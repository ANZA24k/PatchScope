import {createClient, createAccount, generatePrivateKey} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {connectProvider, allowedSource, sha256, verifyHistory, transactionState} from './core.js';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const client = createClient({chain:studionet});
let deployment, signer, provider, accountKind, mode='lock', selected, pending, busy=false;
let txs = JSON.parse(localStorage.getItem('patchscope.transactions') || '[]');
let issues = new Map(), candidates = [];
const txUrl = hash => `https://explorer-studio.genlayer.com/tx/${hash}`;
const addressUrl = a => `https://explorer-studio.genlayer.com/address/${a}`;
const short = v => v ? v.slice(0,10)+'…'+v.slice(-6) : '—';
const message = (text, error=false) => { $('load-status').textContent=text; $('load-status').className=error?'error':''; };
const read = async (name,args=[]) => JSON.parse(await client.readContract({address:deployment.contract,functionName:name,args,transactionHashVariant:'latest-final'}));
function setAccount(account,kind,p=null) {
 signer=account; accountKind=kind; provider=p;
 const address=typeof signer==='string'?signer:signer.address;
 $('account').textContent=`${kind==='wallet'?'Wallet':'Browser test account'} · ${address}`;
 $('account-note').textContent=kind==='wallet'?'Only the address is connected. Each write needs a separate confirmation.':'Generated locally using the same account primitives as Studio. Session-only key; test GEN only. It is not your Studio tab account.';
 $('connect').textContent=short(address);
 if(mode==='lock') renderForm();
}
$('connect').onclick=async()=>{
 try{
  const p=window.ethereum?.providers?.find(p=>p.isMetaMask) || window.ethereum;
  const a=await connectProvider(p);setAccount(a,'wallet',p);
  p.on?.('accountsChanged',()=>{signer=null;provider=null;$('account').textContent='Wallet account changed — reconnect before writing';$('connect').textContent='Reconnect wallet';});
  p.on?.('chainChanged',()=>{pending=null;$('confirmation').close();message('Wallet network changed. Preview the write again.');});
 }catch(e){message(e.message||String(e),true);}
};
$('test-account').onclick=()=>{
 if(!confirm('Create a local test account for Studionet? Its key stays in this browser session. Never send real assets to it. This action sends no transaction.'))return;
 const key=sessionStorage.getItem('patchscope.test-key')||generatePrivateKey();
 sessionStorage.setItem('patchscope.test-key',key);setAccount(createAccount(key),'test');
};
async function refresh(){
 try{
  if(!deployment?.contract){message('Deployment is not configured. No live results are shown.',true);return;}
  $('refresh').disabled=true;message('Reading finalized contract state…');
  const counts=await read('counts');
  const ids=Array.from({length:Math.min(counts.candidates,40)},(_,i)=>String(counts.candidates-i));
  candidates=await Promise.all(ids.map(id=>read('get_candidate',[id])));
  const issueIds=[...new Set(candidates.map(c=>c.issue_id))];
  issues=new Map(await Promise.all(issueIds.map(async id=>[id,await read('get_issue',[id])])));
  $('candidates').innerHTML=candidates.map(c=>`<button data-candidate="${esc(c.id)}" class="${selected===c.id?'selected':''}"><small>ISSUE ${esc(c.issue_id)} / PATCH ${esc(c.id)}</small><b>${esc(issues.get(c.issue_id).title)}</b><span class="badge ${esc(c.status)}">${esc(c.status)}</span></button>`).join('')||'<p>No finalized candidates yet. Create an issue below.</p>';
  for(const b of $('candidates').querySelectorAll('button'))b.onclick=()=>showCandidate(b.dataset.candidate);
  message(`Finalized state refreshed · ${counts.issues} issues · ${counts.candidates} candidates${counts.candidates>40?' · showing latest 40':''}`);
  if(candidates.length)await showCandidate(candidates.some(c=>c.id===selected)?selected:candidates[candidates.length-1].id);
 }catch(e){message(`Live read failed: ${e.message||JSON.stringify(e)}. Previously loaded data may be stale.`,true);}finally{$('refresh').disabled=false;}
}
async function showCandidate(id){
 selected=id;const c=candidates.find(c=>c.id===id), issue=issues.get(c.issue_id), latest=c.history.at(-1);
 for(const b of $('candidates').querySelectorAll('button'))b.classList.toggle('selected',b.dataset.candidate===id);
 const chainOK=await verifyHistory(c);
 $('detail').innerHTML=`<div class="detail-head"><div><span class="label">LOCKED ISSUE / ${esc(issue.id)}</span><h3>${esc(issue.title)}</h3><p class="meta">${esc(issue.repository)}<br>Patch commit ${esc(c.commit)}</p></div><span class="badge ${esc(c.status)}">${esc(c.status)}</span></div><p>${esc(issue.problem)}</p><p class="meta">Baseline ${esc(issue.base_commit)}<br>Submit by ${new Date(issue.deadline*1000).toISOString()}<br>Commitment ${esc(c.commitment)}</p><h3>Criterion findings</h3>${issue.criteria.map((criterion,i)=>{
  const f=latest?.result.findings[i];return `<div class="criterion"><span class="label">${String(i+1).padStart(2,'0')} / ${esc(criterion.kind)}</span><p>${esc(criterion.text)}</p>${f?`<span class="badge ${esc(f.status)}">${esc(f.status)}</span><p><small>${esc(f.reason)}</small></p>${f.quote?`<blockquote>${esc(f.quote)}</blockquote><small>Source ${f.source+1} · ${esc(c.evidence[f.source]?.role)}</small>`:''}`:'<small>Awaiting a finalized review.</small>'}</div>`;
 }).join('')}<details open><summary>Committed evidence · ${c.evidence.length} files</summary>${c.evidence.map((e,i)=>`<div class="source"><button data-verify="${i}">Verify bytes</button><a href="${esc(e.url)}" target="_blank" rel="noreferrer">${esc(e.role)} / ${esc(e.url.split('/').at(-1))} ↗</a><code>${esc(e.sha256)}<br>${e.bytes} bytes · ${esc(latest?.result.sources[i].status||'NOT REVIEWED')}</code><span id="verify-${i}" class="meta"></span></div>`).join('')}</details><details><summary>Append-only verdict history · ${c.history.length} reviews</summary><p class="meta ${chainOK?'success':'error'}">${chainOK?'Review hash chain verified locally':'INVALID review hash chain'}</p>${c.history.map(h=>`<div class="history-entry"><span class="badge ${esc(h.result.verdict)}">${esc(h.result.verdict)}</span><p>Revision ${h.revision} · ${new Date(h.reviewed_at*1000).toISOString()}</p><p class="meta">Reviewer ${esc(h.reviewer)}<br>Review hash ${esc(h.review_hash)}<br>Previous ${esc(h.previous_hash)}</p></div>`).join('')}</details><details><summary>Locked issue and raw receipt</summary><pre>${esc(JSON.stringify({issue,candidate:c},null,2))}</pre><button id="export">Export receipt JSON</button></details>`;
 for(const b of $('detail').querySelectorAll('[data-verify]'))b.onclick=async()=>{
  const i=Number(b.dataset.verify),e=c.evidence[i];b.disabled=true;
  try{
   const r=await fetch(e.url,{redirect:'error'});if(!r.ok)throw Error(`HTTP ${r.status}`);
   const body=await r.arrayBuffer();const hash=await sha256(body);
   const ok=body.byteLength===e.bytes&&hash===e.sha256;
   $(`verify-${i}`).textContent=ok?'Exact bytes and SHA-256 match.':'COMMITMENT MISMATCH';
   $(`verify-${i}`).className=ok?'meta success':'meta error';
  }catch(err){$(`verify-${i}`).textContent=`Verification unavailable: ${err.message}`;}finally{b.disabled=false;}
 };
 $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({network:'studionet',contract:deployment.contract,issue,candidate:c},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`patchscope-${c.id}-receipt.json`;a.click();URL.revokeObjectURL(url);};
}
$('refresh').onclick=refresh;
function renderForm(){
 const address=signer?(typeof signer==='string'?signer:signer.address):'';
 const fields={
 lock:`<div class="form-grid"><label>Issue title<input name="title" required maxlength="100" value="Prevent empty-inventory division by zero"></label><label>Repository (owner/name)<input name="repository" required value="ANZA24k/PatchScope"></label><label class="wide">Problem<textarea name="problem" maxlength="1200" required>Inventory average_cost crashes when count is zero. Assess the submitted function from source; do not require proof of runtime execution.</textarea></label><label>Baseline commit (40 lowercase hex)<input name="base_commit" required pattern="[0-9a-f]{40}" value="${esc(deployment?.baselineCommit||'')}"></label><label>Authorized submitter address<input name="submitter" required pattern="0x[0-9a-fA-F]{40}" value="${esc(address)}"></label><label>Fix criteria (one per line)<textarea name="fixes" required>When count equals zero, average_cost returns zero without dividing.</textarea></label><label>Regression guards (one per line)<textarea name="regressions" required>For positive count, average_cost continues to return total divided by count.</textarea></label><label>Required evidence roles<select name="roles"><option value="code">Code</option><option value="code,tests">Code + tests</option><option value="code,tests,report">Code + tests + report</option></select></label><label>Submission deadline (UTC)<input type="datetime-local" name="deadline" required value="${new Date(Date.now()+7*86400000).toISOString().slice(0,16)}"></label></div>`,
 submit:`<div class="form-grid"><label>Issue ID<input name="issue_id" required pattern="[1-9][0-9]*" value="1"></label><label>Exact patch commit<input name="commit" required pattern="[0-9a-f]{40}" value="${esc(deployment?.sourceCommit||'')}"></label><label class="wide">Evidence files (role + path, one per line)<textarea name="paths" required>code demo/fixed.py</textarea></label></div><p class="notice">Files are fetched from the locked repository at your exact commit. SHA-256 and byte lengths are calculated before preview. 1–4 files, 12 KB per file, 24 KB total. Branch URLs and redirects are rejected. The patch must differ from the baseline commit.</p>`,
 review:`<div class="form-grid"><label>Candidate ID<input name="candidate_id" required pattern="[1-9][0-9]*" value="${esc(selected||'1')}"></label><label>Expected prior reviews<input name="revision" type="number" min="0" max="2" value="0" required></label></div><p class="notice">First review is permissionless. Rechecks require the issue owner or submitter. FIXED is terminal; other candidates allow up to three reviews before the deadline plus seven days. Unavailable retrieval can be retried without changing history.</p>`
 };
 $('form-fields').innerHTML=fields[mode];
}
for(const tab of document.querySelectorAll('[data-mode]'))tab.onclick=()=>{mode=tab.dataset.mode;document.querySelectorAll('[data-mode]').forEach(t=>t.classList.toggle('active',t===tab));renderForm();};
const explanations={lock:'Lock immutable issue criteria, baseline, authorized submitter and deadline. Anyone may read this public record. The owner cannot edit its terms later.',submit:'Bind this exact patch commit to the locked issue and these file hashes. The contract will check your authorization, evidence limits and replay protection. This does not start an AI review.',review:'Ask GenLayer validators to independently retrieve and assess the committed evidence. Consensus will append a public review if execution succeeds; conflicting findings can leave the transaction undetermined.'};
$('write-form').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 try{
  if(!deployment?.contract)throw Error('No deployed contract configured');
  if(!signer)throw Error('Connect a wallet or create a browser test account first.');
  const data=Object.fromEntries(new FormData(event.currentTarget));let functionName,args;
  if(mode==='lock'){
   const criteria=[...data.fixes.split('\n').filter(x=>x.trim()).map(text=>({kind:'fix',text})),...data.regressions.split('\n').filter(x=>x.trim()).map(text=>({kind:'regression',text}))];
   if(criteria.length<2||criteria.length>6)throw Error('Use 2–6 total criteria, including a fix and regression guard.');
   const payload={title:data.title,problem:data.problem,repository:data.repository,base_commit:data.base_commit,submitter:data.submitter,criteria,required_roles:data.roles.split(','),deadline:Math.floor(Date.parse(data.deadline+'Z')/1000)};
   functionName='lock_issue';args=[JSON.stringify(payload)];
  }else if(mode==='submit'){
   const issue=await read('get_issue',[data.issue_id]);
   const rows=data.paths.trim().split('\n');if(rows.length>4)throw Error('Maximum four sources.');
   const evidence=[];let total=0;
   for(const row of rows){
    const [role,path,...extra]=row.trim().split(/\s+/);if(extra.length||!['code','tests','report'].includes(role))throw Error('Use role + path on each line.');
    const url=`https://raw.githubusercontent.com/${issue.repository}/${data.commit}/${path}`;
    if(!allowedSource(url,issue.repository,data.commit))throw Error('Unsafe evidence path.');
    const r=await fetch(url,{redirect:'error'});if(!r.ok)throw Error(`Evidence HTTP ${r.status}: ${path}`);
    const bytes=await r.arrayBuffer();total+=bytes.byteLength;
    if(bytes.byteLength<1||bytes.byteLength>12000||total>24000)throw Error('Evidence exceeds byte limits.');
    evidence.push({url,role,bytes:bytes.byteLength,sha256:await sha256(bytes)});
   }
   functionName='submit_patch';args=[data.issue_id,data.commit,JSON.stringify(evidence)];
  }else{functionName='review';args=[data.candidate_id,Number(data.revision)];}
  pending={functionName,args,kind:accountKind,address:typeof signer==='string'?signer:signer.address};
  $('write-explanation').textContent=explanations[mode];$('confirm-contract').textContent=deployment.contract;$('confirm-signer').textContent=pending.address;
  $('confirm-payload').textContent=JSON.stringify({functionName,args},null,2);$('confirmation').showModal();
 }catch(e){message(e.message||String(e),true);}
};
$('cancel').onclick=()=>{$('confirmation').close();pending=null;};
function persist(){localStorage.setItem('patchscope.transactions',JSON.stringify(txs));renderTxs();}
function renderTxs(){
 $('tx-list').innerHTML=txs.length?txs.map(tx=>`<div class="tx"><b>${esc(tx.method)}</b> <span class="badge">${esc(tx.state)}</span> ${esc(tx.error||'')}<br><a href="${txUrl(tx.hash)}" target="_blank" rel="noreferrer">${esc(tx.hash)} ↗</a><br>${esc(tx.signer)}${tx.state==='ACCEPTED'?' · accepted, awaiting finality':''}</div>`).join(''):'No transactions submitted in this browser.';
}
async function track(tx){
 for(let i=0;i<60;i++){
  try{
   const receipt=await client.getTransaction({hash:tx.hash});const s=transactionState(receipt);tx.state=s.state;tx.error=s.failed?'Execution failed; inspect the explorer receipt.':'';persist();
   if(s.failed||s.done){if(s.done&&!s.failed)await refresh();return;}
  }catch(e){tx.error=`Status temporarily unavailable: ${e.message||JSON.stringify(e)}`;persist();return;}
  await new Promise(r=>setTimeout(r,2500));
 }
 tx.error='Still pending. Use Resume tracking later; do not resubmit blindly.';persist();
}
$('send').onclick=async()=>{
 if(!pending||busy)return;busy=true;$('send').disabled=true;
 const p=pending;
 try{
  let writer;
  if(p.kind==='wallet'){
   const accounts=await provider.request({method:'eth_accounts'});
   if(accounts[0]?.toLowerCase()!==p.address.toLowerCase())throw Error('Wallet account changed; reconnect and preview again.');
   const chain=await provider.request({method:'eth_chainId'});if(Number(chain)!==61999)throw Error('Switch the wallet to Studionet chain 61999, then preview again. No network permissions were requested.');
   writer=createClient({chain:studionet,account:p.address,provider});
  }else{
   // Fresh funds are simulated by Studio, never a transfer from another wallet.
   const balance=await client.getBalance({address:p.address});
   if(balance<1000000000000000000n)await client.request({method:'sim_fundAccount',params:[p.address,1000000000000000000000]});
   writer=createClient({chain:studionet,account:signer});
  }
  message('Sending the confirmed write…');
  const hash=await writer.writeContract({address:deployment.contract,functionName:p.functionName,args:p.args,value:0n,leaderOnly:false});
  if(!/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('RPC returned an invalid transaction hash.');
  const tx={hash,method:p.functionName,signer:p.address,state:'PENDING',error:''};txs.unshift(tx);persist();
  $('confirmation').close();pending=null;message('Transaction submitted. Tracking consensus and finality…');await track(tx);
 }catch(e){message(`Write failed or rejected: ${e.message||JSON.stringify(e)}`,true);}finally{busy=false;$('send').disabled=false;}
};
$('resume').onclick=async()=>{if(busy)return;busy=true;$('resume').disabled=true;try{for(const tx of txs.filter(t=>!['FINALIZED','CANCELED','CANCELLED','UNDETERMINED'].includes(t.state)))await track(tx);}finally{busy=false;$('resume').disabled=false;}};
async function init(){
 try{
  deployment=await (await fetch('/deployment.json')).json();
  if(deployment.contract){$('deployment').innerHTML=`<a href="${addressUrl(deployment.contract)}" target="_blank" rel="noreferrer">STUDIONET CONTRACT ↗<br>${esc(deployment.contract)}</a>`;}
  $('pilot-log').innerHTML=deployment.pilots.map(p=>`<div class="tx"><b>${esc(p.label)}</b><br><a href="${txUrl(p.transaction)}" target="_blank" rel="noreferrer">${esc(p.transaction)} ↗</a></div>`).join('');
  renderForm();renderTxs();await refresh();
 }catch(e){message(`Initialization failed: ${e.message}`,true);}
}
init();
