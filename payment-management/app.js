(() => {
  'use strict';
  const M=window.PSPModel, P=window.PSPPageScopes, $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const opt=(v,t,s)=>`<option value="${esc(v)}"${v===s?' selected':''}>${esc(t)}</option>`;
  const tag=(text,type='info')=>`<span class="tag tag-${type}">${esc(text)}</span>`;
  const now=()=>new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai',hour12:false}).slice(0,16);
  const KEY='dramavideo-payment-sites-demo-v1';
  const sourceName={global:'全局默认',site:'站点覆盖',link:'链接指定'};
  const sourceTag=r=>tag(sourceName[r.source]||'待配置',r.source==='link'?'success':r.source==='site'?'primary':'info');
  const price=s=>`${s.currency} ${s.price.toFixed(2)}${s.type==='subscription'?' / 月':''}`;
  let data=load();
  const site=id=>M.get(data.sites,id), channel=id=>M.get(data.channels,id), account=id=>M.get(data.accounts,id), template=id=>M.get(data.templates,id);
  const scopes=loadPageScopes();
  const ui={page:'links',search:'',channelStatus:'all',accountProvider:'all',ruleDraft:null,channelDraft:null,accountDraft:null,linkForm:null,validated:null,pendingMutation:null};
  Object.defineProperty(ui,'site',{get:()=>scopes.get(ui.page),set:value=>scopes.set(ui.page,value)});
  let modalFocus,toastTimer;

  function loadPageScopes(){
    let saved=null,legacy=null;
    try{saved=JSON.parse(localStorage.getItem(KEY+'-scopes')||'null');legacy=localStorage.getItem(KEY+'-scope');}catch(_){}
    return P.create(data.sites.map(s=>s.id),saved,legacy);
  }
  function persistPageScopes(){try{localStorage.setItem(KEY+'-scopes',JSON.stringify(scopes.snapshot()));}catch(_){}}
  function isPaymentPage(){return P.group(ui.page)==='payment';}
  function requirePaymentManagement(){
    if(isPaymentPage())return true;
    modal('请进入支付管理','<p>共享支付资源在支付管理中维护。</p>','<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-page="payment">进入支付管理</button>');
    return false;
  }

  function load(){
    const base=M.seed();
    try {
      const raw=localStorage.getItem(KEY);
      if(!raw||raw.length>350000) return base;
      const d=JSON.parse(raw), idOK=x=>typeof x==='string'&&/^[a-z0-9_-]{1,50}$/.test(x);
      const textOK=(x,n=80)=>typeof x==='string'&&x.length<=n;
      const strings=a=>Array.isArray(a)&&a.every(x=>textOK(x,160));
      const unique=a=>new Set(a.map(x=>x.id)).size===a.length;
      if(d.version!==6||!['channels','accounts','rules','links','orders'].every(k=>Array.isArray(d[k]))) return base;
      if(d.channels.length>8||d.accounts.length>40||d.rules.length>30||d.links.length>50||d.orders.length>30) return base;
      if(!d.channels.every(c=>idOK(c.id)&&M.providers.includes(c.provider)&&textOK(c.name,60)&&typeof c.enabled==='boolean')||!unique(d.channels)||new Set(d.channels.map(c=>c.provider)).size!==d.channels.length) return base;
      if(!d.accounts.every(a=>idOK(a.id)&&d.channels.some(c=>c.id===a.channelId)&&textOK(a.name,60)&&textOK(a.code,60)&&typeof a.enabled==='boolean'&&strings(a.siteIds)&&a.siteIds.every(id=>base.sites.some(s=>s.id===id))&&['supports','types','methods','currencies','regions'].every(k=>strings(a[k]))&&['live','test'].includes(a.environment))||!unique(d.accounts)) return base;
      if(new Set(d.accounts.map(a=>a.channelId+'|'+a.environment+'|'+a.code.toLowerCase())).size!==d.accounts.length) return base;
      if(!d.skuPSPs||!base.skus.every(s=>strings(d.skuPSPs[s.id])&&d.skuPSPs[s.id].length&&d.skuPSPs[s.id].every(id=>d.channels.some(c=>c.id===id)))) return base;
      if(!d.accounts.every(a=>a.siteMethods&&typeof a.siteMethods==='object'&&Object.entries(a.siteMethods).every(([id,methods])=>a.siteIds.includes(id)&&strings(methods)&&methods.every(m=>a.methods.includes(m))))) return base;
      const pairOK=r=>d.accounts.some(a=>a.id===r.accountId&&a.channelId===r.channelId);
      if(!pairOK(d.globalDefault)) return base;
      if(!d.rules.every(r=>idOK(r.id)&&textOK(r.name,60)&&typeof r.enabled==='boolean'&&strings(r.siteIds)&&r.siteIds.every(id=>base.sites.some(s=>s.id===id))&&pairOK(r))||!unique(d.rules)) return base;
      if(!d.links.every(l=>idOK(l.id)&&textOK(l.name)&&typeof l.enabled==='boolean'&&base.sites.some(s=>s.id===l.site)&&base.templates.some(t=>t.id===l.template&&t.site===l.site)&&['default','specific'].includes(l.mode)&&(l.mode!=='specific'||pairOK(l)))||!unique(d.links)) return base;
      if(!d.orders.every(o=>textOK(o.id)&&textOK(o.provider)&&textOK(o.account)&&textOK(o.accountCode)&&idOK(o.accountId)&&base.sites.some(s=>s.id===o.siteId)&&textOK(o.paymentMethod)&&Number.isFinite(o.amount)&&textOK(o.site))) return base;
      Object.assign(base,{channels:d.channels,accounts:d.accounts,skuPSPs:d.skuPSPs,rules:d.rules,links:d.links,orders:d.orders,globalDefault:d.globalDefault,globalRevision:Number(d.globalRevision)||1,nextLink:Number(d.nextLink)||1009,nextOrder:Number(d.nextOrder)||1});
      return M.routingIssues(base).length?M.seed():base;
    }catch(_){return base;}
  }
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_){toast('本次操作已生效，当前浏览器无法保留记录。');}}
  function toast(message,error=false){clearTimeout(toastTimer);const el=$('#toast');el.textContent=message;el.className='toast show'+(error?' error':'');toastTimer=setTimeout(()=>el.className='toast',3100);}
  function closeModal(){const el=$('#modalRoot');el.innerHTML='';document.body.classList.remove('modal-open');if(modalFocus?.isConnected)modalFocus.focus({preventScroll:true});}
  function modal(title,body,footer='',wide=false){
    if(!$('#modalRoot').firstElementChild)modalFocus=document.activeElement;
    $('#modalRoot').innerHTML=`<div class="modal-backdrop" data-action="backdrop"><section class="modal${wide?' modal-wide':''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-header"><h2 id="modalTitle">${esc(title)}</h2><button type="button" class="close-btn" aria-label="关闭对话框" data-action="close">×</button></header><div class="modal-body">${body}</div><footer class="modal-footer">${footer||'<button class="btn" data-action="close">关闭</button>'}</footer></section></div>`;
    document.body.classList.add('modal-open');requestAnimationFrame(()=>$('#modalRoot button')?.focus());
  }
  function problems(items){return items.length?`<div class="alert alert-error" role="alert"><strong>请处理以下问题</strong><ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'<div class="alert alert-success">检查通过，可以保存配置。</div>';}
  function modalError(items){const el=$('#formErrors');if(el){el.innerHTML=problems(items);el.scrollIntoView({block:'nearest',behavior:'smooth'});}}
  function confirm(title,body,action,id=''){const label=action==='confirm-reset'?'确认复位':action==='confirm-delete-rule'?'确认删除':action.includes('disable')?'确认停用':action.includes('toggle')?'确认操作':'确认保存';modal(title,body,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="${action}" data-id="${esc(id)}">${label}</button>`);}
  function table(headers,rows){return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}"><div class="empty">暂无符合条件的记录</div></td></tr>`}</tbody></table></div>`;}
  function heading(title,desc,actions=''){
    const current=site(ui.site),payment=isPaymentPage(),linkContext=P.group(ui.page)==='links';
    const moduleName=payment?'支付管理':linkContext?'推广链接管理':ui.page==='products'?'商品 SKU 管理':'付费面板管理';
    const breadcrumb=`投放中心 <span>/</span> ${moduleName}${ui.page==='create'?' <span>/</span> 新建推广链接':''}`;
    const label='站点';
    const helper=ui.page==='create'?'切换站点后，付费面板和收款选择会重置，请重新校验。':payment?'选择站点查看生效配置和关联账户；共享账户变更会提示全部影响范围。':`筛选仅影响${moduleName}，其他模块的站点选择保持独立。`;
    return `<div class="breadcrumb">${breadcrumb}</div><div class="page-head"><div><h1>${esc(payment?'支付管理':title)}</h1><p class="subtext">${esc(desc)}</p></div><div class="actions">${actions}</div></div><div class="page-scope-bar"><div class="field page-site-field"><label for="pageSite">${label}</label><select id="pageSite">${siteOpts(ui.site,true,true)}</select></div><div class="page-scope-info"><strong>${current?esc(current.name+' · '+current.domain):'全部站点'}</strong><span>${esc(helper)}</span></div></div>`;
  }
  function siteOpts(value,all=false,withDomain=false){return (all?opt('all','全部站点',value):'')+data.sites.map(s=>opt(s.id,s.name+(withDomain?' · '+s.domain:''),value)).join('');}
  function eligibleAccounts(channelId,siteIds=[]){return data.accounts.filter(a=>a.channelId===channelId&&channel(channelId)?.enabled&&a.enabled&&a.environment==='live'&&siteIds.every(id=>a.siteIds.includes(id)&&M.methodsFor(data,id,a.id).length));}
  function channelOpts(value,{placeholder=false,siteId='',all=false,templateId=''}={}){
    return (placeholder?opt('','请选择 PSP',value):'')+data.channels.filter(c=>all||(c.enabled&&(!siteId||eligibleAccounts(c.id,[siteId]).length))).map(c=>{
      const unavailable=templateId&&siteId&&!eligibleAccounts(c.id,[siteId]).some(a=>!M.compatible(data,siteId,c.id,a.id,templateId).length);
      return `<option value="${esc(c.id)}"${c.id===value?' selected':''}${unavailable?' disabled':''}>${esc(c.provider+(unavailable?'（当前面板不可用）':!c.enabled?'（已停用）':''))}</option>`;
    }).join('');
  }
  function accountOpts(channelId,value,siteIds=[],templateId=''){
    return opt('','请选择收款账户',value)+eligibleAccounts(channelId,siteIds).map(a=>{
      const unavailable=templateId&&siteIds.length===1&&M.compatible(data,siteIds[0],channelId,a.id,templateId).length;
      return `<option value="${esc(a.id)}"${a.id===value?' selected':''}${unavailable?' disabled':''}>${esc(a.name+' · '+a.code+(unavailable?'（商品配置不可用）':''))}</option>`;
    }).join('');
  }
  function accountLine(a){return a?`${esc(a.name)}<div class="subtext mono">${esc(a.code)}</div>`:'尚未选择收款账户';}
  function checks(name,values,chosen){return values.map(v=>`<label class="radio-option"><input type="checkbox" name="${name}" value="${esc(v[0])}"${chosen.includes(v[0])?' checked':''}>${esc(v[1])}</label>`).join('');}
  function checkedValues(name){return [...document.querySelectorAll(`[name="${name}"]:checked`)].map(e=>e.value);}
  function visibleSite(id){return ui.site==='all'||ui.site===id;}
  function render(){
    document.title=(isPaymentPage()?'支付管理':({links:'推广链接管理',create:'新建推广链接',products:'商品 SKU 管理',templates:'付费面板管理'}[ui.page]||'支付与推广管理'))+' · DramaVideo Backend';
    const activePage=isPaymentPage()?'payment':ui.page==='create'?'links':ui.page;
    document.querySelectorAll('.sidebar [data-page]').forEach(b=>{const active=b.dataset.page===activePage;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    $('#view').innerHTML=({payment:renderPayment,links:renderLinks,create:renderCreate,products:renderProducts,templates:renderTemplates}[ui.page]||renderPayment)();
  }
  function renderKeep(){const active=document.activeElement,id=active?.id,start=active?.selectionStart,end=active?.selectionEnd,x=window.scrollX,y=window.scrollY;render();if(id){const next=document.getElementById(id);next?.focus({preventScroll:true});if(next?.setSelectionRange&&typeof start==='number')try{next.setSelectionRange(start,end);}catch(_){}}window.scrollTo(x,y);}
  function navigate(page){closeModal();ui.page=P.group(page)==='payment'?'payment':page;ui.search='';if(ui.page==='create'){newLink();return;}render();window.scrollTo(0,0);}

  function paymentSummary(){
    const global=ui.site==='all',s=site(ui.site),r=global?{...data.globalDefault,channel:channel(data.globalDefault.channelId),account:account(data.globalDefault.accountId),source:'global'}:M.effective(data,ui.site);
    const own=r.source==='site',inherited=data.sites.filter(s=>!data.rules.some(x=>x.enabled&&x.siteIds.includes(s.id))).length;
    const actions=global?'<button class="btn btn-primary" data-action="edit-global">修改全局默认</button><button class="btn" data-action="show-site-results">查看各站生效结果</button><button class="btn" data-action="show-site-rules">管理站点指定配置</button>':`<button class="btn btn-primary" data-action="edit-site-default">修改本站收款配置</button>${own?'<button class="btn" data-action="restore-site-default">恢复继承全局</button>':''}<button class="btn" data-action="edit-global">修改全局默认</button>`;
    return `<section class="panel payment-current"><div class="panel-head"><div><h2>${global?'全局默认收款配置':esc(s.name)+' 当前收款配置'}</h2><span class="subtext">${global?`${inherited} 个站点继承全局 · ${data.sites.length-inherited} 个站点单独指定`:'配置来源：'+(own?esc(r.rule.name):'继承全局默认')}</span></div>${sourceTag(r)}</div><div class="payment-current-row"><div class="default-provider"><div class="provider-logo ${esc(r.channel?.provider.toLowerCase()||'')}">${esc(r.channel?.provider[0]||'?')}</div><div><strong>${esc(r.channel?.provider||'暂不可用')}</strong><div>${esc(r.account?.name||'')}</div><div class="subtext mono">${esc(r.account?.code||'')}</div></div></div><div class="actions">${actions}</div></div>${global?'<p class="hint">未单独指定的站点整组继承此 PSP 与账户。支付方式可按站点单独设置。</p>':renderMethods(r)+(r.error?problems([r.error]):'')}<p class="hint payment-routing-hint">链接指定 ＞ 站点指定 ＞ 全局默认。变更影响后续新订单，已有订单和原订阅保留原支付关系。</p></section>`;
  }
  function showSiteResults(){
    modal('各站当前默认收款结果',table(['站点','PSP / 收款账户','本站支付方式','配置来源'],data.sites.map(s=>{
      const r=M.effective(data,s.id);
      return `<tr><td>${esc(s.name)}<div class="subtext">${esc(s.domain)}</div></td><td><strong>${esc(r.channel?.provider||'不可用')}</strong>${accountLine(r.account)}${r.error?`<div class="field-error">${esc(r.error)}</div>`:''}</td><td>${r.error?tag('不可用','warning'):M.methodsFor(data,s.id,r.account.id).map(m=>tag(m,'primary')).join(' ')}</td><td>${sourceTag(r)}<div class="subtext">${esc(r.rule?.name||'全局默认配置')}</div></td></tr>`;
    })),'<button class="btn" data-action="close">关闭</button>',true);
  }
  function showSiteRules(){
    modal('站点指定配置',`<p class="hint rule-list-hint">同一站点最多有一条启用配置；一条配置可适用于多个站点。停用后恢复继承全局。</p>${table(['配置名称 / 适用站点','PSP / 收款账户','状态','操作'],data.rules.map(r=>`<tr><td><strong>${esc(r.name)}</strong><div class="subtext">${r.siteIds.map(id=>esc(site(id).name)).join('、')}</div></td><td><strong>${esc(channel(r.channelId)?.provider)}</strong>${accountLine(account(r.accountId))}</td><td>${tag(r.enabled?'已启用':'已停用',r.enabled?'success':'info')}</td><td><div class="actions"><button class="btn-link" data-action="edit-rule" data-id="${r.id}">编辑</button><button class="btn-link" data-action="toggle-rule" data-id="${r.id}">${r.enabled?'停用':'启用'}</button>${!r.enabled?`<button class="btn-link" data-action="delete-rule" data-id="${r.id}">删除</button>`:''}</div></td></tr>`))}`,'<button class="btn" data-action="close">关闭</button><button class="btn btn-primary" data-action="new-rule">新增站点配置</button>',true);
  }
  function accountDefaultAction(a){
    const global=ui.site==='all',r=global?data.globalDefault:M.effective(data,ui.site),current=global?r.accountId:r.account?.id;
    if(current===a.id)return tag(global?'全局默认':'本站默认','primary');
    const issues=global?M.checkGlobal(data,{channelId:a.channelId,accountId:a.id}).issues:M.compatible(data,ui.site,a.channelId,a.id,site(ui.site).template);
    return `<button class="btn-link" data-action="${global?'use-global-account':'use-site-account'}" data-id="${a.id}"${issues.length?' disabled title="'+esc(issues[0])+'"':''}>${global?'设为全局默认':'设为本站默认'}</button>`;
  }
  function renderPayment(){
    const global=ui.site==='all',scoped=data.accounts.filter(a=>global||a.siteIds.includes(ui.site));
    const providers=data.channels.filter(c=>global||scoped.some(a=>a.channelId===c.id));
    const rows=scoped.filter(a=>(ui.accountProvider==='all'||a.channelId===ui.accountProvider)&&(ui.channelStatus==='all'||String(a.enabled)===ui.channelStatus)&&(!ui.search||`${channel(a.channelId).provider} ${a.name} ${a.code}`.toLowerCase().includes(ui.search.toLowerCase())));
    const actions='<button class="btn btn-plain" data-action="reset">复位示例</button><button class="btn" data-action="new-channel">新增 PSP</button><button class="btn btn-primary" data-action="new-account">新增收款账户</button>';
    return `${heading('支付管理','集中管理 PSP、收款账户与各站点的默认收款配置。',actions)}${paymentSummary()}
      <details class="panel payment-providers"><summary><span><strong>支付服务商</strong><span class="subtext">${providers.length} 家 PSP · ${scoped.length} 个${global?'':'本站关联'}账户</span></span><span class="hint">展开管理 PSP</span></summary>
      <div class="psp-service-grid">${providers.map(c=>{const accounts=scoped.filter(a=>a.channelId===c.id),available=eligibleAccounts(c.id,global?[]:[ui.site]);return `<article class="psp-service"><div class="psp-service-heading"><div class="provider-logo ${esc(c.provider.toLowerCase())}">${esc(c.provider[0])}</div><div><strong>${esc(c.name)}</strong><div class="subtext">${accounts.length} 个账户 · ${available.length} 个可用</div></div>${tag(c.enabled?'已启用':'已停用',c.enabled?'success':'info')}</div><div class="actions"><button class="btn-link" data-action="filter-provider" data-id="${c.id}">查看账户</button><button class="btn-link" data-action="new-account" data-id="${c.id}">新增账户</button><button class="btn-link" data-action="edit-channel" data-id="${c.id}">编辑</button><button class="btn-link" data-action="toggle-channel" data-id="${c.id}">${c.enabled?'停用 PSP':'启用 PSP'}</button></div></article>`;}).join('')||'<div class="empty">本站尚未关联 PSP，可新增收款账户并授权本站。</div>'}</div></details>
      <section class="panel" id="accountPanel"><div class="panel-head"><div><h2>收款账户</h2><span class="subtext">账户能力和授权对所有关联站点生效，本站支付方式可以单独配置。</span></div></div>
      <div class="filter-bar"><div class="field"><label for="accountProvider">所属 PSP</label><select id="accountProvider">${opt('all','全部 PSP',ui.accountProvider)}${providers.map(c=>opt(c.id,c.provider,ui.accountProvider)).join('')}</select></div><div class="field grow"><label for="channelSearch">账户搜索</label><input id="channelSearch" placeholder="PSP / 账户名称 / 商户号" value="${esc(ui.search)}"></div><div class="field"><label for="channelStatus">账户状态</label><select id="channelStatus">${opt('all','全部状态',ui.channelStatus)}${opt('true','已启用',ui.channelStatus)}${opt('false','已停用',ui.channelStatus)}</select></div><button class="btn" data-action="reset-filters">重置</button></div>
      <div class="list-gap">${table(['PSP / 收款账户','商户号 / 环境',global?'账户支持能力':'本站启用支付方式','关联站点 / 商品','操作'],rows.map(a=>{const methods=global?a.methods:M.methodsFor(data,ui.site,a.id),mapped=data.skus.filter(s=>a.supports.includes(s.id)&&(global||s.site===ui.site)).length;return `<tr><td><strong>${esc(a.name)}</strong><div class="subtext">${esc(channel(a.channelId).provider)} ${a.id===data.globalDefault.accountId?tag('全局默认','primary'):''}</div></td><td><span class="mono">${esc(a.code)}</span><div class="subtext">${a.environment==='live'?'正式环境':'测试环境'}</div></td><td>${methods.length?methods.map(x=>tag(x,'primary')).join(' '):tag('本站未启用支付方式','warning')}<div class="subtext">${a.types.map(t=>t==='subscription'?'自动续费':'一次性支付').join(' / ')}</div>${!global?`<div class="subtext">账户能力：${esc(a.methods.join('、'))}</div>`:''}</td><td>${a.siteIds.map(id=>esc(site(id).name)).join('、')} ${tag(a.enabled&&channel(a.channelId).enabled?'已启用':'不可用',a.enabled&&channel(a.channelId).enabled?'success':'warning')}<div class="subtext">${mapped} 个${global?'':'本站'} SKU 已配置${global?'':' · 同时关联 '+(a.siteIds.length-1)+' 个其他站点'}</div></td><td><div class="actions">${accountDefaultAction(a)}<button class="btn-link" data-action="account-detail" data-id="${a.id}">详情</button><button class="btn-link" data-action="edit-account" data-id="${a.id}">编辑</button><button class="btn-link" data-action="toggle-account" data-id="${a.id}">${a.enabled?'停用':'启用'}</button>${!global?`<button class="btn-link" data-action="site-methods" data-id="${a.id}">配置本站支付方式</button>`:''}</div></td></tr>`;}))}</div><div class="pagination"><span>共 ${rows.length} 个账户</span><span>站点筛选不改变账户授权范围</span></div></section>`;
  }
  function editGlobal(accountId=''){
    if(!requirePaymentManagement())return;
    const chosen=account(accountId),g=chosen?{channelId:chosen.channelId,accountId:chosen.id}:data.globalDefault;
    modal('修改全局默认收款配置',`<div class="form-grid"><div class="field"><label class="required" for="globalDefaultSelect">默认 PSP</label><select id="globalDefaultSelect">${channelOpts(g.channelId)}</select></div><div class="field"><label class="required" for="globalDefaultAccount">收款账户</label><select id="globalDefaultAccount">${accountOpts(g.channelId,g.accountId)}</select></div></div><div class="alert alert-info">变更前检查默认面板和在用链接的商品与账户关联。已指定账户的链接、已有订单和原有订阅保留原支付关系。</div><div id="globalCheck"></div>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-global">保存全局默认</button>`,true);
    updateGlobalCheck();
  }
  function readGlobal(){return {channelId:$('#globalDefaultSelect').value,accountId:$('#globalDefaultAccount').value};}
  function updateGlobalCheck(){
    const result=M.checkGlobal(data,readGlobal()),names=data.sites.filter(s=>!data.rules.some(r=>r.enabled&&r.siteIds.includes(s.id))).map(s=>s.name);
    $('#globalCheck').innerHTML=problems(result.issues)+`<div class="subtext">当前直接受影响的站点：${esc(names.join('、')||'无')}。已启用站点配置保持原 PSP 和账户。</div>`;
    $('[data-action="save-global"]').disabled=!!result.issues.length;
  }
  function editRule(id){
    if(!requirePaymentManagement())return;
    ui.ruleDraft=id?M.copy(M.get(data.rules,id)):{id:'cover-'+Date.now(),name:'',siteIds:[],channelId:'waffo',accountId:'',enabled:true,updated:now()};
    const r=ui.ruleDraft;
    const choices=data.sites.map(s=>{
      const used=data.rules.find(x=>x.id!==r.id&&x.enabled&&x.siteIds.includes(s.id)),current=M.effective(data,s.id);
      return `<label class="site-choice${used?' site-choice-occupied':''}"><input type="checkbox" name="ruleSites" value="${s.id}"${r.siteIds.includes(s.id)?' checked':''}><span><strong>${esc(s.name)}</strong><small>${esc(s.domain)}</small><span class="site-choice-current">当前：${esc(current.channel?.provider||'不可用')} · ${current.rule?.id===r.id?'本配置':current.source==='site'?'其他站点配置':'全局默认'}</span>${used?`<span class="site-choice-note">已由「${esc(used.name)}」管理</span>`:''}</span></label>`;
    }).join('');
    modal(id?'编辑站点收款配置':'新增站点收款配置',`<form id="ruleForm"><div class="form-grid">
      <div class="field"><label class="required" for="ruleName">配置名称</label><input id="ruleName" maxlength="60" placeholder="例如：TideWatch 收款配置" value="${esc(r.name)}"></div>
      <div class="field"><label for="ruleEnabled">保存后状态</label><select id="ruleEnabled">${opt('true','启用，保存后生效',String(r.enabled))}${opt('false','停用，仅保留配置',String(r.enabled))}</select></div>
      <div class="field full" role="group" aria-labelledby="ruleSitesLabel" aria-describedby="ruleSitesHint ruleValidation"><div class="rule-sites-head"><span class="field-label required" id="ruleSitesLabel">适用站点（多选）</span><span class="rule-site-count" id="ruleSiteCount" role="status"></span></div><div class="site-choice-grid">${choices}</div><span class="hint" id="ruleSitesHint">所选站点共用以下 PSP 与收款账户；同一站点仅可启用一条配置。</span></div>
      <div class="field"><label class="required" for="rulePSP">支付服务商（PSP）</label><select id="rulePSP">${channelOpts(r.channelId,{all:true})}</select><span class="hint" id="rulePSPHint"></span></div>
      <div class="field"><label class="required" for="ruleAccountSelect">收款账户</label><select id="ruleAccountSelect" aria-describedby="ruleAccountHint">${accountOpts(r.channelId,r.accountId,r.siteIds)}</select><span class="hint" id="ruleAccountHint"></span></div>
      </div><div id="ruleValidation" aria-live="polite"></div><section class="rule-impact" aria-labelledby="ruleImpactTitle"><div class="rule-impact-head"><h3 id="ruleImpactTitle">保存后生效预览</h3><span class="hint" id="ruleImpactCount"></span></div><div id="ruleImpactRows"></div><p class="hint rule-effect-note" id="ruleEffectNote"></p></section><div id="formErrors"></div></form>`,`<span class="rule-save-status" id="ruleSaveStatus" role="status"></span><div class="actions"><button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-rule">保存并生效</button></div>`,true);
    $('#modalRoot .modal').classList.add('rule-modal');
    updateRuleAccounts(false);
  }
  function readRule(){return {...ui.ruleDraft,name:$('#ruleName').value.trim(),siteIds:checkedValues('ruleSites'),channelId:$('#rulePSP').value,accountId:$('#ruleAccountSelect').value,enabled:$('#ruleEnabled').value==='true',updated:now()};}
  function updateRuleAccounts(clear){
    const c=$('#rulePSP').value,ids=checkedValues('ruleSites'),value=clear?'':$('#ruleAccountSelect').value;
    const accounts=data.accounts.filter(a=>a.channelId===c),select=$('#ruleAccountSelect');
    select.innerHTML=opt('',ids.length?'请选择收款账户':'请先选择适用站点',value)+accounts.map(a=>{
      const issues=M.pairIssues(data,{channelId:c,accountId:a.id},ids),reason=issues.join('；');
      return `<option value="${esc(a.id)}"${a.id===value?' selected':''}${issues.length?' disabled':''}>${esc(a.name+' · '+a.code+(reason?'（不可用：'+reason+'）':''))}</option>`;
    }).join('');
    select.disabled=!ids.length;
    const usable=accounts.filter(a=>!M.pairIssues(data,{channelId:c,accountId:a.id},ids).length).length;
    $('#rulePSPHint').textContent=!ids.length?'先选择站点，再选择可用于这些站点的账户。':`${channel(c)?.provider||'当前 PSP'} 有 ${usable} 个账户可用于全部所选站点。`;
    const selected=account(select.value),issues=selected?M.pairIssues(data,{channelId:c,accountId:selected.id},ids):[];
    if(ids.length&&issues.length)select.value='';
    select.setAttribute('aria-invalid',String(!!ids.length&&!!issues.length));
    $('#ruleAccountHint').className='hint'+(issues.length?' rule-field-error':'');
    $('#ruleAccountHint').textContent=!ids.length?'选择站点后可查看账户可用范围。':issues.length?'已清空原选账户：'+issues.join('；')+'。请重新选择。':!usable?'当前 PSP 没有可用账户。不可用原因见下拉选项，请更换 PSP 或在渠道管理中调整账户授权。':clear?'已切换 PSP，请重新选择其下的收款账户。':'仅正式环境、已启用且授权给全部所选站点的账户可选。';
    updateRulePreview();
  }
  function updateRulePreview(){
    const r=readRule(),result=M.checkRule(data,r),old=M.get(data.rules,r.id),ids=[...new Set([...(old?.siteIds||[]),...r.siteIds])];
    $('#ruleSiteCount').textContent='已选 '+r.siteIds.length+' / '+data.sites.length+' 个站点';
    const required=['请填写配置名称','请至少选择一个适用站点','请选择 PSP','请选择收款账户'];
    const issues=result.issues.filter(x=>!required.includes(x));
    $('#ruleValidation').innerHTML=issues.length?`<div class="rule-validation"><strong>暂不能保存此配置</strong><ul>${issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:'';
    const resolution=(d,id)=>{
      const resolved=M.effective(d,id);
      if(resolved.error)return `<span class="rule-field-error">${esc(resolved.error)}</span>`;
      return `<strong>${esc(resolved.channel.provider)}</strong><span>${esc(resolved.account.name)}</span><small>${esc(resolved.account.code)}</small><small>${resolved.source==='site'?'站点配置':'全局默认'} · ${esc(M.methodsFor(d,id,resolved.account.id).join(' / '))}</small>`;
    };
    const signature=x=>[x.channel?.id,x.account?.id,x.source,x.error||''].join('|');
    const changed=ids.filter(id=>signature(M.effective(data,id))!==signature(M.effective(result.next,id)));
    $('#ruleImpactCount').textContent=result.issues.length?'配置尚未通过校验':changed.length?`${changed.length} 个站点的默认配置将变化`:'当前默认收款结果无变化';
    $('#ruleImpactRows').innerHTML=!ids.length?'<p class="rule-impact-empty">选择站点后，查看各站当前配置与保存后的结果。</p>':`<div class="rule-impact-table" role="table" aria-label="站点默认收款变更预览"><div class="rule-impact-row rule-impact-labels" role="row"><span role="columnheader">站点</span><span role="columnheader">当前默认</span><span role="columnheader">保存后默认</span></div>${ids.map(id=>{
      const ready=!r.enabled||!r.siteIds.includes(id)||(r.channelId&&r.accountId),removed=old?.siteIds.includes(id)&&!r.siteIds.includes(id);
      return `<div class="rule-impact-row" role="row"><div role="cell"><strong>${esc(site(id).name)}</strong><small>${esc(site(id).domain)}</small>${removed?'<small class="rule-removed-site">已从本配置移除</small>':''}</div><div role="cell">${resolution(data,id)}</div><div role="cell">${ready?resolution(result.next,id):'<span class="hint">选择 PSP 和收款账户后显示</span>'}</div></div>`;
    }).join('')}</div>`;
    $('#ruleEffectNote').textContent=(r.enabled?'保存后，跟随默认配置的推广链接在新建订单时使用上方结果。':'停用配置不参与收款，上方展示停用后的默认结果。')+'已指定账户的链接、已有订单和原订阅保留原支付关系。';
    const save=$('[data-action="save-rule"]');
    save.disabled=!!result.issues.length;
    save.textContent=r.enabled?(old?.enabled?'保存并生效':'保存并启用'):(old?.enabled?'保存并停用':'保存为停用');
    $('#ruleSaveStatus').textContent=result.issues.length?(issues.length?'请先处理配置问题':required.filter(x=>result.issues.includes(x)).join('；')):changed.length?`将调整 ${changed.length} 个站点的默认收款`:'配置检查通过';
    $('#formErrors').innerHTML='';
  }
  function channelForm(id){
    if(!requirePaymentManagement())return;
    const found=channel(id),c=found?M.copy(found):{id:'psp-'+Date.now(),provider:M.providers.find(p=>!data.channels.some(c=>c.provider===p))||'Waffo',name:'',enabled:true,revision:1};
    ui.channelDraft=c;
    modal(found?'编辑支付服务商':'新增支付服务商',`<form id="channelForm"><div class="field"><label class="required" for="channelProvider">PSP 类型</label><select id="channelProvider"${found?' disabled':''}>${M.providers.map(p=>opt(p,p,c.provider)).join('')}</select></div><div class="field"><label class="required" for="channelName">服务商名称</label><input id="channelName" maxlength="60" placeholder="例如：Antom" value="${esc(c.name)}"></div><div class="field"><label for="channelEnabled">服务商状态</label><select id="channelEnabled">${opt('true','启用',String(c.enabled))}${opt('false','停用',String(c.enabled))}</select></div><p class="hint">服务商创建后，可在其下新增多个独立收款账户。整体停用时会检查所有账户的使用情况。</p><div id="formErrors"></div></form>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-channel">保存 PSP</button>`);
  }
  function readChannel(){return {...ui.channelDraft,name:$('#channelName').value.trim(),provider:$('#channelProvider').value,enabled:$('#channelEnabled').value==='true',revision:ui.channelDraft.revision+1};}
  function accountForm(id,channelId){
    if(!requirePaymentManagement())return;
    const found=account(id),a=found?M.copy(found):{id:'account-'+Date.now(),channelId:channelId||(ui.accountProvider!=='all'?ui.accountProvider:data.channels.find(c=>c.enabled)?.id)||'',name:'',code:'',siteIds:ui.site==='all'?[]:[ui.site],types:['once'],methods:['银行卡'],currencies:['USD'],regions:['美国'],environment:'live',enabled:true,revision:1,supports:[],updated:now()};
    ui.accountDraft=a;
    modal(found?'编辑收款账户':'新增收款账户',`<form id="accountForm"><div class="shared-impact-note"><strong>全局共享账户</strong><p>${found?`当前关联 ${a.siteIds.length} 个站点：${a.siteIds.map(id=>esc(site(id).name)).join('、')}。账户能力或授权变更会影响这些站点。`:'请明确选择允许使用此账户的站点。'} 本站支付方式可在站点视角单独配置。</p></div><div class="form-grid"><div class="field"><label class="required" for="accountPSP">所属 PSP</label><select id="accountPSP"${found?' disabled':''}>${channelOpts(a.channelId,{all:true})}</select></div><div class="field"><label class="required" for="accountName">账户名称</label><input id="accountName" maxlength="60" placeholder="例如：Waffo 美国收款账户" value="${esc(a.name)}"></div><div class="field"><label class="required" for="accountCode">商户号（示例）</label><input id="accountCode" maxlength="60" placeholder="例如：WAFFO-DEMO-003" value="${esc(a.code)}"${found?' readonly':''}><span class="hint">同一 PSP、同一环境下商户号不可重复。</span></div><div class="field"><label for="accountEnvironment">接入环境</label><select id="accountEnvironment"${found?' disabled':''}>${opt('live','正式环境（示例）',a.environment)}${opt('test','测试环境（示例）',a.environment)}</select><span class="hint">保存后 PSP、商户号和环境固定。</span></div><div class="field full"><label class="required">关联站点</label><div class="radio-row">${checks('accountSites',data.sites.map(s=>[s.id,s.name]),a.siteIds)}</div></div><div class="field full"><label class="required">支付方式</label><div class="radio-row">${checks('accountMethods',['银行卡','Apple Pay','Google Pay','PayPal'].map(s=>[s,s]),a.methods)}</div></div><div class="field"><label for="accountEnabled">账户状态</label><select id="accountEnabled">${opt('true','启用',String(a.enabled))}${opt('false','停用',String(a.enabled))}</select></div></div><p class="hint account-product-note">商品与收款账户的关联统一在「商品 SKU 管理」中维护。</p><div id="formErrors"></div></form>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-account">保存账户</button>`,true);
  }
  function readAccount(){
    const a={...ui.accountDraft,name:$('#accountName').value.trim(),code:$('#accountCode').value.trim(),channelId:$('#accountPSP').value,siteIds:checkedValues('accountSites'),methods:checkedValues('accountMethods'),currencies:['USD'],types:[...ui.accountDraft.types],supports:[...ui.accountDraft.supports],environment:$('#accountEnvironment').value,enabled:$('#accountEnabled').value==='true',updated:now(),revision:ui.accountDraft.revision+1};
    a.supports=a.supports.filter(id=>a.siteIds.includes(M.get(data.skus,id)?.site));
    a.siteMethods=Object.fromEntries(a.siteIds.map(id=>[id,(ui.accountDraft.siteMethods&&Object.hasOwn(ui.accountDraft.siteMethods,id)?ui.accountDraft.siteMethods[id]:a.methods).filter(m=>a.methods.includes(m))]));
    return a;
  }
  function showAccount(id){
    const a=account(id),c=channel(a.channelId),deps=M.dependencies(data,c.id,a.id),skus=data.skus.filter(s=>a.siteIds.includes(s.site)&&visibleSite(s.site));
    modal('收款账户详情',`<div class="panel-head"><div><h3>${esc(a.name)}</h3><p class="subtext">${esc(c.provider)} · ${a.environment==='live'?'正式环境':'测试环境'}</p></div>${tag(a.enabled?'已启用':'已停用',a.enabled?'success':'info')}</div><div class="detail-grid"><div><span class="subtext">商户号</span><p class="mono">${esc(a.code)}</p></div><div><span class="subtext">关联站点</span><p>${a.siteIds.map(id=>esc(site(id).name)).join('、')}</p></div><div><span class="subtext">支付方式</span><p>${esc(a.methods.join('、'))}</p></div><div><span class="subtext">已开通交易能力</span><p>${a.types.map(t=>t==='subscription'?'自动续费':'一次性支付').join('、')}</p></div></div><h3 class="small-title">本账户关联商品</h3><p class="hint">商品关联在「商品 SKU 管理」中维护，此处仅查看。</p>${table(['站点 / SKU','价格','关联状态'],skus.map(s=>`<tr><td>${esc(s.name)}<div class="subtext">${esc(site(s.site).name)} · ${esc(s.code)}</div></td><td>${esc(price(s))}</td><td>${tag(a.supports.includes(s.id)?'已关联':'未关联',a.supports.includes(s.id)?'success':'warning')}</td></tr>`))}<div class="dependency-strip">${deps.global?tag('全局默认','primary'):''}${tag(deps.rules.length+' 条启用站点配置')}${tag(deps.links.length+' 条在用指定链接')}</div><p class="hint">支持能力与商户号均为示例。历史订单保存下单时账户标识和名称。</p>`,`<button class="btn" data-action="close">关闭</button>${isPaymentPage()?`<button class="btn btn-primary" data-action="edit-account" data-id="${id}">编辑共享账户</button>`:`<button class="btn btn-primary" data-action="site-methods" data-id="${id}">配置本站支付方式</button>`}`,true);
  }

  function renderLinks(){
    const rows=data.links.filter(l=>visibleSite(l.site));
    return `${heading('推广链接管理','统一新建、查看、复制和停用推广链接，查看当前范围的链接汇总与订单记录。','<button class="btn btn-primary" data-action="new-link">＋ 新建推广链接</button>')}<section class="panel"><div class="panel-head"><h2>推广链接</h2><div class="link-count-summary"><span>共 <strong>${rows.length}</strong> 条</span>${tag('启用 '+rows.filter(l=>l.enabled).length,'success')}${tag('停用 '+rows.filter(l=>!l.enabled).length)}</div></div>${table(['链接名称','所属站点 / 面板','支付选择','当前 PSP / 收款账户','状态','操作'],rows.map(l=>{const r=M.effective(data,l.site,M.linkChoice(l));return `<tr><td><strong>${esc(l.name)}</strong><div class="subtext">${esc(l.id)} · ${esc(l.created)}</div></td><td>${esc(site(l.site).name)}<div class="subtext">${esc(site(l.site).domain)}</div><div class="subtext">${esc(template(l.template).name)}</div></td><td>${tag(l.mode==='specific'?'指定 PSP 与账户':'跟随站点默认',l.mode==='specific'?'success':'info')}</td><td><strong>${esc(r.channel?.provider||'不可用')}</strong> ${sourceTag(r)}<div>${accountLine(r.account)}</div>${r.error?`<div class="field-error">${esc(r.error)}</div>`:''}</td><td>${tag(l.enabled?'已生成':'已停用',l.enabled?'success':'info')}</td><td><div class="actions"><button class="btn-link" data-action="link-detail" data-id="${l.id}">查看</button><button class="btn-link" data-action="copy-link" data-id="${l.id}">复制</button>${l.enabled?`<button class="btn-link" data-action="disable-link" data-id="${l.id}">停用</button>`:''}</div></td></tr>`;}))}<div class="pagination"><span>共 ${rows.length} 条</span><span>链接指定 ＞ 站点配置 ＞ 全局默认，整组使用 PSP 与账户</span></div></section>${renderOrders()}`;
  }
  function newLink(form=null){
    if(ui.site==='all'&&!form){chooseLinkSite();return;}
    if(form&&ui.site!==form.site)switchScope(form.site,{quiet:true});
    closeModal();const id=ui.site,s=site(id);
    ui.linkForm=form||{site:id,name:'',template:s.template,mode:'default',channelId:'',accountId:'',source:'Meta',episode:'1'};
    ui.validated=null;ui.page='create';render();window.scrollTo(0,0);
  }
  function renderCreate(){
    const f=ui.linkForm,s=site(f.site),r=M.effective(data,f.site,M.linkChoice(f)),t=template(f.template),valid=ui.validated===JSON.stringify(f);
    return `${heading('新建推广链接','确定落地站点、付费面板，以及默认或指定的 PSP 和账户。','<button class="btn" data-page="links">返回列表</button>')}<div class="form-layout"><section class="panel"><form id="linkForm"><div class="form-section"><div class="section-title">站点与投放信息</div><div class="form-grid"><div class="field"><label class="required" for="linkSite">所属站点</label><div class="current-site-field" id="linkSite"><strong>${esc(s.name)}</strong><span>${esc(s.domain)}</span></div><span class="hint">切换站点请使用页面内的站点筛选，面板和收款选择会重置。</span></div><div class="field"><label for="linkDomain">落地域名</label><input id="linkDomain" readonly value="${esc(s.domain)}"></div><div class="field full"><label class="required" for="linkName">链接名称</label><input id="linkName" data-link="name" maxlength="80" value="${esc(f.name)}" placeholder="例如：美国 · 标准面板 · Waffo 第二账户"></div><div class="field"><label for="linkSource">投放平台</label><select id="linkSource" data-link="source">${['Meta','AppLovin'].map(x=>opt(x,x,f.source)).join('')}</select></div><div class="field"><label for="linkAd">广告账户</label><input id="linkAd" readonly value="${esc(s.name+' · '+f.source+' 示例账户')}"></div><div class="field"><label>落地剧目</label><div class="control-value">${esc(s.drama)} · 英语</div></div><div class="field"><label class="required" for="linkEpisode">起播集</label><input id="linkEpisode" data-link="episode" type="number" min="1" max="60" value="${esc(f.episode)}"></div></div></div><div class="form-section"><div class="section-title">付费面板与收款配置</div><div class="form-grid"><div class="field full"><label class="required" for="linkTemplate">付费面板</label><select id="linkTemplate" data-link="template">${data.templates.filter(t=>t.site===s.id).map(t=>opt(t.id,t.name+' · '+t.version,f.template)).join('')}</select></div><div class="field full"><label for="linkMode">支付选择</label><select id="linkMode" data-link="mode">${opt('default','跟随站点默认',f.mode)}${opt('specific','指定 PSP 与收款账户',f.mode)}</select></div>${f.mode==='specific'?`<div class="field"><label class="required" for="linkChannel">指定 PSP</label><select id="linkChannel" data-link="channelId">${channelOpts(f.channelId,{placeholder:true,siteId:s.id,templateId:f.template})}</select></div><div class="field"><label class="required" for="linkAccount">收款账户</label><select id="linkAccount" data-link="accountId">${accountOpts(f.channelId,f.accountId,[s.id],f.template)}</select><span class="hint">切换 PSP 后请重新选择账户。</span></div>`:''}</div><div class="payment-resolution"><span>实际收款配置</span><strong>${esc(r.channel?.provider||'请选择 PSP')}</strong>${sourceTag(r)}<div>${accountLine(r.account)}</div>${renderMethods(r)}${r.rule?`<div class="hint">命中配置：${esc(r.rule.name)}</div>`:''}${r.error?`<div class="field-error">${esc(r.error)}</div>`:''}</div><div class="sku-grid">${t.skus.map(id=>{const sku=M.get(data.skus,id);return `<div class="sku-card"><h4>${esc(sku.name)}</h4><div class="price">$${sku.price.toFixed(2)}<small>${sku.type==='subscription'?' / 月':''}</small></div><p class="subtext">${esc(sku.rights)}</p></div>`;}).join('')}</div></div><div id="linkValidation"></div><div class="form-footer"><button type="button" class="btn" data-page="links">取消</button><button type="button" class="btn btn-plain" data-action="check-link">校验并预览</button><button type="submit" class="btn btn-primary" id="generateLink"${valid?'':' disabled'}>生成推广链接</button></div></form></section><aside class="summary"><h3>本次配置摘要</h3><div class="summary-list"><div><span>站点</span><strong>${esc(s.name)}</strong></div><div><span>面板</span><strong>${esc(t.name)}</strong></div><div><span>支付选择</span><strong>${f.mode==='specific'?'指定 PSP 与账户':'跟随站点默认'}</strong></div><div><span>实际 PSP</span><strong>${esc(r.channel?.provider||'待选择')}</strong></div><div><span>支付方式</span><strong>${esc(r.error?'待配置':M.methodsFor(data,f.site,r.account?.id).join('、'))}</strong></div><div><span>收款账户</span><strong>${esc(r.account?.name||'待选择')}</strong></div><div><span>配置来源</span>${sourceTag(r)}</div></div><hr><p class="summary-note">链接指定时固定 PSP 与账户；跟随默认时使用站点配置，未覆盖则使用全局默认。新订单创建后固定实际账户。</p></aside></div>`;
  }
  function linkSummary(f){const r=M.effective(data,f.site,M.linkChoice(f));return `<div class="detail-grid"><div><span class="subtext">站点 / 面板</span><p>${esc(site(f.site).name)} · ${esc(template(f.template).name)}</p></div><div><span class="subtext">PSP / 配置来源</span><p>${esc(r.channel?.provider||'不可用')} ${sourceTag(r)}</p></div><div><span class="subtext">收款账户 / 商户号</span><div class="detail-account">${accountLine(r.account)}</div></div><div><span class="subtext">可用支付方式</span><p>${esc(r.error?'暂无':M.methodsFor(data,f.site,r.account?.id).join('、'))}</p></div><div><span class="subtext">投放信息</span><p>${esc(f.source||'Meta')} · 第 ${esc(f.episode||'1')} 集</p></div></div>`;}
  function linkURL(l){return 'https://'+site(l.site).domain+'/p/'+l.id;}
  function checkLink(){const f=ui.linkForm,result=M.checkLink(data,f);ui.validated=result.issues.length?null:JSON.stringify(f);$('#linkValidation').innerHTML=result.issues.length?problems(result.issues):'<div class="alert alert-success">校验通过：PSP 与账户归属、面板全部 SKU、币种、交易类型及商品与账户关联均可用。</div>';$('#generateLink').disabled=!!result.issues.length;if(!result.issues.length)modal('生成前预览',linkSummary(f)+'<div class="alert alert-info">业务域名下的推广路径仅为演示，不会发布到业务站点。跟随默认的新订单读取最新配置；指定链接固定 PSP 与账户。</div>','<button class="btn" data-action="close">返回调整</button><button class="btn btn-primary" data-action="generate-link">确认生成</button>');}
  function generateLink(){
    if(!ui.linkForm)return;const f=ui.linkForm,result=M.checkLink(data,f);
    if(f.site!==ui.site||ui.validated!==JSON.stringify(f)||result.issues.length){closeModal();ui.validated=null;render();toast('配置已变化，请重新校验。',true);return;}
    if(data.links.length>=50){toast('示例链接已达 50 条，请复位示例。',true);return;}
    const l={...M.copy(f),id:'demo-'+data.nextLink++,enabled:true,created:now(),generatedProvider:result.resolved.channel.provider,generatedAccount:result.resolved.account.name,generatedAccountId:result.resolved.account.id};
    data.links.unshift(l);persist();closeModal();ui.linkForm=null;ui.validated=null;ui.page='links';render();window.scrollTo(0,0);
    modal('推广链接已生成',`<div class="success-heading"><span class="success-icon">✓</span><h2>链接生成成功</h2><p class="subtext">${esc(l.name)}</p></div><div class="alert alert-info">示例推广地址仅用于展示，不会发布到业务站点。</div><div class="field"><label for="generatedURL">示例推广链接</label><input id="generatedURL" class="mono" readonly value="${esc(linkURL(l))}"></div>${linkSummary(l)}`,'<button class="btn" data-action="close">返回列表</button><button class="btn btn-primary" data-action="copy-link" data-id="'+l.id+'">复制链接</button>');
  }
  function showLink(id){const l=M.get(data.links,id),t=template(l.template),r=M.effective(data,l.site,M.linkChoice(l));modal('推广链接详情',`<h3>${esc(l.name)} ${tag(l.enabled?'已生成':'已停用',l.enabled?'success':'info')}</h3>${linkSummary(l)}<div class="field"><label for="detailURL">示例地址</label><input id="detailURL" readonly value="${esc(linkURL(l))}" class="mono"></div><div class="purchase-demo"><h3>下单效果预览</h3><p class="subtext">记录当前实际 PSP 与账户，之后调整配置可比较历史记录。</p><div class="field"><label for="purchaseSku">选择示例商品</label><select id="purchaseSku">${t.skus.map(sid=>{const s=M.get(data.skus,sid);return opt(sid,s.name+' · '+price(s),t.skus[0]);}).join('')}</select></div><div class="field"><label for="purchaseMethod">支付方式</label><select id="purchaseMethod">${M.methodsFor(data,l.site,r.account?.id).map(m=>opt(m,m,'')).join('')}</select></div><div id="purchaseResult"></div><button class="btn btn-plain" data-action="record-order" data-id="${id}"${l.enabled?'':' disabled'}>记录一次示例下单</button></div>`,'<button class="btn" data-action="close">关闭</button><button class="btn btn-primary" data-action="copy-link" data-id="'+id+'">复制链接</button>',true);}
  function renderOrders(){const rows=data.orders.filter(o=>ui.site==='all'||o.siteId===ui.site);return `<section class="panel"><div class="panel-head"><div><h2>示例订单记录</h2><span class="subtext">固定下单时的 PSP、账户标识及名称，后续配置或重命名不改写历史。</span></div>${tag('仅演示，不真实扣款')}</div>${table(['记录编号 / 时间','站点 / 商品','金额 / 支付方式','下单 PSP / 账户','当时的配置来源'],rows.map(o=>`<tr><td>${esc(o.id)}<div class="subtext">${esc(o.created)}</div></td><td>${esc(o.site)}<div class="subtext">${esc(o.sku)}</div></td><td>${esc(o.currency)} ${o.amount.toFixed(2)}<div class="subtext">${esc(o.paymentMethod)}</div></td><td><strong>${esc(o.provider)}</strong><div>${esc(o.account)}</div><div class="subtext mono">${esc(o.accountCode)}</div></td><td>${tag(sourceName[o.source],o.source==='site'?'primary':'info')}<div class="subtext">${esc(o.rule)}</div></td></tr>`))}${!rows.length?'<p class="hint">打开链接详情，记录示例下单后，再调整全局或站点配置查看差异。</p>':''}</section>`;}
  function renderProducts(){return `${heading('商品 SKU 管理','统一维护'+(ui.site==='all'?'各站点':'本站')+'商品的 PSP 与收款账户关联，商品售价统一使用美元（USD）。')}<section class="panel">${table(['SKU / 商品','所属站点','价格 / 权益','支持的 PSP','已配置收款账户','操作'],data.skus.filter(s=>visibleSite(s.site)).map(s=>`<tr><td><strong>${esc(s.name)}</strong><div class="subtext mono">${esc(s.code)}</div></td><td>${esc(site(s.site).name)}<div class="subtext">${esc(site(s.site).domain)}</div></td><td>${esc(price(s))}<div class="subtext">${esc(s.rights)}</div></td><td>${data.skuPSPs[s.id].map(id=>tag(channel(id).provider,'primary')).join(' ')}</td><td>${data.accounts.filter(a=>a.supports.includes(s.id)&&a.siteIds.includes(s.site)&&data.skuPSPs[s.id].includes(a.channelId)).map(a=>`<div>${esc(a.name)} ${!a.enabled||!channel(a.channelId).enabled?tag('已停用'):''}</div>`).join('')}</td><td><button class="btn-link" data-action="edit-sku-psps" data-id="${s.id}">${ui.site==='all'?'进入本站配置':'配置支付'}</button></td></tr>`))}</section>`;}
  function renderTemplates(){return `${heading('付费面板管理','面板组合本站 SKU，生成链接时校验所选账户的全部商品与账户的关联。')}<section class="panel">${table(['面板名称','所属站点','关联商品','发布版本','兼容 PSP / 收款账户'],data.templates.filter(t=>visibleSite(t.site)).map(t=>`<tr><td><strong>${esc(t.name)}</strong>${site(t.site).template===t.id?' '+tag('站点默认','primary'):''}</td><td>${esc(site(t.site).name)}</td><td>${t.skus.map(id=>esc(M.get(data.skus,id).name)).join('、')}</td><td>${tag(t.version)}</td><td>${data.accounts.filter(a=>!M.compatible(data,t.site,a.channelId,a.id,t.id).length).map(a=>`<div>${tag(channel(a.channelId).provider,'success')} ${esc(a.name)}</div>`).join(' ')}</td></tr>`))}</section>`;}

  function renderMethods(r){
    const methods=r.error?[]:M.methodsFor(data,r.site.id,r.account?.id);
    return `<div class="payment-methods"><span class="subtext">可用支付方式</span><div>${methods.length?methods.map(m=>tag(m,'primary')).join(' '):tag('暂无可用方式','warning')}</div></div>`;
  }
  function switchScope(id,{page=null,quiet=false}={}){
    if(id!=='all'&&!site(id))return;
    clearTimeout(toastTimer);$('#toast').className='toast';
    const targetPage=page||ui.page,previous=scopes.get(targetPage);
    const currentForm=ui.page==='create'&&P.group(targetPage)==='links'?M.copy(ui.linkForm):null;
    if(previous===id&&!page)return;
    if(currentForm)ui.savedDraft=currentForm;
    scopes.set(targetPage,id);ui.search='';ui.accountProvider='all';ui.channelStatus='all';
    ui.validated=null;
    if(page)ui.page=P.group(page)==='payment'?'payment':page;
    if(currentForm){
      if(id==='all'){ui.page='links';ui.linkForm=null;}
      else ui.linkForm={site:id,name:currentForm.name,source:currentForm.source,episode:currentForm.episode,template:site(id).template,mode:'default',channelId:'',accountId:''};
    }
    persistPageScopes();
    closeModal();renderKeep();window.scrollTo(0,0);
    if(!quiet)toast(id==='all'?(currentForm?'已显示全部站点，本次链接草稿已临时保留。':'当前模块已显示全部站点。'):'当前模块已选择 '+site(id).name+(currentForm?'，面板和收款选择已重置，请重新校验。':'。'));
  }
  function chooseLinkSite(){
    modal('选择推广站点',`<div class="field"><label for="newLinkSite">为哪个站点生成推广链接</label><select id="newLinkSite">${opt('','请选择站点','')}${siteOpts('',false,true)}</select></div><p class="hint">确定后进入该站点，域名、商品和支付配置会一起切换。</p><div id="formErrors"></div>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="choose-link-site">进入站点并新建</button>`);
  }
  function editSiteDefault(accountId=''){
    if(ui.site==='all')return;
    const r=M.effective(data,ui.site),chosen=accountId?account(accountId):r.account,mode=accountId||r.source==='site'?'override':'inherit';
    modal('修改本站收款配置',`<div class="current-site-field"><strong>${esc(site(ui.site).name)}</strong><span>${esc(site(ui.site).domain)}</span></div><div class="field"><label for="siteDefaultMode">收款策略</label><select id="siteDefaultMode">${opt('inherit','继承全局默认',mode)}${opt('override','本站单独指定 PSP 与账户',mode)}</select></div><div class="form-grid local-default-fields" id="siteDefaultFields"${mode==='inherit'?' hidden':''}><div class="field"><label class="required" for="siteDefaultPSP">PSP</label><select id="siteDefaultPSP">${channelOpts(chosen?.channelId||'',{siteId:ui.site,placeholder:true,templateId:site(ui.site).template})}</select></div><div class="field"><label class="required" for="siteDefaultAccount">收款账户</label><select id="siteDefaultAccount">${accountOpts(chosen?.channelId||'',chosen?.id||'',[ui.site],site(ui.site).template)}</select></div></div><p class="hint">仅更新本站后续默认购买。链接已指定的账户、已有订单和原订阅保持原支付关系。</p><div id="siteDefaultCheck"></div>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-site-default">保存本站配置</button>`,true);
    updateSiteDefaultCheck();
  }
  function readSiteDefault(){return $('#siteDefaultMode').value==='inherit'?null:{channelId:$('#siteDefaultPSP').value,accountId:$('#siteDefaultAccount').value};}
  function updateSiteDefaultCheck(){
    $('#siteDefaultFields').hidden=$('#siteDefaultMode').value==='inherit';
    const choice=readSiteDefault(),out=M.checkSiteDefault(data,ui.site,choice,now());
    const r=M.effective(out.next,ui.site);
    $('#siteDefaultCheck').innerHTML=problems(out.issues)+(!out.issues.length?`<div class="config-result">保存后：<strong>${esc(r.channel.provider)} · ${esc(r.account.name)}</strong>${renderMethods(r)}</div>`:'');
    $('[data-action="save-site-default"]').disabled=!!out.issues.length;
  }
  function editSiteMethods(id){
    if(ui.site==='all')return;
    const a=account(id);if(!a?.siteIds.includes(ui.site))return;
    ui.methodsAccount=id;ui.methodsSite=ui.site;
    modal('配置本站支付方式',`<div class="current-site-field"><strong>${esc(site(ui.site).name)}</strong><span>${esc(site(ui.site).domain)}</span></div><div class="detail-grid"><div><span class="subtext">PSP / 收款账户</span><p>${esc(channel(a.channelId).provider)} · ${esc(a.name)}</p></div><div><span class="subtext">账户支持方式</span><p>${esc(a.methods.join('、'))}</p></div></div><div class="field"><label>本站启用支付方式</label><div class="radio-row">${checks('siteMethods',a.methods.map(m=>[m,m]),M.methodsFor(data,ui.site,id))}</div><span class="hint">只调整本站，不改变账户能力和其他站点。清空后该账户不可用于本站新购买，在用配置会阻止此操作。</span></div><div id="formErrors"></div>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-site-methods">保存本站支付方式</button>`);
  }
  function skuAccountIssues(sku,a){
    const issues=M.pairIssues(data,{channelId:a.channelId,accountId:a.id},[sku.site]);
    if(!a.currencies.includes('USD'))issues.push('账户未开通美元交易');
    if(!a.types.includes(sku.type))issues.push('账户未开通'+(sku.type==='subscription'?'自动续费':'一次性支付'));
    return issues;
  }
  function editSkuPSPs(id){
    const sku=M.get(data.skus,id);if(!sku)return;
    if(ui.site==='all')switchScope(sku.site,{page:'products',quiet:true});
    if(ui.site!==sku.site)return;
    ui.editingSku=id;
    const options=data.channels.map(c=>`<label class="psp-binding-option"><input type="checkbox" name="skuPSPs" value="${c.id}"${data.skuPSPs[id].includes(c.id)?' checked':''}><span><strong>${esc(c.provider)}</strong><small>${c.enabled?'已启用':'已停用'}</small></span></label>`).join('');
    modal('配置商品支付',`<form id="skuPaymentForm"><div class="current-site-field"><strong>${esc(site(sku.site).name)}</strong><span>${esc(site(sku.site).domain)}</span></div><div class="detail-grid"><div><span class="subtext">商品 SKU</span><p>${esc(sku.name)} · ${esc(sku.code)}</p></div><div><span class="subtext">售价 / 权益</span><p>${esc(price(sku))} · ${esc(sku.rights)}</p></div></div><div class="field"><span class="field-label required" id="skuPSPLabel">允许使用的 PSP（多选）</span><div class="psp-binding-options" role="group" aria-labelledby="skuPSPLabel">${options}</div></div><section class="sku-payment-accounts" aria-labelledby="skuAccountLabel"><h3 id="skuAccountLabel">关联收款账户</h3><p class="hint">仅展示已授权给本站的账户；交易能力沿用账户已有配置。移除 PSP 时同时取消该 PSP 下的账户选择。</p><div id="skuAccountOptions"></div></section><div id="skuPaymentCheck" aria-live="polite"></div><div id="formErrors"></div></form>`,`<span class="rule-save-status" id="skuSaveStatus" role="status"></span><div class="actions"><button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save-sku-psps">保存支付配置</button></div>`,true);
    $('#modalRoot .modal').classList.add('sku-payment-modal');
    updateSkuAccounts(data.accounts.filter(a=>a.supports.includes(id)).map(a=>a.id));
  }
  function updateSkuAccounts(initial){
    const sku=M.get(data.skus,ui.editingSku),chosen=initial||checkedValues('skuAccounts'),psps=checkedValues('skuPSPs');
    $('#skuAccountOptions').innerHTML=psps.length?psps.map(id=>{
      const rows=data.accounts.filter(a=>a.channelId===id&&a.siteIds.includes(sku.site));
      return rows.length?rows.map(a=>{
        const issues=skuAccountIssues(sku,a),selected=chosen.includes(a.id);
        return `<label class="sku-account-choice${issues.length?' sku-account-unavailable':''}"><input type="checkbox" name="skuAccounts" value="${a.id}"${selected?' checked':''}${issues.length&&!selected?' disabled':''}><span><strong>${esc(a.name)}</strong><small>${esc(channel(a.channelId).provider)} · ${esc(a.code)} · ${a.environment==='live'?'正式环境':'测试环境'}</small>${issues.length?`<small class="rule-field-error">${esc(issues.join('；'))}</small>`:`<small>${esc(M.methodsFor(data,sku.site,a.id).join(' / '))}</small>`}</span></label>`;
      }).join(''):`<p class="hint sku-account-empty">${esc(channel(id).provider)} 暂无授权给本站的账户，请先在渠道管理中关联站点。</p>`;
    }).join(''):'<p class="hint sku-account-empty">选择 PSP 后可关联对应收款账户。</p>';
    updateSkuPaymentCheck();
  }
  function readSkuPayment(){return {channelIds:checkedValues('skuPSPs'),accountIds:checkedValues('skuAccounts')};}
  function updateSkuPaymentCheck(){
    const choice=readSkuPayment(),out=M.checkSkuPayment(data,ui.editingSku,choice.channelIds,choice.accountIds);
    $('#skuPaymentCheck').innerHTML=out.issues.length?problems(out.issues):'';
    $('#skuSaveStatus').textContent=out.issues.length?'请先处理商品支付配置问题':`已选 ${choice.channelIds.length} 家 PSP · ${choice.accountIds.length} 个账户`;
    $('[data-action="save-sku-psps"]').disabled=!!out.issues.length;
    $('#formErrors').innerHTML='';
  }

  async function copyLink(id){const l=M.get(data.links,id);if(!l)return;const url=linkURL(l);try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);else{const a=document.createElement('textarea');a.value=url;document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();if(!ok)throw Error();}toast(l.enabled?'示例链接已复制。':'已复制，请注意该链接已停用。');}catch(_){modal('手动复制链接',`<div class="field"><label for="copyURL">请选中并复制</label><input id="copyURL" readonly value="${esc(url)}"></div>`);requestAnimationFrame(()=>{$('#copyURL')?.focus();$('#copyURL')?.select();});}}
  function apply(next,message){data=next;persist();closeModal();renderKeep();toast(message);}
  function reset(){confirm('复位示例','<p>恢复 Waffo 主收款账户作为全局默认，以及初始多账户配置，清除本原型中的新增记录。</p>','confirm-reset');}
  function toggleChannel(id,confirmed=false){
    if(!isPaymentPage())return;
    const c={...M.copy(channel(id)),enabled:!channel(id).enabled,revision:channel(id).revision+1},result=M.checkChannel(data,c);
    if(result.issues.length){modal('暂不能'+(c.enabled?'启用':'停用')+' PSP',problems(result.issues));return;}
    if(!confirmed){confirm(c.enabled?'启用 PSP':'停用 PSP',`<p>${esc(c.provider)} 将${c.enabled?'恢复供新配置选择':'整体停止用于新支付'}，其下账户状态分别保留。历史订单保持原值。</p>`,'confirm-channel-toggle',id);return;}
    apply(result.next,c.enabled?'PSP 已启用。':'PSP 已停用。');
  }
  function toggleAccount(id,confirmed=false){
    if(!isPaymentPage())return;
    const a={...M.copy(account(id)),enabled:!account(id).enabled,revision:account(id).revision+1,updated:now()},result=M.checkAccount(data,a);
    if(result.issues.length){modal('暂不能'+(a.enabled?'启用':'停用')+'账户',problems(result.issues));return;}
    if(!confirmed){confirm(a.enabled?'启用收款账户':'停用收款账户',`<p>${esc(a.name)} 将${a.enabled?'恢复供新配置选择':'停止用于新支付'}，同一 PSP 下的其他账户保持原状态。</p>`,'confirm-account-toggle',id);return;}
    apply(result.next,a.enabled?'收款账户已启用。':'收款账户已停用。');
  }
  function action(name,id,target,event){
    if(name==='go-global'){switchScope('all',{page:'global'});return;}
    if(name==='show-site-results'){showSiteResults();return;}
    if(name==='show-site-rules'){showSiteRules();return;}
    if(name==='use-global-account'){editGlobal(id);return;}
    if(name==='choose-link-site'){const id=$('#newLinkSite').value;if(!site(id)){modalError(['请选择要生成链接的站点']);return;}const draft=ui.savedDraft?.site===id?M.copy(ui.savedDraft):null;switchScope(id,{quiet:true});newLink(draft);return;}
    if(name==='edit-site-default'){editSiteDefault();return;}
    if(name==='use-site-account'){editSiteDefault(id);return;}
    if(name==='save-site-default'){if(ui.site==='all')return;const out=M.checkSiteDefault(data,ui.site,readSiteDefault(),now());if(out.issues.length){updateSiteDefaultCheck();return;}apply(out.next,site(ui.site).name+' 的收款配置已保存。');return;}
    if(name==='restore-site-default'){if(ui.site==='all')return;const out=M.checkSiteDefault(data,ui.site,null,now());if(out.issues.length){modal('暂不能恢复继承',problems(out.issues));return;}confirm('恢复本站继承全局',`<p>${esc(site(ui.site).name)} 的后续默认购买将使用 ${esc(channel(data.globalDefault.channelId).provider)} · ${esc(account(data.globalDefault.accountId).name)}。已指定账户的链接、已有订单和原订阅保持原支付关系。</p>`,'confirm-restore-site',ui.site);return;}
    if(name==='confirm-restore-site'){if(ui.site!==id)return;const out=M.checkSiteDefault(data,id,null,now());if(out.issues.length){modal('暂不能恢复继承',problems(out.issues));return;}apply(out.next,'本站已恢复继承全局默认。');return;}
    if(name==='site-methods'){editSiteMethods(id);return;}
    if(name==='save-site-methods'){if(ui.site!==ui.methodsSite)return;const out=M.checkSiteMethods(data,ui.site,ui.methodsAccount,checkedValues('siteMethods'));if(out.issues.length){modalError(out.issues);return;}apply(out.next,'已保存 '+site(ui.site).name+' 的支付方式。');return;}
    if(name==='edit-sku-psps'){editSkuPSPs(id);return;}
    if(name==='save-sku-psps'){const sku=M.get(data.skus,ui.editingSku);if(!sku||sku.site!==ui.site)return;const choice=readSkuPayment(),out=M.checkSkuPayment(data,sku.id,choice.channelIds,choice.accountIds,now());if(out.issues.length){updateSkuPaymentCheck();return;}apply(out.next,'商品的 PSP 与收款账户关联已保存。');return;}
    if(name==='confirm-shared-account'){if(!isPaymentPage()||!ui.pendingAccount)return;const out=M.checkAccount(data,ui.pendingAccount);if(out.issues.length){modal('暂不能保存共享账户',problems(out.issues));return;}ui.pendingAccount=null;apply(out.next,'共享账户已保存，关联站点的可用配置已更新。');return;}
    if(name==='close'){closeModal();return;}
    if(name==='backdrop'){if(event.target===target)closeModal();return;}
    if(name==='new-channel'){channelForm();return;}
    if(name==='edit-channel'){channelForm(id);return;}
    if(name==='new-account'){accountForm(null,id);return;}
    if(name==='edit-account'){accountForm(id);return;}
    if(name==='account-detail'){showAccount(id);return;}
    if(name==='filter-provider'){ui.accountProvider=id;render();$('#accountPanel').scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(name==='new-rule'){editRule();return;}
    if(name==='edit-rule'){editRule(id);return;}
    if(name==='edit-global'){editGlobal();return;}
    if(name==='save-global'){if(!isPaymentPage())return;const result=M.checkGlobal(data,readGlobal());if(result.issues.length){updateGlobalCheck();return;}apply(result.next,'全局默认 PSP 与收款账户已更新。');return;}
    if(name==='save-rule'){if(!isPaymentPage())return;const r=readRule();if(data.rules.length>=30&&!M.get(data.rules,r.id)){modalError(['示例配置已达 30 条，请复位示例']);return;}const result=M.checkRule(data,r);if(result.issues.length){modalError(result.issues);return;}apply(result.next,'站点收款配置已保存，生效结果已更新。');return;}
    if(name==='toggle-rule'){const r={...M.copy(M.get(data.rules,id)),enabled:!M.get(data.rules,id).enabled,updated:now()},result=M.checkRule(data,r);if(result.issues.length){modal('暂不能'+(r.enabled?'启用':'停用'),problems(result.issues));return;}apply(result.next,r.enabled?'配置已启用，站点使用指定 PSP 与账户。':'配置已停用，站点恢复使用全局默认。');return;}
    if(name==='delete-rule'){confirm('删除停用配置','<p>仅删除此停用配置，不改变任何站点当前默认收款账户。</p>','confirm-delete-rule',id);return;}
    if(name==='confirm-delete-rule'){const r=M.get(data.rules,id);if(r&&!r.enabled){data.rules=data.rules.filter(x=>x.id!==id);persist();closeModal();render();toast('配置已删除。');}return;}
    if(name==='save-channel'){if(!isPaymentPage())return;const c=readChannel();if(data.channels.length>=8&&!channel(c.id)){modalError(['示例服务商已达上限']);return;}const result=M.checkChannel(data,c);if(result.issues.length){modalError(result.issues);return;}apply(result.next,'PSP 已保存，可在其下新增多个账户。');return;}
    if(name==='save-account'){
      if(!isPaymentPage())return;
      const a=readAccount(),old=account(a.id);
      if(data.accounts.length>=40&&!old){modalError(['示例账户已达 40 个，请复位示例']);return;}
      const result=M.checkAccount(data,a);if(result.issues.length){modalError(result.issues);return;}
      const affected=[...new Set([...(old?.siteIds||[]),...a.siteIds])];
      if(old&&affected.length>1){
        ui.pendingAccount=a;
        const changed=[['账户名称','name'],['关联站点','siteIds'],['支付方式能力','methods'],['商品关联','supports'],['账户状态','enabled']].filter(([label,key])=>JSON.stringify(old[key])!==JSON.stringify(a[key])).map(([label])=>label);
        modal('确认保存共享账户',`<div class="shared-impact-note"><strong>${esc(a.name)}</strong><p>本次修改：${esc(changed.join('、')||'账户配置')}。影响以下 ${affected.length} 个关联站点：</p><div class="impact-sites">${affected.map(id=>tag(site(id).name,'primary')).join(' ')}</div></div><p class="hint">已检查在用配置的兼容性。已有订单和原订阅保留原支付关系。</p>`,`<button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="confirm-shared-account">确认保存共享账户</button>`,true);return;
      }
      apply(result.next,'收款账户已保存。');return;
    }
    if(name==='toggle-channel'||name==='confirm-channel-toggle'){toggleChannel(id,name==='confirm-channel-toggle');return;}
    if(name==='toggle-account'||name==='confirm-account-toggle'){toggleAccount(id,name==='confirm-account-toggle');return;}
    if(name==='new-link'){newLink();return;}
    if(name==='check-link'){checkLink();return;}
    if(name==='generate-link'){generateLink();return;}
    if(name==='copy-link'){copyLink(id);return;}
    if(name==='link-detail'){showLink(id);return;}
    if(name==='disable-link'){confirm('停用推广链接',`<p>停用「${esc(M.get(data.links,id).name)}」后不再生成新的购买记录，历史订单保持原值。</p>`,'confirm-disable-link',id);return;}
    if(name==='confirm-disable-link'){const l=M.get(data.links,id);if(l)l.enabled=false;persist();closeModal();render();toast('推广链接已停用。');return;}
    if(name==='record-order'){const l=M.get(data.links,id);if(!l?.enabled)return;if(data.orders.length>=30){toast('示例订单已达 30 条，请复位示例。',true);return;}const result=M.snapshot(data,{...l,episode:l.episode||'1'},$('#purchaseSku').value,now(),$('#purchaseMethod').value);if(result.issues){$('#purchaseResult').innerHTML=problems(result.issues);return;}data.nextOrder++;data.orders.unshift(result.order);persist();renderKeep();$('#purchaseResult').innerHTML=`<div class="alert alert-success">已记录 ${esc(result.order.id)}：${esc(result.order.provider)} · ${esc(result.order.account)} · ${esc(result.order.accountCode)}。可关闭后在列表下方查看。</div>`;toast('示例下单已记录，不会真实扣款。');return;}
    if(name==='reset'){reset();return;}
    if(name==='confirm-reset'){data=M.seed();persist();closeModal();scopes.reset();persistPageScopes();Object.assign(ui,{page:'payment',search:'',channelStatus:'all',accountProvider:'all',linkForm:null,validated:null,savedDraft:null,pendingAccount:null,ruleDraft:null,accountDraft:null,channelDraft:null,editingSku:null,methodsAccount:null,methodsSite:null});try{localStorage.removeItem(KEY+'-scope');}catch(_){}render();toast('已恢复 Waffo 主账户全局默认和多账户示例。');return;}
    if(name==='reset-filters'){ui.search='';ui.channelStatus='all';ui.accountProvider='all';render();}
  }
  document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(button){if(button.dataset.action==='backdrop'&&e.target!==button)return;if(button.disabled)return;e.preventDefault();action(button.dataset.action,button.dataset.id,button,e);return;}const nav=e.target.closest('[data-page]');if(nav){e.preventDefault();navigate(nav.dataset.page);}});
  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.id==='pageSite'){switchScope(el.value);return;}
    if(el.id==='accountProvider'){ui.accountProvider=el.value;renderKeep();return;}
    if(el.id==='channelStatus'){ui.channelStatus=el.value;renderKeep();return;}
    if(el.id==='siteDefaultMode'){updateSiteDefaultCheck();return;}
    if(el.id==='siteDefaultPSP'){$('#siteDefaultAccount').innerHTML=accountOpts(el.value,'',[ui.site],site(ui.site).template);updateSiteDefaultCheck();return;}
    if(el.id==='siteDefaultAccount'){updateSiteDefaultCheck();return;}
    if(el.id==='globalDefaultSelect'){$('#globalDefaultAccount').innerHTML=accountOpts(el.value,'');updateGlobalCheck();return;}
    if(el.id==='globalDefaultAccount'){updateGlobalCheck();return;}
    if(el.name==='skuPSPs'){updateSkuAccounts();return;}
    if(el.name==='skuAccounts'){updateSkuPaymentCheck();return;}
    if(el.id==='rulePSP'){updateRuleAccounts(true);return;}
    if(el.name==='ruleSites'){updateRuleAccounts(false);return;}
    if(el.id==='ruleAccountSelect'||el.id==='ruleEnabled'){updateRuleAccounts(false);return;}
    if(el.dataset.link){const key=el.dataset.link;if(key==='name'||key==='episode')return;ui.linkForm[key]=el.value;ui.validated=null;if(key==='site'){ui.linkForm.template=site(el.value).template;ui.linkForm.channelId='';ui.linkForm.accountId='';}if(key==='mode'){ui.linkForm.channelId='';ui.linkForm.accountId='';}if(key==='channelId')ui.linkForm.accountId='';renderKeep();}
  });
  document.addEventListener('input',e=>{const el=e.target;if(el.id==='ruleName'){updateRulePreview();return;}if(el.id==='channelSearch'){ui.search=el.value;renderKeep();return;}if(el.dataset.link&&['name','episode'].includes(el.dataset.link)){ui.linkForm[el.dataset.link]=el.value;ui.validated=null;$('#generateLink').disabled=true;$('#linkValidation').innerHTML='';}});
  document.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='linkForm')generateLink();if(e.target.id==='ruleForm')action('save-rule');if(e.target.id==='channelForm')action('save-channel');if(e.target.id==='accountForm')action('save-account');if(e.target.id==='skuPaymentForm')action('save-sku-psps');});
  document.addEventListener('keydown',e=>{if(!$('#modalRoot').firstElementChild)return;if(e.key==='Escape'){closeModal();return;}if(e.key==='Tab'){const els=[...$('#modalRoot').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(el=>el.getClientRects().length);if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  window.prototypeApp={navigate,resetDemo:()=>action('confirm-reset')};
  const hash=location.hash.slice(1);if(['payment','channels','global','links','products','templates'].includes(hash))ui.page=P.group(hash)==='payment'?'payment':hash;
  persistPageScopes();
  render();
})();
