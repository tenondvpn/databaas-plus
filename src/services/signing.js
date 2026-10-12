// Shardora 交易签名 —— 与 clipy/shardora_sdk.py 的 _sign_message / _get_tx_params 保持一致。
//
// 节点接受两种提交方式：
//   1. JSON-RPC `eth_sendRawTransaction`（标准 EIP-155 / EIP-1559）
//   2. 私有 POST /transaction（本文件实现的自定义报文布局）
//
// 合约写入必须走第 2 种：step=8(kContractExcute) 的 nonce 记在 40 字节的
// `合约地址‖用户地址` 预存账户上，而 /transaction 的调用方可以自行决定用哪个
// 地址去查 nonce，JSON-RPC 那条路径做不到。
import { secp256k1 } from 'ethereum-cryptography/secp256k1'
import { keccak256 } from 'ethereum-cryptography/keccak'

const enc = new TextEncoder()

export function hexToBytes(hex) {
    const h = String(hex).replace(/^0x/, '')
    const out = new Uint8Array(h.length / 2)
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
    return out
}

export function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// 小端序 uint64，对应 Python 的 struct.pack('<Q', v)
function uint64LE(n) {
    const buf = new Uint8Array(8)
    let v = BigInt(n)
    for (let i = 0; i < 8; i++) {
        buf[i] = Number(v & 0xffn)
        v >>= 8n
    }
    return buf
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
 * 由私钥推导密钥对与账户地址。
 * accountId = keccak256(未压缩公钥去掉 0x04 前缀)[-20:]
 */
export function getKeypair(privateKeyHex) {
    const skBytes = hexToBytes(privateKeyHex)
    if (skBytes.length !== 32) throw new Error('私钥必须是 32 字节（64 位十六进制）')
    const pkBytes = secp256k1.getPublicKey(skBytes, false)
    const accountId = bytesToHex(keccak256(pkBytes.slice(1))).slice(-40)
    return { skBytes, pkBytes, accountId }
}

/**
 * 组装并按 shardora 自定义布局签名一笔交易。
 *
 * 签名报文：
 *   nonce(8, LE) ‖ pubkey(65) ‖ to(20) ‖ amount(8, LE)
 *   ‖ gas_limit(8, LE) ‖ gas_price(8, LE) ‖ step(8, LE)
 *   ‖ [contract_code] ‖ [input] ‖ prefund(8, LE) ‖ [key] ‖ [val]
 */
export function buildAndSignTx(opts) {
    const keypair = getKeypair(opts.privateKeyHex)
    const amount = BigInt(opts.amount ?? 0)
    const gasLimit = BigInt(opts.gasLimit ?? 999999)
    const gasPrice = BigInt(opts.gasPrice ?? 1)
    const step = BigInt(opts.step ?? 0)
    const prepay = BigInt(opts.prepay ?? 0)

    const toHex = String(opts.to).replace(/^0x/, '')
    if (toHex.length !== 40) throw new Error('目标地址必须是 20 字节（40 位十六进制）')

    const parts = [
        uint64LE(opts.nonce),
        keypair.pkBytes,
        hexToBytes(toHex),
        uint64LE(amount),
        uint64LE(gasLimit),
        uint64LE(gasPrice),
        uint64LE(step),
    ]
    if (opts.contractBytes) parts.push(hexToBytes(opts.contractBytes))
    if (opts.input) parts.push(hexToBytes(opts.input))
    parts.push(uint64LE(prepay))
    if (opts.key !== undefined) {
        parts.push(enc.encode(opts.key))
        if (opts.val !== undefined) parts.push(enc.encode(opts.val))
    }

    const msgHash = keccak256(concat(parts))
    // ethereum-cryptography 默认产出规范化的 s（对应 coincurve 的 lowS）
    const sig = secp256k1.sign(msgHash, keypair.skBytes)

    const params = {
        nonce: String(opts.nonce),
        pubkey: bytesToHex(keypair.pkBytes),
        to: toHex,
        amount: String(amount),
        gas_limit: String(gasLimit),
        gas_price: String(gasPrice),
        shard_id: String(opts.shardId ?? 3),
        type: String(step),
        sign_r: sig.r.toString(16).padStart(64, '0'),
        sign_s: sig.s.toString(16).padStart(64, '0'),
        sign_v: String(sig.recovery ?? 0),
    }
    if (opts.key !== undefined) params.key = opts.key
    if (opts.val !== undefined) params.val = opts.val
    if (opts.contractBytes) params.bytes_code = opts.contractBytes
    if (opts.input) params.input = opts.input
    if (prepay > 0n) params.prefund = String(prepay)

    return { params, txHash: bytesToHex(msgHash), from: keypair.accountId }
}
