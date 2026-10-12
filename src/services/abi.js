// 最小 ABI 编解码器 —— 只覆盖去中心化数据库用到的几种类型。
//
// 需要自己实现而不是直接用 web3.eth.abi，是因为链上回包是按部署时 solc 的
// eth_abi 布局产生的，这里必须逐字节对齐，不能依赖第三方库的版本差异。
import { keccak256 } from 'ethereum-cryptography/keccak'

const enc = new TextEncoder()
const dec = new TextDecoder('utf-8')

export function hexToBytes(hex) {
    const h = String(hex).replace(/^0x/, '')
    const out = new Uint8Array(h.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
    return out
}

export function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** 4 字节函数选择器，等价于 eth_utils.function_signature_to_4byte_selector */
export function selector(signature) {
    return bytesToHex(keccak256(enc.encode(signature)).slice(0, 4))
}

/** uint256 → 32 字节大端 */
function uint256Bytes(n) {
    const buf = new Uint8Array(32)
    let v = BigInt(n)
    for (let i = 31; i >= 0; i--) {
        buf[i] = Number(v & 0xffn)
        v >>= 8n
    }
    return buf
}

/** 32 字节大端 → BigInt */
function readUint256(bytes, offset) {
    let v = 0n
    for (let i = 0; i < 32; i++) v = (v << 8n) | BigInt(bytes[offset + i])
    return v
}

/** 动态 string 的 ABI 编码（自成一段，供 offset 引用） */
function encodeString(s) {
    const data = enc.encode(s)
    const padded = new Uint8Array(Math.ceil(data.length / 32) * 32)
    padded.set(data)
    const out = new Uint8Array(32 + padded.length)
    out.set(uint256Bytes(data.length), 0)
    out.set(padded, 32)
    return out
}

function concat(parts) {
    const total = parts.reduce((s, p) => s + p.length, 0)
    const out = new Uint8Array(total)
    let off = 0
    for (const p of parts) {
        out.set(p, off)
        off += p.length
    }
    return out
}

/**
 * 编码 set(string,string) 的完整 calldata（含 4 字节选择器）。
 *
 * head 区固定为 2 个字：两个 offset 分别指向各自动态段的起点，
 * 且是相对「参数区起点」的绝对偏移 —— 即 0x40（=2 个字）与 0x80（=2 个字+key 段）。
 */
export function encodeSet(key, value) {
    const keyEnc = encodeString(key)
    const valEnc = encodeString(value)
    const headLen = 64   // 两个动态 offset，各 32 字节
    const keyOffset = headLen
    const valOffset = headLen + keyEnc.length
    return bytesToHex(concat([
        hexToBytes(selector('set(string,string)')),
        uint256Bytes(keyOffset),
        uint256Bytes(valOffset),
        keyEnc,
        valEnc,
    ]))
}

/**
 * 编码 getPaginated(uint256,uint256)
 */
export function encodeGetPaginated(offset, limit) {
    return bytesToHex(concat([
        uint256Bytes(offset),
        uint256Bytes(limit),
    ]))
}

/**
 * 解码 getPaginated 的回包。
 *
 * 返回类型 Entry[]（Entry = (string,string)）是「动态元素构成动态数组」，
 * ABI 会套两层偏移，不能只加一次基准：
 *
 *   1) 数组层：长度字之后紧跟 N 个 32 字节元素偏移，全部相对「长度字之后第一个字节」；
 *   2) 元素层：每个元素的数据区自身又是一个 head(两个 offset) + tail(两段 string)，
 *      这两个 offset 相对该元素数据区的起点。
 *
 * 实测样例 Entry[2] = [("ab","cd"),("hello","world")]，共 512 字节：
 *   byte   0 : 32    数组数据区偏移
 *   byte  32 : 2     元素个数                       <- 数组层基准 = 32 + 32 = 64
 *   byte  64 : 64    元素 0 数据区偏移 -> 64 + 64  = 128
 *   byte  96 : 256   元素 1 数据区偏移 -> 64 + 256 = 320
 *   byte 128 : 64    元素 0 key  偏移 -> 128 + 64  = 192  ("ab")
 *   byte 160 : 128   元素 0 value 偏移 -> 128 + 128 = 256 ("cd")
 *   byte 320 : 64    元素 1 key  偏移 -> 320 + 64  = 384  ("hello")
 *   byte 352 : 128   元素 1 value 偏移 -> 320 + 128 = 448 ("world")
 *
 * 注意元素层偏移不能省：把 64/96 直接当成 key/value 指针（少读一层）会得到
 * 元素 0 读错、元素 1 恰好蒙对的假象。
 */
export function decodeEntryArray(hex) {
    const bytes = hexToBytes(hex)
    if (bytes.length < 64) return []
    const arrayDataOffset = Number(readUint256(bytes, 0))
    if (arrayDataOffset + 32 > bytes.length) return []
    const count = Number(readUint256(bytes, arrayDataOffset))
    if (!Number.isFinite(count) || count < 0) return []
    const arrayBase = arrayDataOffset + 32
    const out = []
    for (let i = 0; i < count; i++) {
        const elemOffsetPos = arrayBase + i * 32
        if (elemOffsetPos + 32 > bytes.length) break
        const elemBase = arrayBase + Number(readUint256(bytes, elemOffsetPos))
        if (elemBase + 64 > bytes.length) break
        const keyPtr = elemBase + Number(readUint256(bytes, elemBase))
        const valPtr = elemBase + Number(readUint256(bytes, elemBase + 32))
        out.push({ key: readStringAt(bytes, keyPtr), value: readStringAt(bytes, valPtr) })
    }
    return out
}

/** 读取 [len][data] 形式的动态 string */
function readStringAt(bytes, offset) {
    const len = Number(readUint256(bytes, offset))
    if (!Number.isFinite(len) || len <= 0) return ''
    return dec.decode(bytes.slice(offset + 32, offset + 32 + len))
}

/** 解码 totalKeys() 的 uint256 回包 */
export function decodeUint256(hex) {
    const bytes = hexToBytes(hex)
    if (bytes.length < 32) return 0n
    return readUint256(bytes, 0)
}
