(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const get = (items, id) => items.find(item => item.id === id);
  const providers = ['Waffo', 'Subotiz', 'Latipay', 'Antom'];
  function seed() {
    const sites = [
      {id:'dv', name:'TideWatch', domain:'tide-watch.com', template:'dv-standard', drama:'The Hidden Heiress'},
      {id:'lumi', name:'QuikDrama', domain:'quikdrama.com', template:'lumi-standard', drama:'Love Beyond the Contract'},
      {id:'mini', name:'PlotNests', domain:'plotnests.com', template:'mini-coins', drama:'A Second Chance'},
      {id:'prutora', name:'Prutora', domain:'prutora.com', template:'prutora-standard', drama:'The Last Promise'},
      {id:'dramazas', name:'Dramazas', domain:'dramazas.com', template:'dramazas-standard', drama:'A Love Rewritten'},
      {id:'dramuzi', name:'Dramuzi', domain:'dramuzi.com', template:'dramuzi-standard', drama:'Beyond the Spotlight'}
    ];
    const skus = [
      {id:'dv-500', site:'dv', name:'500 金币', code:'TW-COIN-500', price:4.99, currency:'USD', type:'once', rights:'500 金币'},
      {id:'dv-1200', site:'dv', name:'1,200 金币', code:'TW-COIN-1200', price:9.99, currency:'USD', type:'once', rights:'1,200 金币'},
      {id:'dv-vip', site:'dv', name:'VIP 月度订阅', code:'TW-VIP-MONTH', price:19.99, currency:'USD', type:'subscription', rights:'本站 VIP，按月自动续费'},
      {id:'lumi-600', site:'lumi', name:'600 金币', code:'QD-COIN-600', price:5.99, currency:'USD', type:'once', rights:'600 金币'},
      {id:'lumi-vip', site:'lumi', name:'VIP 月度订阅', code:'QD-VIP-MONTH', price:17.99, currency:'USD', type:'subscription', rights:'本站 VIP，按月自动续费'},
      {id:'mini-500', site:'mini', name:'500 金币', code:'PN-COIN-500', price:4.99, currency:'USD', type:'once', rights:'500 金币'}
    ];
    const templates = [
      {id:'dv-standard',site:'dv',name:'标准付费面板',skus:['dv-500','dv-vip'],version:'V3'},
      {id:'dv-coins',site:'dv',name:'金币专属面板',skus:['dv-500','dv-1200'],version:'V2'},
      {id:'lumi-standard',site:'lumi',name:'QuikDrama 标准面板',skus:['lumi-600','lumi-vip'],version:'V1'},
      {id:'mini-coins',site:'mini',name:'PlotNests 金币面板',skus:['mini-500'],version:'V1'}
    ];
    sites.filter(s=>['prutora','dramazas','dramuzi'].includes(s.id)).forEach(s=>{
      skus.push(
        {id:s.id+'-500',site:s.id,name:'500 金币',code:s.id.toUpperCase()+'-COIN-500',price:4.99,currency:'USD',type:'once',rights:'500 金币'},
        {id:s.id+'-vip',site:s.id,name:'VIP 月度订阅',code:s.id.toUpperCase()+'-VIP-MONTH',price:19.99,currency:'USD',type:'subscription',rights:'本站 VIP，按月自动续费'}
      );
      templates.push({id:s.template,site:s.id,name:s.name+' 标准面板',skus:[s.id+'-500',s.id+'-vip'],version:'V1'});
    });
    const channels = [
      {id:'waffo',provider:'Waffo',name:'Waffo',enabled:true,revision:1},
      {id:'subotiz',provider:'Subotiz',name:'Subotiz',enabled:true,revision:1},
      {id:'latipay',provider:'Latipay',name:'Latipay',enabled:true,revision:1}
    ];
    const account = (id,channelId,name,code,siteIds,types,methods) => ({id,channelId,name,code,siteIds,types,methods,currencies:['USD'],regions:['美国'],environment:'live',enabled:true,revision:1,supports:skus.filter(s=>siteIds.includes(s.site)&&types.includes(s.type)).map(s=>s.id),updated:'2026-11-03 10:00'});
    const accounts = [
      account('waffo-main','waffo','Waffo 主收款账户','WAFFO-DEMO-001',sites.map(s=>s.id),['once','subscription'],['银行卡','Google Pay']),
      account('waffo-second','waffo','Waffo 第二收款账户','WAFFO-DEMO-002',sites.filter(s=>s.id!=='lumi').map(s=>s.id),['once','subscription'],['银行卡','Apple Pay']),
      account('subotiz-main','subotiz','Subotiz 主收款账户','SUBOTIZ-DEMO-001',sites.map(s=>s.id),['once','subscription'],['银行卡','Apple Pay']),
      account('latipay-main','latipay','Latipay 主收款账户','LATIPAY-DEMO-001',['dv','mini'],['once'],['银行卡'])
    ];
    accounts.forEach(a=>{a.siteMethods=Object.fromEntries(a.siteIds.map(id=>[id,[...a.methods]]));});
    accounts[0].siteMethods.mini=['银行卡'];
    accounts[1].siteMethods.dv=['银行卡'];
    accounts[2].siteMethods.prutora=['银行卡'];
    const skuPSPs=Object.fromEntries(skus.map(s=>[s.id,channels.filter(c=>accounts.some(a=>a.channelId===c.id&&a.supports.includes(s.id))).map(c=>c.id)]));
    const rules = [
      {id:'cover-lumi',name:'QuikDrama 收款配置',siteIds:['lumi'],channelId:'subotiz',accountId:'subotiz-main',enabled:true,updated:'2026-11-03 10:10'},
      {id:'cover-mini',name:'PlotNests 停用配置',siteIds:['mini'],channelId:'latipay',accountId:'latipay-main',enabled:false,updated:'2026-11-03 10:15'}
    ];
    const links = [
      {id:'demo-1001',name:'TideWatch · 跟随默认',site:'dv',template:'dv-standard',mode:'default',channelId:'',accountId:'',enabled:true,created:'2026-11-03 10:20'},
      {id:'demo-1002',name:'QuikDrama · 跟随默认',site:'lumi',template:'lumi-standard',mode:'default',channelId:'',accountId:'',enabled:true,created:'2026-11-03 10:25'},
      {id:'demo-1003',name:'TideWatch · 指定 Subotiz',site:'dv',template:'dv-standard',mode:'specific',channelId:'subotiz',accountId:'subotiz-main',enabled:true,created:'2026-11-03 10:30'},
      {id:'demo-1004',name:'TideWatch · 金币专属',site:'dv',template:'dv-coins',mode:'specific',channelId:'latipay',accountId:'latipay-main',enabled:true,created:'2026-11-03 10:35'},
      {id:'demo-1005',name:'TideWatch · Waffo 第二账户',site:'dv',template:'dv-standard',mode:'specific',channelId:'waffo',accountId:'waffo-second',enabled:true,created:'2026-11-03 10:40'}
    ];
    sites.filter(s=>['prutora','dramazas','dramuzi'].includes(s.id)).forEach((s,i)=>{
      links.push({id:'demo-'+(1006+i),name:s.name+' · 跟随默认',site:s.id,template:s.template,mode:'default',channelId:'',accountId:'',enabled:true,created:'2026-11-03 10:45'});
    });
    return {version:6,sites,skus,skuPSPs,templates,channels,accounts,rules,links,orders:[],globalDefault:{channelId:'waffo',accountId:'waffo-main'},globalRevision:1,nextLink:1009,nextOrder:1};
  }
  const linkChoice = link => link.mode==='specific'?{channelId:link.channelId,accountId:link.accountId}:null;
  function pairIssues(data, choice, siteIds=[]) {
    if(!choice?.channelId) return ['请选择 PSP'];
    const channel=get(data.channels,choice.channelId);
    if(!channel) return ['所选 PSP 不存在'];
    if(!choice.accountId) return ['请选择收款账户'];
    const account=get(data.accounts,choice.accountId);
    if(!account) return ['所选收款账户不存在'];
    if(account.channelId!==channel.id) return ['收款账户不属于所选 PSP，请重新选择账户'];
    const issues=[];
    if(!channel.enabled) issues.push(channel.provider+' 服务商已停用');
    if(!account.enabled) issues.push(account.name+' 已停用');
    if(account.environment!=='live') issues.push('正式配置不能使用测试环境账户');
    siteIds.forEach(id=>{
      if(!account.siteIds.includes(id)) issues.push(account.name+' 未授权给 '+(get(data.sites,id)?.name||'该站点')+' 使用');
      else if(!methodsFor(data,id,account.id).length) issues.push(account.name+' 在 '+(get(data.sites,id)?.name||'本站')+' 未启用支付方式');
    });
    return issues;
  }
  function effective(data, siteId, specified=null) {
    const site=get(data.sites,siteId);
    if(!site) return {error:'请选择有效站点'};
    let source='global', rule=null, choice=specified;
    if(specified!==null) source='link';
    else {
      const matched=data.rules.filter(r=>r.enabled&&r.siteIds.includes(siteId));
      if(matched.length>1) return {error:'本站存在多条启用的覆盖配置，请先处理冲突'};
      rule=matched[0]||null;source=rule?'site':'global';choice=rule||data.globalDefault;
    }
    const result={site,channel:get(data.channels,choice?.channelId),account:get(data.accounts,choice?.accountId),source,rule};
    const issues=pairIssues(data,choice,[siteId]);
    if(issues.length) return {...result,error:issues.join('；')+'。请调整配置，系统不会自动切换账户。'};
    return result;
  }
  function compatible(data, siteId, channelId, accountId, templateId) {
    const account=get(data.accounts,accountId), template=get(data.templates,templateId);
    const issues=pairIssues(data,{channelId,accountId},[siteId]);
    if(!template||template.site!==siteId) issues.push('付费面板不属于本站');
    if(issues.length) return issues;
    if(!account.methods.length) issues.push('账户未配置可用支付方式');
    template.skus.forEach(id=>{
      const sku=get(data.skus,id);
      if(!sku||sku.site!==siteId) {issues.push('面板引用了无效商品');return;}
      if(!(data.skuPSPs[sku.id]||[]).includes(channelId)) issues.push(sku.name+'：未关联 '+get(data.channels,channelId).provider+' PSP');
      if(!account.currencies.includes(sku.currency)) issues.push(sku.name+'：账户不支持 '+sku.currency);
      if(!account.types.includes(sku.type)) issues.push(sku.name+'：账户不支持'+(sku.type==='subscription'?'自动续费':'一次性购买'));
      if(!account.supports.includes(id)) issues.push(sku.name+'：尚未关联所选收款账户，请到商品 SKU 管理中配置');
    });
    return [...new Set(issues)];
  }
  function routingIssues(data) {
    const issues=pairIssues(data,data.globalDefault).map(x=>'全局默认：'+x);
    data.sites.forEach(site=>{
      const r=effective(data,site.id);
      if(r.error) issues.push(site.name+'：'+r.error);
      else compatible(data,site.id,r.channel.id,r.account.id,site.template).forEach(msg=>issues.push(site.name+' · 默认面板：'+msg));
    });
    data.links.filter(l=>l.enabled).forEach(link=>{
      const r=effective(data,link.site,linkChoice(link));
      if(r.error) issues.push('链接「'+link.name+'」：'+r.error);
      else compatible(data,link.site,r.channel.id,r.account.id,link.template).forEach(msg=>issues.push('链接「'+link.name+'」：'+msg));
    });
    data.rules.filter(r=>r.enabled).forEach(r=>issues.push(...pairIssues(data,r,r.siteIds).map(x=>'站点配置「'+r.name+'」：'+x)));
    return [...new Set(issues)];
  }
  function checkGlobal(data, choice) {
    const next=copy(data); next.globalDefault=copy(choice); next.globalRevision++;
    return {next,issues:routingIssues(next)};
  }
  function checkRule(data, rule) {
    const issues=[];
    if(!rule.name.trim()) issues.push('请填写配置名称');
    if(!rule.siteIds.length) issues.push('请至少选择一个适用站点');
    if(rule.siteIds.some(id=>!get(data.sites,id))) issues.push('包含无效站点');
    const c=get(data.channels,rule.channelId),a=get(data.accounts,rule.accountId);
    if(!c) issues.push('请选择 PSP');
    if(!a) issues.push('请选择收款账户');
    else if(a.channelId!==rule.channelId) issues.push('收款账户不属于所选 PSP');
    if(rule.enabled) rule.siteIds.forEach(id=>{
      const conflict=data.rules.find(r=>r.id!==rule.id&&r.enabled&&r.siteIds.includes(id));
      if(conflict) issues.push(get(data.sites,id)?.name+' 已在启用配置「'+conflict.name+'」中，请先调整该配置');
    });
    const next=copy(data), index=next.rules.findIndex(r=>r.id===rule.id);
    if(index>=0) next.rules[index]=copy(rule); else next.rules.push(copy(rule));
    if(!issues.length) issues.push(...routingIssues(next));
    return {next,issues:[...new Set(issues)]};
  }
  function dependencies(data, channelId, accountId='') {
    const match = item => item.channelId===channelId&&(!accountId||item.accountId===accountId);
    return {global:match(data.globalDefault),rules:data.rules.filter(r=>r.enabled&&match(r)),links:data.links.filter(l=>l.enabled&&l.mode==='specific'&&match(l))};
  }
  function referenceIssues(deps, label) {
    const issues=[];
    if(deps.global) issues.push(label+'是全局默认，请先更换全局默认 PSP 与账户');
    if(deps.rules.length) issues.push(label+'仍被 '+deps.rules.length+' 条启用的站点配置使用');
    if(deps.links.length) issues.push(label+'仍被 '+deps.links.length+' 条指定收款账户的在用链接使用');
    return issues;
  }
  function checkChannel(data, channel) {
    const issues=[], old=get(data.channels,channel.id);
    if(!channel.name.trim()) issues.push('请填写服务商名称');
    if(!providers.includes(channel.provider)) issues.push('请选择已支持的 PSP');
    if(old&&old.provider!==channel.provider) issues.push('已有服务商不能更换 PSP 类型');
    if(data.channels.some(c=>c.id!==channel.id&&c.provider===channel.provider)) issues.push(channel.provider+' 已存在，请在该服务商下新增账户');
    if(!channel.enabled) issues.push(...referenceIssues(dependencies(data,channel.id),'该服务商'));
    const next=copy(data), index=next.channels.findIndex(c=>c.id===channel.id);
    if(index>=0) next.channels[index]=copy(channel); else next.channels.push(copy(channel));
    if(!issues.length) issues.push(...routingIssues(next));
    return {next,issues:[...new Set(issues)]};
  }
  function checkAccount(data, account) {
    const issues=[], old=get(data.accounts,account.id),channel=get(data.channels,account.channelId);
    if(!account.name.trim()) issues.push('请填写账户名称');
    if(!account.code.trim()) issues.push('请填写示例商户号');
    if(!channel) issues.push('请选择所属 PSP');
    if(old&&(old.channelId!==account.channelId||old.code!==account.code||old.environment!==account.environment)) issues.push('已有账户的 PSP、商户号和环境不能修改，请新增账户');
    if(data.accounts.some(a=>a.id!==account.id&&a.channelId===account.channelId&&a.environment===account.environment&&a.code.toLowerCase()===account.code.toLowerCase())) issues.push('同一 PSP、同一环境下已存在此商户号');
    if(!['live','test'].includes(account.environment)) issues.push('请选择账户环境');
    if(!account.siteIds.length||account.siteIds.some(id=>!get(data.sites,id))) issues.push('请关联有效站点');
    if(!account.currencies.includes('USD')) issues.push('当前仅使用美元交易，请核对账户的美元收款能力');
    if(!account.methods.length) issues.push('请至少选择一种支付方式');
    if(!account.types.length) issues.push('账户交易能力尚未就绪，请核对已有账户配置');
    if(account.siteMethods&&Object.entries(account.siteMethods).some(([id,methods])=>!account.siteIds.includes(id)||!Array.isArray(methods)||methods.some(m=>!account.methods.includes(m)))) issues.push('本站支付方式不能超出账户能力和关联站点');
    account.supports.forEach(id=>{
      const sku=get(data.skus,id);
      if(!sku||!account.siteIds.includes(sku.site)||!account.types.includes(sku.type)||!account.currencies.includes(sku.currency)) issues.push((sku?.name||'所选商品')+'：账户商品关联与站点或交易能力不匹配');
    });
    if(!account.enabled) issues.push(...referenceIssues(dependencies(data,account.channelId,account.id),'该账户'));
    const next=copy(data), index=next.accounts.findIndex(a=>a.id===account.id);
    if(index>=0) next.accounts[index]=copy(account); else next.accounts.push(copy(account));
    if(!issues.length) issues.push(...routingIssues(next));
    return {next,issues:[...new Set(issues)]};
  }
  function checkLink(data, form) {
    const issues=[], site=get(data.sites,form.site),template=get(data.templates,form.template);
    if(!form.name?.trim()) issues.push('请填写链接名称');
    if(!site) issues.push('请选择站点');
    if(!template||template.site!==form.site) issues.push('请选择本站付费面板');
    if(!['default','specific'].includes(form.mode)) issues.push('请选择支付模式');
    if(form.mode==='specific'&&!form.channelId) issues.push('请选择指定 PSP');
    if(form.mode==='specific'&&!form.accountId) issues.push('请选择指定收款账户');
    if(!Number.isInteger(Number(form.episode))||Number(form.episode)<1||Number(form.episode)>60) issues.push('起播集应为 1–60 的整数');
    const resolved=effective(data,form.site,linkChoice(form));
    if(resolved.error) issues.push(resolved.error);
    else if(template) issues.push(...compatible(data,form.site,resolved.channel.id,resolved.account.id,form.template));
    return {issues:[...new Set(issues)],resolved};
  }
  function snapshot(data, form, skuId, when, method) {
    const result=checkLink(data,form),sku=get(data.skus,skuId),template=get(data.templates,form.template);
    if(result.issues.length) return {issues:result.issues};
    if(!sku||!template.skus.includes(skuId)) return {issues:['请选择当前付费面板中的商品']};
    const r=result.resolved,methods=methodsFor(data,form.site,r.account.id),paymentMethod=method||methods[0];
    if(!methods.includes(paymentMethod)) return {issues:['所选支付方式在本站当前账户下不可用，请重新选择']};
    return {order:{id:'DEMO-ORDER-'+data.nextOrder,site:r.site.name,siteId:r.site.id,paymentMethod,sku:sku.name,amount:sku.price,currency:sku.currency,rights:sku.rights,provider:r.channel.provider,channelId:r.channel.id,account:r.account.name,accountId:r.account.id,accountCode:r.account.code,source:r.source,rule:r.rule?.name||'',created:when,channelRevision:r.channel.revision,accountRevision:r.account.revision,globalRevision:data.globalRevision}};
  }
  function methodsFor(data,siteId,accountId) {
    const a=get(data.accounts,accountId);
    if(!a||!a.siteIds.includes(siteId)) return [];
    const configured=a.siteMethods&&Object.hasOwn(a.siteMethods,siteId)?a.siteMethods[siteId]:a.methods;
    return [...new Set(configured.filter(m=>a.methods.includes(m)))];
  }
  function checkSiteMethods(data,siteId,accountId,methods) {
    const a=get(data.accounts,accountId),issues=[];
    if(!get(data.sites,siteId)) issues.push('请选择有效站点');
    if(!a||!a.siteIds.includes(siteId)) issues.push('该账户未关联本站，请到全局管理中维护账户关联');
    if(!Array.isArray(methods)||methods.some(m=>!a?.methods.includes(m))) issues.push('不能启用账户能力以外的支付方式');
    const next=copy(data);
    if(!issues.length){const target=get(next.accounts,accountId);target.siteMethods={...target.siteMethods,[siteId]:[...new Set(methods)]};target.revision++;issues.push(...routingIssues(next));}
    return {next,issues:[...new Set(issues)]};
  }
  function checkSiteDefault(data,siteId,choice,when='') {
    if(!get(data.sites,siteId)) return {next:copy(data),issues:['请选择有效站点']};
    const next=copy(data),matched=next.rules.filter(r=>r.enabled&&r.siteIds.includes(siteId));
    if(matched.length>1) return {next,issues:['本站存在重复启用配置，请到全局管理中处理']};
    matched.forEach(r=>{if(r.siteIds.length>1)r.siteIds=r.siteIds.filter(id=>id!==siteId);else r.enabled=false;r.updated=when;});
    if(choice){
      const name=get(data.sites,siteId).name+' 独立收款配置',id='site-'+siteId;
      const r={id,name,siteIds:[siteId],channelId:choice.channelId,accountId:choice.accountId,enabled:true,updated:when};
      const index=next.rules.findIndex(x=>x.id===id);if(index>=0)next.rules[index]=r;else next.rules.push(r);
    }
    return {next,issues:routingIssues(next)};
  }
  function checkSkuPSPs(data,skuId,channelIds) {
    const sku=get(data.skus,skuId),issues=[];
    if(!sku) issues.push('商品不存在');
    if(!Array.isArray(channelIds)||!channelIds.length||channelIds.some(id=>!get(data.channels,id))) issues.push('请至少选择一个有效 PSP');
    const next=copy(data);
    if(!issues.length){next.skuPSPs[skuId]=[...new Set(channelIds)];issues.push(...routingIssues(next));}
    return {next,issues:[...new Set(issues)]};
  }
  function checkSkuPayment(data,skuId,channelIds,accountIds,when='') {
    const sku=get(data.skus,skuId),issues=[],next=copy(data);
    const channels=Array.isArray(channelIds)?[...new Set(channelIds)]:[],accounts=Array.isArray(accountIds)?[...new Set(accountIds)]:[];
    if(!sku)issues.push('商品不存在');
    if(!channels.length||channels.some(id=>!get(data.channels,id)))issues.push('请至少选择一个有效 PSP');
    if(!accounts.length)issues.push('请至少关联一个收款账户');
    if(sku){
      if(sku.currency!=='USD')issues.push('当前商品统一使用美元（USD）');
      accounts.forEach(id=>{
        const a=get(data.accounts,id);
        if(!a){issues.push('所选收款账户不存在');return;}
        if(!channels.includes(a.channelId))issues.push(a.name+' 所属 PSP 未被选择');
        issues.push(...pairIssues(data,{channelId:a.channelId,accountId:id},[sku.site]));
        if(!a.currencies.includes('USD'))issues.push(a.name+' 未开通美元交易');
        if(!a.types.includes(sku.type))issues.push(a.name+' 未开通'+(sku.type==='subscription'?'自动续费':'一次性支付'));
      });
      channels.forEach(id=>{if(!accounts.some(aid=>get(data.accounts,aid)?.channelId===id))issues.push((get(data.channels,id)?.provider||'该 PSP')+' 尚未关联收款账户');});
    }
    if(!issues.length){
      next.skuPSPs[skuId]=channels;
      next.accounts.forEach(a=>{
        const had=a.supports.includes(skuId),selected=accounts.includes(a.id);
        if(had===selected)return;
        a.supports=selected?[...a.supports,skuId]:a.supports.filter(id=>id!==skuId);
        a.revision++;if(when)a.updated=when;
      });
      issues.push(...routingIssues(next));
    }
    return {next,issues:[...new Set(issues)]};
  }
  const api={seed,copy,get,providers,linkChoice,pairIssues,effective,compatible,routingIssues,checkGlobal,checkRule,dependencies,checkChannel,checkAccount,checkLink,snapshot,methodsFor,checkSiteMethods,checkSiteDefault,checkSkuPSPs,checkSkuPayment};
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.PSPModel=api;
})(typeof window==='object'?window:globalThis);
