import {emptyShop,looks,emptyPrice,total} from './catalog';
export function createDemoApi(){
 let shop={...emptyShop,hours:'Du mardi au samedi · 09h–18h',directions_note:'Renseignez l’adresse réelle depuis « Réglages » pour activer les itinéraires.'};
 let prices=looks.map((l,i)=>({...emptyPrice(l.id),labor:[95,85,110,140,180][i%5],fabric:30,finishing:10,notes:'Exemple de tarif pour cet aperçu. À remplacer par les prix de l’atelier.'}));
 let blocked=[{date:'2026-12-24'}];
 let orders:any[]=[{id:'demo-1',code:'DEMO-NAYA',model:1,name:'Aïcha — exemple',email:'exemple@example.com',phone:'—',notes:'Je souhaite une coupe très ample.',date:'2026-12-12',time:'10:00',pickup:'2026-12-22',status:0,appointment_status:'pending',appointment_note:'',quoted_total:105,quoted_currency:'EUR'}];
 return async function api(path:string,body?:any):Promise<any>{
 const action=body?.action||new URLSearchParams(path.replace(/^\?/, '')).get('action');
 if(action==='public')return structuredClone({shop,prices});
 if(action==='availability')return structuredClone({blocked,taken:orders.filter(o=>['pending','confirmed'].includes(o.appointment_status)).map(o=>({date:o.date,time:o.time}))});
 if(action==='admin')return structuredClone({orders,blocked});
 if(action==='session'||action==='login'||action==='logout')return {ok:true,authenticated:true};
 if(action==='track'){const code=new URLSearchParams(path.slice(1)).get('code');const o=orders.find(o=>o.code===code);if(!o)throw Error('Code inconnu. Essayez DEMO-NAYA.');return structuredClone(o)}
 if(action==='book'){if(blocked.some(b=>b.date===body.date||b.date===body.pickup))throw Error('Cette journée est bloquée.');if(orders.some(o=>o.date===body.date&&o.time===body.time&&['pending','confirmed'].includes(o.appointment_status)))throw Error('Ce créneau est déjà réservé.');const code='DEMO-'+Math.random().toString(36).slice(2,8).toUpperCase();const p=prices[(body.model-1)%20];const order={...body,id:code,code,status:0,appointment_status:'pending',appointment_note:'',quoted_total:total(p),quoted_currency:shop.currency};orders=[order,...orders];return structuredClone({code,order})}
 if(action==='appointment'){const o=orders.find(o=>o.id===body.id);if(!o)throw Error('Commande inconnue.');if(body.state!=='confirmed'&&!body.note.trim())throw Error('Expliquez votre décision au client.');if(['pending','confirmed'].includes(body.state)&&(blocked.some(b=>b.date===o.date)||orders.some(x=>x.id!==o.id&&x.date===o.date&&x.time===o.time&&['pending','confirmed'].includes(x.appointment_status))))throw Error('Ce créneau n’est plus disponible.');o.appointment_status=body.state;o.appointment_note=body.note;return {ok:true}}
 if(action==='status'){const o=orders.find(o=>o.id===body.id);if(o?.appointment_status!=='confirmed')throw Error('Confirmez le rendez-vous avant de modifier la confection.');o.status=body.status;return {ok:true}}
 if(action==='block'){if(!blocked.some(b=>b.date===body.date))blocked.push({date:body.date});return {ok:true}}
 if(action==='unblock'){blocked=blocked.filter(b=>b.date!==body.date);return {ok:true}}
 if(action==='shop'){shop={...body.shop};return {ok:true}}
 if(action==='price'){prices=prices.map(p=>p.look_id===body.price.look_id?body.price:p);return {ok:true}}
 throw Error('Action indisponible.');
 }
}
