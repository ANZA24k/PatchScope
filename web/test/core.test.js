import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectProvider, canonical, transactionState, allowedSource, sha256, hashObject, verifyHistory} from '../core.js';
test('wallet connection requests only public accounts', async () => {
 const requests=[]; const address='0x'+'1'.repeat(40);
 assert.equal(await connectProvider({request: async p => {requests.push(p); return [address];}}), address);
 assert.deepEqual(requests,[{method:'eth_requestAccounts'}]);
});
test('wallet rejection propagates without fallback signing', async () => {
 let count=0; await assert.rejects(connectProvider({request:async()=>{count++; throw new Error('User rejected');}}),/rejected/); assert.equal(count,1);
});
test('no provider is handled', async()=>assert.rejects(connectProvider(null),/No EIP/));
test('empty accounts rejected', async()=>assert.rejects(connectProvider({request:async()=>[]}),/valid address/));
test('canonical hashes match Python ASCII JSON',()=>assert.equal(canonical({z:'é',a:1}),'仮'.replace('仮','{"a":1,"z":"\\u00e9"}')));
test('accepted is not finalized',()=>assert.deepEqual(transactionState({statusName:'ACCEPTED'}),{state:'ACCEPTED',failed:false,done:false,accepted:true}));
test('finalized failure is not success',()=>assert.equal(transactionState({statusName:'FINALIZED',txExecutionResultName:'USER_ERROR'}).failed,true));
test('undetermined is terminal failure',()=>assert.equal(transactionState({status:'UNDETERMINED'}).failed,true));
test('pinned source only',()=>{
 const c='a'.repeat(40); const prefix=`https://raw.githubusercontent.com/a/b/${c}/`;
 assert.ok(allowedSource(prefix+'src/fix.py','a/b',c));
 for(const p of ['../x','a//b','x?q=1','%2e%2e/x']) assert.ok(!allowedSource(prefix+p,'a/b',c));
 assert.ok(!allowedSource(prefix.replace(c,'main')+'x','a/b',c));
});
test('receipt chain detects mutation',async()=>{
 const entry={previous_hash:'a'.repeat(64),result:{verdict:'FIXED'}};
 const candidate={commitment:entry.previous_hash,history:[{...entry,review_hash:await hashObject(entry)}]};
 assert.ok(await verifyHistory(candidate));candidate.history[0].result.verdict='FAILED';assert.ok(!await verifyHistory(candidate));
});

test('Studio receipt arrays distinguish finalized execution error',()=>assert.equal(transactionState({statusName:'FINALIZED',consensus_data:{leader_receipt:[{execution_result:'ERROR'}]}}).failed,true));

test('SHA-256 works without secure-context Web Crypto',async()=>assert.equal(await sha256(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));

test('idle validator receipt does not turn successful leader execution into failure',()=>assert.equal(transactionState({statusName:'FINALIZED',consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'},{mode:'validator',execution_result:'ERROR',result:{payload:'idle'}}]}}).failed,false));
