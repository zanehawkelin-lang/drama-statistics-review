// All records are synthetic and intentionally use DEMO transaction identifiers.
export const DEMO_START = '2026-11-01';
export const DEMO_END = '2026-11-08';
export const DRAMAS = [
  {id:239, commonId:244, title:"I Vanished With the Don's True Heir", zh:'我带着大佬的真继承人消失了'},
  {id:454, commonId:451, title:'Blind Seer of the Underworld', zh:'冥界盲眼先知'},
  {id:385, commonId:383, title:"One Night with the CEO, Now I'm His Contract Bride", zh:'一夜之后，我成了总裁的契约新娘'},
  {id:591, commonId:582, title:"His Father's Touch", zh:'被觊觎的继承人'},
  {id:215, commonId:213, title:'From Outcast to Nobel: The Heiress Returns', zh:'从弃女到诺奖，千金归来'}
];
export const PRODUCTS = [
  {id:'MEM7', type:'会员', label:'7天会员', price:9.99, original:19.99},
  {id:'MEM30', type:'会员', label:'30天会员', price:19.99, original:39.99},
  {id:'COIN2000', type:'金币', label:'2000金币＋500赠币', price:19.99, original:39.99},
  {id:'UNLOCK', type:'单剧解锁', label:'解锁单本短剧全章', price:19.99, original:39.99}
];
export const APPS = ['DramaVideo','QuikDrama','Prutora'];
export const COUNTRIES = ['美国','英国','加拿大','澳大利亚','巴西'];
export const PROMOTERS = ['投手A','投手B','投手C'];
const eventLabels = {first:'首次购买会员',auto:'自动续费',manual:'手动复购',single:'单次购买'};
let sequence = 0;
const all = [];
function dateAt(weeksAgo, minutesAgo = 0, period = 7) {
  const d = new Date(Date.UTC(2026,10,8,14,32) - weeksAgo * period * 86400000 - minutesAgo * 60000);
  return d.toISOString().slice(0,19).replace('T',' ');
}
function makeOrder(user, event, index, length, extras={}) {
  sequence += 1;
  const product = extras.product || PRODUCTS[user.period === 30 ? 1 : 0];
  const createdAt = extras.createdAt || dateAt(length-index-1,user.minute,user.period || 7);
  const id = `DEMO${createdAt.slice(0,10).replaceAll('-','')}${String(sequence).padStart(5,'0')}`;
  const status = extras.status || '已支付';
  const method = ['Card Pay','Apple Pay','Google Pay','PayPal'][(sequence+user.minute)%4];
  const provider = method === 'PayPal' ? 'PayPal' : 'Airwallex';
  const drama = DRAMAS[user.drama % DRAMAS.length];
  const promotionId = 300 + user.drama + APPS.indexOf(user.app)*100 + (user.source === 'AppLovin' ? 30 : 0);
  return {
    id,transactionId:`DEMO-${provider === 'PayPal' ? 'PP' : 'AW'}-${String(sequence).padStart(8,'0')}`,
    userId:user.id,uuid:`demo-${user.id}-${APPS.indexOf(user.app)+1}-4e98-87d2-19a03c`,
    app:user.app,country:user.country,test:!!user.test,drama,product,
    provider,method,autoProduct:product.type === '会员',
    original:product.original,amount:product.price,currency:'USD',
    createdAt,paidAt:status === '已支付' ? createdAt : '',status,
    source:user.source,promoter:user.promoter,
    promotionId,promotionName:`${user.source === 'Facebook' ? 'FB' : 'AL'}-${drama.zh}-${user.app}`,
    event,purchaseType:eventLabels[event],
    subscriptionId:product.type === '会员' ? `DEMO-SUB-${user.id}-${APPS.indexOf(user.app)+1}-${event === 'manual' ? index : Math.max(0,index-1)}` : '',
    ...extras
  };
}
const configs = [
  ['810001','DramaVideo',['first','auto','auto','manual','manual','auto']],
  ['810002','DramaVideo',['first']],
  ['810003','DramaVideo',['first','manual']],
  ['810004','DramaVideo',['first','auto','auto','auto']],
  ['810005','QuikDrama',['first','manual','manual']],
  ['810006','DramaVideo',[]],
  ['810007','Prutora',['first','auto']],
  ['810008','DramaVideo',['first','auto','manual']],
  ['810009','QuikDrama',['first','auto','auto','manual','manual','auto','auto']],
  ['810010','DramaVideo',['first','manual','auto','auto']],
  ['810011','Prutora',['first']],
  ['810012','DramaVideo',['first','manual','manual','auto']],
  ['810013','QuikDrama',[]],
  ['810014','DramaVideo',['first','auto','auto','auto','manual']],
  ['810001','QuikDrama',['first','manual']],
  ['810015','Prutora',['first','auto','manual','manual']]
];
configs.forEach(([id,app,events],u)=>{
  const user = {id,app,minute:u*8,period:u%4 === 3 ? 30 : 7,drama:u%5,country:COUNTRIES[u%5],source:u%3 === 1 ? 'AppLovin' : 'Facebook',promoter:u%5 === 0 ? '' : PROMOTERS[u%3],test:u===12};
  let subscription = 0;
  events.forEach((event,index)=>{
    if(event === 'first' || event === 'manual') subscription += 1;
    const order = makeOrder(user,event,index,events.length);
    order.subscriptionId = `DEMO-SUB-${id}-${APPS.indexOf(app)+1}-${subscription}`;
    all.push(order);
  });
  const nonMember = PRODUCTS[u%2 === 0 ? 2 : 3];
  all.push(makeOrder(user,'single',0,1,{product:nonMember,createdAt:dateAt(0,220+u*5)}));
  if(u%2 === 0){
    const status = ['待支付','已失败','已关闭'][Math.floor(u/2)%3];
    all.push(makeOrder(user,events.length ? 'manual' : 'first',0,1,{status,createdAt:dateAt(0,300+u*7)}));
  }
});
export const ORDERS = all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
export const PROMOTIONS = [...new Map(ORDERS.map(o=>[o.promotionId,{id:o.promotionId,name:o.promotionName,app:o.app}])).values()].sort((a,b)=>a.id-b.id);
export function memberHistory(userId,app){
  return ORDERS.filter(o=>o.userId===userId && o.app===app && o.product.type==='会员' && o.status==='已支付').sort((a,b)=>b.paidAt.localeCompare(a.paidAt));
}
export function memberStats(userId,app){
  const history = memberHistory(userId,app);
  if(!history.length) return null;
  const auto = history.filter(o=>o.event==='auto').length;
  const manual = history.filter(o=>o.event==='manual').length;
  return {total:auto+manual,auto,manual,first:history.filter(o=>o.event==='first').length,orders:history.length};
}
