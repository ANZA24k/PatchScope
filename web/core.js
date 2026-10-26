import {sha256 as hash256} from '@noble/hashes/sha2.js';
export function canonical(value) {
  const normalize = v => Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, normalize(v[k])])) : v;
  return JSON.stringify(normalize(value)).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
export async function sha256(bytes) { return [...hash256(new Uint8Array(bytes))].map(x => x.toString(16).padStart(2, '0')).join(''); }
export const hashObject = obj => sha256(new TextEncoder().encode(canonical(obj)));
export async function connectProvider(provider) {
  if (!provider?.request) throw new Error('No EIP-1193 wallet found. Use the browser test account or open Studio.');
  const accounts = await provider.request({method: 'eth_requestAccounts'});
  if (!/^0x[0-9a-fA-F]{40}$/.test(accounts?.[0])) throw new Error('Wallet returned no valid address');
  return accounts[0];
}
export function transactionState(tx) {
  const state = tx.statusName || tx.status;
  const rawReceipts = tx.consensus_data?.leader_receipt;
  const receipts = Array.isArray(rawReceipts) ? rawReceipts : rawReceipts ? [rawReceipts] : [];
  const executions = [tx.txExecutionResultName, tx.receipt?.execution_result, ...receipts.filter(r => !r.mode || r.mode === 'leader').map(r => r.execution_result)].filter(Boolean);
  const failed = ['CANCELED','CANCELLED','UNDETERMINED'].includes(state) || executions.some(result => !['SUCCESS','FINISHED_WITH_RETURN'].includes(result));
  return {state: String(state || 'PENDING'), failed: Boolean(failed), done: state === 'FINALIZED', accepted: state === 'ACCEPTED'};
}
export async function verifyHistory(candidate) {
  let previous = candidate.commitment;
  for (const review of candidate.history) {
    const {review_hash, ...entry} = review;
    if (entry.previous_hash !== previous || await hashObject(entry) !== review_hash) return false;
    previous = review_hash;
  }
  return true;
}
export function allowedSource(url, repo, commit) {
  const prefix = `https://raw.githubusercontent.com/${repo}/${commit}/`;
  const path = url.startsWith(prefix) ? url.slice(prefix.length) : '';
  return /^[A-Za-z0-9_./-]+$/.test(path) && path.split('/').every(p => p && p !== '.' && p !== '..') && url.length <= 350;
}
