const assert = require('node:assert/strict');
const M = require('./model.js');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const pair = (channelId,accountId) => ({channelId,accountId});
const form = (mode='default',channelId='',accountId='') => ({name:'示例链接',site:'dv',template:'dv-standard',mode,channelId,accountId,episode:'1'});
const rule = (d,fields) => ({id:'new-rule',name:'新站点配置',siteIds:['dv'],channelId:'waffo',accountId:'waffo-second',enabled:true,...fields});

test('初始多账户配置无冲突',()=>assert.deepEqual(M.routingIssues(M.seed()),[]));
test('一个 PSP 下有多个独立账户',()=>assert.equal(M.seed().accounts.filter(a=>a.channelId==='waffo').length,2));
test('未覆盖站点继承全局 PSP 与主账户',()=>{const r=M.effective(M.seed(),'dv');assert.equal(r.source,'global');assert.equal(r.channel.provider,'Waffo');assert.equal(r.account.id,'waffo-main');});
test('站点覆盖整组优先于全局',()=>{const r=M.effective(M.seed(),'lumi');assert.equal(r.source,'site');assert.equal(r.account.id,'subotiz-main');});
test('链接可指定相同 PSP 下的第二账户',()=>{const r=M.effective(M.seed(),'dv',pair('waffo','waffo-second'));assert.equal(r.source,'link');assert.equal(r.account.id,'waffo-second');});
test('链接指定整组优先于站点覆盖',()=>{const d=M.seed(),r=M.effective(d,'lumi',pair('waffo','waffo-main'));assert.equal(r.source,'link');assert.equal(r.account.id,'waffo-main');});
test('只指定 PSP 不能从其他层补账户',()=>{const r=M.effective(M.seed(),'dv',pair('waffo',''));assert.ok(r.error.includes('请选择收款账户'));assert.equal(r.source,'link');assert.equal(r.account,undefined);});
test('其他 PSP 的账户不能混配',()=>{const r=M.effective(M.seed(),'dv',pair('waffo','subotiz-main'));assert.ok(r.error.includes('不属于'));});
test('同 PSP 新账户可保存且不会复制映射',()=>{const d=M.seed(),a={...M.copy(d.accounts[0]),id:'waffo-new',name:'第三账户',code:'WAFFO-DEMO-003',supports:[]},out=M.checkAccount(d,a);assert.deepEqual(out.issues,[]);assert.equal(out.next.accounts.filter(a=>a.channelId==='waffo').length,3);assert.ok(M.compatible(out.next,'dv','waffo',a.id,'dv-standard').some(x=>x.includes('尚未关联所选收款账户')));assert.equal(d.accounts.length,4);});
test('同 PSP 同环境重复商户号被拒绝',()=>{const d=M.seed(),a={...d.accounts[0],id:'duplicate'};assert.ok(M.checkAccount(d,a).issues.some(x=>x.includes('已存在此商户号')));});
test('不同 PSP 可使用相同示例商户号',()=>{const d=M.seed(),a={...d.accounts[0],id:'subotiz-other',channelId:'subotiz'};assert.deepEqual(M.checkAccount(d,a).issues,[]);});
test('已有账户身份不能被改写',()=>{const d=M.seed(),a={...d.accounts[0],code:'CHANGED'};assert.ok(M.checkAccount(d,a).issues.some(x=>x.includes('不能修改')));});
test('同 PSP 内切换全局账户仅影响继承配置',()=>{const out=M.checkGlobal(M.seed(),pair('waffo','waffo-second'));assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'dv').account.id,'waffo-second');assert.equal(M.effective(out.next,'lumi').account.id,'subotiz-main');assert.equal(M.effective(out.next,'dv',pair('subotiz','subotiz-main')).account.id,'subotiz-main');});
test('未授权站点不能选用第二账户',()=>{const r=M.effective(M.seed(),'lumi',pair('waffo','waffo-second'));assert.ok(r.error.includes('未授权'));assert.equal(r.account.id,'waffo-second');});
test('一次性账户不能承接包含 VIP 的全局配置',()=>{const out=M.checkGlobal(M.seed(),pair('latipay','latipay-main'));assert.ok(out.issues.some(x=>x.includes('VIP')));});
test('未选择账户不能生成推广链接',()=>assert.ok(M.checkLink(M.seed(),form('specific','waffo','')).issues.some(x=>x.includes('收款账户'))));
test('默认主账户不能直接停用',()=>{const d=M.seed(),a={...d.accounts[0],enabled:false};assert.ok(M.checkAccount(d,a).issues.some(x=>x.includes('全局默认')));});
test('显式链接使用的第二账户不能直接停用',()=>{const d=M.seed(),a={...d.accounts[1],enabled:false};assert.ok(M.checkAccount(d,a).issues.some(x=>x.includes('在用链接')));});
test('在用 PSP 整体停用会检查其账户引用',()=>{const d=M.seed(),c={...d.channels[0],enabled:false},out=M.checkChannel(d,c);assert.ok(out.issues.some(x=>x.includes('全局默认')));assert.ok(out.issues.some(x=>x.includes('在用链接')));});
test('无引用账户可停用且不影响同 PSP 其他账户',()=>{const d=M.seed();d.links.find(l=>l.id==='demo-1005').enabled=false;const out=M.checkAccount(d,{...d.accounts[1],enabled:false});assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'dv').account.id,'waffo-main');const r=M.effective(out.next,'dv',pair('waffo','waffo-second'));assert.ok(r.error.includes('已停用'));assert.equal(r.account.id,'waffo-second');});
test('停用站点覆盖后整组恢复全局',()=>{const d=M.seed(),out=M.checkRule(d,{...d.rules[0],enabled:false});assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'lumi').account.id,'waffo-main');});
test('同站点的重复启用配置被拒绝',()=>{const d=M.seed();assert.ok(M.checkRule(d,rule(d,{siteIds:['lumi'],accountId:'waffo-main'})).issues.some(x=>x.includes('QuikDrama')));});
test('一条配置可以覆盖多个站点',()=>{const d=M.seed(),out=M.checkRule(d,rule(d,{siteIds:['dv','mini']}));assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'mini').account.id,'waffo-second');});
test('账户映射变更会检查在用链接',()=>{const d=M.seed(),a={...d.accounts[1],supports:['mini-500']};assert.ok(M.checkAccount(d,a).issues.some(x=>x.includes('Waffo 第二账户')));});
test('所选映射必须符合账户能力',()=>{const d=M.seed(),a={...d.accounts[3],supports:['dv-vip']};assert.ok(M.checkAccount(d,a).issues.some(x=>x.includes('账户商品关联')));});
test('测试账户不能用于正式配置',()=>{const d=M.seed();d.accounts.push({...d.accounts[1],id:'waffo-test',environment:'test'});assert.ok(M.checkGlobal(d,pair('waffo','waffo-test')).issues.some(x=>x.includes('测试环境')));});
test('PSP 不重复创建，新增账户复用服务商',()=>{const d=M.seed(),c={...d.channels[0],id:'waffo-copy'};assert.ok(M.checkChannel(d,c).issues.some(x=>x.includes('新增账户')));});
test('历史订单在同 PSP 账户切换后仍固定原账户',()=>{const d=M.seed(),first=M.snapshot(d,form(),'dv-500','2026-11-03 11:00').order,out=M.checkGlobal(d,pair('waffo','waffo-second')),second=M.snapshot(out.next,form(),'dv-500','2026-11-03 11:05').order;assert.equal(first.provider,second.provider);assert.equal(first.accountId,'waffo-main');assert.equal(first.accountCode,'WAFFO-DEMO-001');assert.equal(second.accountId,'waffo-second');});
test('账户重命名不会改写历史订单快照',()=>{const d=M.seed(),first=M.snapshot(d,form(),'dv-500','2026-11-03').order,out=M.checkAccount(d,{...d.accounts[0],name:'新名称'});assert.deepEqual(out.issues,[]);assert.equal(first.account,'Waffo 主收款账户');assert.equal(M.snapshot(out.next,form(),'dv-500','2026-11-03').order.account,'新名称');});

