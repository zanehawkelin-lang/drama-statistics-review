import {APPS,USERS,SUBSCRIPTIONS,selectSubscriptions,billingHistory,latestBilling,successfulRenewals,entitlementValid} from './renewal-data.js?v=user-overview-20261112';
const glyphs={orders:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',chat:'<path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/>',banner:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 17 6-5 4 3 3-5 5 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',down:'<path d="m5 9 7 7 7-7"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',reset:'<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-12-3 4 3 4"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[n]||glyphs.info}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toFixed(2),date=v=>v?v.slice(0,16):'—';
const kinds={'生效中':'active','已取消':'canceled','已到期':'expired','成功':'success','失败':'failure','处理中':'processing'};
const badge=value=>`<span class="renew-status ${kinds[value]||''}"><span aria-hidden="true"></span>${esc(value)}</span>`;
const defaults={userId:'810001',app:'DramaVideo',status:''};
const query=new URLSearchParams(location.search);
let applied={...defaults,...(query.has('userId')?{userId:query.get('userId')}:{})},sort='next-asc',page=1,pageSize=10,lastFocus,toastTimer;
if(query.has('app')&&(APPS.includes(query.get('app'))||query.get('app')===''))applied.app=query.get('app');
const root=document.querySelector('#renewal-app'),drawer=document.querySelector('#renewal-drawer');
root.innerHTML=`<header class="topbar"><div class="brand"><svg class="brand-mark" viewBox="0 0 30 30" aria-hidden="true"><path fill="#d43a9e" stroke="none" d="M7 5h9a9 9 0 0 1 0 18H4z"/><path fill="#6651e9" stroke="none" d="M11 9h6a5 5 0 0 1 0 10H8z"/><path fill="#f8faff" stroke="none" d="m13 12 6 3-7 3z"/></svg><span class="brand-divider"></span>DramaVideo Backend</div><nav class="topnav" aria-label="后台中心"><span>首页</span><span class="active">业务中心</span><span>投放中心</span></nav><span class="demo-label">演示数据</span><div class="avatar" aria-hidden="true">DV</div></header>
<div class="shell" id="shell"><aside class="sidebar" aria-label="业务导航"><div class="nav-item">${icon('film')}<span class="nav-label">短剧管理</span></div><div class="nav-item nav-parent">${icon('orders')}<span class="nav-label">订单管理</span>${icon('down')}</div><a class="nav-sub nav-link" href="../">订单列表</a><div class="nav-sub">订单日报</div><a class="nav-sub active nav-link" href="./" aria-current="page">自动续费</a><div class="nav-item">${icon('user')}<span class="nav-label">用户管理</span></div><div class="nav-item">${icon('chat')}<span class="nav-label">反馈管理</span></div><div class="nav-item">${icon('banner')}<span class="nav-label">Banner管理</span></div><div class="sidebar-foot"><button class="sidebar-toggle" id="collapseSidebar" aria-label="收起或展开侧栏">${icon('sidebar')}</button><span>业务中心</span></div></aside>
<main class="main"><div class="page-heading"><div class="heading-copy"><h1>用户订阅总览</h1><span class="breadcrumb">订单管理 / 自动续费</span></div><a class="text-button return-orders" href="../">返回订单列表</a></div>
<form id="user-search" class="surface user-search" novalidate><div class="search-fields"><div class="field user-search-id"><label for="userId">用户ID</label><input id="userId" name="userId" placeholder="输入完整用户ID" autocomplete="off" list="demo-users"><datalist id="demo-users">${USERS.map(u=>`<option value="${u.id}">${u.country}</option>`).join('')}</datalist></div><div class="field"><label for="app">所属应用</label><select id="app" name="app"><option value="">全部应用</option>${APPS.map(a=>`<option>${a}</option>`).join('')}</select></div><div class="search-actions"><button class="btn" type="button" id="reset">${icon('reset')}重置</button><button class="btn primary" type="submit">${icon('search')}查询</button></div><button class="text-button advanced-toggle" type="button" id="advanced-toggle" aria-expanded="false" aria-controls="advanced">高级筛选${icon('down')}</button></div><div class="advanced" id="advanced" hidden><div class="field status-field"><label for="status">订阅状态</label><select name="status" id="status"><option value="">全部状态</option><option>生效中</option><option>已取消</option><option>已到期</option></select></div></div><p id="filter-error" class="filter-error" role="alert"></p></form>
<section class="surface overview-results" aria-label="用户订阅查询结果"><div class="user-context" id="user-context"></div><div class="result-toolbar"><div class="result-label">订阅列表<span class="result-count" id="result-count" aria-live="polite"></span><button type="button" class="status-chip" id="status-chip" hidden></button></div><div class="result-tools"><select class="sort-select" id="sort" aria-label="订阅排序"><option value="next-asc">下次扣款：从近到远</option><option value="next-desc">下次扣款：从远到近</option><option value="created-desc">订阅创建：从新到旧</option></select><button type="button" class="btn" id="export">${icon('export')}导出订阅</button></div></div><div class="overview-scroll" tabindex="0" role="region" aria-label="用户订阅列表，可横向滚动"><table class="overview-table"><thead><tr><th scope="col">订阅信息</th><th scope="col">订阅状态</th><th scope="col">下次扣款</th><th scope="col">最近扣款</th><th scope="col">操作</th></tr></thead><tbody id="rows"></tbody></table></div><div class="pagination" id="pagination" hidden><span class="pagination-caption" id="page-caption"></span><div class="pagination-controls"><select id="size" aria-label="每页条数"><option value="10">10条 / 页</option><option value="20">20条 / 页</option><option value="50">50条 / 页</option></select><div id="pages" class="renew-pages"></div></div></div></section></main></div>`;
function visibleRows(){
  const [key,direction]=sort.split('-'),sign=direction==='asc'?1:-1;
  return selectSubscriptions(applied).sort((a,b)=>{
    const av=key==='next'?a.nextAt:a.createdAt,bv=key==='next'?b.nextAt:b.createdAt;
    if(!av&&bv)return 1;if(av&&!bv)return -1;
    return av.localeCompare(bv)*sign||a.id.localeCompare(b.id);
  });
}
function subscriptionState(s){
  const note=s.status==='已取消'&&entitlementValid(s)?`权益有效至 ${s.periodEnd.slice(0,10)}`:s.retry?'扣款待重试':s.status==='生效中'?'自动续费已开启':'自动续费已关闭';
  return `${badge(s.status)}<span class="cell-secondary ${s.retry?'warning-copy':''}">${note}</span>`;
}
function nextCharge(s){return s.nextAt?`<span class="cell-primary">${date(s.nextAt)}</span><span class="cell-secondary">${s.retry?'<span class="warning-copy">下次重试</span> · ':''}预计 $${money(s.amount)} ${s.currency}</span>`:`<span class="muted">—</span><span class="cell-secondary">${s.status==='已取消'?'已取消自动续费':'无后续扣款计划'}</span>`;}
function recentCharge(s){
  const b=latestBilling(s.id);if(!b)return '<span class="muted">暂无续费记录</span><span class="cell-secondary">尚未发生续费</span>';
  return `${badge(b.status)}${b.status==='成功'?`<span class="recent-amount">$${money(b.received)} <span class="currency">${b.currency}</span></span>`:''}<span class="cell-secondary">${date(b.latestAt)}</span>${b.status==='失败'?`<span class="failure-copy recent-reason">${esc(b.failureReason)}</span>`:''}`;
}
function row(s){return `<tr><td><strong class="subscription-product">${s.product}</strong><span class="cycle-label">每${s.cycle}天</span><span class="cell-secondary subscription-id">${s.id}${applied.app?'':` · ${s.app}`}</span></td><td>${subscriptionState(s)}</td><td>${nextCharge(s)}</td><td>${recentCharge(s)}</td><td><button type="button" class="text-button primary view-subscription" data-view="${s.id}" aria-label="查看订阅${s.id}的详情">查看详情</button></td></tr>`;}
function render(){
  const rows=visibleRows(),user=USERS.find(u=>u.id===applied.userId),max=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,max);
  const context=document.querySelector('#user-context');context.hidden=!user;
  context.innerHTML=user?`<div class="user-context-main"><span class="context-label">当前用户</span><strong>${user.id}</strong><span class="context-country">${user.country}</span></div><div class="context-app"><span class="context-label">所属应用</span><span>${esc(applied.app||'全部应用')}</span></div>`:'';
  document.querySelector('#result-count').textContent=`共 ${rows.length} 条订阅`;
  const statusChip=document.querySelector('#status-chip');statusChip.hidden=!applied.status;statusChip.innerHTML=applied.status?`${applied.status}${icon('close')}`:'';statusChip.setAttribute('aria-label','清除订阅状态筛选');
  const emptyTitle=!user?'未找到该用户':applied.status?'没有符合条件的订阅':'该用户暂无订阅记录';
  const emptyCopy=!user?'请核对完整用户ID后重新查询。':applied.status?'清除订阅状态筛选后查看该用户的全部订阅。':'可以切换所属应用，查看该用户的其他订阅。';
  document.querySelector('#rows').innerHTML=rows.length?rows.slice((page-1)*pageSize,page*pageSize).map(row).join(''):`<tr><td colspan="5" class="overview-empty"><strong>${emptyTitle}</strong><p>${emptyCopy}</p>${applied.status?'<button class="btn" data-clear-status>清除状态筛选</button>':''}</td></tr>`;
  document.querySelector('#export').disabled=!rows.length;
  document.querySelector('#pagination').hidden=rows.length<=10;
  document.querySelector('#page-caption').textContent=`第 ${rows.length?(page-1)*pageSize+1:0}—${Math.min(page*pageSize,rows.length)} 条，共 ${rows.length} 条`;
  document.querySelector('#pages').innerHTML=`<button class="page-btn" data-page="${page-1}" aria-label="上一页" ${page===1?'disabled':''}>上一页</button><span class="page-number">${page} / ${max}</span><button class="page-btn" data-page="${page+1}" aria-label="下一页" ${page===max?'disabled':''}>下一页</button>`;
}
function syncForm(){for(const [key,value]of Object.entries(applied))document.getElementById(key).value=value;document.querySelector('#sort').value=sort;}
function search(){
  const data=Object.fromEntries(new FormData(document.querySelector('#user-search')));data.userId=data.userId.trim();
  if(!data.userId){document.querySelector('#filter-error').textContent='请输入用户ID后查询。';document.querySelector('#userId').focus();return;}
  document.querySelector('#filter-error').textContent='';applied=data;page=1;render();
}
function clearStatus(){applied.status='';document.querySelector('#status').value='';page=1;render();}
function reset(){applied={...defaults};sort='next-asc';page=1;pageSize=10;syncForm();document.querySelector('#size').value='10';document.querySelector('#filter-error').textContent='';document.querySelector('#advanced').hidden=true;document.querySelector('#advanced-toggle').setAttribute('aria-expanded','false');render();}
const field=(label,value)=>`<div class="detail-field"><dt>${label}</dt><dd>${value}</dd></div>`;
function attemptDetails(b){
  return `<div class="billing-identifiers"><div><span>续费订单号</span><strong>${b.orderId}</strong></div><div><span>订阅商品</span><strong>${b.product}</strong></div></div><ol class="attempt-list">${b.attempts.map(a=>`<li><div class="attempt-heading"><strong>第${a.attemptNo}次尝试</strong>${badge(a.status)}<time>${date(a.attemptedAt)}</time></div><dl class="attempt-fields">${field('扣款金额',`$${money(a.requested)} ${a.currency}`)}${field('实付金额',a.status==='成功'?`$${money(a.received)} ${a.currency}`:'—')}${field('支付渠道',`${a.provider} · ${a.method}`)}${field('三方交易号',esc(a.transactionId||'—'))}</dl>${a.status==='失败'?`<p class="attempt-failure">${esc(a.failureReason)}<span>渠道代码：${esc(a.failureCode)}</span></p>`:''}</li>`).join('')}</ol>`;
}
function billingRows(bills){
  if(!bills.length)return '<div class="history-empty">暂无续费记录<p>该订阅尚未发生续费，首次购买不计入续费历史。</p></div>';
  return `<div class="history-scroll"><table class="billing-table"><thead><tr><th scope="col">续费订单 / 时间</th><th scope="col">实付金额</th><th scope="col">最终结果</th><th scope="col">操作</th></tr></thead><tbody>${bills.map(b=>`<tr><td><span class="billing-order">${b.orderId}</span><span class="cell-secondary">${date(b.latestAt)}</span></td><td class="history-money">${b.status==='成功'?`$${money(b.received)}<span class="currency">${b.currency}</span>`:'<span class="muted">—</span>'}</td><td>${badge(b.status)}${b.status==='失败'?`<span class="cell-secondary failure-copy">${esc(b.failureReason)}</span>`:''}</td><td><button type="button" class="text-button primary" data-bill="${b.billingId}" data-count="${b.attempts.length}" aria-expanded="false" aria-controls="detail-${b.billingId}">展开明细${b.attempts.length>1?`（${b.attempts.length}次）`:''}</button></td></tr><tr id="detail-${b.billingId}" class="billing-detail-row" hidden><td colspan="4">${attemptDetails(b)}</td></tr>`).join('')}</tbody></table></div>`;
}
function showDetails(id){
  const s=SUBSCRIPTIONS.find(s=>s.id===id);if(!s)return;
  lastFocus=document.activeElement;const bills=billingHistory(id);
  const next=s.nextAt?`<dl class="detail-grid next-fields">${field(s.retry?'下次重试时间':'下次扣款时间',date(s.nextAt))}${field('预计扣款金额',`$${money(s.amount)} ${s.currency}`)}</dl>`:`<p class="no-next">${s.status==='已取消'?`自动续费已关闭${entitlementValid(s)?`，会员权益有效至 ${date(s.periodEnd)}`:''}。`:'订阅已到期，无后续扣款计划。'}</p>`;
  drawer.innerHTML=`<div class="drawer-head"><div><h2 id="drawer-title">订阅详情</h2><p class="drawer-subtitle">${s.id}</p></div><button type="button" class="icon-button" data-close aria-label="关闭订阅详情">${icon('close')}</button></div><div class="drawer-body"><div class="subscription-detail-heading"><strong>${s.product}<span>每${s.cycle}天</span></strong>${badge(s.status)}</div><section class="detail-section" aria-labelledby="subscription-info-title"><h3 class="section-title" id="subscription-info-title">订阅信息</h3><dl class="detail-grid">${field('用户ID / 所属应用',`${s.userId} / ${s.app}`)}${field('订阅创建时间',date(s.createdAt))}${field('当前会员权益到期时间',date(s.periodEnd))}${field('累计成功续费次数',`${successfulRenewals(id)} 次`)}${field('支付服务商',s.provider)}${field('支付方式',s.method)}${s.canceledAt?field('取消续费时间',date(s.canceledAt)):''}</dl></section><section class="detail-section" aria-labelledby="next-charge-title"><h3 class="section-title" id="next-charge-title">下次扣款${s.retry?'<span class="retry-label">待重试</span>':''}</h3>${next}</section><section class="detail-section history-section" aria-labelledby="history-title"><div class="history-heading"><h3 class="section-title" id="history-title">续费历史<span>${bills.length}期</span></h3><span>按每期续费汇总</span></div>${billingRows(bills)}</section></div>`;
  if(!drawer.open)drawer.showModal();drawer.scrollTop=0;drawer.querySelector('[data-close]').focus();
}
function exportRows(){
  const rows=visibleRows();if(!rows.length)return;
  const header=['用户ID','所属应用','订阅ID','订阅商品','周期（天）','订阅状态','下次扣款时间（UTC+8）','下次是否重试','预计扣款金额','币种','最近扣款结果','最近扣款时间（UTC+8）','最近实付金额','最近失败原因','支付服务商','支付方式'];
  const lines=rows.map(s=>{const b=latestBilling(s.id);return [s.userId,s.app,s.id,s.product,s.cycle,s.status,s.nextAt,s.retry?'是':'否',s.nextAt?money(s.amount):'',s.currency,b?.status||'',b?.latestAt||'',b?.status==='成功'?money(b.received):'',b?.failureReason||'',s.provider,s.method];});
  const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"',csv=[header,...lines].map(r=>r.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=`用户${applied.userId}_订阅总览_${rows.length}条.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  const toast=document.querySelector('#toast');toast.textContent=`已导出 ${rows.length} 条订阅`;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2500);
}
function toggleBill(button){
  const row=document.getElementById(`detail-${button.dataset.bill}`);row.hidden=!row.hidden;button.setAttribute('aria-expanded',String(!row.hidden));button.textContent=row.hidden?`展开明细${Number(button.dataset.count)>1?`（${button.dataset.count}次）`:''}`:'收起明细';
}
 document.querySelector('#user-search').addEventListener('submit',e=>{e.preventDefault();search();});
 document.querySelector('#reset').addEventListener('click',reset);
 document.querySelector('#status-chip').addEventListener('click',clearStatus);
 document.querySelector('#advanced-toggle').addEventListener('click',e=>{const section=document.querySelector('#advanced');section.hidden=!section.hidden;e.currentTarget.setAttribute('aria-expanded',String(!section.hidden));});
 document.querySelector('#sort').addEventListener('change',e=>{sort=e.target.value;page=1;render();});
 document.querySelector('#size').addEventListener('change',e=>{pageSize=Number(e.target.value);page=1;render();});
 document.querySelector('#export').addEventListener('click',exportRows);
 document.querySelector('#collapseSidebar').addEventListener('click',()=>document.querySelector('#shell').classList.toggle('compact'));
 document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.view){showDetails(button.dataset.view);return;}if(button.hasAttribute('data-close')){drawer.close();return;}if(button.dataset.bill){toggleBill(button);return;}if(button.hasAttribute('data-clear-status')){clearStatus();return;}if(button.dataset.page){page=Number(button.dataset.page);render();}});
 drawer.addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
 syncForm();render();
