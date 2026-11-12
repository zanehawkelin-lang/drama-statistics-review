(() => {
  'use strict';
  const paths = {
    film:'M5 3h14v18H5zM2 6h3M2 10h3M2 14h3M2 18h3M9 3v18',
    orders:'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4',
    user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
    message:'M4 4h16v13H9l-5 4V4ZM8 9h.01M12 9h.01M16 9h.01',
    image:'M3 3h18v18H3zM3 16l6-6 4 4 3-3 5 5M17 7h.01',
    reset:'M4 10a8 8 0 1 1 1 8M4 4v6h6',
    search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    plus:'M12 5v14M5 12h14', close:'m6 6 12 12M6 18 18 6',
    mail:'M3 5h18v14H3zM3 6l9 7 9-7', check:'m5 12 4 4L19 6',
    help:'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3M12 18h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    chevron:'m9 6 6 6-6 6', left:'m15 6-6 6 6 6', clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    attachment:'m9 12 6-6a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l9-9',
    send:'m3 3 18 9-18 9 3-9-3-9ZM6 12h15', refresh:'M20 10a8 8 0 0 0-14-5L3 8M3 3v5h5M4 14a8 8 0 0 0 14 5l3-3M21 21v-5h-5',
    info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', external:'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.info}"/></svg>`;
  const $ = sel => document.querySelector(sel);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = x => JSON.parse(JSON.stringify(x));
  const KEY = 'dramavideo-feedback-demo-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
  let settings = saved?.settings || clone(FeedbackSeed.settings);
  let records = Array.isArray(saved?.records) ? saved.records : clone(FeedbackSeed.records);
  let filters = {}, quick = 'all', page = 1, pageSize = 10;
  let drawer = null, draft = null, settingsTab = 'auto', selectedId = null;
  let replyDraft = '', replyNotify = true, replyFiles = [], modalKind = null, previousFocus = null;
  const statusNames = {pending:'待处理', processing:'处理中', done:'已处理', closed:'已关闭'};
  const ackNames = {sent:'回执已发送',failed:'回执发送失败',skipped:'回执未发送',off:'回执未发送',sending:'回执发送中'};
  function persist() { try { localStorage.setItem(KEY, JSON.stringify({settings,records})); } catch (_) {} }
  function stamp() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }
  function demoStamp() { return '2026-11-12 ' + stamp().slice(11); }
  function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); }
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3200); }
  function template(text, record) { return String(text).replaceAll('#{feedback_id}', String(record.id)).replaceAll('{feedback_id}', String(record.id)); }
  function isEmail(email) { return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email || ''); }
  function current() { return records.find(r => r.id === selectedId); }
  function matchedRecords() {
    return records.filter(r => (!filters.source || r.source === filters.source)
      && (!filters.userId || String(r.userId || '').includes(filters.userId))
      && (!filters.email || r.email.toLowerCase().includes(filters.email.toLowerCase()))
      && (!filters.type || r.type === filters.type) && (!filters.status || r.status === filters.status)
      && (!filters.start || r.createdAt.slice(0,10) >= filters.start) && (!filters.end || r.createdAt.slice(0,10) <= filters.end)
      && (quick !== 'pending' || ['pending','processing'].includes(r.status)) && (quick !== 'failed' || r.ack === 'failed'));
  }
  function ackClass(ack) { return ack === 'sent' ? 'ack-success' : ack === 'failed' ? 'ack-failed' : 'ack-muted'; }
  function render() {
    const all = matchedRecords(), max = Math.max(1,Math.ceil(all.length/pageSize));
    page = Math.min(page,max);
    $('#connectionSummary').innerHTML = `<span class="status-dot ${settings.connected ? 'connected' : 'disconnected'}"></span>${settings.connected ? 'Gmail 已连接' : 'Gmail 连接异常'}<span class="separator">·</span>自动回执${settings.enabled ? '已开启' : '已关闭'}<span class="separator">·</span>统一管理 H5 与邮箱反馈`;
    $('#connectionBanner').innerHTML = !settings.connected ? `<div class="connection-banner notice-warning">${icon('info')}<span>Gmail 连接已失效，邮箱来信同步及邮件发送暂不可用。H5 反馈仍可正常提交。</span><button class="link-btn" data-action="connection-settings">重新连接</button></div>` : !settings.syncEnabled ? `<div class="connection-banner notice-warning">${icon('info')}<span>邮箱来信同步已暂停，自动回执仍按设置处理新 H5 反馈。</span><button class="link-btn" data-action="connection-settings">查看设置</button></div>` : '';
    const pendingCount = records.filter(r => ['pending','processing'].includes(r.status)).length;
    const failedCount = records.filter(r => r.ack === 'failed').length;
    $('#listStatus').innerHTML = `<div class="button-group"><button class="quick-filter ${quick==='all'?'active':''}" data-action="quick" data-value="all">全部反馈 <span>${records.length}</span></button><button class="quick-filter ${quick==='pending'?'active':''}" data-action="quick" data-value="pending">待跟进 <span>${pendingCount}</span></button><button class="quick-filter ${quick==='failed'?'active':''}" data-action="quick" data-value="failed">回执失败 <span>${failedCount}</span></button></div><span class="section-description">自动回执不改变处理状态</span>`;
    $('#feedbackRows').innerHTML = all.length ? all.slice((page-1)*pageSize,page*pageSize).map(r => `<tr>
      <td><button class="link-btn feedback-ref" data-action="detail" data-id="${r.id}">${r.id}</button><div><span class="source-tag ${r.source==='email'?'source-mail':'source-h5'}">${r.source==='email'?'邮箱':'H5'}</span></div></td>
      <td><div class="cell-main">${esc(r.name || 'Guest')} <span class="cell-sub">${r.userId ? '· '+esc(r.userId) : ''}</span></div><div class="cell-sub email-cell" title="${esc(r.email)}">${esc(r.email || '未填写联系邮箱')}</div>${r.source==='email' && !r.userId ? '<span class="cell-sub">未关联用户</span>':''}</td>
      <td>${esc(r.type)}</td>
      <td><div class="truncate-3" title="${esc(r.content)}">${esc(r.content)}</div>${r.messages.some(m=>m.attachment||m.attachments?.length) ? `<button class="link-btn small" data-action="attachment" data-id="${r.id}">${icon('attachment')}查看附件</button>`:''}</td>
      <td><span class="tag tag-${r.status}">${statusNames[r.status]}</span><button class="ack-line ${ackClass(r.ack)}" data-action="detail" data-id="${r.id}" title="${esc(r.ackReason || ackNames[r.ack])}">${r.ack==='sent' ? icon('check') : r.ack==='failed' ? icon('info') : icon('clock')}${ackNames[r.ack]}</button></td>
      <td>${r.latestReply ? `<div class="truncate-2">${esc(r.latestReply)}</div><span class="cell-sub">${r.messages.filter(m=>m.kind==='agent').at(-1)?.via==='internal'?'后台记录':'邮件回复'}</span>` : '<span class="cell-sub">—</span>'}</td>
      <td><div>${esc(r.createdAt.slice(0,10))}</div><div class="cell-sub">${esc(r.createdAt.slice(11))}</div></td>
      <td><div class="cell-actions"><button class="link-btn" data-action="detail" data-id="${r.id}">${r.status==='pending'||r.status==='processing'?'处理':'查看'}</button>${r.status==='pending'||r.status==='processing'?`<button class="link-btn" data-action="close-record" data-id="${r.id}">关闭</button>`:''}</div></td></tr>`).join('') : '<tr><td colspan="8"><div class="empty-state">'+icon('search')+'<strong>暂无符合条件的反馈</strong><span>调整筛选条件，或重置后查看全部反馈</span><button class="btn" data-action="reset-filters">重置筛选</button></div></td></tr>';
    $('#pagination').innerHTML = `<label><span class="visually-hidden">每页条数</span><select id="pageSize"><option value="10" ${pageSize===10?'selected':''}>10条/页</option><option value="20" ${pageSize===20?'selected':''}>20条/页</option><option value="50" ${pageSize===50?'selected':''}>50条/页</option></select></label><button class="page-circle" aria-label="上一页" data-action="prev" ${page===1?'disabled':''}>${icon('left')}</button>${Array.from({length:max},(_,i)=>`<button class="page-circle ${page===i+1?'active':''}" data-action="page" data-value="${i+1}" aria-label="第 ${i+1} 页">${i+1}</button>`).join('')}<button class="page-circle" aria-label="下一页" data-action="next" ${page===max?'disabled':''}>${icon('chevron')}</button><span>共 ${all.length} 条</span>`;
    hydrateIcons();
  }
  function drawerShell(title, subtitle, body, foot, wide=false) {
    return `<div class="drawer-backdrop" data-action="dismiss-drawer"></div><section class="drawer ${wide?'drawer-wide':''}" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"><div class="drawer-head"><div><h2 class="drawer-title" id="drawerTitle">${title}</h2><p class="drawer-subtitle">${subtitle}</p></div><button class="icon-button drawer-close" data-action="dismiss-drawer" aria-label="关闭抽屉">${icon('close')}</button></div>${body}<div class="drawer-foot">${foot}</div></section>`;
  }
  function mountDrawer(html) { $('#drawerRoot').innerHTML = html; document.body.style.overflow='hidden'; hydrateIcons($('#drawerRoot')); $('.drawer-close')?.focus(); }
  function openSettings(tab='auto') { previousFocus=document.activeElement; drawer='settings'; draft=clone(settings); settingsTab=tab; renderSettings(); }
  function captureSettings() {
    if (!draft || drawer!=='settings') return;
    if ($('#autoSubject')) { draft.subject=$('#autoSubject').value; draft.body=$('#autoBody').value; draft.senderName=$('#senderName').value; }
    if ($('#syncScope')) draft.syncScope=$('#syncScope').value;
  }
  function renderSettings() {
    const tabs=`<div class="drawer-tabs" role="tablist" aria-label="反馈设置"><button role="tab" aria-selected="${settingsTab==='auto'}" class="${settingsTab==='auto'?'active':''}" data-action="settings-tab" data-value="auto">自动回执</button><button role="tab" aria-selected="${settingsTab==='mailbox'}" class="${settingsTab==='mailbox'?'active':''}" data-action="settings-tab" data-value="mailbox">邮箱接入</button></div>`;
    const switchEl=(id,on,label,action)=>`<button id="${id}" type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${label}" data-action="${action}"><span class="switch-track"></span></button>`;
    const body=settingsTab==='auto' ? `<div class="drawer-body"><div class="settings-layout"><div class="form-stack">
      <section class="form-section"><div class="form-row"><div><h3 class="section-title">自动发送收件回执</h3><p class="section-note">新反馈进入后台后，向用户发送一封确认邮件</p></div>${switchEl('autoEnabled',draft.enabled,'启用自动回执','toggle-auto')}</div><div class="notice notice-info">${icon('info')}<span>适用于 H5 新反馈与 Gmail 首次来信。用户后续补充信息不重复回执，反馈仍保留待处理状态。</span></div></section>
      <section class="form-section"><h3 class="section-title">邮件内容</h3><p class="section-note">所有反馈统一使用以下文案</p><div class="field"><label for="senderName">发件人名称 <span class="required-star">*</span></label><input class="form-control" id="senderName" maxlength="60" value="${esc(draft.senderName)}"></div><div class="field"><label for="autoSubject">邮件主题 <span class="required-star">*</span></label><input class="form-control" id="autoSubject" maxlength="180" value="${esc(draft.subject)}"><div class="form-help">邮箱来信在原会话内回复，沿用用户邮件主题；此主题用于 H5 反馈。</div></div><div class="field"><label for="autoBody">邮件正文 <span class="required-star">*</span></label><textarea class="form-control" id="autoBody" rows="11" maxlength="3000">${esc(draft.body)}</textarea><div class="variable-chips"><span class="form-help">可插入变量</span><button class="variable-chip" data-action="insert-variable">反馈编号</button><span class="form-help" id="bodyCounter">${draft.body.length} / 3000</span></div></div><div id="settingsError" class="form-error" role="alert"></div></section>
      <section class="form-section"><div class="form-row"><div><h3 class="section-title">发送邮箱</h3><p class="section-note">自动回执和人工邮件共用已连接的客服邮箱</p></div><button class="link-btn" data-action="settings-tab" data-value="mailbox">管理邮箱 ${icon('chevron')}</button></div><div class="mail-account compact"><span class="mail-logo">${icon('mail')}</span><div class="mail-meta"><strong>${esc(draft.mailbox || '尚未连接 Gmail')}</strong><span class="cell-sub">${draft.connected?'已连接 · 可发送邮件':'连接失效 · 暂不可发送'}</span></div><span class="tag ${draft.connected?'tag-done':'tag-closed'}">${draft.connected?'正常':'异常'}</span></div></section>
      <section class="form-section"><h3 class="section-title">发送规则</h3><ul class="rule-list"><li>每条新反馈最多成功发送一次自动回执。</li><li>历史导入、同一会话的后续回复不触发回执。</li><li>排除自动回复、退信和系统自身发出的邮件。</li><li>发送失败保留记录，可在反馈详情中重试。</li></ul></section>
    </div><aside class="preview-panel"><div class="section-title">邮件预览</div><p class="section-note">以反馈 #89 为例</p><div class="preview-mail"><div class="preview-envelope">${icon('mail')}收件回执</div><h4 class="preview-subject" id="inlineSubject"></h4><div class="preview-meta"><strong id="inlineSender"></strong><span>${esc(draft.mailbox)}</span></div><div class="preview-content" id="inlineBody"></div></div><button class="btn" data-action="preview">${icon('external')}查看完整预览</button></aside></div></div>` : `<div class="drawer-body"><div class="form-stack">
      <section class="form-section"><h3 class="section-title">客服邮箱</h3><p class="section-note">连接 Gmail，将来信与 H5 反馈统一管理</p><div class="mail-account"><span class="mail-logo">${icon('mail')}</span><div class="mail-meta"><strong>${esc(draft.mailbox||'未连接 Gmail')}</strong><span class="cell-sub">${draft.connected?'已连接 · 收信与发信可用':'连接异常 · 需要重新连接'}</span></div><span class="tag ${draft.connected?'tag-done':'tag-closed'}">${draft.connected?'连接正常':'连接失效'}</span></div><div class="inline-actions"><button class="btn" data-action="connect">${icon('refresh')}${draft.connected?'重新连接':'连接 Gmail'}</button><button class="btn" data-action="check-connection">检查连接</button><span class="form-help">仅演示连接流程，不会读取真实邮件</span></div></section>
      <section class="form-section"><div class="form-row"><div><h3 class="section-title">同步邮箱来信</h3><p class="section-note">首次来信创建反馈，后续回复追加到原反馈</p></div>${switchEl('syncEnabled',draft.syncEnabled,'同步邮箱来信','toggle-sync')}</div><div class="field"><label for="syncScope">同步范围</label><select id="syncScope" class="form-control"><option value="support" ${draft.syncScope==='support'?'selected':''}>Gmail「用户反馈」标签内的新邮件</option><option value="inbox" ${draft.syncScope==='inbox'?'selected':''}>收件箱内的新邮件</option></select><span class="form-help">建议使用专门的反馈标签，避免把其他业务邮件创建为反馈。</span></div><div class="connection-summary"><div class="connection-stat"><span>最近同步</span><strong>${esc(draft.syncAt)}</strong></div><div class="connection-stat"><span>同步状态</span><strong>${draft.connected ? draft.syncEnabled ? '正常同步' : '已暂停' : '连接中断'}</strong></div><button class="link-btn" data-action="sync-now">${icon('refresh')}立即同步</button></div></section>
      <section class="form-section"><h3 class="section-title">邮件会话</h3><ul class="rule-list"><li>直接来信允许没有用户 ID，显示为“未关联用户”。</li><li>用户回复 H5 回执或人工邮件时，关联原反馈。</li><li>客服在 Gmail 中的人工回复同步到沟通记录。</li><li>同一封邮件不会重复创建反馈或再次发送回执。</li></ul></section>
      <section class="form-section"><div class="form-row"><div><h3 class="section-title">历史邮件</h3><p class="section-note">可导入已有来信，历史邮件不会发送自动回执</p></div><button class="btn" data-action="import-history">导入历史邮件</button></div></section>
    </div></div>`;
    mountDrawer(drawerShell('反馈设置','邮箱来信与 H5 反馈统一管理',tabs+body,`<span class="settings-footer-note">保存后对新反馈生效，历史反馈不补发回执</span><div class="inline-actions"><button class="btn" data-action="dismiss-drawer">取消</button><button class="btn primary" data-action="save-settings">保存设置</button></div>`));
    updatePreview();
  }
  function updatePreview() { if (!$('#inlineSubject')) return; const r={id:89}; $('#inlineSubject').textContent=template(draft.subject,r); $('#inlineBody').textContent=template(draft.body,r); $('#inlineSender').textContent=draft.senderName; $('#bodyCounter').textContent=`${draft.body.length} / 3000`; }
  function openDetail(id) { previousFocus=document.activeElement; selectedId=Number(id); drawer='detail'; replyDraft='';replyFiles=[];replyNotify=true;renderDetail(); }
  function renderDetail() {
    const r=current(); if(!r)return;
    if(!isEmail(r.email))replyNotify=false;
    const timeline=r.messages.map((m,index)=>{
      const label=m.kind==='user'?(r.name||'用户'):m.kind==='auto'?'自动回执':m.kind==='agent'?'客服回复':'系统记录';
      const badge=m.kind==='auto'?'自动发送':m.kind==='agent'&&m.origin==='gmail'?'Gmail 回复':m.via==='internal'?'后台记录':m.via==='h5'?'H5 提交':'邮件';
      const attachments=m.attachments || (m.attachment ? [typeof m.attachment==='string'?m.attachment:m.attachment.name||'附件.png'] : []);
      return `<article class="timeline-item"><div class="timeline-avatar ${m.kind==='auto'?'auto':m.kind==='agent'?'agent':m.kind==='system'?'system':'user'}">${icon(m.kind==='auto'?'mail':m.kind==='agent'?'message':m.kind==='system'?'info':'user')}</div><div class="timeline-main"><div class="timeline-head"><strong>${esc(label)}</strong><span class="source-tag ${m.kind==='auto'?'source-h5':''}">${badge}</span><time>${esc(m.at)}</time></div><div class="timeline-content ${m.kind==='auto'?'auto-content':''}">${esc(m.text)}${attachments.length?`<div class="attachment-list">${attachments.map(name=>`<button class="attachment" data-action="attachment" data-index="${index}" data-id="${r.id}">${icon('attachment')}${esc(name)}</button>`).join('')}</div>`:''}</div><div class="timeline-meta ${m.delivery==='failed'?'ack-failed':''}">${m.delivery==='sent'?icon('check')+'邮件已发送 · 不代表已送达或已阅读':m.delivery==='failed'?icon('info')+'邮件发送失败：'+esc(r.ackReason||'邮件服务暂不可用'):m.via==='internal'?'仅保存后台记录，未发送邮件':''}${m.kind==='auto'&&m.delivery==='failed'&&r.ack==='failed'?`<button class="link-btn" data-action="retry" data-id="${r.id}">重试发送</button>`:''}</div></div></article>`;
    }).join('');
    const composer=r.status==='closed'?`<div class="composer"><div class="notice notice-info">${icon('info')}<span>此反馈已关闭。如需继续跟进，可重新打开。</span><button class="link-btn" data-action="reopen" data-id="${r.id}">重新打开</button></div></div>`:`<section class="composer"><div class="composer-head"><strong>回复用户</strong><select id="quickReply" aria-label="选择快捷回复"><option value="">选择快捷回复</option><option value="details">请用户补充信息</option><option value="review">告知正在核查</option><option value="resolved">告知问题已解决</option></select></div><textarea id="replyContent" class="form-control" aria-label="回复内容" placeholder="请输入回复内容，邮件发送后会记录在上方沟通记录中" maxlength="3000">${esc(replyDraft)}</textarea><div class="attachment-list" id="replyAttachments">${replyFiles.map((f,i)=>`<button class="attachment" data-action="remove-file" data-index="${i}">${icon('attachment')}${esc(f.name)} ×</button>`).join('')}</div><div class="composer-actions"><div class="inline-actions"><label class="link-btn attachment-label">${icon('attachment')}添加图片<input class="visually-hidden" id="replyFile" type="file" accept="image/*" multiple></label><span class="form-help" id="replyCount">${replyDraft.length} / 3000</span></div><label class="checkbox-row"><input id="notifyEmail" type="checkbox" ${replyNotify?'checked':''} ${!isEmail(r.email)?'disabled':''}>发送邮件通知</label></div><div class="form-help">${isEmail(r.email)?'收件人：'+esc(r.email):'未提供有效邮箱，回复将仅保存在后台。'}</div><div id="replyError" class="form-error" role="alert"></div></section>`;
    const body=`<div class="drawer-body detail-body"><div class="detail-summary"><div class="form-row"><div class="inline-actions"><span class="tag tag-${r.status}">${statusNames[r.status]}</span><span class="source-tag ${r.source==='email'?'source-mail':'source-h5'}">${r.source==='email'?'邮箱来信':'H5 反馈'}</span><span class="ack-line ${ackClass(r.ack)}">${ackNames[r.ack]}</span></div>${r.ack==='failed'?`<button class="link-btn" data-action="retry" data-id="${r.id}">${icon('refresh')}重试回执</button>`:''}</div><div class="summary-grid"><div class="summary-item"><span>联系邮箱</span><strong>${esc(r.email||'未填写')}</strong></div><div class="summary-item"><span>用户 ID</span><strong>${esc(r.userId||'—（未关联用户）')}</strong></div><div class="summary-item"><span>反馈类型</span><strong>${esc(r.type)}</strong></div><div class="summary-item"><span>创建时间</span><strong>${esc(r.createdAt)}</strong></div></div>${r.ack!=='sent'?`<p class="form-help ${r.ack==='failed'?'ack-failed':''}">回执说明：${esc(r.ackReason||'未发送')}</p>`:''}</div><div class="conversation"><div class="conversation-heading"><h3 class="section-title">沟通记录</h3><span class="section-note">${r.messages.length} 条记录</span></div>${timeline}</div>${composer}</div>`;
    const foot=r.status==='closed'?`<span class="form-help">最后更新：${esc(r.updatedAt)}</span><button class="btn" data-action="dismiss-drawer">关闭详情</button>`:`<div class="inline-actions"><span class="form-help">回复后状态</span><select id="replyStatus" class="form-control" aria-label="回复后状态"><option value="processing">处理中</option><option value="done">已处理</option><option value="pending">待处理</option></select></div><div class="inline-actions"><button class="btn" data-action="dismiss-drawer">取消</button><button class="btn primary" data-action="send-reply">${icon('send')}发送回复</button></div>`;
    mountDrawer(drawerShell(`反馈详情 #${r.id}`,r.subject||r.content.slice(0,55),body,foot,true));
  }
  function dismissDrawer(force=false) {
    if(drawer==='settings') {captureSettings(); if(!force && JSON.stringify(draft)!==JSON.stringify(settings)) {openModal('discard','放弃未保存的修改？','<p>离开后，本次修改不会生效。</p>','<button class="btn" data-action="dismiss-modal">继续编辑</button><button class="btn primary" data-action="discard-drawer">放弃修改</button>');return;}}
    if(drawer==='detail' && !force && (replyDraft.trim()||replyFiles.length)) {openModal('discard','放弃未发送的回复？','<p>离开后，当前回复内容不会保存。</p>','<button class="btn" data-action="dismiss-modal">继续编辑</button><button class="btn primary" data-action="discard-drawer">放弃回复</button>');return;}
    $('#drawerRoot').innerHTML='';drawer=null;draft=null;document.body.style.overflow='';previousFocus?.focus();
  }
  let modalReturnFocus=null;
  function openModal(kind,title,body,foot,wide=false) { modalReturnFocus=document.activeElement;modalKind=kind;$('#modalRoot').innerHTML=`<div class="modal-backdrop"></div><section class="modal ${wide?'preview-modal':''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><h2 id="modalTitle">${title}</h2><button class="icon-button" data-action="dismiss-modal" aria-label="关闭弹窗">${icon('close')}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot||'<button class="btn primary" data-action="dismiss-modal">知道了</button>'}</div></section>`;document.body.style.overflow='hidden';$('#modalRoot .icon-button').focus();}
  function dismissModal() {$('#modalRoot').innerHTML='';modalKind=null;if(!drawer)document.body.style.overflow='';modalReturnFocus?.focus();}
  function preview() {captureSettings();openModal('preview','自动回执预览',`<div class="preview-envelope">${icon('mail')}H5 反馈收件回执</div><h3 class="preview-subject">${esc(template(draft.subject,{id:89}))}</h3><div class="preview-meta"><strong>${esc(draft.senderName)}</strong><span>${esc(draft.mailbox)}</span><span>收件人：alex.demo@example.com</span></div><div class="preview-content">${esc(template(draft.body,{id:89}))}</div><p class="form-help">邮箱来信将作为原邮件的回复发送，使用原会话主题。</p>`,`<button class="btn" data-action="dismiss-modal">返回编辑</button><button class="btn primary" data-action="test-modal">发送测试邮件</button>`,true);}
  function testModal() {captureSettings();openModal('test','发送测试邮件',`<p class="section-note">检查自动回执的主题、正文及反馈编号展示。</p><div class="field"><label for="testEmail">测试收件邮箱</label><input id="testEmail" class="form-control" type="email" placeholder="请输入测试邮箱" value="preview@example.com"></div><div class="notice notice-info">${icon('info')}<span>此操作仅演示发送结果，不会实际发送邮件。</span></div><div id="testError" class="form-error" role="alert"></div>`,'<button class="btn" data-action="dismiss-modal">取消</button><button class="btn primary" data-action="run-test">发送测试</button>');}
  function sendAck(r, forceFail=false) {
    if (r.ack==='sent') return false;
    const when=demoStamp();
    if(!settings.enabled) {r.ack='off';r.ackReason='提交时自动回执未开启';return false;}
    if(!isEmail(r.email)) {r.ack='skipped';r.ackReason=r.email?'联系邮箱格式无效，未发送回执':'未填写联系邮箱，未发送回执';return false;}
    const failed=forceFail||!settings.connected;
    r.ack=failed?'failed':'sent';r.ackAt=when;r.ackReason=failed?(!settings.connected?'Gmail 连接失效':'邮件服务暂时不可用，请重试'):'';
    r.messages.push({kind:'auto',via:'email',at:when,text:template(settings.body,r),delivery:failed?'failed':'sent',attachment:null});
    return !failed;
  }
  function retryAck(id) {
    const r=records.find(x=>x.id===Number(id)); if(!r||r.ack!=='failed')return;
    if(!settings.connected) {toast('Gmail 连接已失效，请先在反馈设置中重新连接');return;}
    if(!settings.enabled) {toast('自动回执已关闭，请先开启并保存设置');return;}
    r.ack='sent';r.ackReason='';r.ackAt=demoStamp();
    r.messages.push({kind:'auto',via:'email',at:r.ackAt,text:template(settings.body,r),delivery:'sent',attachment:null});
    persist();render();if(drawer==='detail')renderDetail();toast('回执重试成功（模拟），处理状态保持不变');
  }
  function simulationModal() {openModal('simulate','演示新反馈',`<p class="section-note">模拟反馈进入后台，查看自动回执和会话关联效果。</p><div class="field"><label for="simEvent">演示场景</label><select class="form-control" id="simEvent"><option value="h5">H5 提交新反馈</option><option value="email">Gmail 收到首次来信</option><option value="reply">用户回复原邮件会话</option><option value="agent">客服在 Gmail 中直接回复</option><option value="failure">新反馈 · 回执发送失败</option><option value="auto">收到对方自动回复（不回执）</option><option value="disconnect">Gmail 连接失效</option></select></div><div id="simFields"></div><div id="simError" class="form-error" role="alert"></div>`,'<button class="btn" data-action="dismiss-modal">取消</button><button class="btn primary" data-action="run-simulation">模拟提交</button>');renderSimFields();}
  function renderSimFields() {
    const kind=$('#simEvent').value;
    if(kind==='disconnect') {$('#simFields').innerHTML='<div class="notice notice-warning">连接失效后，列表显示提示。新 H5 反馈正常保存，邮件回执记为失败；重新连接后可重试。</div>';return;}
    if(kind==='reply'||kind==='agent') {$('#simFields').innerHTML=`<div class="field"><label for="simThread">原反馈会话</label><select class="form-control" id="simThread">${records.filter(r=>isEmail(r.email)&&r.ack==='sent').map(r=>`<option value="${r.id}">#${r.id} · ${esc(r.email)}</option>`).join('')}</select></div><div class="field"><label for="simContent">${kind==='agent'?'客服回复内容':'用户补充内容'}</label><textarea class="form-control" id="simContent" maxlength="3000">${kind==='agent'?'Hi, we are reviewing your feedback and will share an update as soon as possible.':"Thank you. I've attached the additional details. Could you please check again?"}</textarea></div><div class="form-help">${kind==='agent'?'同步到原反馈，更新最新人工回复，处理状态由客服决定。':'补充到原反馈，不新建记录，也不重复发送回执。'}</div>`;return;}
    if(kind==='auto') {$('#simFields').innerHTML='<div class="notice notice-info">模拟收到一封对方的外出自动回复。系统将忽略该邮件，不创建新反馈、不自动回执。</div>';return;}
    $('#simFields').innerHTML=`<div class="field"><label for="simEmail">联系邮箱</label><input class="form-control" id="simEmail" type="email" value="${kind==='email'?'jamie.demo':'alex.demo'}@example.com" placeholder="可留空，演示无邮箱场景"></div><div class="field"><label for="simContent">反馈内容</label><textarea id="simContent" class="form-control" maxlength="3000">${kind==='email'?'Hi, please help me cancel the automatic renewal of my subscription.':'I paid for a weekly subscription, but my videos are still locked. Please help.'}</textarea></div><div class="notice notice-info">${kind==='email'?'首次来信创建“邮箱”来源反馈，用户 ID 为空。':'反馈保存后自动回执，处理状态保持“待处理”。'}${kind==='failure'?' 本次将模拟邮件发送失败。':''}</div>`;
  }
  function runSimulation() {
    const kind=$('#simEvent').value;
    if(kind==='disconnect') {settings.connected=false;persist();dismissModal();render();toast('已模拟 Gmail 连接失效');return;}
    if(kind==='auto') {dismissModal();toast('已识别对方自动回复，未创建反馈、未发送回执');return;}
    const content=$('#simContent').value.trim();if(!content){$('#simError').textContent='请输入反馈内容';return;}
    if((kind==='reply'||kind==='email'||kind==='agent')&&(!settings.connected||!settings.syncEnabled)){ $('#simError').textContent='请先在反馈设置中连接 Gmail 并开启来信同步';return; }
    if(kind==='reply'||kind==='agent') {
      const r=records.find(x=>x.id===Number($('#simThread').value));if(!r){$('#simError').textContent='暂无可关联的邮件会话';return;}
      r.messages.push({kind:kind==='agent'?'agent':'user',via:'email',origin:kind==='agent'?'gmail':null,at:demoStamp(),text:content,delivery:kind==='agent'?'sent':null,attachment:null});r.updatedAt=demoStamp();
      if(kind==='agent')r.latestReply=content;
      if(kind==='reply'&&['closed','done'].includes(r.status)){r.status='pending';r.messages.push({kind:'system',via:'internal',at:demoStamp(),text:'用户补充了新消息，反馈已重新打开，等待客服跟进。',delivery:null,attachment:null});}
      persist();dismissModal();render();openDetail(r.id);toast(kind==='agent'?'已同步 Gmail 人工回复，未改变处理状态':'已追加到原反馈，未重复发送自动回执');return;
    }
    const email=$('#simEmail').value.trim();if(kind==='email'&&!isEmail(email)){$('#simError').textContent='首次邮件来信需要有效的发件邮箱';return;}
    const id=Math.max(...records.map(x=>x.id),89)+1, when=demoStamp(),source=kind==='email'?'email':'h5';
    const r={id,source,userId:source==='h5'?String(270000+id):null,email,name:source==='email'?'Jamie':'Guest',type:'其他',subject:source==='email'?'Help with my subscription':'H5 用户反馈',content,status:'pending',ack:'off',ackReason:'',ackAt:null,createdAt:when,updatedAt:when,latestReply:'',messages:[{kind:'user',via:source==='h5'?'h5':'email',at:when,text:content,delivery:null,attachment:null}]};
    sendAck(r,kind==='failure');records.unshift(r);persist();filters={};quick='all';page=1;$('#filterForm').reset();dismissModal();render();openDetail(r.id);toast(r.ack==='sent'?'新反馈已保存并发送回执（模拟），状态仍为待处理':r.ack==='failed'?'反馈已保存，回执发送失败，可在详情中重试':'反馈已保存，'+r.ackReason);
  }
  function sendReply() {
    const r=current(), content=$('#replyContent')?.value.trim();if(!r||!content){$('#replyError').textContent='请输入回复内容';return;}
    const notify=isEmail(r.email)&&$('#notifyEmail').checked;
    if(notify&&!settings.connected){$('#replyError').textContent='Gmail 连接失效。请先重新连接，或取消邮件通知后仅保存后台记录。';return;}
    if(notify&&!isEmail(r.email)){$('#replyError').textContent='当前反馈未提供有效邮箱';return;}
    const when=demoStamp();r.messages.push({kind:'agent',via:notify?'email':'internal',at:when,text:content,delivery:notify?'sent':null,attachment:null,attachments:replyFiles.map(f=>f.name)});r.latestReply=content;r.updatedAt=when;r.status=$('#replyStatus').value;
    replyDraft='';replyFiles=[];persist();render();renderDetail();toast(notify?'人工回复已发送（模拟），已更新处理状态':'回复已保存到后台，未发送邮件');
  }
  function resetFilters(){filters={};quick='all';page=1;$('#filterForm').reset();render();}
  function exportCsv() {const cols=['反馈ID','来源','用户ID','联系邮箱','反馈类型','反馈内容','处理状态','自动回执','最新人工回复','创建时间'];const vals=matchedRecords().map(r=>[r.id,r.source==='h5'?'H5反馈':'邮箱来信',r.userId,r.email,r.type,r.content,statusNames[r.status],ackNames[r.ack],r.latestReply,r.createdAt]);const quote=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const csv='\ufeff'+[cols,...vals].map(row=>row.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='反馈管理_演示数据.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出当前筛选结果（模拟数据）');}
  $('#filterForm').addEventListener('submit',e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));if(f.start&&f.end&&f.start>f.end){toast('开始日期不能晚于结束日期');return;}filters=f;page=1;render();});
  $('#filterForm').addEventListener('reset',()=>{setTimeout(()=>{filters={};quick='all';page=1;render();},0);});
  document.addEventListener('input',e=>{if(['autoSubject','autoBody','senderName'].includes(e.target.id)){captureSettings();updatePreview();}if(e.target.id==='replyContent'){replyDraft=e.target.value;$('#replyCount').textContent=`${replyDraft.length} / 3000`;}});
  document.addEventListener('change',e=>{
    if(e.target.id==='pageSize'){pageSize=Number(e.target.value);page=1;render();}
    if(e.target.id==='simEvent')renderSimFields();
    if(e.target.id==='notifyEmail')replyNotify=e.target.checked;
    if(e.target.id==='quickReply') {const texts={details:'Hi,\n\nThank you for the details. Could you please share your User ID and payment receipt so we can look into this further?\n\nBest regards,\nCustomer Support Team',review:'Hi,\n\nThank you for your patience. Our support team is reviewing your feedback. We will get back to you with an update as soon as possible.\n\nBest regards,\nCustomer Support Team',resolved:'Hi,\n\nWe have completed our review and addressed the issue you reported. Please try again and let us know if you need any further assistance.\n\nBest regards,\nCustomer Support Team'};if(texts[e.target.value]){replyDraft=texts[e.target.value];$('#replyContent').value=replyDraft;$('#replyCount').textContent=`${replyDraft.length} / 3000`;}}
    if(e.target.id==='replyFile'){const files=[...e.target.files];if(replyFiles.length+files.length>5){toast('最多添加 5 张图片');return;}if(files.some(f=>f.size>2*1024*1024||!f.type.startsWith('image/'))){toast('请添加不超过 2MB 的图片');return;}replyFiles.push(...files);$('#replyAttachments').innerHTML=replyFiles.map((f,i)=>`<button class="attachment" data-action="remove-file" data-index="${i}">${icon('attachment')}${esc(f.name)} ×</button>`).join('');}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=Number(b.dataset.id);
    if(a==='settings')openSettings();
    else if(a==='connection-settings')openSettings('mailbox');
    else if(a==='settings-tab'){captureSettings();settingsTab=b.dataset.value;renderSettings();}
    else if(a==='toggle-auto'){captureSettings();draft.enabled=!draft.enabled;renderSettings();}
    else if(a==='toggle-sync'){captureSettings();draft.syncEnabled=!draft.syncEnabled;renderSettings();}
    else if(a==='save-settings'){captureSettings();if(!draft.senderName.trim()||!draft.subject.trim()||!draft.body.trim()){settingsTab='auto';renderSettings();$('#settingsError').textContent='请填写发件人名称、邮件主题和正文';return;}if(draft.enabled&&!draft.connected){settingsTab='mailbox';renderSettings();toast('请先连接可用的 Gmail 客服邮箱');return;}settings=clone(draft);persist();dismissDrawer(true);render();toast('反馈设置已保存，对后续新反馈生效');}
    else if(a==='dismiss-drawer')dismissDrawer();
    else if(a==='dismiss-modal')dismissModal();
    else if(a==='discard-drawer'){dismissModal();dismissDrawer(true);}
    else if(a==='detail')openDetail(id);
    else if(a==='preview')preview();
    else if(a==='test-modal')testModal();
    else if(a==='run-test'){const email=$('#testEmail').value.trim();if(!isEmail(email)){$('#testError').textContent='请输入有效的测试邮箱';return;}if(!draft.connected){$('#testError').textContent='Gmail 连接已失效，请先重新连接';return;}dismissModal();toast('测试邮件发送成功（模拟），未发送真实邮件');}
    else if(a==='insert-variable'){const t=$('#autoBody'),start=t.selectionStart,end=t.selectionEnd;t.value=t.value.slice(0,start)+'#{feedback_id}'+t.value.slice(end);captureSettings();updatePreview();t.focus();t.setSelectionRange(start+14,start+14);}
    else if(a==='connect') {captureSettings();openModal('connect','连接 Gmail',`<div class="mail-connect-illustration">${icon('mail')}</div><p class="section-note">连接客服邮箱，用于接收反馈和发送回复。</p><div class="field"><label for="connectEmail">演示客服邮箱</label><input class="form-control" type="email" id="connectEmail" value="${esc(draft.mailbox||'support-demo@gmail.com')}"></div><div class="notice notice-info">${icon('info')}<span>原型仅模拟 Google 授权后的连接结果，不会发起真实授权或读取邮件。</span></div><div id="connectError" class="form-error" role="alert"></div>`,'<button class="btn" data-action="dismiss-modal">取消</button><button class="btn primary" data-action="finish-connect">模拟授权并连接</button>');}
    else if(a==='finish-connect'){const email=$('#connectEmail').value.trim();if(!isEmail(email)||!/@gmail\.com$/i.test(email)){$('#connectError').textContent='请输入以 @gmail.com 结尾的演示邮箱';return;}draft.mailbox=email;draft.connected=true;draft.syncAt=demoStamp();dismissModal();renderSettings();toast('邮箱已连接（模拟），保存设置后生效');}
    else if(a==='check-connection'){toast(draft.connected?'连接检查正常：收信、发信均可用（模拟）':'连接已失效，请重新连接 Gmail');}
    else if(a==='sync-now'){captureSettings();if(!draft.connected||!draft.syncEnabled){toast('请先连接 Gmail 并开启来信同步');return;}draft.syncAt=demoStamp();renderSettings();toast('同步完成（模拟），没有重复创建反馈或发送回执');}
    else if(a==='import-history'){openModal('history','导入历史邮件','<p>演示导入一条历史用户来信，创建反馈供客服查看。</p><div class="notice notice-info">历史邮件不发送自动回执，也不会更改已存在的反馈。</div>','<button class="btn" data-action="dismiss-modal">取消</button><button class="btn primary" data-action="finish-history">导入演示邮件</button>');}
    else if(a==='finish-history'){if(!draft.connected){toast('请先连接 Gmail');return;}const exists=records.find(r=>r.importMarker==='history-demo');if(exists){dismissModal();toast('该历史邮件已导入，未重复创建反馈');return;}const id=Math.max(...records.map(r=>r.id))+1;records.unshift({id,source:'email',userId:null,email:'history.demo@example.com',name:'Taylor',type:'其他',content:'Could you help me find the story I was watching?',subject:'Help finding a story',status:'pending',ack:'skipped',ackReason:'历史邮件导入，不触发自动回执',ackAt:null,createdAt:'2026-11-10 16:20:00',updatedAt:demoStamp(),latestReply:'',importMarker:'history-demo',messages:[{kind:'user',via:'email',at:'2026-11-10 16:20:00',text:'Could you help me find the story I was watching?',delivery:null,attachment:null},{kind:'system',via:'internal',at:demoStamp(),text:'历史邮件导入，未发送自动回执。',delivery:null,attachment:null}]});persist();dismissModal();render();toast('已导入 1 条历史反馈，未发送自动回执');}
    else if(a==='simulate')simulationModal();
    else if(a==='run-simulation')runSimulation();
    else if(a==='quick'){quick=b.dataset.value;page=1;render();}
    else if(a==='retry')retryAck(id);
    else if(a==='prev'){page--;render();}else if(a==='next'){page++;render();}else if(a==='page'){page=Number(b.dataset.value);render();}
    else if(a==='reset-filters')resetFilters();
    else if(a==='export')exportCsv();
    else if(a==='send-reply')sendReply();
    else if(a==='remove-file'){replyFiles.splice(Number(b.dataset.index),1);$('#replyAttachments').innerHTML=replyFiles.map((f,i)=>`<button class="attachment" data-action="remove-file" data-index="${i}">${icon('attachment')}${esc(f.name)} ×</button>`).join('');}
    else if(a==='close-record'){selectedId=id;openModal('close-record',`关闭反馈 #${id}？`,'<p>关闭后保留全部沟通记录，不向用户发送邮件。用户再次回复时可继续跟进。</p>','<button class="btn" data-action="dismiss-modal">取消</button><button class="btn primary" data-action="confirm-close">确认关闭</button>');}
    else if(a==='confirm-close'){const r=current();if(r){r.status='closed';r.updatedAt=demoStamp();r.messages.push({kind:'system',via:'internal',at:r.updatedAt,text:'客服已关闭反馈。',delivery:null,attachment:null});persist();render();}dismissModal();toast('反馈已关闭，沟通记录已保留');}
    else if(a==='reopen'){const r=current();r.status='pending';r.updatedAt=demoStamp();r.messages.push({kind:'system',via:'internal',at:r.updatedAt,text:'客服重新打开反馈，等待处理。',delivery:null,attachment:null});persist();render();renderDetail();toast('反馈已重新打开，未重复发送回执');}
    else if(a==='attachment'){openModal('attachment','反馈附件',`<div class="demo-receipt"><span class="source-tag">演示附件</span><h3>Payment confirmation</h3><div class="receipt-check">${icon('check')}</div><p>Sample payment receipt</p><span>仅用于演示反馈截图的查看效果</span><div class="receipt-line"></div><p>Order: DEMO-20261112</p><span>不包含真实支付信息</span></div>`);}
    else if(a==='reset-demo'){localStorage.removeItem(KEY);settings=clone(FeedbackSeed.settings);records=clone(FeedbackSeed.records);dismissModal();dismissDrawer(true);resetFilters();toast('已恢复初始演示数据和设置');}
  });
  $('#helpButton').innerHTML=icon('help');
  $('#helpButton').addEventListener('click',()=>openModal('help','原型使用说明','<ol class="rule-list"><li>点击「反馈设置」，编辑统一回执文案、预览邮件或管理 Gmail 接入。</li><li>点击「演示新反馈」，测试两个来源的新反馈、会话追加和失败重试。</li><li>点击列表「处理」，查看沟通记录并模拟人工回复。</li></ol><div class="notice notice-info">数据与设置仅保存在当前浏览器，不会连接 Gmail 或发送真实邮件。</div>','<button class="btn" data-action="reset-demo">恢复演示数据</button><button class="btn primary" data-action="dismiss-modal">开始体验</button>'));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(modalKind)dismissModal();else if(drawer)dismissDrawer();}
    if(e.key==='Tab'&&(modalKind||drawer)){const root=modalKind?$('#modalRoot .modal'):$('#drawerRoot .drawer');const focusable=[...root.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}
  });
  render();
})();