test('用户提供的六个域名分别对应六个独立站点',()=>{const sites=M.seed().sites;assert.equal(sites.length,6);assert.equal(new Set(sites.map(s=>s.id)).size,6);assert.deepEqual(sites.map(s=>s.domain),['tide-watch.com','quikdrama.com','plotnests.com','prutora.com','dramazas.com','dramuzi.com']);});
test('六站分别拥有自己的面板和商品',()=>{const d=M.seed();d.sites.forEach(s=>{const t=M.get(d.templates,s.template);assert.equal(t.site,s.id);assert.ok(t.skus.length>0);t.skus.forEach(id=>assert.equal(M.get(d.skus,id).site,s.id));});assert.ok(M.compatible(d,'prutora','waffo','waffo-main','dramuzi-standard').includes('付费面板不属于本站'));});

test('同一账户在不同站点可启用不同支付方式',()=>{const d=M.seed();assert.deepEqual(M.methodsFor(d,'dv','waffo-main'),['银行卡','Google Pay']);assert.deepEqual(M.methodsFor(d,'mini','waffo-main'),['银行卡']);});
test('本站支付方式变更不会修改其他站点或账户能力',()=>{const d=M.seed(),out=M.checkSiteMethods(d,'lumi','subotiz-main',['银行卡']);assert.deepEqual(out.issues,[]);assert.deepEqual(M.methodsFor(out.next,'lumi','subotiz-main'),['银行卡']);assert.deepEqual(M.methodsFor(out.next,'dv','subotiz-main'),['银行卡','Apple Pay']);assert.deepEqual(out.next.accounts[2].methods,['银行卡','Apple Pay']);assert.deepEqual(M.methodsFor(d,'lumi','subotiz-main'),['银行卡','Apple Pay']);});
test('不能为账户未授权的站点配置支付方式',()=>{const out=M.checkSiteMethods(M.seed(),'lumi','waffo-second',['银行卡']);assert.ok(out.issues.some(x=>x.includes('未关联本站')));});
test('不能启用账户能力外的支付方式',()=>{const out=M.checkSiteMethods(M.seed(),'dv','waffo-main',['Apple Pay']);assert.ok(out.issues.some(x=>x.includes('能力以外')));});
test('默认账户不能清空本站支付方式',()=>{const out=M.checkSiteMethods(M.seed(),'dv','waffo-main',[]);assert.ok(out.issues.some(x=>x.includes('未启用支付方式')));});
test('本站覆盖只改变当前站点而不改全局',()=>{const d=M.seed(),out=M.checkSiteDefault(d,'dv',pair('waffo','waffo-second'),'2026-11-03');assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'dv').account.id,'waffo-second');assert.equal(M.effective(out.next,'mini').account.id,'waffo-main');assert.deepEqual(out.next.globalDefault,d.globalDefault);});
test('在共享站点配置中单独修改本站保留其他站点',()=>{const d=M.seed(),shared=M.checkRule(d,{id:'shared',name:'共享',siteIds:['dv','mini'],channelId:'subotiz',accountId:'subotiz-main',enabled:true});assert.deepEqual(shared.issues,[]);const out=M.checkSiteDefault(shared.next,'dv',pair('waffo','waffo-second'));assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'dv').account.id,'waffo-second');assert.equal(M.effective(out.next,'mini').account.id,'subotiz-main');assert.deepEqual(out.next.rules.find(r=>r.id==='shared').siteIds,['mini']);});
test('本站恢复继承不会停用共享配置的其他站点',()=>{const d=M.seed(),shared=M.checkRule(d,{id:'shared',name:'共享',siteIds:['dv','mini'],channelId:'subotiz',accountId:'subotiz-main',enabled:true});const out=M.checkSiteDefault(shared.next,'dv',null);assert.deepEqual(out.issues,[]);assert.equal(M.effective(out.next,'dv').source,'global');assert.equal(M.effective(out.next,'mini').source,'site');});
test('商品关联 PSP 必须覆盖在用面板和链接',()=>{const out=M.checkSkuPSPs(M.seed(),'dv-vip',['waffo']);assert.ok(out.issues.some(x=>x.includes('未关联 Subotiz')));});
test('商品支持 PSP 可以多选且不修改其他站点商品',()=>{const d=M.seed(),before=M.copy(d.skuPSPs),out=M.checkSkuPSPs(d,'mini-500',['waffo','subotiz']);assert.deepEqual(out.issues,[]);assert.deepEqual(out.next.skuPSPs['mini-500'],['waffo','subotiz']);Object.keys(before).filter(id=>id!=='mini-500').forEach(id=>assert.deepEqual(out.next.skuPSPs[id],before[id]));});
test('下单只能使用本站实际启用的支付方式',()=>{const d=M.seed(),f={...form(),site:'mini',template:'mini-coins'};assert.ok(M.snapshot(d,f,'mini-500','2026-11-03','Google Pay').issues.some(x=>x.includes('不可用')));});
test('历史订单固定站点和支付方式',()=>{const d=M.seed(),first=M.snapshot(d,form(),'dv-500','2026-11-03','Google Pay').order,out=M.checkSiteMethods(d,'dv','waffo-main',['银行卡']);assert.deepEqual(out.issues,[]);assert.equal(first.siteId,'dv');assert.equal(first.paymentMethod,'Google Pay');assert.equal(M.snapshot(out.next,form(),'dv-500','2026-11-03').order.paymentMethod,'银行卡');});
test('SKU 支付配置同时维护 PSP 与账户且不改其他商品',()=>{
  const d=M.seed(),out=M.checkSkuPayment(d,'mini-500',['waffo','subotiz'],['waffo-main','waffo-second','subotiz-main'],'2026-11-04');
  assert.deepEqual(out.issues,[]);
  assert.deepEqual(out.next.skuPSPs['mini-500'],['waffo','subotiz']);
  assert.ok(!M.get(out.next.accounts,'latipay-main').supports.includes('mini-500'));
  d.skus.filter(s=>s.id!=='mini-500').forEach(s=>{
    assert.deepEqual(out.next.skuPSPs[s.id],d.skuPSPs[s.id]);
    d.accounts.forEach(a=>assert.equal(M.get(out.next.accounts,a.id).supports.includes(s.id),a.supports.includes(s.id)));
  });
  d.accounts.forEach(a=>['types','currencies','methods','siteIds'].forEach(k=>assert.deepEqual(M.get(out.next.accounts,a.id)[k],a[k])));
  assert.ok(M.get(d.accounts,'latipay-main').supports.includes('mini-500'));
});
test('SKU 页面可为已授权新账户关联商品',()=>{
  const d=M.seed();d.accounts.push({...M.copy(d.accounts[0]),id:'waffo-new',name:'新增账户',code:'WAFFO-DEMO-009',supports:[]});
  const out=M.checkSkuPayment(d,'dv-500',d.skuPSPs['dv-500'],['waffo-main','waffo-second','subotiz-main','latipay-main','waffo-new']);
  assert.deepEqual(out.issues,[]);assert.ok(M.get(out.next.accounts,'waffo-new').supports.includes('dv-500'));
  assert.deepEqual(M.get(d.accounts,'waffo-new').supports,[]);
});
test('SKU 支付配置不能使用未授权给本站的账户',()=>{
  const d=M.seed(),out=M.checkSkuPayment(d,'lumi-600',['waffo','subotiz'],['waffo-main','waffo-second','subotiz-main']);
  assert.ok(out.issues.some(x=>x.includes('未授权给 QuikDrama')));
});
test('SKU 自动续费能力沿用账户且不能通过关联开通',()=>{
  const d=M.seed(),before=M.copy(d.accounts[3].types),out=M.checkSkuPayment(d,'dv-vip',['waffo','subotiz','latipay'],['waffo-main','waffo-second','subotiz-main','latipay-main']);
  assert.ok(out.issues.some(x=>x.includes('未开通自动续费')));assert.deepEqual(d.accounts[3].types,before);
});
test('SKU 移除在用账户关联被拦截且原始配置未变',()=>{
  const d=M.seed(),out=M.checkSkuPayment(d,'dv-500',d.skuPSPs['dv-500'],['waffo-main','subotiz-main','latipay-main']);
  assert.ok(out.issues.some(x=>x.includes('Waffo 第二账户')));assert.ok(d.accounts[1].supports.includes('dv-500'));
});
test('每个已选 PSP 需要明确关联收款账户',()=>{
  const out=M.checkSkuPayment(M.seed(),'mini-500',['waffo','subotiz'],['waffo-main']);
  assert.ok(out.issues.some(x=>x.includes('Subotiz 尚未关联收款账户')));
});
console.log(`通过 ${checks} 项业务规则检查`);
