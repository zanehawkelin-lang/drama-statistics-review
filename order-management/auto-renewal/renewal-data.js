// Discussion data only. No payment or subscription service is connected.
export const SNAPSHOT='2026-11-12 18:00:00';
export const APPS=['DramaVideo','QuikDrama','Prutora'];
export const PRODUCTS=['7天会员','30天会员'];
export const PROVIDERS=['Airwallex','PayPal'];
const pad=n=>String(n).padStart(2,'0');
const date=(day,hour=10,minute=0)=>`2026-11-${pad(day)} ${pad(hour)}:${pad(minute)}:00`;
export const PLANS=Array.from({length:26},(_,i)=>{
  const monthly=i%4===2,stopped=i%7===5,retry=i%6===2&&!stopped;
  const dueDay=13+i%10;
  return {
    id:`DEMO-SUB-${810001+i}`,userId:String(810001+i),app:APPS[i%3],
    country:['美国','英国','加拿大','澳大利亚'][i%4],product:PRODUCTS[monthly?1:0],
    cycle:monthly?'每30天':'每7天',amount:monthly?19.99:9.99,currency:'USD',
    provider:i%4===1?'PayPal':'Airwallex',method:i%4===1?'PayPal':['Card Pay','Apple Pay','Google Pay'][i%3],
    status:stopped?'已停止':retry?'重试中':'待扣款',
    subscriptionStatus:stopped?(i%2===0?'已到期':'已取消'):'生效中',
    nextAt:stopped?'':date(dueDay,14+i%6,(i*7)%60),
    periodEnd:date(stopped?(i%2===0?10:19):dueDay,14+i%6,(i*7)%60),
    createdAt:`2026-10-${pad(1+i%20)} 10:00:00`,
    failureReason:retry?'余额不足':'',
  };
});
export const RECORDS=[];
let sequence=0;
function attempt(plan,day,status,no=1,billingId){
  sequence++;
  RECORDS.push({...plan,id:`DEMO-CHG-${String(sequence).padStart(5,'0')}`,subscriptionId:plan.id,
    billingId:billingId||`DEMO-BILL-${plan.userId}-${day}`,attemptNo:no,status,
    attemptedAt:date(day,9+(sequence%9),(sequence*11)%60),
    paidAt:status==='成功'?date(day,9+(sequence%9),(sequence*11)%60):'',
    received:status==='成功'?plan.amount:0,
    transactionId:status==='处理中'?'':`DEMO-${plan.provider==='PayPal'?'PP':'AW'}-${String(sequence).padStart(8,'0')}`,
    orderId:status==='成功'?`DEMO-RENEW-${String(sequence).padStart(6,'0')}`:'',
    failureReason:status==='失败'?['余额不足','银行卡已过期','发卡行拒绝交易'][sequence%3]:'',
    failureCode:status==='失败'?['insufficient_funds','expired_card','card_declined'][sequence%3]:'',
  });
}
PLANS.forEach((p,i)=>{
  attempt(p,6+i%6,'成功');
  if(i%5===0){const bill=`DEMO-BILL-${p.userId}-retry`;attempt(p,10,'失败',1,bill);attempt(p,11,'成功',2,bill);}
  if(p.status==='重试中')attempt(p,12,'失败');
  if(i%8===0&&p.status==='待扣款')attempt(p,12,'处理中');
});
export function successfulRenewals(subscriptionId){return RECORDS.filter(r=>r.subscriptionId===subscriptionId&&r.status==='成功').length;}
export function selectRows(rows,filters,tab){
  const q=filters.query.trim().toLowerCase();
  return rows.filter(r=>{
    if(filters.app&&r.app!==filters.app)return false;
    if(filters.provider&&r.provider!==filters.provider)return false;
    if(filters.product&&r.product!==filters.product)return false;
    if(filters.status&&r.status!==filters.status)return false;
    const ids=tab==='plans'?[r.id,r.userId]:[r.id,r.subscriptionId,r.userId,r.orderId,r.transactionId];
    if(q&&!ids.some(id=>id?.toLowerCase()===q))return false;
    const day=(tab==='plans'?r.nextAt:r.attemptedAt).slice(0,10);
    if((filters.start||filters.end)&&!day)return false;
    return (!filters.start||day>=filters.start)&&(!filters.end||day<=filters.end);
  });
}
export function summarize(rows,tab){
  if(tab==='plans')return {
    pending:rows.filter(r=>r.status==='待扣款').length,
    retry:rows.filter(r=>r.status==='重试中').length,
    amount:rows.filter(r=>r.status!=='已停止'&&r.nextAt).reduce((n,r)=>n+r.amount,0),
    stopped:rows.filter(r=>r.status==='已停止').length,
  };
  const success=rows.filter(r=>r.status==='成功').length,failed=rows.filter(r=>r.status==='失败').length;
  return {attempts:rows.length,success,failed,processing:rows.filter(r=>r.status==='处理中').length,
    rate:success+failed?success/(success+failed)*100:null,
    amount:rows.reduce((n,r)=>n+(r.status==='成功'?r.received:0),0)};
}
