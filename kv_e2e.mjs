// 完整写入链路：step7 垫付 -> step8 写入 -> 回执 -> 读回
import { secp256k1 } from 'ethereum-cryptography/secp256k1'
import { keccak256 } from 'ethereum-cryptography/keccak'

function h2b(h){h=String(h).replace(/^0x/,'');const o=new Uint8Array(h.length/2);for(let i=0;i<o.length;i++)o[i]=parseInt(h.slice(i*2,i*2+2),16);return o}
function b2h(b){return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('')}
function u64(n){const b=new Uint8Array(8);let v=BigInt(n);for(let i=0;i<8;i++){b[i]=Number(v&0xffn);v>>=8n}return b}
function cat(ps){const t=ps.reduce((s,p)=>s+p.length,0);const o=new Uint8Array(t);let f=0;for(const p of ps){o.set(p,f);f+=p.length}return o}
function mk(pk){const sk=h2b(pk);const pub=secp256k1.getPublicKey(sk,false);return{sk,pub,addr:b2h(keccak256(pub.slice(1))).slice(-40)}}
function sel(s){return b2h(keccak256(new TextEncoder().encode(s))).slice(0,8)}
function p32(n){return BigInt(n).toString(16).padStart(64,'0')}
function hexBody(b,w){let s='';for(const x of b)s+=x.toString(16).padStart(2,'0');return s.padEnd(w*2,'0')}
function encStr(s){const b=new TextEncoder().encode(s);return p32(b.length)+hexBody(b,Math.ceil(b.length/32)*32)}
function encodeSet(k,v){const kb=new TextEncoder().encode(k),vb=new TextEncoder().encode(v)
  return sel('set(string,string)')+p32(64)+p32(64+32+Math.ceil(kb.length/32)*32)+encStr(k)+encStr(v)}
function encodeGetPaginated(o,l){return sel('getPaginated(uint256,uint256)')+p32(o)+p32(l)}

function signTx(o){
  const k=o.kp
  const parts=[u64(o.nonce),k.pub,h2b(o.to),u64(o.amount??0),u64(o.gasLimit??5000000),u64(1),u64(o.step)]
  if(o.input)parts.push(h2b(o.input))
  parts.push(u64(o.prepay??0))
  const h=keccak256(cat(parts))
  const sig=secp256k1.sign(h,k.sk)
  const d={nonce:String(o.nonce),pubkey:b2h(k.pub),to:o.to,amount:String(o.amount??0),
    gas_limit:String(o.gasLimit??5000000),gas_price:'1',shard_id:String(o.shardId),
    type:String(o.step),sign_r:sig.r.toString(16).padStart(64,'0'),
    sign_s:sig.s.toString(16).padStart(64,'0'),sign_v:String(sig.recovery??0)}
  if(o.input)d.input=o.input
  if(o.prepay>0)d.prefund=String(o.prepay)
  return {d,txHash:b2h(h)}
}

const HOST='http://121.40.200.145:8080', SHARD=3
const k=mk(process.argv[2])
const CONTRACT=process.argv[3]
console.log('user =', k.addr, '\ncontract =', CONTRACT)

async function q(ep,p){const r=await fetch(`${HOST}/api/shard${SHARD}/${ep}`,{method:'POST',body:new URLSearchParams(p)});return await r.text()}
async function post(d){const r=await fetch(`${HOST}/api/shard${SHARD}/transaction`,{method:'POST',body:new URLSearchParams(d)});return {code:r.status,body:await r.text()}}
async function wait(tx,secs=40){for(let i=0;i<secs;i++){const t=await q('transaction_receipt',{tx_hash:tx});
  try{const j=JSON.parse(t); if(j.status!==100010&&j.status!==10001&&j.status!==10003)return j}catch(_){}
  await new Promise(r=>setTimeout(r,1000))} return {status:'timeout'}}

const pfAddr=CONTRACT+k.addr
console.log('\n=== A. 垫付前的预存账户 ===')
console.log(await q('query_account',{address:pfAddr}))

let acc=JSON.parse(await q('query_account',{address:k.addr})||'{}')
console.log('\n=== B. step=7 垫付 gas ===')
let t=signTx({kp:k,to:CONTRACT,step:7,gasLimit:5000000,prepay:3000000,shardId:SHARD,nonce:parseInt(acc.nonce||'0',10)+1})
console.log('submit =>', await post(t.d))
console.log('receipt =>', await wait(t.txHash))

console.log('\n=== C. 垫付后预存账户 ===')
console.log(await q('query_account',{address:pfAddr}))

acc=JSON.parse(await q('query_account',{address:k.addr})||'{}')
let pfAcc=JSON.parse(await q('query_account',{address:pfAddr})||'{}')
const pfNonce=parseInt(pfAcc.nonce||'0',10)
console.log('\n=== D. step=8 写入 set(key,value) ===')
const key='database_'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14)
const val=JSON.stringify({request:{method:'POST',url:'/api/test'},response:{status:200}})
t=signTx({kp:k,to:CONTRACT,step:8,input:encodeSet(key,val),gasLimit:5000000,prepay:3000000,shardId:SHARD,nonce:pfNonce+1})
console.log('key =', key)
console.log('submit =>', await post(t.d))
console.log('receipt =>', await wait(t.txHash))

console.log('\n=== E. 读回 totalKeys / getPaginated ===')
console.log('totalKeys =', await q('abi_query_contract',{address:CONTRACT,input:sel('totalKeys()'),from:'0000000000000000000000000000000000000000'}))
console.log('page      =', (await q('abi_query_contract',{address:CONTRACT,input:encodeGetPaginated(0,10),from:'0000000000000000000000000000000000000000'})).slice(0,400))
