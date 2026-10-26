import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {verifyHistory,transactionState,sha256} from './core.js';
const client=createClient({chain:studionet});
const config=JSON.parse(fs.readFileSync(new URL('./public/deployment.json',import.meta.url)));
const local=fs.readFileSync(new URL('../contracts/patchscope.py',import.meta.url),'utf8');
const remote=await client.getContractCode(config.contract);
assert.equal(remote,local,'deployed source differs');
const read=async(name,args=[])=>JSON.parse(await client.readContract({address:config.contract,functionName:name,args,transactionHashVariant:'latest-final'}));
const counts=await read('counts');
const records=[];
for(let id=1;id<=counts.candidates;id++){
 const candidate=await read('get_candidate',[String(id)]);
 assert.ok(await verifyHistory(candidate),'review hash chain invalid');
 for(const source of candidate.evidence){
  const response=await fetch(source.url,{redirect:'error'});assert.ok(response.ok);
  const body=await response.arrayBuffer();assert.equal(body.byteLength,source.bytes);assert.equal(await sha256(body),source.sha256);
 }
 records.push(candidate);
}
const txs=[];
for(const pilot of config.pilots){
 const tx=await client.getTransaction({hash:pilot.transaction});
 const state=transactionState(tx);assert.equal(state.state,'FINALIZED');assert.equal(state.failed,false);
 txs.push({label:pilot.label,hash:pilot.transaction,state:state.state,result:tx.result_name,leaderOnly:tx.leader_only,leaderExecution:(tx.consensus_data?.leader_receipt||[]).filter(r=>r.mode==='leader').map(r=>r.execution_result),votes:tx.consensus_data?.votes});
}
const report={verifiedAt:new Date().toISOString(),contract:config.contract,sourceSHA256:await sha256(new TextEncoder().encode(local)),counts,records,transactions:txs};
fs.writeFileSync(new URL('../docs/live-state.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceMatch:true,counts,candidates:records.map(c=>({id:c.id,status:c.status,reviews:c.history.length})),finalizedTransactions:txs.length}));
