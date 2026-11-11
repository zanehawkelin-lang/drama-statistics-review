const assert = require('node:assert/strict');
const P = require('./page-scopes.js');
const ids = ['dv','lumi','mini','prutora','dramazas','dramuzi'];
let passed = 0;
function test(name, run) { run(); console.log('PASS', name); passed++; }

test('fresh defaults keep payment broad and business modules site-specific', () => {
  assert.deepEqual(P.create(ids).snapshot(), {payment:'all',links:'dv',products:'dv',templates:'dv'});
});
test('payment and legacy entry routes share one selection without changing other modules', () => {
  const s = P.create(ids);
  s.set('channels','lumi');
  assert.equal(s.get('global'),'lumi');
  assert.equal(s.get('payment'),'lumi');
  assert.deepEqual(s.snapshot(), {payment:'lumi',links:'dv',products:'dv',templates:'dv'});
});
test('link list and creation share a selection', () => {
  const s = P.create(ids);
  s.set('create','dramuzi');
  assert.equal(s.get('links'),'dramuzi');
  assert.equal(s.get('channels'),'all');
});
test('all module selections survive serialization and reload independently', () => {
  const s = P.create(ids);
  s.set('channels','lumi'); s.set('links','dv'); s.set('products','mini'); s.set('templates','prutora');
  const reloaded = P.create(ids, JSON.parse(JSON.stringify(s.snapshot())), 'dramazas');
  assert.deepEqual(reloaded.snapshot(), {payment:'lumi',links:'dv',products:'mini',templates:'prutora'});
});
test('legacy site selection migrates once and then separates', () => {
  const s = P.create(ids,null,'lumi');
  assert.deepEqual(s.snapshot(), {payment:'lumi',links:'lumi',products:'lumi',templates:'lumi'});
  s.set('products','mini');
  assert.equal(P.create(ids,s.snapshot(),'dv').get('products'),'mini');
  assert.equal(s.get('global'),'lumi');
});
test('legacy all-sites selection is preserved', () => {
  assert.deepEqual(P.create(ids,null,'all').snapshot(), {payment:'all',links:'all',products:'all',templates:'all'});
});
test('invalid stored IDs and partial records fall back per module', () => {
  const s = P.create(ids,{payment:'removed',links:'mini',products:null},'lumi');
  assert.deepEqual(s.snapshot(), {payment:'all',links:'mini',products:'dv',templates:'dv'});
  assert.equal(P.create(ids,null,'removed').get('links'),'dv');
});
test('invalid selections are rejected without changing the snapshot', () => {
  const s = P.create(ids), before = s.snapshot();
  assert.equal(s.set('channels','removed'),false);
  assert.equal(s.set('products',null),false);
  assert.deepEqual(s.snapshot(),before);
});
test('targeting the SKU module leaves the payment and link contexts intact', () => {
  const s = P.create(ids,{payment:'lumi',links:'dramazas',products:'all',templates:'prutora'});
  s.set('products','mini');
  assert.deepEqual(s.snapshot(), {payment:'lumi',links:'dramazas',products:'mini',templates:'prutora'});
});
test('snapshot is a copy and reset restores all module defaults', () => {
  const s = P.create(ids,null,'lumi'), copy = s.snapshot();
  copy.payment='all';
  assert.equal(s.get('channels'),'lumi');
  s.reset();
  assert.deepEqual(s.snapshot(), P.create(ids).snapshot());
});
console.log(`${passed} page-scope checks passed.`);
