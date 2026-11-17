// Synthetic demonstration data only. All timestamps use fixed UTC+8 wall time.
export const AS_OF = '2026-11-17 18:00:00';
export const APPS = ['DramaVideo', 'QuikDrama', 'Prutora'];
export const DEFAULT_RANGE = {start: '2026-11-11', end: '2026-11-17'};

const dayOf = value => String(value || '').slice(0, 10);
const shiftDay = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};
const at = (day, time) => `${day} ${time}:00`;
const uniqueAttempts = attempts => [...new Map(attempts.map(a => [a.id, a])).values()]
  .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
const reasonLabel = type => type === 'voluntary' ? '主动取消' : '扣款失败终止';
const amountList = rows => {
  const cents = new Map();
  for (const row of rows) cents.set(row.currency, (cents.get(row.currency) || 0) + Math.round(row.amount * 100));
  return [...cents].map(([currency, value]) => ({currency, amount: value / 100}))
    .sort((a, b) => a.currency === b.currency ? 0 : a.currency === 'USD' ? -1 : b.currency === 'USD' ? 1 : a.currency.localeCompare(b.currency));
};

const bills = [], stops = [];
function makeBill(key, day, app, mode, extra = {}) {
  const index = APPS.indexOf(app);
  const currency = app === 'QuikDrama' ? 'EUR' : 'USD';
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
        currency: app === 'QuikDrama' ? 'EUR' : 'USD', amount: null, attempts: [],
      });
    }
  });
}

export const FIXTURE_IDS = {
  crossDay: 'DEMO-BILL-FIX-CROSS', sameDay: 'DEMO-BILL-FIX-SAME',
  pending: 'DEMO-BILL-FIX-PENDING', terminated: 'DEMO-BILL-FIX-TERMINATED',
  voluntary: 'DEMO-SUB-FIX-VOLUNTARY',
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

export const DEMO_DATA = {bills, stops, asOf: AS_OF};

/** Build pure query functions; injections allow checks of counting rules without UI coupling. */
export function createModel({bills: rawBills = [], stops: rawStops = [], asOf = AS_OF} = {}) {
  const allBills = [...new Map(rawBills.filter(b => !b.purchaseType || b.purchaseType === 'auto_renewal')
    .map(b => [b.billingId, {...b, attempts: uniqueAttempts(b.attempts || [])}])).values()];
  const allStops = [...new Map(rawStops.map(s => [s.id, s])).values()].sort((a, b) => a.eventAt.localeCompare(b.eventAt) || a.id.localeCompare(b.id));

  function interval(filters = {}, selectedDay) {
    const start = selectedDay || filters.start || DEFAULT_RANGE.start;
    const end = selectedDay || filters.end || DEFAULT_RANGE.end;
    for (const value of [start, end]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || shiftDay(value, 0) !== value) throw new RangeError('日期格式不正确');
    }
    if (start > end) throw new RangeError('开始日期不能晚于结束日期');
    const count = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
    if (count > 366) throw new RangeError('请查询不超过366天的日期范围');
    const cutoff = end >= dayOf(asOf) ? asOf : `${end} 23:59:59`;
    return {app: filters.app || '', start, end, cutoff, futureOnly: start > dayOf(asOf), count};
  }
  const applies = (row, range) => !range.app || row.app === range.app;
  const inRange = (time, range) => time >= `${range.start} 00:00:00` && time <= range.cutoff;
  const stopAt = (subscriptionId, cutoff) => allStops.filter(s => s.subscriptionId === subscriptionId && s.eventAt <= cutoff).at(-1);
  const known = (bill, cutoff) => bill.attempts.filter(a => a.at <= cutoff);

  function billRecord(bill, range, event, status, reason = '') {
    const attempts = known(bill, range.cutoff);
    const success = attempts.find(a => a.status === '成功');
    const latest = attempts.at(-1);
    const stop = stopAt(bill.subscriptionId, range.cutoff);
    const canRetry = !success && !stop && latest?.status === '失败' && !!latest.nextAt;
    return {
      ...bill, id: bill.billingId, eventAt: event.at, status, reason,
      amount: bill.amount, paidAmount: success ? success.amount : null,
      attempts, nextAt: canRetry ? latest.nextAt : '',
      stopType: stop?.stopType || '', stopReason: stop ? reasonLabel(stop.stopType) : '',
    };
  }

  function recordsFor(metric, filters = {}, selectedDay) {
    if (!['success', 'recovered', 'failed', 'pending', 'stopped', 'voluntary', 'terminated'].includes(metric)) throw new RangeError('不支持的指标');
    const range = interval(filters, selectedDay);
    if (range.futureOnly) return [];
    let records = [];
    if (['stopped', 'voluntary', 'terminated'].includes(metric)) {
      const latestStops = new Map();
      for (const stop of allStops.filter(s => applies(s, range) && inRange(s.eventAt, range))) latestStops.set(stop.subscriptionId, stop);
      records = [...latestStops.values()]
        .filter(s => metric === 'stopped' || s.stopType === (metric === 'voluntary' ? 'voluntary' : 'payment_failure'))
        .map(s => {
          const bill = allBills.find(b => b.billingId === s.billingId);
          return {...s, status: s.stopType === 'voluntary' ? '主动取消' : '失败终止', stopReason: reasonLabel(s.stopType), nextAt: '', paidAmount: null, attempts: bill ? known(bill, range.cutoff) : []};
        });
    } else if (['success', 'recovered', 'failed', 'pending'].includes(metric)) {
      for (const bill of allBills.filter(b => applies(b, range))) {
        const attempts = known(bill, range.cutoff);
        if (!attempts.length) continue;
        const success = attempts.find(a => a.status === '成功');
        const latest = attempts.at(-1);
        const stop = stopAt(bill.subscriptionId, range.cutoff);
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
