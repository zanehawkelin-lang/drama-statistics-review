import {ORDERS,DRAMAS,PRODUCTS,APPS,COUNTRIES,PROMOTERS,PROMOTIONS,DEMO_START,DEMO_END,memberHistory,memberStats,isFirstPayment} from './data.js?v=first-payment-20261109';

const icons={
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  chevron:'<path d="m8 5 7 7-7 7"/>',down:'<path d="m5 9 7 7 7-7"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  orders:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  chat:'<path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z"/><path d="M7 9h9m-9 4h5"/>',
  banner:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 6-5 4 3 3-5 5 6"/>',
  export:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  reset:'<path d="M4 11a8 8 0 1 1 2 7M4 4v7h7"/>',
  filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v1"/>',
  sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-12-3 4 3 4"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
};
const svg=(name,extra='')=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${icons[name]||icons.info}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toFixed(2);
const defaults={app:'',queryType:'id',query:'',userId:'',status:'',timeType:'createdAt',start:DEMO_START,end:DEMO_END,drama:'',promotion:'',provider:'',method:'',productType:'',product:'',source:'',promoter:'',country:'',firstPayment:'',repeatMetric:'total',repeatMin:'',repeatMax:''};
const SORT_FIELDS={created:{label:'创建时间',asc:'从旧到新',desc:'从新到旧'},paid:{label:'支付时间',asc:'从旧到新',desc:'从新到旧'},total:{label:'会员复购次数',asc:'从少到多',desc:'从多到少'},auto:{label:'自动续费次数',asc:'从少到多',desc:'从多到少'},manual:{label:'手动复购次数',asc:'从少到多',desc:'从多到少'}};
let applied={...defaults},page=1,pageSize=10,sort='created-desc',activeHistory=null,historyTab='all',lastFocus=null,toastTimer;
const drawer=document.querySelector('#detail-drawer');
const app=document.querySelector('#prototype-app');
const options=(items,all='全部')=>`<option value="">${esc(all)}</option>${items.map(i=>`<option value="${esc(typeof i==='string'?i:i.value)}">${esc(typeof i==='string'?i:i.label)}</option>`).join('')}`;
function field(name,label,items,all='全部',cls=''){
  return `<div class="field ${cls}"><label for="${name}">${label}</label><select id="${name}" name="${name}">${options(items,all)}</select></div>`;
}
function sortHeader(field,label){
  return `<button type="button" class="sort-header" data-sort-field="${field}">${label}<span class="sort-carets" aria-hidden="true"><span class="sort-up">${svg('down')}</span><span class="sort-down">${svg('down')}</span></span></button>`;
}
function renderShell(){
  app.innerHTML=`
  <header class="topbar">
    <div class="brand"><svg class="brand-mark" viewBox="0 0 30 30" aria-hidden="true"><path fill="#d43a9e" stroke="none" d="M7 5h9a9 9 0 0 1 0 18H4z"/><path fill="#6651e9" stroke="none" d="M11 9h6a5 5 0 0 1 0 10H8z"/><path fill="#f8faff" stroke="none" d="m13 12 6 3-7 3z"/></svg><span class="brand-divider"></span>DramaVideo Backend</div>
    <nav class="topnav" aria-label="后台中心"><span>首页</span><span class="active">业务中心</span><span>投放中心</span></nav>
    <div class="avatar" aria-hidden="true">DV</div>
  </header>
  <div class="shell" id="shell">
    <aside class="sidebar" aria-label="业务导航">
      <div class="nav-item">${svg('film')}<span class="nav-label">短剧管理</span></div>
      <div class="nav-item nav-parent">${svg('orders')}<span class="nav-label">订单管理</span>${svg('down','class="chevron"')}</div>
      <div class="nav-sub active" aria-current="page">订单列表</div><div class="nav-sub">订单日报</div>
      <div class="nav-item">${svg('user')}<span class="nav-label">用户管理</span></div>
      <div class="nav-item">${svg('chat')}<span class="nav-label">反馈管理</span></div>
      <div class="nav-item">${svg('banner')}<span class="nav-label">Banner管理</span></div>
      <div class="sidebar-foot"><button class="sidebar-toggle" id="collapseSidebar" aria-label="收起或展开侧栏" title="收起或展开侧栏">${svg('sidebar')}</button><span>业务中心</span></div>
    </aside>
    <main class="main">
      <div class="page-heading"><div class="heading-copy"><h1>订单列表</h1><span class="breadcrumb">订单管理 / 订单列表</span></div><button class="text-button" data-action="help">${svg('info')}字段口径说明</button></div>
      <form id="filters" class="surface filters" novalidate>
        <div class="filter-grid">
          ${field('app','所属应用',APPS)}
          <div class="field span-2 lookup"><label for="query">订单查询</label><div class="compound"><select name="queryType" id="queryType" aria-label="查询编号类型"><option value="id">订单号</option><option value="transactionId">三方交易号</option></select><input id="query" name="query" placeholder="输入完整编号，精确查询" autocomplete="off"></div></div>
          <div class="field"><label for="userId">用户ID</label><input id="userId" name="userId" placeholder="请输入用户ID" autocomplete="off"></div>
          ${field('status','订单状态',['待支付','已支付','已失败','已关闭'])}
          <div class="field"><label for="timeType">时间类型</label><select id="timeType" name="timeType"><option value="createdAt">创建时间</option><option value="paidAt">支付成功时间</option></select></div>
          <div class="field span-2"><span class="field-label">时间范围 <span class="subtle">（UTC+8）</span></span><div class="date-range"><input type="date" id="start" name="start" aria-label="开始日期" value="${DEMO_START}"><span>至</span><input type="date" id="end" name="end" aria-label="结束日期" value="${DEMO_END}"></div></div>
          <div class="field secondary-filter"><label for="drama">所属剧目</label><input id="drama" name="drama" list="dramaOptions" placeholder="剧目ID / 中英文名称" autocomplete="off"><datalist id="dramaOptions">${DRAMAS.map(d=>`<option value="${d.id} · ${esc(d.title)}">通用ID ${d.commonId} · ${esc(d.zh)}</option>`).join('')}</datalist></div>
          <div class="field secondary-filter"><label for="promotion">推广链接</label><input id="promotion" name="promotion" list="promotionOptions" placeholder="链接ID / 名称" autocomplete="off"><datalist id="promotionOptions">${PROMOTIONS.map(p=>`<option value="${p.id} · ${esc(p.name)}"></option>`).join('')}</datalist></div>
          ${field('provider','支付服务商',['Airwallex','PayPal'],'全部','secondary-filter')}
          ${field('method','支付方式',['Card Pay','Apple Pay','Google Pay','PayPal'],'全部','secondary-filter')}
        </div>
        <div class="advanced" id="advancedFilters" hidden><div class="filter-grid">
          ${field('productType','商品类型',['会员','金币','单剧解锁'])}
          ${field('product','购买商品',PRODUCTS.map(p=>({value:p.id,label:p.label})))}
          ${field('source','来源平台',['Facebook','AppLovin'])}
          ${field('promoter','投手',PROMOTERS)}
          ${field('country','国家 / 地区',COUNTRIES)}
          ${field('firstPayment','是否首充',[{value:'yes',label:'是'},{value:'no',label:'否'}])}
          <div class="field"><label for="repeatMetric">复购次数类型</label><select id="repeatMetric" name="repeatMetric"><option value="total">会员复购总次数</option><option value="auto">自动续费次数</option><option value="manual">手动复购次数</option></select></div>
          <div class="field"><span class="field-label">次数范围</span><div class="range-pair"><input type="number" name="repeatMin" id="repeatMin" min="0" step="1" placeholder="最小值" aria-label="复购次数最小值"><span class="muted">—</span><input type="number" name="repeatMax" id="repeatMax" min="0" step="1" placeholder="最大值" aria-label="复购次数最大值"></div></div>
        </div></div>
        <div id="filterError" class="filter-error" role="alert"></div>
        <div class="filters-bottom"><button type="button" class="text-button primary" id="toggleAdvanced" aria-expanded="false" aria-controls="advancedFilters">${svg('filter')}高级筛选 ${svg('down','style="width:12px;height:12px"')}</button><div class="filter-actions"><button type="button" class="btn" id="resetFilters">${svg('reset')}重置</button><button type="submit" class="btn primary" id="searchOrders">${svg('search')}搜索</button></div></div>
      </form>
      <section class="surface result-surface" aria-label="订单查询结果">
        <div class="result-toolbar"><div class="result-label">订单明细<span class="result-count" id="resultCount"></span></div><div class="result-tools"><select id="sortOrders" class="sort-select" aria-label="订单排序">${Object.entries(SORT_FIELDS).map(([key,config])=>['desc','asc'].map(direction=>`<option value="${key}-${direction}">${config.label}：${config[direction]}</option>`).join('')).join('')}</select><button class="btn" id="exportOrders">${svg('export')}导出筛选结果</button></div></div>
        <div class="active-filters" id="activeFilters" aria-label="已应用的筛选条件"></div>
        <div class="table-scroll" id="tableScroll" tabindex="0" role="region" aria-label="订单表格，可横向滚动"><table class="orders-table"><thead><tr>
          <th scope="col">订单信息</th><th scope="col">用户信息</th><th scope="col" data-sort-column="total" aria-sort="none"><span class="header-help">${sortHeader('total','会员复购')}<button class="copy" data-action="help" aria-label="查看会员复购次数口径" title="当前应用内的累计成功会员复购次数">${svg('info')}</button></span></th><th scope="col">短剧信息</th><th scope="col">所属应用</th><th scope="col">支付渠道</th><th scope="col">自动续费产品</th><th scope="col" title="C端展示的原价金额">订单金额</th><th scope="col" title="付款金额">实付金额</th><th scope="col">充值产品</th><th scope="col" data-sort-column="paid" aria-sort="none">${sortHeader('paid','支付时间')}</th><th scope="col" data-sort-column="created" aria-sort="descending">${sortHeader('created','创建时间')}</th><th scope="col">来源平台</th><th scope="col">推广链接信息</th><th scope="col">投手信息</th><th scope="col">订单状态</th>
        </tr></thead><tbody id="orderRows"></tbody></table></div>
        <div class="pagination"><span class="pagination-caption" id="paginationCaption"></span><div class="pagination-controls"><select id="pageSize" aria-label="每页显示条数"><option value="10">10条 / 页</option><option value="20">20条 / 页</option><option value="50">50条 / 页</option></select><div id="pageButtons" style="display:flex;gap:5px"></div><span id="pageMeta" class="page-meta"></span></div></div>
      </section>
    </main>
  </div>`;
}
const statsCache=new Map();
function statsFor(o){const k=`${o.app}:${o.userId}`;if(!statsCache.has(k))statsCache.set(k,memberStats(o.userId,o.app));return statsCache.get(k);}
function matchesSearch(o,f){
  if(f.app&&o.app!==f.app)return false;
  if(f.query&&o[f.queryType].toLowerCase()!==f.query.trim().toLowerCase())return false;
  if(f.userId&&o.userId!==f.userId.trim())return false;
  if(f.status&&o.status!==f.status)return false;
  if(f.firstPayment && isFirstPayment(o)!==(f.firstPayment==='yes'))return false;
  const date=o[f.timeType]?.slice(0,10)||'';
  if((f.start||f.end)&&!date)return false;
  if(f.start&&date<f.start)return false;
  if(f.end&&date>f.end)return false;
  if(f.drama){const q=f.drama.trim().toLowerCase();if(/^\d+$/.test(q)){if(![o.drama.id,o.drama.commonId].includes(Number(q)))return false;}else if(!`${o.drama.id} · ${o.drama.title} ${o.drama.zh} ${o.drama.commonId}`.toLowerCase().includes(q))return false;}
  if(f.promotion){const q=f.promotion.trim().toLowerCase();if(/^\d+$/.test(q)){if(o.promotionId!==Number(q))return false;}else if(!`${o.promotionId} · ${o.promotionName}`.toLowerCase().includes(q))return false;}
  for(const k of ['provider','method','source','promoter','country'])if(f[k]&&o[k]!==f[k])return false;
  if(f.productType&&o.product.type!==f.productType)return false;
  if(f.product&&o.product.id!==f.product)return false;
  if(f.repeatMin!==''||f.repeatMax!==''){
    const s=statsFor(o);if(!s)return false;const n=s[f.repeatMetric];
    if(f.repeatMin!==''&&n<Number(f.repeatMin))return false;
    if(f.repeatMax!==''&&n>Number(f.repeatMax))return false;
  }
  return true;
}
function filteredOrders(){
  const list=ORDERS.filter(o=>matchesSearch(o,applied));
  const [field,direction]=sort.split('-'),factor=direction==='asc'?1:-1;
  return list.sort((a,b)=>{
    const isTime=field==='created'||field==='paid';
    const aValue=isTime?a[field==='created'?'createdAt':'paidAt']:statsFor(a)?.[field];
    const bValue=isTime?b[field==='created'?'createdAt':'paidAt']:statsFor(b)?.[field];
    const aMissing=aValue===null||aValue===undefined||aValue==='';
    const bMissing=bValue===null||bValue===undefined||bValue==='';
    if(aMissing!==bMissing)return aMissing?1:-1;
    const compare=aMissing?0:(isTime?aValue.localeCompare(bValue):aValue-bValue)*factor;
    return compare||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id);
  });
}
function updateSortControls(){
  const [field,direction]=sort.split('-');
  document.querySelector('#sortOrders').value=sort;
  document.querySelectorAll('[data-sort-column]').forEach(column=>{
    const key=column.dataset.sortColumn,active=key===field,button=column.querySelector('.sort-header');
    column.setAttribute('aria-sort',active?(direction==='asc'?'ascending':'descending'):'none');
    button.dataset.direction=active?direction:'';
    const next=active&&direction==='desc'?'asc':'desc';
    const action=`按${SORT_FIELDS[key].label}${SORT_FIELDS[key][next]}排序`;
    button.setAttribute('aria-label',action);button.title=action;
  });
}
function setSort(value){
  sort=value;page=1;renderTable();document.querySelector('#tableScroll').scrollTop=0;
}
const copyButton=(value,label='复制')=>`<button class="copy" data-copy="${esc(value)}" aria-label="${esc(label)}" title="${esc(label)}">${svg('copy')}</button>`;
function formatTime(s){if(!s)return '<span class="muted">—</span>';return `<span class="date-time">${s.slice(0,10)}<span class="time">${s.slice(11,16)}</span></span>`;}
function statusHTML(status){const cls={'已支付':'paid','已失败':'failed','已关闭':'closed'}[status]||'';return `<span class="status ${cls}"><span class="status-dot"></span>${status}</span>`;}
function repeatCell(o){
  const s=statsFor(o);
  if(!s)return '<span class="member-no-count" title="当前应用内暂无成功购买会员记录">—</span><div class="member-cell-caption">暂无会员记录</div>';
  return `<button class="member-total ${s.total===0?'is-zero':''}" data-history="${o.userId}" data-app="${esc(o.app)}" aria-label="查看用户${o.userId}在${o.app}的会员复购记录，累计${s.total}次"><strong>${s.total}</strong><span>次</span>${svg('chevron')}</button>${s.total?`<div class="member-cell-split"><span>自动 <b>${s.auto}</b></span><span class="member-dot" aria-hidden="true">·</span><span>手动 <b>${s.manual}</b></span></div>`:'<div class="member-cell-caption">尚未复购</div>'}`;
}
function orderRow(o){return `<tr data-order-id="${o.id}">
  <td><div class="copy-line order-number-line"><button class="order-link" data-order="${o.id}" aria-label="查看订单${o.id}">${o.id}</button>${copyButton(o.id,'复制订单号')}${isFirstPayment(o)?'<span class="first-charge-badge" title="当前应用内该用户的首次成功付款">首充</span>':''}</div><div class="copy-line subtle" style="margin-top:6px"><span class="truncate" title="${esc(o.transactionId)}">${esc(o.transactionId)}</span>${copyButton(o.transactionId,'复制三方交易号')}</div></td>
  <td><div class="user-top"><span>用户ID：${o.userId}</span><span class="country">${o.country}</span>${o.test?'<span class="badge test-label">测试</span>':''}</div><div class="copy-line"><span class="uuid" title="${esc(o.uuid)}">UUID：${esc(o.uuid)}</span>${copyButton(o.uuid,'复制UUID')}</div></td>
  <td class="member-cell">${repeatCell(o)}</td>
  <td><div class="drama-title" title="${esc(o.drama.title)}">${esc(o.drama.title)}</div><div class="drama-ids">通用ID ${o.drama.commonId} · 语言ID ${o.drama.id}</div></td>
  <td><span class="badge">${o.app}</span></td><td><div class="payment-provider">${o.provider}</div><div class="payment-method">${o.method}</div></td>
  <td><div><span class="badge ${o.autoProduct?'auto':''}">${o.autoProduct?'是':'否'}</span></div><div class="subtle" style="margin-top:6px">本笔：${o.purchaseType}</div></td>
  <td><span class="money">$${money(o.original)}</span><span class="currency">USD</span></td><td><span class="money">$${money(o.amount)}</span><span class="currency">USD</span></td>
  <td><div class="product-name">${esc(o.product.label)}</div><div class="subtle">商品ID：${o.product.id}</div></td>
  <td>${formatTime(o.paidAt)}</td><td>${formatTime(o.createdAt)}</td><td><span class="badge">${o.source}</span></td>
  <td><div class="copy-line">链接ID：${o.promotionId}${copyButton(o.promotionId,'复制推广链接ID')}</div><div class="link-name" title="${esc(o.promotionName)}">${esc(o.promotionName)}</div></td>
  <td>${o.promoter?`<div>${o.promoter}</div><div class="subtle">投手ID：${PROMOTERS.indexOf(o.promoter)+1}</div>`:'<span class="muted">—</span>'}</td><td>${statusHTML(o.status)}</td>
</tr>`;}
function renderTable(){
  const list=filteredOrders(),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.min(page,pages);
  const rows=list.slice((page-1)*pageSize,page*pageSize);
  document.querySelector('#orderRows').innerHTML=rows.length?rows.map(orderRow).join(''):`<tr><td colspan="16" class="empty-cell"><div class="empty-inner"><div class="empty-title">没有符合条件的订单</div><p>试试缩小筛选条件，或检查订单号和用户ID。</p><button class="btn" data-action="reset">${svg('reset')}重置筛选</button></div></td></tr>`;
  document.querySelector('#resultCount').textContent=`共 ${list.length} 条`;
  document.querySelector('#paginationCaption').textContent=list.length?`第 ${(page-1)*pageSize+1}—${Math.min(page*pageSize,list.length)} 条，共 ${list.length} 条`:'共 0 条';
  document.querySelector('#pageMeta').textContent=`${page} / ${pages} 页`;
  let positions=[...new Set([1,...Array.from({length:5},(_,i)=>page+i-2).filter(p=>p>0&&p<=pages),pages])].sort((a,b)=>a-b);
  let last=0,nums='';for(const p of positions){if(last&&p-last>1)nums+='<span class="muted" style="padding:5px 2px">…</span>';nums+=`<button class="page-btn ${p===page?'selected':''}" data-page="${p}" aria-label="第${p}页" ${p===page?'aria-current="page"':''}>${p}</button>`;last=p;}
  document.querySelector('#pageButtons').innerHTML=`<button class="page-btn" data-page="${page-1}" aria-label="上一页" ${page===1?'disabled':''}>${svg('chevron','style="transform:rotate(180deg)"')}</button>${nums}<button class="page-btn" data-page="${page+1}" aria-label="下一页" ${page===pages?'disabled':''}>${svg('chevron')}</button>`;
  document.querySelector('#exportOrders').disabled=!list.length;
  updateSortControls();
  renderChips();
}
function renderChips(){
  const chips=[];
  const labels={app:'应用',userId:'用户ID',status:'状态',drama:'剧目',promotion:'推广链接',provider:'服务商',method:'支付方式',productType:'商品类型',source:'来源平台',promoter:'投手',country:'国家'};
  for(const [k,label]of Object.entries(labels))if(applied[k])chips.push([k,`${label}：${applied[k]}`]);
  if(applied.firstPayment)chips.push(['firstPayment',`是否首充：${applied.firstPayment==='yes'?'是':'否'}`]);
  if(applied.query)chips.push(['query',`${applied.queryType==='id'?'订单号':'三方交易号'}：${applied.query}`]);
  if(applied.start||applied.end)chips.push(['dates',`${applied.timeType==='createdAt'?'创建时间':'支付成功时间'}：${applied.start||'不限'} 至 ${applied.end||'不限'}`]);
  if(applied.product)chips.push(['product',`商品：${PRODUCTS.find(p=>p.id===applied.product)?.label||applied.product}`]);
  if(applied.repeatMin!==''||applied.repeatMax!=='')chips.push(['repeat',`${{total:'会员复购',auto:'自动续费',manual:'手动复购'}[applied.repeatMetric]}：${applied.repeatMin||0}—${applied.repeatMax||'不限'}次`]);
  document.querySelector('#activeFilters').innerHTML=chips.map(([k,t])=>`<button class="filter-chip" data-clear="${k}" title="清除${esc(t)}">${esc(t.length>58?t.slice(0,55)+'…':t)}${svg('close')}</button>`).join('');
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2600);}
function validate(f){
  if(f.start&&f.end&&f.start>f.end)return ['开始日期不能晚于结束日期，请调整时间范围。','start'];
  if(f.repeatMin!==''&&(!Number.isInteger(Number(f.repeatMin))||Number(f.repeatMin)<0))return ['复购次数需填写大于或等于0的整数。','repeatMin'];
  if(f.repeatMax!==''&&(!Number.isInteger(Number(f.repeatMax))||Number(f.repeatMax)<0))return ['复购次数需填写大于或等于0的整数。','repeatMax'];
  if(f.repeatMin!==''&&f.repeatMax!==''&&Number(f.repeatMin)>Number(f.repeatMax))return ['次数最小值不能大于最大值，请调整次数范围。','repeatMin'];
  return null;
}
function applySearch(){
  const f=Object.fromEntries(new FormData(document.querySelector('#filters')));
  for(const key of ['query','userId','drama','promotion'])f[key]=f[key].trim();
  const error=validate(f);const err=document.querySelector('#filterError');err.textContent=error?error[0]:'';
  if(error){document.getElementById(error[1]).focus();return;}
  applied=f;page=1;renderTable();document.querySelector('#tableScroll').scrollTop=0;
}
function resetFilters(){
  const form=document.querySelector('#filters');form.reset();
  for(const [key,value]of Object.entries(defaults)){const el=form.elements.namedItem(key);if(el)el.value=value;}
  document.querySelector('#method').innerHTML=options(['Card Pay','Apple Pay','Google Pay','PayPal']);
  document.querySelector('#product').innerHTML=options(PRODUCTS.map(p=>({value:p.id,label:p.label})));
  document.querySelector('#filterError').textContent='';applied={...defaults};page=1;sort='created-desc';document.querySelector('#sortOrders').value=sort;renderTable();
}
function openDrawer(html){
  if(!drawer.open)lastFocus=document.activeElement;
  drawer.innerHTML=html;if(!drawer.open)drawer.showModal();drawer.scrollTop=0;
  drawer.querySelector('[data-close]')?.focus({preventScroll:true});
}
const drawerHeader=(title,subtitle='',back='')=>`<div class="drawer-head"><div>${back}<h2 id="drawer-title">${title}</h2><div class="drawer-subtitle">${subtitle}</div></div><button class="icon-button" data-close aria-label="关闭详情">${svg('close')}</button></div>`;
function openHistory(userId,application,tab='all'){
  if(!['all','auto','manual'].includes(tab))tab='all';
  activeHistory={userId,app:application};historyTab=tab;
  const history=memberHistory(userId,application),s=memberStats(userId,application)||{total:0,auto:0,manual:0,first:0,orders:0};
  const repeats=history.filter(o=>o.event==='auto'||o.event==='manual');
  const first=history.find(o=>o.event==='first');
  const shown=repeats.filter(o=>tab==='all'||o.event===tab);
  openDrawer(`${drawerHeader('会员复购记录',`<span>用户ID：${userId}</span><span class="badge">${application}</span>`)}<div class="drawer-body">
    <div class="member-summary"><div class="member-summary-total"><span>累计复购</span><strong>${s.total}</strong><span>次</span></div><div class="member-summary-breakdown"><span>自动续费 <b>${s.auto}</b> 次</span><span class="member-summary-separator"></span><span>手动复购 <b>${s.manual}</b> 次</span></div></div>
    <div class="tabs member-tabs" role="tablist" aria-label="会员付款记录分类">${[['all','全部复购'],['auto','自动续费'],['manual','手动复购']].map(([key,label])=>`<button class="tab ${tab===key?'active':''}" role="tab" aria-selected="${tab===key}" data-history-tab="${key}">${label}</button>`).join('')}</div>
    <div id="historyRecords" class="member-records" role="tabpanel" aria-label="${{all:'全部',auto:'自动续费',manual:'手动复购'}[tab]}会员付款记录">${shown.length?`<table class="member-record-table"><thead><tr><th scope="col">类型 / 商品</th><th scope="col">订单 / 支付时间</th><th scope="col">实付金额</th></tr></thead><tbody>${shown.map(o=>`<tr class="member-record"><td class="record-type"><span class="badge ${o.event==='auto'?'auto':'manual'}">${o.purchaseType}</span><span class="record-secondary">${o.product.label}</span></td><td class="record-order"><button class="order-link" data-order="${o.id}" data-from-history="yes">${o.id}</button><span class="record-secondary">${o.paidAt.slice(0,16)}</span></td><td class="record-money"><span class="money">$${money(o.amount)}</span><span class="record-secondary">USD</span></td></tr>`).join('')}</tbody></table>`:`<div class="member-empty"><div>${tab==='all'?'尚未发生会员复购':`暂无${tab==='auto'?'自动续费':'手动复购'}记录`}</div><p>${s.total===0?'已完成首次会员购买，后续复购会展示在这里。':'此分类下暂无成功付款的会员订单。'}</p></div>`}</div>
    ${first?`<details class="first-member-order" ${s.total===0?'open':''}><summary><span class="first-label">首次购买<span class="first-not-counted">不计入复购</span></span><span class="first-date">${first.paidAt.slice(0,10)} ${svg('down')}</span></summary><div class="first-member-body"><div><button class="order-link" data-order="${first.id}" data-from-history="yes">${first.id}</button><span class="record-secondary">${first.product.label} · ${first.paidAt.slice(0,16)}</span></div><span class="money">$${money(first.amount)} <span class="currency">USD</span></span></div></details>`:''}
    <div class="member-footnote"><span>仅展示成功付款 · 时间为 UTC+8</span><details class="member-scope"><summary>${svg('info')}统计口径</summary><p>按 ${application} 内当前用户累计，不受订单列表时间筛选影响。首次购买、金币充值、单剧解锁和未成功付款不计入会员复购。</p></details></div>
  </div>`);
}
function detailField(label,value,wide=false){return `<div class="detail-field ${wide?'wide':''}"><dt>${label}</dt><dd>${value}</dd></div>`;}
function openOrder(id,fromHistory=false){
  const o=ORDERS.find(x=>x.id===id);if(!o)return;
  const back=fromHistory&&activeHistory?`<button class="back-link" data-back-history>${svg('chevron','style="transform:rotate(180deg);width:13px;height:13px"')}返回会员复购记录</button>`:'';
  const s=statsFor(o);
  openDrawer(`${drawerHeader('订单详情',`${statusHTML(o.status)}<span>${o.id}</span>`,back)}<div class="drawer-body">
    <h3 class="section-title">付款与商品</h3><dl class="detail-grid">
    ${detailField('订单金额（C端原价）',`<span class="money">$${money(o.original)}</span> <span class="muted">USD</span>`)}${detailField('实付金额（付款金额）',`<span class="money">$${money(o.amount)}</span> <span class="muted">USD</span>`)}
    ${detailField('购买商品',`${o.product.label}<div class="subtle">${o.product.type} · 商品ID ${o.product.id}</div>`)}${detailField('本笔购买类型',`${o.purchaseType}<div class="subtle">自动续费产品：${o.autoProduct?'是':'否'}</div>`)}
    ${detailField('是否首充',isFirstPayment(o)===null?'—（未成功付款）':isFirstPayment(o)?'是':'否')}
    ${detailField('支付渠道',`${o.provider} · ${o.method}`)}${detailField('三方交易号',`${esc(o.transactionId)} ${copyButton(o.transactionId,'复制三方交易号')}`)}
    ${detailField('创建时间',`${o.createdAt}（UTC+8）`)}${detailField('支付成功时间',o.paidAt?`${o.paidAt}（UTC+8）`:'—')}
    ${o.subscriptionId?detailField('订阅编号',o.subscriptionId,true):''}</dl>
    <div class="divider"></div><h3 class="section-title">用户信息</h3><dl class="detail-grid">${detailField('用户ID',`${o.userId}${o.test?' <span class="badge test-label">测试用户</span>':''}`)}${detailField('所属应用 / 国家',`${o.app} / ${o.country}`)}${detailField('UUID',`${o.uuid} ${copyButton(o.uuid,'复制UUID')}`,true)}</dl>
    <div class="detail-repeat"><div><strong>会员复购：${s?s.total+'次':'—'}</strong><p>${s?`自动续费 ${s.auto}次 · 手动复购 ${s.manual}次`:'当前应用内暂无成功购买会员记录'}</p></div>${s?`<button class="text-button primary" data-history="${o.userId}" data-app="${o.app}">查看记录 ${svg('chevron','style="width:13px;height:13px"')}</button>`:''}</div>
    <h3 class="section-title">剧目与推广</h3><dl class="detail-grid">${detailField('短剧',`${esc(o.drama.title)}<div class="subtle">通用ID ${o.drama.commonId} · 语言ID ${o.drama.id}</div>`,true)}${detailField('来源平台',o.source)}${detailField('投手',o.promoter||'—')}${detailField('推广链接',`链接ID：${o.promotionId}<br>${esc(o.promotionName)}`,true)}</dl>
  </div>`);
}
function openHelp(){openDrawer(`${drawerHeader('字段口径说明','订单金额与会员复购')}<div class="drawer-body help-copy">
  <h3>金额</h3><p><strong>订单金额：</strong>C端展示的原价金额。<br><strong>实付金额：</strong>付款金额。</p><p>是否付款成功以订单状态和支付成功时间为准。</p>
  <h3>是否首充</h3><p>同一用户在当前应用内的首笔成功付款订单，会员、金币和单剧解锁均参与判断。按支付成功时间确定，不受列表时间范围、商品筛选或分页影响。</p><p>未成功付款的订单不占首充资格，也不归入“否”。首次购买会员不一定是首充，例如先买金币再买会员，会员订单为非首充，会员复购仍为0次。</p><h3>会员复购</h3><div class="formula">会员复购总次数 ＝ 自动续费次数 ＋ 手动复购次数</div><ul><li>首次成功购买会员，不计入会员复购。</li><li>自动续费：系统按订阅自动扣款成功。</li><li>手动复购：用户主动再次成功购买会员，包括重新订阅。</li><li>待支付、失败、关闭订单，以及金币、单剧解锁订单，不计入。</li></ul>
  <h3>范围与时间</h3><p>按当前应用内的同一用户累计。不同应用分别计算。</p><p>列表展示的是用户截至当前的累计次数，同一用户的不同订单行显示一致；它不代表本笔订单是第几次续费。</p><p>订单时间筛选只影响订单列表，累计复购次数与会员复购记录不受影响。</p>
  <h3>零次与暂无记录</h3><p><strong>0次：</strong>已有首次成功购买会员，尚未发生复购。<br><strong>—：</strong>当前应用内暂无成功购买会员记录。</p>
  </div>`);}
