// Synthetic demonstration data only. All timestamps use fixed UTC+8 wall time.
export const AS_OF = '2026-11-17 18:00:00';
export const APPS = ['DramaVideo', 'QuikDrama', 'Prutora'];
export const STOP_TYPES = [
  {metric: 'voluntary', type: 'voluntary', label: '用户取消'},
  {metric: 'terminated', type: 'payment_failure', label: '支付原因终止'},
  {metric: 'platform', type: 'platform', label: '平台关闭'},
  {metric: 'unknown', type: 'unknown', label: '原因待确认'},
];

const dayOf = value => String(value || '').slice(0, 10);
const shiftDay = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};
export const DEFAULT_RANGE = {start: shiftDay(dayOf(AS_OF), -7), end: shiftDay(dayOf(AS_OF), -1)};
const at = (day, time) => `${day} ${time}:00`;
const uniqueAttempts = attempts => [...new Map(attempts.map(a => [a.id, a])).values()]
  .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
const reasonLabel = type => STOP_TYPES.find(item => item.type === type)?.label || '原因待确认';
const amountList = rows => {
  const cents = new Map();
  for (const row of rows) cents.set(row.currency, (cents.get(row.currency) || 0) + Math.round(row.amount * 100));
  return [...cents].map(([currency, value]) => ({currency, amount: value / 100}))
    .sort((a, b) => a.currency === b.currency ? 0 : a.currency === 'USD' ? -1 : b.currency === 'USD' ? 1 : a.currency.localeCompare(b.currency));
};

const bills = [], stops = [];
function makeBill(key, day, app, mode, extra = {}) {
  const index = APPS.indexOf(app);
  const currency = 'USD';
  const amount = mode % 2 === 0 ? 9.99 : 19.99;
  const billingId = `DEMO-BILL-${key}`;
  const subscriptionId = `DEMO-SUB-D-${key}`;
  const base = {
    id: billingId, billingId, orderId: `DEMO-RENEW-${key}`, subscriptionId, purchaseType: 'auto_renewal',
    userId: String(810001 + ((Number(key.replace(/\D/g, '').slice(-4)) || index) % 4)),
    app, product: mode % 2 === 0 ? '7天会员' : '30天会员', amount, currency,
    provider: index === 1 ? 'PayPal' : 'Airwallex', method: index === 1 ? 'PayPal' : 'Card Pay',
    entitlementEnd: at(shiftDay(day, mode % 2 === 0 ? 7 : 30), '09:00'), attempts: [], ...extra,
  };
  const attempt = (suffix, date, time, status, reason = '', nextAt = '') => ({
    id: `DEMO-ATT-${key}-${suffix}`, at: at(date, time), status, reason,
    amount: base.amount, currency: base.currency, nextAt,
    provider: base.provider, method: base.method,
    transactionId: `DEMO-TXN-${key}-${suffix}`,
  });
  if (mode === 0) base.attempts.push(attempt('01', day, '09:20', '成功'));
  if (mode === 1) base.attempts.push(attempt('01', day, '10:45', '成功'));
  if (mode === 2) base.attempts.push(
    attempt('01', day, '10:00', '失败', '余额不足', at(day, '14:10')),
    attempt('02', day, '14:10', '成功'),
  );
  if (mode === 3) base.attempts.push(
    attempt('01', day, '11:30', '失败', '发卡行暂时拒绝', at(shiftDay(day, 1), '09:40')),
    attempt('02', shiftDay(day, 1), '09:40', '成功'),
  );
  if (mode === 4) {
    base.attempts.push(
      attempt('01', day, '12:05', '失败', '银行卡已过期', at(day, '15:00')),
      attempt('02', day, '15:00', '失败', '银行卡已过期'),
    );
    stops.push({...base, id: `DEMO-STOP-${key}`, eventAt: at(day, '17:00'), stopType: 'payment_failure', reason: '银行卡已过期，已结束重试并停止自动续费'});
  }
  if (mode === 5) {
    base.attempts.push(
      attempt('01', day, '16:30', '失败', '余额不足', at(shiftDay(day, 2), '10:00')),
      attempt('02', shiftDay(day, 2), '10:00', '失败', '余额不足', at(shiftDay(day, 4), '09:30')),
      attempt('03', shiftDay(day, 4), '09:30', '失败', '余额不足'),
    );
    stops.push({...base, id: `DEMO-STOP-${key}`, eventAt: at(shiftDay(day, 4), '10:00'), stopType: 'payment_failure', reason: '扣款失败后重试期结束，停止自动续费'});
  }
  bills.push(base);
  return base;
}

