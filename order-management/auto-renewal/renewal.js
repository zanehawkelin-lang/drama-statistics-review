import {APPS,PRODUCTS,PROVIDERS,PLANS,RECORDS,successfulRenewals,selectRows,summarize} from './renewal-data.js?v=20261112';

const glyphs={orders:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',chat:'<path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/>',banner:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 17 6-5 4 3 3-5 5 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',down:'<path d="m5 9 7 7 7-7"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',reset:'<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-12-3 4 3 4"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[n]||glyphs.info}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toFixed(2);
const shortDate=v=>v?v.slice(0,16):'—';
const statusStyle={'待扣款':'pending','重试中':'retry','已停止':'stopped','成功':'success','失败':'failure','处理中':'processing'};
const badge=v=>`<span class="renew-status ${statusStyle[v]||''}"><span aria-hidden="true"></span>${esc(v)}</span>`;
const initial={app:'',query:'',provider:'',product:'',status:'',start:'',end:''};
const states={plans:{filters:{...initial},sort:'time-asc',page:1,size:10},records:{filters:{...initial,start:'2026-11-06',end:'2026-11-12'},sort:'time-desc',page:1,size:10}};
let tab=location.hash==='#records'?'records':'plans',returnFocus=null,toastTimer;
const root=document.querySelector('#renewal-app'),drawer=document.querySelector('#renewal-drawer');
const current=()=>states[tab];
const options=(xs,first='全部')=>`<option value="">${first}</option>${xs.map(x=>`<option>${esc(x)}</option>`).join('')}`;
function select(name,label,values){return `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}">${options(values)}</select></div>`;}
root.innerHTML=`<header class="topbar"><div class="brand"><svg class="brand-mark" viewBox="0 0 30 30" aria-hidden="true"><path fill="#d43a9e" stroke="none" d="M7 5h9a9 9 0 0 1 0 18H4z"/><path fill="#6651e9" stroke="none" d="M11 9h6a5 5 0 0 1 0 10H8z"/><path fill="#f8faff" stroke="none" d="m13 12 6 3-7 3z"/></svg><span class="brand-divider"></span>DramaVideo Backend</div><nav class="topnav" aria-label="后台中心"><span>首页</span><span class="active">业务中心</span><span>投放中心</span></nav><span class="demo-label">演示数据</span><div class="avatar" aria-hidden="true">DV</div></header>
<div class="shell" id="shell"><aside class="sidebar" aria-label="业务导航"><div class="nav-item">${icon('film')}<span class="nav-label">短剧管理</span></div><div class="nav-item nav-parent">${icon('orders')}<span class="nav-label">订单管理</span>${icon('down')}</div><a class="nav-sub nav-link" href="../">订单列表</a><div class="nav-sub">订单日报</div><a class="nav-sub active nav-link" href="./" aria-current="page">自动续费</a><div class="nav-item">${icon('user')}<span class="nav-label">用户管理</span></div><div class="nav-item">${icon('chat')}<span class="nav-label">反馈管理</span></div><div class="nav-item">${icon('banner')}<span class="nav-label">Banner管理</span></div><div class="sidebar-foot"><button class="sidebar-toggle" id="collapseSidebar" aria-label="收起或展开侧栏">${icon('sidebar')}</button><span>业务中心</span></div></aside>
<main class="main"><div class="page-heading"><div class="heading-copy"><h1>自动续费</h1><span class="breadcrumb">订单管理 / 自动续费</span></div><a class="text-button return-orders" href="../">返回订单列表</a></div>
<div class="renew-tabs" role="tablist" aria-label="自动续费看板"><button type="button" id="tab-plans" role="tab" data-tab="plans" aria-controls="renew-panel">续费计划<span>查看下次扣款安排</span></button><button type="button" id="tab-records" role="tab" data-tab="records" aria-controls="renew-panel">续费记录<span>查看实际扣款结果</span></button></div>
<section id="renew-panel" role="tabpanel" aria-labelledby="tab-plans"><form class="surface filters renewal-filters" id="renew-filters" novalidate><div class="filter-grid">${select('app','所属应用',APPS)}<div class="field span-2"><label for="query" id="query-label">订阅 / 用户</label><input id="query" name="query" placeholder="输入完整订阅ID或用户ID" autocomplete="off"></div>${select('status','续费状态',['待扣款','重试中','已停止'])}${select('provider','支付服务商',PROVIDERS)}${select('product','订阅商品',PRODUCTS)}<div class="field span-2"><span class="field-label" id="date-label">下次扣款时间（UTC+8）</span><div class="date-range"><input type="date" name="start" id="start" aria-label="开始日期"><span>至</span><input type="date" name="end" id="end" aria-label="结束日期"></div></div><div class="quick-range" id="quick-range"></div></div><p id="filter-error" class="filter-error" role="alert"></p><div class="filters-bottom"><span class="scope-copy" id="scope-copy"></span><div class="filter-actions"><button type="button" class="btn" id="reset">${icon('reset')}重置</button><button type="submit" class="btn primary">${icon('search')}搜索</button></div></div></form>
<section class="surface summary-strip" id="summary" aria-label="筛选结果汇总"></section>
<section class="surface result-surface renewal-results" aria-label="自动续费列表"><div class="result-toolbar"><div class="result-label"><span id="list-title"></span><span class="result-count" id="result-count" aria-live="polite"></span></div><div class="result-tools"><select class="sort-select" id="sort" aria-label="排序方式"></select><button type="button" class="btn" id="export">${icon('export')}导出筛选结果</button></div></div><div class="applied-summary" id="applied-summary"></div><div class="renew-table-scroll" tabindex="0" role="region" aria-label="自动续费表格，可横向滚动"><table class="renew-table"><thead id="columns"></thead><tbody id="rows"></tbody></table></div><div class="pagination"><span class="pagination-caption" id="page-caption"></span><div class="pagination-controls"><select id="size" aria-label="每页条数"><option value="10">10条 / 页</option><option value="20">20条 / 页</option><option value="50">50条 / 页</option></select><div class="renew-pages" id="pages"></div></div></div></section></section></main></div>`;
function filtered(){
  const rows=selectRows(tab==='plans'?PLANS:RECORDS,current().filters,tab);
  const [key,direction]=current().sort.split('-'),sign=direction==='asc'?1:-1;
  return [...rows].sort((a,b)=>{
    let va=key==='amount'?(tab==='plans'&&!a.nextAt?null:a.amount):tab==='plans'?a.nextAt:a.attemptedAt,vb=key==='amount'?(tab==='plans'&&!b.nextAt?null:b.amount):tab==='plans'?b.nextAt:b.attemptedAt;
    if(!va&&vb)return 1;if(va&&!vb)return -1;
    return (typeof va==='number'?(va-vb):String(va).localeCompare(String(vb)))*sign||a.id.localeCompare(b.id);
  });
}
function renderSummary(rows){
  const s=summarize(rows,tab),items=tab==='plans'?[['待扣款订阅',s.pending,'个'],['重试中订阅',s.retry,'个'],['计划扣款金额',`$${money(s.amount)}`,'USD'],['已停止续费',s.stopped,'个']]:[['扣款尝试',s.attempts,'次'],['扣款成功',s.success,'次'],['扣款成功率',s.rate===null?'—':`${s.rate.toFixed(1)}%`,''],['实收金额',`$${money(s.amount)}`,'USD']];
  document.querySelector('#summary').innerHTML=items.map(([label,value,unit])=>`<div class="summary-item"><span class="summary-label">${label}${label==='扣款成功率'?`<span title="成功次数 ÷（成功次数 ＋ 失败次数），处理中不计入分母" class="metric-help">${icon('info')}</span>`:''}</span><div class="summary-value">${value}<small>${unit}</small></div></div>`).join('');
}
function userCell(r){return `<strong class="user-id">用户ID：${r.userId}</strong><span class="cell-secondary">${r.app} · ${r.country}</span>`;}
function planRow(r){return `<tr><td>${userCell(r)}</td><td><button type="button" class="order-link" data-plan="${r.id}">${r.id}</button><span class="cell-secondary">${r.product} · ${r.cycle}</span></td><td>${badge(r.status)}<span class="cell-secondary">订阅${r.subscriptionStatus}</span></td><td class="date-cell">${shortDate(r.nextAt)}${r.status==='重试中'?'<span class="cell-secondary">下次重试</span>':''}</td><td><span class="money">${r.nextAt?'$'+money(r.amount):'—'}</span>${r.nextAt?'<span class="currency">USD</span>':''}</td><td>${r.provider}<span class="cell-secondary">${r.method}</span></td><td>${successfulRenewals(r.id)}<span class="cell-secondary">次成功续费</span></td><td><button class="text-button primary" data-plan="${r.id}">查看详情</button><button class="text-button" data-related="${r.id}">续费记录</button></td></tr>`;}
function recordRow(r){return `<tr><td>${userCell(r)}</td><td><button type="button" class="order-link" data-record="${r.id}">${r.id}</button><span class="cell-secondary">${r.subscriptionId}</span></td><td>${r.product}<span class="cell-secondary">本期第${r.attemptNo}次尝试</span></td><td>${badge(r.status)}<span class="cell-secondary ${r.status==='失败'?'failure-copy':''}">${r.failureReason|| (r.status==='成功'?'已确认收款':'等待支付结果')}</span></td><td class="date-cell">${shortDate(r.attemptedAt)}</td><td><span class="money">$${money(r.amount)}</span><span class="currency">USD</span><span class="cell-secondary">实收 ${r.status==='成功'?'$'+money(r.received):'—'}</span></td><td>${r.provider}<span class="cell-secondary">${r.method}</span></td><td><button class="text-button primary" data-record="${r.id}">查看详情</button>${r.orderId?`<button class="text-button" data-order="${r.id}">查看订单</button>`:''}</td></tr>`;}
function renderRows(){
  const rows=filtered(),s=current(),max=Math.max(1,Math.ceil(rows.length/s.size));s.page=Math.min(s.page,max);
  renderSummary(rows);
  document.querySelector('#result-count').textContent=`共 ${rows.length} ${tab==='plans'?'个订阅':'次尝试'}`;
  document.querySelector('#columns').innerHTML='<tr>'+(tab==='plans'?['用户信息','订阅信息','续费状态','下次扣款时间','计划扣款金额','支付渠道','累计续费','操作']:['用户信息','扣款 / 订阅信息','订阅商品','扣款结果','扣款时间','扣款金额','支付渠道','操作']).map(t=>`<th scope="col">${t}</th>`).join('')+'</tr>';
  document.querySelector('#rows').innerHTML=rows.length?rows.slice((s.page-1)*s.size,s.page*s.size).map(tab==='plans'?planRow:recordRow).join(''):`<tr><td colspan="8" class="renew-empty"><strong>没有符合条件的${tab==='plans'?'续费计划':'扣款记录'}</strong><p>调整筛选条件，或重置后查看全部记录。</p><button class="btn" data-reset>重置筛选</button></td></tr>`;
  document.querySelector('#page-caption').textContent=rows.length?`第 ${(s.page-1)*s.size+1}—${Math.min(s.page*s.size,rows.length)} 条，共 ${rows.length} 条`:'共 0 条';
  document.querySelector('#pages').innerHTML=`<button class="page-btn" data-page="${s.page-1}" aria-label="上一页" ${s.page===1?'disabled':''}>上一页</button>${Array.from({length:max},(_,i)=>`<button class="page-btn ${s.page===i+1?'selected':''}" data-page="${i+1}" aria-label="第${i+1}页" ${s.page===i+1?'aria-current="page"':''}>${i+1}</button>`).join('')}<button class="page-btn" data-page="${s.page+1}" aria-label="下一页" ${s.page===max?'disabled':''}>下一页</button>`;
  document.querySelector('#export').disabled=!rows.length;
  const f=s.filters,labels=[f.app,f.query,f.status,f.provider,f.product,f.start||f.end?`${f.start||'不限'} 至 ${f.end||'不限'}`:''].filter(Boolean);
  document.querySelector('#applied-summary').innerHTML=labels.map(t=>`<span class="renew-chip">${esc(t)}</span>`).join('');
}
function renderTab(focus=false){
  document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  document.querySelector('#renew-panel').setAttribute('aria-labelledby',`tab-${tab}`);
  document.querySelector('#status').innerHTML=options(tab==='plans'?['待扣款','重试中','已停止']:['成功','失败','处理中']);
  document.querySelector('label[for="status"]').textContent=tab==='plans'?'续费状态':'扣款结果';
  document.querySelector('#query-label').textContent=tab==='plans'?'订阅 / 用户':'扣款 / 订单 / 用户';
  document.querySelector('#query').placeholder=tab==='plans'?'输入完整订阅ID或用户ID':'输入完整扣款、订阅、订单或用户ID';
  document.querySelector('#date-label').textContent=(tab==='plans'?'下次扣款时间':'扣款时间')+'（UTC+8）';
  document.querySelector('#scope-copy').textContent=tab==='plans'?'按订阅查看，计划金额以实际扣款结果为准。':'每行一次扣款尝试，失败重试单独记录。';
  document.querySelector('#quick-range').innerHTML=tab==='plans'?'<button type="button" class="range-button" data-range="next">未来7天</button><button type="button" class="range-button" data-range="all">全部时间</button>':'<button type="button" class="range-button" data-range="recent">最近7天</button><button type="button" class="range-button" data-range="all">全部时间</button>';
  document.querySelector('#list-title').textContent=tab==='plans'?'续费计划明细':'自动扣款明细';
  const timeLabel=tab==='plans'?'下次扣款时间':'扣款时间';
  document.querySelector('#sort').innerHTML=`<option value="time-${tab==='plans'?'asc':'desc'}">${timeLabel}：${tab==='plans'?'从近到远':'从新到旧'}</option><option value="time-${tab==='plans'?'desc':'asc'}">${timeLabel}：${tab==='plans'?'从远到近':'从旧到新'}</option><option value="amount-desc">扣款金额：从高到低</option><option value="amount-asc">扣款金额：从低到高</option>`;
  for(const [key,value]of Object.entries(current().filters))document.getElementById(key).value=value;
  document.querySelector('#sort').value=current().sort;document.querySelector('#size').value=current().size;
  document.querySelector('#filter-error').textContent='';renderRows();if(focus)document.querySelector(`#tab-${tab}`).focus();
}
function changeTab(next){tab=next;history.replaceState(null,'',`#${next}`);renderTab();}
function search(){
  const data=Object.fromEntries(new FormData(document.querySelector('#renew-filters')));data.query=data.query.trim();
  if(data.start&&data.end&&data.start>data.end){document.querySelector('#filter-error').textContent='开始日期不能晚于结束日期，请调整时间范围。';return;}
  document.querySelector('#filter-error').textContent='';current().filters=data;current().page=1;renderRows();
}
function reset(){current().filters={...initial,...(tab==='records'?{start:'2026-11-06',end:'2026-11-12'}:{})};current().sort=tab==='plans'?'time-asc':'time-desc';current().page=1;renderTab();}
function field(label,value){return `<div class="detail-field"><dt>${label}</dt><dd>${value}</dd></div>`;}
function openDrawer(title,subtitle,body){if(!drawer.open)returnFocus=document.activeElement;drawer.innerHTML=`<div class="drawer-head"><div><h2 id="drawer-title">${title}</h2><p class="drawer-subtitle">${esc(subtitle)}</p></div><button class="icon-button" data-close aria-label="关闭详情">${icon('close')}</button></div><div class="drawer-body">${body}</div>`;if(!drawer.open)drawer.showModal();drawer.querySelector('[data-close]').focus();}
function planDetails(id){
  const p=PLANS.find(x=>x.id===id);if(!p)return;
  const records=RECORDS.filter(r=>r.subscriptionId===id).sort((a,b)=>b.attemptedAt.localeCompare(a.attemptedAt));
  openDrawer('续费计划详情',p.id,`<div class="detail-status">${badge(p.status)}<span>订阅${p.subscriptionStatus}</span></div><h3 class="section-title">下次扣款</h3><dl class="detail-grid">${field('预计扣款时间',shortDate(p.nextAt))}${field('计划扣款金额',p.nextAt?'$'+money(p.amount)+' USD':'—')}${field('当前权益到期时间',shortDate(p.periodEnd))}${field('续费周期',p.cycle)}</dl>${p.status==='重试中'?'<p class="retry-notice">最近一次扣款失败。此处展示演示重试安排。</p>':''}<div class="divider"></div><h3 class="section-title">订阅信息</h3><dl class="detail-grid">${field('用户ID',p.userId)}${field('所属应用',p.app)}${field('订阅商品',p.product)}${field('支付渠道',p.provider+' · '+p.method)}${field('订阅创建时间',shortDate(p.createdAt))}${field('累计成功续费',successfulRenewals(id)+' 次')}</dl><div class="section-heading"><h3 class="section-title">最近扣款</h3><button class="text-button primary" data-related="${id}">查看全部记录</button></div>${records.slice(0,3).map(r=>`<div class="attempt-row"><div><button class="order-link" data-record="${r.id}">${r.id}</button><span class="cell-secondary">${shortDate(r.attemptedAt)} · 本期第${r.attemptNo}次尝试</span></div>${badge(r.status)}</div>`).join('')}`);
}
function recordDetails(id,orderOnly=false){
  const r=RECORDS.find(x=>x.id===id);if(!r)return;
  const sameBill=RECORDS.filter(x=>x.billingId===r.billingId).sort((a,b)=>a.attemptNo-b.attemptNo);
  openDrawer(orderOnly?'续费订单摘要':'自动扣款详情',orderOnly?r.orderId:r.id,`<div class="detail-status">${badge(r.status)}<span>${r.product} · ${r.app}</span></div><h3 class="section-title">扣款结果</h3><dl class="detail-grid">${field('扣款金额','$'+money(r.amount)+' USD')}${field('实际收款',r.status==='成功'?'$'+money(r.received)+' USD':'—')}${field('扣款时间',shortDate(r.attemptedAt))}${field('支付成功时间',shortDate(r.paidAt))}${field('支付服务商',r.provider)}${field('支付方式',r.method)}${field('三方交易号',r.transactionId||'—')}${field('订单号',r.orderId||'—')}</dl>${r.status==='失败'?`<div class="failure-notice"><strong>${esc(r.failureReason)}</strong><p>渠道返回：${esc(r.failureCode)}</p></div>`:''}<div class="divider"></div><h3 class="section-title">关联订阅</h3><dl class="detail-grid">${field('订阅ID',`<button class="order-link" data-plan="${r.subscriptionId}">${r.subscriptionId}</button>`)}${field('用户ID',r.userId)}${field('本期扣款编号',r.billingId)}${field('本次尝试','第'+r.attemptNo+'次')}</dl><h3 class="section-title">本期扣款尝试</h3>${sameBill.map(x=>`<div class="attempt-row"><div><span>第${x.attemptNo}次尝试</span><span class="cell-secondary">${shortDate(x.attemptedAt)}</span></div>${badge(x.status)}</div>`).join('')}`);
}
function exportRows(){
  const rows=filtered();if(!rows.length)return;
  const header=tab==='plans'?['订阅ID','用户ID','所属应用','商品','续费状态','订阅状态','下次扣款时间（UTC+8）','计划扣款金额','币种','支付服务商','支付方式','累计成功续费次数']:['扣款ID','订阅ID','本期扣款编号','尝试次数','用户ID','所属应用','商品','扣款结果','失败原因','扣款时间（UTC+8）','扣款金额','实际收款','币种','三方交易号','订单号'];
  const lines=rows.map(r=>tab==='plans'?[r.id,r.userId,r.app,r.product,r.status,r.subscriptionStatus,r.nextAt,r.nextAt?money(r.amount):'',r.currency,r.provider,r.method,successfulRenewals(r.id)]:[r.id,r.subscriptionId,r.billingId,r.attemptNo,r.userId,r.app,r.product,r.status,r.failureReason,r.attemptedAt,money(r.amount),r.status==='成功'?money(r.received):'',r.currency,r.transactionId,r.orderId]);
  const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"',csv=[header,...lines].map(row=>row.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=`${tab==='plans'?'续费计划':'续费记录'}_${rows.length}条.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  const t=document.querySelector('#toast');t.textContent=`已导出 ${rows.length} 条筛选结果`;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),2500);
}
document.querySelector('#renew-filters').addEventListener('submit',e=>{e.preventDefault();search();});
document.querySelector('#reset').addEventListener('click',reset);
document.querySelector('#sort').addEventListener('change',e=>{current().sort=e.target.value;current().page=1;renderRows();});
document.querySelector('#size').addEventListener('change',e=>{current().size=Number(e.target.value);current().page=1;renderRows();});
document.querySelector('#export').addEventListener('click',exportRows);
document.querySelector('#collapseSidebar').addEventListener('click',()=>document.querySelector('#shell').classList.toggle('compact'));
document.querySelector('.renew-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();changeTab(e.key==='Home'?'plans':e.key==='End'?'records':tab==='plans'?'records':'plans');document.querySelector(`#tab-${tab}`).focus();});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){changeTab(b.dataset.tab);return;}
  if(b.hasAttribute('data-close')){drawer.close();return;}
  if(b.dataset.plan){planDetails(b.dataset.plan);return;}
  if(b.dataset.record){recordDetails(b.dataset.record);return;}
  if(b.dataset.order){recordDetails(b.dataset.order,true);return;}
  if(b.dataset.related){if(drawer.open)drawer.close();states.records.filters={...initial,query:b.dataset.related};states.records.page=1;changeTab('records');document.querySelector('#query').focus();return;}
  if(b.dataset.page){current().page=Number(b.dataset.page);renderRows();document.querySelector('.renew-table-scroll').scrollTop=0;return;}
  if(b.hasAttribute('data-reset')){reset();return;}
  if(b.dataset.range){const mode=b.dataset.range;document.querySelector('#start').value=mode==='next'?'2026-11-13':mode==='recent'?'2026-11-06':'';document.querySelector('#end').value=mode==='next'?'2026-11-19':mode==='recent'?'2026-11-12':'';search();}
});
drawer.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
window.addEventListener('hashchange',()=>{tab=location.hash==='#records'?'records':'plans';renderTab();});
renderTab();
