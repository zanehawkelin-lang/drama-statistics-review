// All identities, subscriptions, orders and payment attempts are synthetic.
export const AS_OF='2026-11-12 18:00:00';
export const APPS=['DramaVideo','QuikDrama','Prutora'];
export const USERS=[{id:'810001',country:'美国'},{id:'810002',country:'英国'},{id:'810003',country:'加拿大'},{id:'810004',country:'澳大利亚'}];
const subscription=(id,userId,app,product,cycle,status,createdAt,periodEnd,nextAt,provider,method,extra={})=>({id,userId,app,product,cycle,status,createdAt,periodEnd,nextAt,provider,method,amount:cycle===30?19.99:9.99,currency:'USD',retry:false,canceledAt:'',...extra});
export const SUBSCRIPTIONS=[
  subscription('DEMO-SUB-810001-01','810001','DramaVideo','7天会员',7,'生效中','2026-10-18 10:00:00','2026-11-15 10:00:00','2026-11-15 10:00:00','Airwallex','Card Pay'),
  subscription('DEMO-SUB-810001-02','810001','DramaVideo','30天会员',30,'生效中','2026-09-13 09:00:00','2026-11-12 09:00:00','2026-11-13 09:00:00','PayPal','PayPal',{retry:true}),
  subscription('DEMO-SUB-810001-03','810001','DramaVideo','7天会员',7,'已取消','2026-10-26 16:30:00','2026-11-16 16:30:00','','Airwallex','Apple Pay',{canceledAt:'2026-11-10 15:20:00'}),
  subscription('DEMO-SUB-810001-04','810001','QuikDrama','7天会员',7,'生效中','2026-10-20 12:00:00','2026-11-17 12:00:00','2026-11-17 12:00:00','Airwallex','Google Pay'),
  subscription('DEMO-SUB-810002-01','810002','DramaVideo','30天会员',30,'生效中','2026-09-23 11:00:00','2026-11-22 11:00:00','2026-11-22 11:00:00','Airwallex','Card Pay'),
  subscription('DEMO-SUB-810002-02','810002','DramaVideo','7天会员',7,'已取消','2026-10-25 08:00:00','2026-11-15 08:00:00','','PayPal','PayPal',{canceledAt:'2026-11-09 12:10:00'}),
  subscription('DEMO-SUB-810003-01','810003','Prutora','7天会员',7,'已到期','2026-10-15 15:00:00','2026-11-05 15:00:00','','Airwallex','Card Pay'),
  subscription('DEMO-SUB-810004-01','810004','DramaVideo','7天会员',7,'生效中','2026-11-11 13:00:00','2026-11-18 13:00:00','2026-11-18 13:00:00','Airwallex','Apple Pay'),
];
export const ATTEMPTS=[];
let sequence=0;
function addPeriod(subscriptionId,key,periodEnd,attempts){
  const sub=SUBSCRIPTIONS.find(s=>s.id===subscriptionId);
  const billingId=`${subscriptionId.replace('SUB','BILL')}-${key}`,orderId=`${subscriptionId.replace('SUB','ORDER')}-${key}`;
  attempts.forEach(([attemptedAt,status,reason='',code=''],i)=>{
    sequence++;
    ATTEMPTS.push({id:`DEMO-CHG-${String(sequence).padStart(5,'0')}`,subscriptionId,billingId,orderId,product:sub.product,periodEnd,attemptNo:i+1,attemptedAt,status,
      requested:sub.amount,received:status==='成功'?sub.amount:null,currency:sub.currency,paidAt:status==='成功'?attemptedAt:'',provider:sub.provider,method:sub.method,
      transactionId:status==='处理中'?'':`DEMO-${sub.provider==='PayPal'?'PP':'AW'}-${String(sequence).padStart(8,'0')}`,failureReason:reason,failureCode:code});
  });
}
addPeriod('DEMO-SUB-810001-01','20261025','2026-11-01 10:00:00',[['2026-10-25 10:00:12','成功']]);
addPeriod('DEMO-SUB-810001-01','20261101','2026-11-08 10:00:00',[
  ['2026-11-01 10:00:08','失败','余额不足','insufficient_funds'],['2026-11-01 11:30:05','成功']]);
addPeriod('DEMO-SUB-810001-01','20261108','2026-11-15 10:00:00',[['2026-11-08 10:00:06','成功']]);
addPeriod('DEMO-SUB-810001-02','20261013','2026-11-12 09:00:00',[['2026-10-13 09:00:15','成功']]);
addPeriod('DEMO-SUB-810001-02','20261112','2026-12-12 09:00:00',[
  ['2026-11-12 09:00:12','失败','余额不足','insufficient_funds'],['2026-11-12 15:00:24','失败','余额不足','insufficient_funds']]);
addPeriod('DEMO-SUB-810001-03','20261102','2026-11-09 16:30:00',[['2026-11-02 16:30:08','成功']]);
addPeriod('DEMO-SUB-810001-03','20261109','2026-11-16 16:30:00',[['2026-11-09 16:30:09','成功']]);
addPeriod('DEMO-SUB-810001-04','20261103','2026-11-10 12:00:00',[['2026-11-03 12:00:08','成功']]);
addPeriod('DEMO-SUB-810001-04','20261110','2026-11-17 12:00:00',[['2026-11-10 12:00:08','成功']]);
addPeriod('DEMO-SUB-810002-01','20261023','2026-11-22 11:00:00',[['2026-10-23 11:00:07','成功']]);
addPeriod('DEMO-SUB-810002-02','20261101','2026-11-08 08:00:00',[['2026-11-01 08:00:09','成功']]);
addPeriod('DEMO-SUB-810002-02','20261108','2026-11-15 08:00:00',[['2026-11-08 08:00:09','成功']]);
addPeriod('DEMO-SUB-810003-01','20261022','2026-10-29 15:00:00',[['2026-10-22 15:00:04','成功']]);
addPeriod('DEMO-SUB-810003-01','20261029','2026-11-05 15:00:00',[['2026-10-29 15:00:04','成功']]);
export function selectSubscriptions(filters,subscriptions=SUBSCRIPTIONS){return subscriptions.filter(s=>s.userId===filters.userId.trim()&&(!filters.app||s.app===filters.app)&&(!filters.status||s.status===filters.status));}
export function billingHistory(subscriptionId,attempts=ATTEMPTS){
  const groups=new Map();
  for(const a of attempts.filter(a=>a.subscriptionId===subscriptionId)){
    if(!groups.has(a.billingId))groups.set(a.billingId,new Map());
    groups.get(a.billingId).set(a.id,a);
  }
  return [...groups.values()].map(group=>{
    const entries=[...group.values()].sort((a,b)=>a.attemptedAt.localeCompare(b.attemptedAt)||a.attemptNo-b.attemptNo);
    const successful=entries.filter(a=>a.status==='成功'),final=successful.at(-1)||entries.at(-1);
    return {...final,attempts:entries,latestAt:entries.at(-1).attemptedAt};
  }).sort((a,b)=>b.latestAt.localeCompare(a.latestAt)||a.billingId.localeCompare(b.billingId));
}
export function latestBilling(subscriptionId){return billingHistory(subscriptionId)[0]||null;}
export function successfulRenewals(subscriptionId,attempts=ATTEMPTS){return billingHistory(subscriptionId,attempts).filter(b=>b.status==='成功').length;}
export function entitlementValid(subscription){return subscription.periodEnd>AS_OF;}