// Thirty days of deterministic examples, without implying real business performance.
for (let offset = 0; offset < 30; offset++) {
  const day = shiftDay('2026-10-19', offset);
  APPS.forEach((app, appIndex) => {
    const count = 4 + (offset + appIndex) % 4;
    for (let n = 0; n < count; n++) makeBill(`${day.replaceAll('-', '')}-${appIndex}-${n}`, day, app, (offset + appIndex + n) % 6);
    if ((offset + appIndex) % 3 === 0) {
      const key = `VOL-${day.replaceAll('-', '')}-${appIndex}`;
      stops.push({
        id: `DEMO-STOP-${key}`, subscriptionId: `DEMO-SUB-${key}`, userId: String(810001 + (offset % 4)),
        app, product: '30天会员', eventAt: at(day, '13:25'), stopType: 'voluntary',
        reason: '用户主动关闭自动续费', entitlementEnd: at(shiftDay(day, 12), '09:00'),
        currency: 'USD', amount: null, attempts: [],
      });
    }
  });
}

export const FIXTURE_IDS = {
  crossDay: 'DEMO-BILL-FIX-CROSS', sameDay: 'DEMO-BILL-FIX-SAME',
  pending: 'DEMO-BILL-FIX-PENDING', terminated: 'DEMO-BILL-FIX-TERMINATED',
  voluntary: 'DEMO-SUB-FIX-VOLUNTARY',
  manual: 'DEMO-SUB-FIX-MANUAL', unknown: 'DEMO-SUB-FIX-UNKNOWN',
  service: 'DEMO-SUB-FIX-SERVICE', refund: 'DEMO-BILL-FIX-SAME',
};
const cross = makeBill('FIX-CROSS', '2026-11-16', 'DramaVideo', 3, {userId: '810001'});
const same = makeBill('FIX-SAME', '2026-11-17', 'DramaVideo', 2, {userId: '810001'});
// Repeated provider notifications have the same attempt identifier and never add orders or amounts.
same.attempts.push({...same.attempts[1]});
const pending = makeBill('FIX-PENDING', '2026-11-16', 'DramaVideo', 5, {userId: '810002'});
const terminated = makeBill('FIX-TERMINATED', '2026-11-17', 'DramaVideo', 4, {userId: '810003'});
stops.push({
  id: 'DEMO-STOP-FIX-VOLUNTARY', subscriptionId: FIXTURE_IDS.voluntary, userId: '810004',
  app: 'DramaVideo', product: '30天会员', eventAt: '2026-11-17 09:45:00', stopType: 'voluntary',
  reason: '用户主动关闭自动续费', entitlementEnd: '2026-11-30 09:45:00', currency: 'USD', amount: null, attempts: [],
});

// Confirmed closure examples. Refund amounts never reduce the gross renewal-paid metric.
stops.push(
  {
    id: 'DEMO-STOP-FIX-MANUAL', subscriptionId: FIXTURE_IDS.manual, userId: '810002',
    app: 'DramaVideo', product: '30天会员', eventAt: '2026-11-16 16:20:00', stopType: 'platform',
    reasonCode: 'manual_close', reason: '后台人工关闭', source: '管理后台', operator: '运营（演示）',
    entitlementEnd: '2026-11-28 09:00:00', closureStatus: 'succeeded',
  },
  {
    ...same, id: 'DEMO-STOP-FIX-REFUND', eventAt: '2026-11-17 17:35:00', stopType: 'platform',
    reasonCode: 'refund_succeeded', reason: '退款成功自动关闭', source: '系统自动', operator: '',
    entitlementEnd: '', closureStatus: 'succeeded',
    refund: {id: 'DEMO-REFUND-FIX-SAME', orderId: same.orderId, subscriptionId: same.subscriptionId,
      status: 'succeeded', type: 'full', amount: same.amount, currency: same.currency, succeededAt: '2026-11-17 17:30:00'},
  },
  {
    id: 'DEMO-STOP-FIX-SERVICE', subscriptionId: FIXTURE_IDS.service, userId: '810004',
    app: 'DramaVideo', product: '7天会员', eventAt: '2026-11-17 16:45:00', stopType: 'voluntary',
    reasonCode: 'user_requested', reason: '客服按用户要求取消', source: '客服后台', operator: '客服（演示）',
    entitlementEnd: '2026-11-22 09:00:00', closureStatus: 'succeeded',
  },
  {
    id: 'DEMO-STOP-FIX-UNKNOWN', subscriptionId: FIXTURE_IDS.unknown, userId: '810003',
    app: 'QuikDrama', product: '30天会员', eventAt: '2026-11-17 17:10:00', stopType: 'unknown',
    reason: '渠道已确认关闭，未提供具体原因', source: '支付渠道', operator: '',
    entitlementEnd: '2026-11-25 09:00:00', closureStatus: 'succeeded',
  },
);

