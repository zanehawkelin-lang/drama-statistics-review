import {APPS, AS_OF, DEFAULT_RANGE, STOP_TYPES, summarize, recordsFor} from './daily-data.js?v=live-status-20261118';

const icons = {
  orders:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  chat:'<path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/>',
  banner:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 17 6-5 4 3 3-5 5 6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  down:'<path d="m5 9 7 7 7-7"/>',
  sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-12-3 4 3 4"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = value => Number(value || 0).toLocaleString('en-US');
const money = value => Number(value || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
const labels = {success:'续订成功订单', recovered:'重试成功订单', failed:'续订失败订单', pending:'待重试订单', stopped:'停止续费订阅', voluntary:'用户取消订阅', terminated:'支付原因终止订阅', platform:'平台关闭订阅', unknown:'原因待确认订阅'};
const stopMetrics = ['stopped', ...STOP_TYPES.map(item=>item.metric)];
const today = AS_OF.slice(0,10);
const params = new URLSearchParams(location.search);
let filters = {...DEFAULT_RANGE, app: APPS.includes(params.get('app')) ? params.get('app') : ''};
let sort = {field:'date', direction:'desc'};
let summary, drawerMetric = 'success', drawerDay = '', recordQuery = '', platformReason = '', lastFocus, toastTimer;
const drawer = document.querySelector('#daily-drawer');

document.querySelector('#daily-app').innerHTML = `
<header class="topbar"><div class="brand"><svg class="brand-mark" viewBox="0 0 30 30" aria-hidden="true"><path fill="#d43a9e" stroke="none" d="M7 5h9a9 9 0 0 1 0 18H4z"/><path fill="#6651e9" stroke="none" d="M11 9h6a5 5 0 0 1 0 10H8z"/><path fill="#f8faff" stroke="none" d="m13 12 6 3-7 3z"/></svg><span class="brand-divider"></span>DramaVideo Backend</div><nav class="topnav" aria-label="后台中心"><span>首页</span><span class="active">业务中心</span><span>投放中心</span></nav><span class="demo-label" title="模拟数据，演示时点 ${AS_OF}，UTC+8">演示数据 · ${today.slice(5).replace('-','/')}</span><div class="avatar" aria-hidden="true">DV</div></header>
<div class="shell" id="shell"><aside class="sidebar" aria-label="业务导航"><div class="nav-item">${icon('film')}<span class="nav-label">短剧管理</span></div><div class="nav-item nav-parent">${icon('orders')}<span class="nav-label">订单管理</span>${icon('down')}</div><a class="nav-sub nav-link" href="../">订单列表</a><div class="nav-sub">订单日报</div><a class="nav-sub active nav-link" href="./" aria-current="page">自动续费</a><div class="nav-item">${icon('user')}<span class="nav-label">用户管理</span></div><div class="nav-item">${icon('chat')}<span class="nav-label">反馈管理</span></div><div class="nav-item">${icon('banner')}<span class="nav-label">Banner管理</span></div><div class="sidebar-foot"><button class="sidebar-toggle" id="collapse-sidebar" aria-label="收起或展开侧栏">${icon('sidebar')}</button><span>业务中心</span></div></aside>
<main class="main daily-main"><div class="page-heading"><div class="heading-copy"><h1>自动续费总览</h1><span class="daily-page-description">按日查看续订、重试与停止续费</span></div></div>
<form id="daily-filters" class="surface daily-filters" novalidate><div class="daily-filter-fields"><div class="field daily-app-filter"><label for="app">所属应用</label><select id="app"><option value="">全部应用</option>${APPS.map(a=>`<option>${esc(a)}</option>`).join('')}</select></div><div class="field daily-date-filter"><label for="start">日期范围 <span class="filter-zone">UTC+8</span></label><div class="date-range"><input type="date" id="start" aria-label="开始日期" max="${today}" required><span>至</span><input type="date" id="end" aria-label="结束日期" max="${today}" required></div></div><div class="daily-filter-actions"><button class="btn" type="button" id="reset">重置</button><button class="btn primary" type="submit">${icon('search')}查询</button></div></div><p id="filter-error" class="filter-error" role="alert"></p></form>
<section class="daily-summary" aria-label="续费统计"><div class="metrics-grid" id="metrics" aria-live="polite"></div></section>
<section class="surface daily-results" aria-labelledby="daily-heading"><div class="daily-result-toolbar"><div><h2 id="daily-heading">每日统计<span class="result-count" id="day-count"></span></h2><p>点击数量查看对应记录</p></div><button type="button" class="btn" id="export">${icon('export')}导出统计</button></div><div class="daily-table-scroll" role="region" aria-label="每日续费统计，可横向滚动" tabindex="0"><table class="daily-table"><thead><tr><th data-column="date">${sortButton('date','日期')}</th><th data-column="success">${sortButton('success','续订成功')}</th><th data-column="failed">${sortButton('failed','续订失败')}</th><th data-column="pending">${sortButton('pending','待重试')}<span class="column-note">截至当日</span></th><th data-column="stopped">${sortButton('stopped','停止续费')}</th><th>续订实付金额</th><th>操作</th></tr></thead><tbody id="daily-rows"></tbody></table></div></section>
</main></div><div id="statistics-tooltip" class="statistics-tooltip" role="tooltip" hidden></div>`;

function sortButton(field, label) { return `<button type="button" class="daily-sort" data-sort="${field}">${label}<span class="sort-glyph">${icon('down')}</span></button>`; }
function nextDay(day) { const value=new Date(day+'T00:00:00Z');value.setUTCDate(value.getUTCDate()+1);return value.toISOString().slice(0,10); }
function cutLabel(day) { const end=day||filters.end;return end===today?`${end.slice(5).replace('-','/')} ${AS_OF.slice(11,16)}`:`${nextDay(end).slice(5).replace('-','/')} 00:00前`; }
function statisticsStatus(day) { return day===today?'<span class="today-label" tabindex="0" data-statistics-tooltip aria-describedby="statistics-tooltip">统计中</span>':''; }
let statisticsTipTimer;
function hideStatisticsTip() { clearTimeout(statisticsTipTimer);document.querySelector('#statistics-tooltip').hidden=true; }
function showStatisticsTip(trigger) {
  if(drawer.open)return;
  clearTimeout(statisticsTipTimer);
  const tip=document.querySelector('#statistics-tooltip');
  tip.innerHTML=`<strong>当天数据尚未完整</strong><p>统计开始：<span class="tooltip-time">${today} 00:00</span><br>统计截止：<span class="tooltip-time">${nextDay(today)} 00:00</span>（不含）</p><p>模拟数据截至：<span class="tooltip-time">${AS_OF}</span><br>以上时间均为 UTC+8。</p><p>仅展示截至更新时间已发生的数据；历史日期按完整自然日展示。</p>`;
  tip.hidden=false;
  const rect=trigger.getBoundingClientRect();
  tip.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-tip.offsetWidth-12))+'px';
  tip.style.top=Math.max(12,rect.bottom+8+tip.offsetHeight>window.innerHeight-12?rect.top-tip.offsetHeight-8:rect.bottom+8)+'px';
}
function scheduleStatisticsTipHide() { clearTimeout(statisticsTipTimer);statisticsTipTimer=setTimeout(hideStatisticsTip,120); }
function countButton(metric, value, day='', extra='') { return `<button class="count-link ${extra}" data-metric="${metric}" ${day?`data-day="${day}"`:''} aria-label="查看${day?day+' ':''}${labels[metric]} ${num(value)}${stopMetrics.includes(metric)?'条':'笔'}明细" ${value?'':'disabled'}>${num(value)}</button>`; }
function amountsMarkup(amounts, compact=false) { return amounts?.length ? amounts.map(a=>`<span class="${compact?'daily-amount':'metric-money'}"><strong>${money(a.amount)}</strong><span>${esc(a.currency)}</span></span>`).join('') : `<span class="${compact?'daily-amount':'metric-money'}"><strong>0.00</strong><span>USD</span></span>`; }
function render() {
  hideStatisticsTip();
  summary = summarize(filters);
  document.querySelector('#metrics').innerHTML = `
    <article class="metric-card"><h3>续订成功订单数</h3><div class="metric-number">${countButton('success',summary.success)}<span>笔</span></div><div class="metric-secondary">其中重试成功 ${countButton('recovered',summary.recovered,'','metric-sub-link')} 笔</div></article>
    <article class="metric-card"><h3>续订失败订单数</h3><div class="metric-number">${countButton('failed',summary.failed)}<span>笔</span></div><div class="metric-secondary">发生过失败，按续费期去重</div></article>
    <article class="metric-card"><h3>待重试订单数 <span class="metric-label-note">期末</span></h3><div class="metric-number">${countButton('pending',summary.pending)}<span>笔</span></div></article>
    <article class="metric-card"><h3>停止续费订阅数</h3><div class="metric-number">${countButton('stopped',summary.stopped)}<span>条</span></div><div class="metric-secondary stop-split">${STOP_TYPES.map(item=>`<span class="stop-breakdown-item">${item.label} ${countButton(item.metric,summary[item.metric],'','metric-sub-link')}</span>`).join('')}</div></article>
    <article class="metric-card metric-amount"><h3>续订实付金额</h3><div class="metric-money-list">${amountsMarkup(summary.amounts)}</div></article>`;
  const days = sortedDays(summary.days);
  document.querySelector('#day-count').textContent = `共 ${days.length} 天`;
  document.querySelector('#daily-rows').innerHTML = days.length ? days.map(d=>`<tr><td><span class="daily-date">${d.date}</span>${statisticsStatus(d.date)}</td><td>${countButton('success',d.success,d.date)}<span class="cell-note">重试成功 ${countButton('recovered',d.recovered,d.date,'metric-sub-link')}</span></td><td>${countButton('failed',d.failed,d.date)}</td><td>${countButton('pending',d.pending,d.date)}</td><td>${countButton('stopped',d.stopped,d.date)}<span class="cell-note"><button type="button" class="text-button stop-day-details" data-metric="stopped" data-day="${d.date}" ${d.stopped?'':'disabled'}>查看原因</button></span></td><td>${amountsMarkup(d.amounts,true)}</td><td><button type="button" class="text-button primary" data-metric="success" data-day="${d.date}" aria-label="查看${d.date}的续费明细">查看明细</button></td></tr>`).join('') : '<tr><td colspan="7"><div class="daily-empty"><strong>暂无符合条件的统计</strong><p>可调整应用或日期范围后查询。</p><button class="btn" data-reset>重置筛选</button></div></td></tr>';
  document.querySelectorAll('[data-column]').forEach(th=> { const active=th.dataset.column===sort.field; th.setAttribute('aria-sort',active?(sort.direction==='asc'?'ascending':'descending'):'none'); th.querySelector('button').dataset.direction=active?sort.direction:''; });
  document.querySelector('#export').disabled = !days.length;
}
function syncForm() { document.querySelector('#app').value=filters.app; document.querySelector('#start').value=filters.start; document.querySelector('#end').value=filters.end; }
function applyFilters() {
  const next={app:document.querySelector('#app').value,start:document.querySelector('#start').value,end:document.querySelector('#end').value};
  const days=(new Date(next.end+'T00:00:00Z')-new Date(next.start+'T00:00:00Z'))/86400000;
  let error='';
  if(!next.start||!next.end||!Number.isFinite(days)) error='请选择完整的开始日期和结束日期。';
  else if(days<0) error='开始日期不能晚于结束日期，请调整日期范围。';
  else if(next.end>today) error=`演示数据截至 ${today}，请选择该日期或之前的范围。`;
  else if(days>89) error='单次最多查询90天，请缩小日期范围。';
  document.querySelector('#filter-error').textContent=error;
  if(error)return;
  filters=next;render();
}
function reset() {filters={...DEFAULT_RANGE,app:''};sort={field:'date',direction:'desc'};document.querySelector('#filter-error').textContent='';syncForm();render();}
function currentRecords() {
  const records=recordsFor(drawerMetric,filters,drawerDay||undefined).filter(r=>drawerMetric!=='platform'||!platformReason||r.reasonCode===platformReason);
  const query=recordQuery.trim().toLowerCase();
  return query?records.filter(r=>[r.userId,r.subscriptionId,r.orderId,r.billingId,...(r.attempts||[]).map(a=>a.transactionId)].some(v=>String(v||'').toLowerCase().includes(query))):records;
}
function recordClass(status, metric) { return stopMetrics.includes(metric)?'stopped':metric==='pending'?'pending':String(status).includes('成功')?'success':'failed'; }
function stopFactsMarkup(r) {
  const facts=[['停止时间',r.eventAt],['具体原因',r.reason||r.stopReason],['操作来源',r.source],['操作人',r.operator||'—']];
  if(!r.refund) facts.push(['会员权益到期',r.entitlementEnd||'—']);
  const failure=(r.attempts||[]).filter(a=>a.status==='失败').at(-1);
  if(failure) facts.push(['最近扣款失败原因',failure.reason||'未提供']);
  if(r.refund) facts.push(['退款订单',r.refund.orderId],['退款类型',r.refund.type==='partial'?'部分退款':'全额退款'],['退款金额',money(r.refund.amount)+' '+r.refund.currency],['退款成功时间',r.refund.succeededAt]);
  return facts.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'—')}</dd></div>`).join('');
}
function recordMarkup(r) {
  const isStop=stopMetrics.includes(drawerMetric);
  const isPaid=['success','recovered'].includes(drawerMetric);
  const amountLabel=isPaid?'实付金额':drawerMetric==='pending'?'预计重试金额':'请求扣款金额';
  const timestampLabel=drawerMetric==='pending'?'最近失败时间':isPaid?'成功时间':'失败时间';
  const attempted=r.attempts||[];
  const amount=isPaid?(r.paidAmount??r.amount):r.amount;
  const facts=isStop?stopFactsMarkup(r):`<div><dt>${timestampLabel}</dt><dd>${esc(r.eventAt||'—')}</dd></div><div><dt>${amountLabel}</dt><dd>${money(amount)} ${esc(r.currency||'')}</dd></div><div><dt>${drawerMetric==='pending'?'下次重试':'订阅号'}</dt><dd>${esc(drawerMetric==='pending'?r.nextAt||'待更新':r.subscriptionId)}</dd></div>`;
  return `<article class="daily-record"><div class="record-top"><strong class="record-order">${esc(isStop?r.subscriptionId:r.orderId||r.billingId)}</strong><span class="status-pill ${recordClass(r.status,drawerMetric)}">${esc(drawerMetric==='recovered'?'重试成功':r.status)}</span></div><div class="record-meta"><span>用户ID：${esc(r.userId)}</span><span>${esc(r.app)}</span><span>${esc(r.product)}</span></div><dl class="record-facts">${facts}</dl>${r.reason&&!isStop?`<p class="record-reason">${esc(r.reason)}</p>`:''}${attempted.length&&!isStop?`<details class="record-attempts"><summary class="attempt-toggle">扣款尝试 · ${attempted.length} 次</summary><ol class="attempt-list">${attempted.map((a,j)=>`<li class="attempt-row"><div class="attempt-row-top"><strong>第${j+1}次尝试</strong><span class="status-pill ${String(a.status).includes('成功')?'success':a.status==='处理中'?'pending':'failed'}">${esc(a.status)}</span><time>${esc(a.at)}</time></div><p>${String(a.status).includes('成功')?'实付':'请求扣款'} ${money(a.amount)} ${esc(a.currency)}${a.reason?' · '+esc(a.reason):''}</p>${a.transactionId?`<p class="transaction-line">三方交易号：${esc(a.transactionId)}</p>`:''}</li>`).join('')}</ol></details>`:''}</article>`;
}
function drawerTabs() {
  const stopping=stopMetrics.includes(drawerMetric);
  const family=[['success','成功'],['recovered','重试成功'],['failed','失败'],['pending','待重试'],['stopped','停止续费']];
  const main=family.map(([metric,label])=>{const active=metric===drawerMetric||(metric==='stopped'&&stopping);return `<button type="button" class="drawer-tab ${active?'active':''}" data-drawer-metric="${metric}" aria-pressed="${active}">${label}</button>`;}).join('');
  return main+(stopping?'<div class="stop-subtabs" role="group" aria-label="停止类型分类">'+[['stopped','全部停止'],...STOP_TYPES.map(item=>[item.metric,item.label])].map(([metric,label])=>`<button type="button" class="${metric===drawerMetric?'active':''}" data-drawer-metric="${metric}" aria-pressed="${metric===drawerMetric}">${label}</button>`).join('')+'</div>':'')+(drawerMetric==='platform'?`<div class="field platform-reason-field"><label for="platform-reason">关闭原因</label><select id="platform-reason"><option value="">全部原因</option><option value="manual_close" ${platformReason==='manual_close'?'selected':''}>后台人工关闭</option><option value="refund_succeeded" ${platformReason==='refund_succeeded'?'selected':''}>退款成功自动关闭</option></select></div>`:'');
}
function renderRecords() {
  const records=currentRecords();
  document.querySelector('#drawer-tabs').innerHTML=drawerTabs();
  document.querySelector('#drawer-record-count').textContent=`共 ${num(records.length)} ${stopMetrics.includes(drawerMetric)?'条订阅':'笔订单'}`;
  document.querySelector('#drawer-records').innerHTML=records.length?records.map(recordMarkup).join(''):`<div class="daily-empty"><strong>${recordQuery?'没有匹配的记录':'该条件下暂无'+labels[drawerMetric]}</strong><p>${recordQuery?'请核对编号，或清空输入查看全部记录。':'可切换上方分类，或调整看板日期和应用。'}</p>${recordQuery?'<button type="button" class="btn" data-clear-record-query>清空查询</button>':''}</div>`;
  document.querySelector('#drawer-export').disabled=!records.length;
  document.querySelector('#drawer-scope-note').textContent=drawerMetric==='pending'?`截至 ${cutLabel(drawerDay)} 的待重试存量，含此前失败订单`:stopMetrics.includes(drawerMetric)?'按实际关闭成功时间统计；同一订阅不重复计数':'订单按续费期去重';
  const reasons = new Map();
  if(drawerMetric==='failed') for(const r of records) {const reason=r.reason||'未提供原因';reasons.set(reason,(reasons.get(reason)||0)+1);}
  const reasonBox=document.querySelector('#failure-reasons');reasonBox.hidden=!reasons.size;
  reasonBox.innerHTML=reasons.size?'<span>失败原因</span>'+[...reasons].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([reason,count])=>`<span class="reason-count">${esc(reason)} <strong>${count}</strong></span>`).join(''):'';
}
function openRecords(metric='success',day='',focusSearch=false) {
  hideStatisticsTip();
  lastFocus=document.activeElement; drawerMetric=metric;drawerDay=day;recordQuery='';platformReason='';
  drawer.innerHTML=`<div class="drawer-head"><div><h2 id="daily-drawer-title">续费明细</h2><p class="drawer-subtitle">${esc(day||filters.start+' 至 '+filters.end)} · ${esc(filters.app||'全部应用')} · UTC+8</p></div><button class="icon-button" data-close aria-label="关闭明细">${icon('close')}</button></div><div class="drawer-body"><div class="drawer-search"><label for="record-query">用户 / 订阅 / 订单查询</label><div><input id="record-query" type="search" placeholder="用户ID、订阅号、订单号或三方交易号" autocomplete="off"><button class="btn" id="drawer-export">${icon('export')}导出明细</button></div></div><div class="drawer-filter-bar" id="drawer-tabs" role="group" aria-label="明细分类"></div><div class="drawer-record-meta"><span id="drawer-record-count"></span><span id="drawer-scope-note"></span></div><div class="failure-reasons" id="failure-reasons" hidden></div><div class="daily-records" id="drawer-records"></div></div>`;
  renderRecords();
  document.querySelector('#record-query').addEventListener('input',e=>{recordQuery=e.target.value;renderRecords();});
  document.querySelector('#drawer-export').addEventListener('click',exportRecords);
  if(!drawer.open)drawer.showModal();
  drawer.scrollTop=0;drawer.querySelector(focusSearch?'#record-query':'[data-close]').focus();
}
function download(name, rows) {
  const cell=v=>{const value=String(v??'');return '"'+(/^[=+\-@\t\r]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';};
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  const toast=document.querySelector('#toast');toast.textContent='导出文件已生成';toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),2200);
}
function sortedDays(days) { return [...days].sort((a,b)=>sort.field==='date' ? a.date.localeCompare(b.date)*(sort.direction==='asc'?1:-1) : (a[sort.field]-b[sort.field])*(sort.direction==='asc'?1:-1)||b.date.localeCompare(a.date)); }
function exportDays() {
  const currencies=['USD'];
  const rows=[['日期（UTC+8）','所属应用','续订成功订单数','其中重试成功','续订失败订单数','待重试订单数（截至当日）','停止续费订阅数',...STOP_TYPES.map(item=>item.label),...currencies.map(c=>'续订实付金额（'+c+'）')]];
  for(const d of sortedDays(summary.days)) rows.push([d.date,filters.app||'全部应用',d.success,d.recovered,d.failed,d.pending,d.stopped,...STOP_TYPES.map(item=>d[item.metric]),...currencies.map(c=>d.amounts.find(a=>a.currency===c)?.amount||0)]);
  download(`自动续费每日统计_${filters.start}_${filters.end}.csv`,rows);
}
function exportRecords() {
  const paid=['success','recovered'].includes(drawerMetric), stop=stopMetrics.includes(drawerMetric);
  const rows=[['记录类型','用户ID','所属应用','订阅号','续费订单号','商品','发生时间（UTC+8）','结果','原因',paid?'实付金额':stop?'金额（不适用）':'请求／预计金额','币种','下次重试时间','会员权益到期时间','停止类型','操作来源','操作人','退款订单号','退款类型','退款金额','退款币种','退款成功时间']];
  for(const r of currentRecords()) rows.push([labels[drawerMetric],r.userId,r.app,r.subscriptionId,r.orderId||'',r.product,r.eventAt,r.status,r.reason||r.stopReason||'',stop?'':paid?r.paidAmount??r.amount:r.amount,stop?'':r.currency,r.nextAt||'',r.entitlementEnd||'',stop?r.stopReason:'',stop?r.source:'',stop?r.operator:'',r.refund?.orderId||'',r.refund?(r.refund.type==='partial'?'部分退款':'全额退款'):'',r.refund?.amount??'',r.refund?.currency||'',r.refund?.succeededAt||'']);
  download(`${labels[drawerMetric]}_${drawerDay||filters.start+'_'+filters.end}.csv`,rows);
}

document.addEventListener('mouseover',e=>{const trigger=e.target.closest('[data-statistics-tooltip]');if(trigger)showStatisticsTip(trigger);});
document.addEventListener('mouseout',e=>{if(e.target.closest('[data-statistics-tooltip]'))scheduleStatisticsTipHide();});
document.addEventListener('focusin',e=>{if(e.target.matches('[data-statistics-tooltip]'))showStatisticsTip(e.target);});
document.addEventListener('focusout',e=>{if(e.target.matches('[data-statistics-tooltip]'))scheduleStatisticsTipHide();});
const statisticsTooltip=document.querySelector('#statistics-tooltip');
statisticsTooltip.addEventListener('mouseenter',()=>clearTimeout(statisticsTipTimer));
statisticsTooltip.addEventListener('mouseleave',scheduleStatisticsTipHide);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideStatisticsTip();});
window.addEventListener('scroll',hideStatisticsTip,true);
window.addEventListener('resize',hideStatisticsTip);
document.querySelector('#daily-filters').addEventListener('submit',e=>{e.preventDefault();applyFilters();});
document.querySelector('#reset').addEventListener('click',reset);
document.querySelector('#export').addEventListener('click',exportDays);
document.querySelector('#collapse-sidebar').addEventListener('click',()=>document.querySelector('#shell').classList.toggle('compact'));
document.addEventListener('click',e=>{
  const button=e.target.closest('button'); if(!button)return;
  if(button.hasAttribute('data-reset'))reset();
  else if(button.hasAttribute('data-close'))drawer.close();
  else if(button.dataset.metric)openRecords(button.dataset.metric,button.dataset.day||'');
  else if(button.dataset.drawerMetric){drawerMetric=button.dataset.drawerMetric;platformReason='';renderRecords();}
  else if(button.hasAttribute('data-clear-record-query')){recordQuery='';document.querySelector('#record-query').value='';renderRecords();}
  else if(button.dataset.sort){sort={field:button.dataset.sort,direction:sort.field===button.dataset.sort&&sort.direction==='desc'?'asc':'desc'};render();}
});
drawer.addEventListener('change',e=>{if(e.target.id==='platform-reason'){platformReason=e.target.value;renderRecords();document.querySelector('#platform-reason').focus();}});
drawer.addEventListener('close',()=>{if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
syncForm();render();
if(params.get('userId')) { openRecords('success','',true);recordQuery=params.get('userId');document.querySelector('#record-query').value=recordQuery;renderRecords(); }