async function copyText(value){try{await navigator.clipboard.writeText(value);toast('已复制');}catch{toast('复制未完成，请选中编号后手动复制');}}
function exportCSV(){
  const rows=filteredOrders();if(!rows.length)return;
  const headers=['订单号','三方交易号','是否首充','用户ID','所属应用','国家/地区','会员复购总次数','自动续费次数','手动复购次数','本笔购买类型','语言剧目ID','剧目名','支付服务商','支付方式','订单金额（C端原价）','实付金额（付款金额）','币种','商品','订单状态','创建时间（UTC+8）','支付成功时间（UTC+8）','来源平台','推广链接ID','投手','测试用户'];
  const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const body=rows.map(o=>{const s=statsFor(o);return [o.id,o.transactionId,isFirstPayment(o)===null?'—':isFirstPayment(o)?'是':'否',o.userId,o.app,o.country,s?.total??'',s?.auto??'',s?.manual??'',o.purchaseType,o.drama.id,o.drama.title,o.provider,o.method,money(o.original),money(o.amount),o.currency,o.product.label,o.status,o.createdAt,o.paidAt,o.source,o.promotionId,o.promoter,o.test?'是':'否'].map(cell).join(',');});
  const blob=new Blob(['\ufeff'+headers.map(cell).join(',')+'\r\n'+body.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`订单筛选结果_${DEMO_END}_${rows.length}条.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);toast(`已导出全部 ${rows.length} 条筛选结果`);
}
renderShell();renderTable();
document.querySelector('#filters').addEventListener('submit',e=>{e.preventDefault();applySearch();});
document.querySelector('#resetFilters').addEventListener('click',resetFilters);
document.querySelector('#toggleAdvanced').addEventListener('click',e=>{const b=e.currentTarget,a=document.querySelector('#advancedFilters');a.hidden=!a.hidden;document.querySelector('#filters').classList.toggle('expanded',!a.hidden);b.setAttribute('aria-expanded',String(!a.hidden));b.innerHTML=`${svg('filter')}${a.hidden?'高级筛选':'收起高级筛选'} ${svg('down',`style="width:12px;height:12px;transform:rotate(${a.hidden?'0':'180'}deg)"`)}`;});
document.querySelector('#collapseSidebar').addEventListener('click',()=>document.querySelector('#shell').classList.toggle('compact'));
document.querySelector('#provider').addEventListener('change',e=>{const vals=e.target.value==='Airwallex'?['Card Pay','Apple Pay','Google Pay']:e.target.value==='PayPal'?['PayPal']:['Card Pay','Apple Pay','Google Pay','PayPal'];document.querySelector('#method').innerHTML=options(vals);});
document.querySelector('#productType').addEventListener('change',e=>{document.querySelector('#product').innerHTML=options(PRODUCTS.filter(p=>!e.target.value||p.type===e.target.value).map(p=>({value:p.id,label:p.label})));});
document.querySelector('#sortOrders').addEventListener('change',e=>setSort(e.target.value));
document.querySelector('#pageSize').addEventListener('change',e=>{pageSize=Number(e.target.value);page=1;renderTable();});
document.querySelector('#exportOrders').addEventListener('click',exportCSV);
document.addEventListener('click',e=>{
  const target=e.target.closest('button');if(!target)return;
  if(target.hasAttribute('data-sort-field')){const field=target.dataset.sortField;setSort(`${field}-${sort===`${field}-desc`?'asc':'desc'}`);return;}
  if(target.hasAttribute('data-close')){drawer.close();return;}
  if(target.hasAttribute('data-copy')){copyText(target.dataset.copy);return;}
  if(target.hasAttribute('data-history-tab')&&activeHistory){openHistory(activeHistory.userId,activeHistory.app,target.dataset.historyTab);drawer.querySelector(`[data-history-tab="${target.dataset.historyTab}"]`)?.focus({preventScroll:true});return;}
  if(target.hasAttribute('data-back-history')&&activeHistory){openHistory(activeHistory.userId,activeHistory.app,historyTab);return;}
  if(target.hasAttribute('data-history')){openHistory(target.dataset.history,target.dataset.app);return;}
  if(target.hasAttribute('data-order')){openOrder(target.dataset.order,target.dataset.fromHistory==='yes');return;}
  if(target.hasAttribute('data-page')){page=Number(target.dataset.page);renderTable();document.querySelector('#tableScroll').scrollTop=0;return;}
  if(target.hasAttribute('data-clear')){
    const key=target.dataset.clear;
    if(key==='dates'){applied.start='';applied.end='';document.querySelector('#start').value='';document.querySelector('#end').value='';}
    else if(key==='repeat'){applied.repeatMin='';applied.repeatMax='';document.querySelector('#repeatMin').value='';document.querySelector('#repeatMax').value='';}
    else{applied[key]='';const input=document.getElementById(key);if(input)input.value='';}
    page=1;renderTable();return;
  }
  if(target.dataset.action==='help'){openHelp();return;}
  if(target.dataset.action==='reset')resetFilters();
});
drawer.addEventListener('close',()=>{lastFocus?.focus({preventScroll:true});});
drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)drawer.close();}});