export const DEMO_DATA = {bills, stops, asOf: AS_OF};

/** Build pure query functions; injections allow checks of counting rules without UI coupling. */
export function createModel({bills: rawBills = [], stops: rawStops = [], asOf = AS_OF} = {}) {
  const allBills = [...new Map(rawBills.filter(b => !b.purchaseType || b.purchaseType === 'auto_renewal')
    .map(b => [b.billingId, {...b, attempts: uniqueAttempts(b.attempts || [])}])).values()];
  // No reactivation flow in this prototype: repeated closure callbacks/refunds must not add new stops.
  const stopBySubscription = new Map();
  for (const row of [...rawStops].sort((a, b) => a.eventAt.localeCompare(b.eventAt) || a.id.localeCompare(b.id))) {
    if (row.closureStatus && row.closureStatus !== 'succeeded') continue;
    if (row.reasonCode === 'refund_succeeded' && (row.refund?.status !== 'succeeded'
      || row.refund.subscriptionId !== row.subscriptionId || row.refund.succeededAt > row.eventAt)) continue;
    const key = `${row.app}:${row.subscriptionId}`;
    if (!stopBySubscription.has(key)) {
      const stopType = STOP_TYPES.some(item => item.type === row.stopType) ? row.stopType : 'unknown';
      stopBySubscription.set(key, {...row, stopType,
        source: row.source || (stopType === 'voluntary' ? '用户端' : stopType === 'payment_failure' ? '系统自动' : '未提供'),
        operator: row.operator || '',
      });
    }
  }
  const allStops = [...stopBySubscription.values()];

  function interval(filters = {}, selectedDay) {
    const start = selectedDay || filters.start || DEFAULT_RANGE.start;
    const end = selectedDay || filters.end || DEFAULT_RANGE.end;
    for (const value of [start, end]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || shiftDay(value, 0) !== value) throw new RangeError('日期格式不正确');
    }
    if (start > end) throw new RangeError('开始日期不能晚于结束日期');
    const count = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
    if (count > 366) throw new RangeError('请查询不超过366天的日期范围');
    const complete = end < dayOf(asOf);
    const cutoff = complete ? `${shiftDay(end, 1)} 00:00:00` : asOf;
    return {app: filters.app || '', start, end, cutoff, complete, futureOnly: start > dayOf(asOf), count};
  }
  const applies = (row, range) => !range.app || row.app === range.app;
  const beforeCutoff = (time, range) => range.complete ? time < range.cutoff : time <= range.cutoff;
  const inRange = (time, range) => time >= `${range.start} 00:00:00` && beforeCutoff(time, range);
  const stopAt = (bill, range) => allStops.find(s => s.app === bill.app && s.subscriptionId === bill.subscriptionId && beforeCutoff(s.eventAt, range));
  const known = (bill, range) => bill.attempts.filter(a => beforeCutoff(a.at, range));

  function billRecord(bill, range, event, status, reason = '') {
    const attempts = known(bill, range);
    const success = attempts.find(a => a.status === '成功');
    const latest = attempts.at(-1);
    const stop = stopAt(bill, range);
    const canRetry = !success && !stop && latest?.status === '失败' && !!latest.nextAt;
    return {
      ...bill, id: bill.billingId, eventAt: event.at, status, reason,
      amount: bill.amount, paidAmount: success ? success.amount : null,
      attempts, nextAt: canRetry ? latest.nextAt : '',
      stopType: stop?.stopType || '', stopReason: stop ? reasonLabel(stop.stopType) : '',
    };
  }

  function recordsFor(metric, filters = {}, selectedDay) {
    if (!['success', 'recovered', 'failed', 'pending', 'stopped', ...STOP_TYPES.map(item => item.metric)].includes(metric)) throw new RangeError('不支持的指标');
    const range = interval(filters, selectedDay);
    if (range.futureOnly) return [];
    let records = [];
    if (metric === 'stopped' || STOP_TYPES.some(item => item.metric === metric)) {
      const latestStops = new Map();
      for (const stop of allStops.filter(s => applies(s, range) && inRange(s.eventAt, range))) latestStops.set(`${stop.app}:${stop.subscriptionId}`, stop);
      records = [...latestStops.values()]
        .filter(s => metric === 'stopped' || s.stopType === STOP_TYPES.find(item => item.metric === metric)?.type)
        .map(s => {
          const bill = allBills.find(b => b.billingId === s.billingId);
          return {...s, status: reasonLabel(s.stopType), stopReason: reasonLabel(s.stopType), nextAt: '', paidAmount: null, attempts: bill ? known(bill, range) : []};
        });
    } else if (['success', 'recovered', 'failed', 'pending'].includes(metric)) {
      for (const bill of allBills.filter(b => applies(b, range))) {
        const attempts = known(bill, range);
        if (!attempts.length) continue;
        const success = attempts.find(a => a.status === '成功');
        const latest = attempts.at(-1);
        const stop = stopAt(bill, range);
        const recovery = success && attempts.some(a => a.status === '失败' && a.at <= success.at);
        if ((metric === 'success' || metric === 'recovered') && success && inRange(success.at, range) && (metric !== 'recovered' || recovery)) {
          records.push(billRecord(bill, range, success, '成功', recovery ? '失败后重试成功' : '自动续费扣款成功'));
        }
        if (metric === 'failed') {
          const failure = attempts.filter(a => a.status === '失败' && inRange(a.at, range)).at(-1);
          if (failure) {
            const status = success ? '失败后已成功' : stop ? (stop.stopType === 'voluntary' ? '失败·已取消' : '失败·已终止') : latest.status === '失败' && latest.nextAt ? '失败·待重试' : '失败';
            records.push(billRecord(bill, range, failure, status, failure.reason || '扣款失败'));
          }
        }
        if (metric === 'pending' && !success && !stop && latest.status === '失败' && latest.nextAt) {
          records.push(billRecord(bill, range, latest, '待重试', latest.reason || '等待下次扣款重试'));
        }
      }
    } else throw new RangeError('不支持的指标');
    return records.sort((a, b) => b.eventAt.localeCompare(a.eventAt) || a.id.localeCompare(b.id));
  }

  function aggregate(filters, day) {
    const success = recordsFor('success', filters, day);
    const stopped = recordsFor('stopped', filters, day);
    return {
      success: success.length, recovered: recordsFor('recovered', filters, day).length,
      failed: recordsFor('failed', filters, day).length, pending: recordsFor('pending', filters, day).length,
      stopped: stopped.length, voluntary: stopped.filter(s => s.stopType === 'voluntary').length,
      terminated: stopped.filter(s => s.stopType === 'payment_failure').length,
      platform: stopped.filter(s => s.stopType === 'platform').length,
      unknown: stopped.filter(s => s.stopType === 'unknown').length,
      amounts: amountList(success.map(s => ({currency: s.currency, amount: s.paidAmount}))),
    };
  }

  function summarize(filters = {}) {
    const range = interval(filters);
    const normalized = {app: range.app, start: range.start, end: range.end};
    const days = Array.from({length: range.count}, (_, i) => {
      const date = shiftDay(range.start, i);
      return {date, ...aggregate(normalized, date)};
    });
    return {...aggregate(normalized), days};
  }
  return {summarize, recordsFor};
}

const defaultModel = createModel(DEMO_DATA);
export const summarize = (...args) => defaultModel.summarize(...args);
export const recordsFor = (...args) => defaultModel.recordsFor(...args);
