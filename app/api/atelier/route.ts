import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb, transaction } from '@/lib/server/database';
import {rateAllowed} from '@/lib/server/auth';
import {configured,isAdmin,authClient,adminIdentity} from '@/lib/server/supabase';
import { times } from '@/app/catalog';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const response = (data: unknown, status = 200) => NextResponse.json(data, {status,headers:{'Cache-Control':'no-store'}});
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s);
const bookingSchema = z.object({model:z.number().int().min(1).max(200), name:z.string().trim().min(1).max(100), email:z.string().trim().email().max(150), phone:z.string().trim().min(3).max(30), notes:z.string().max(1000).default(''), date:dateSchema, time:z.string().refine(s=>times.includes(s)), pickup:dateSchema});
function currentDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:process.env.ATELIER_TIMEZONE||'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function originAllowed(request: Request){
 const origin=request.headers.get('origin');
 const allowed=[process.env.SITE_URL,process.env.RENDER_EXTERNAL_URL,new URL(request.url).origin].filter(Boolean);
 return !!origin && allowed.some(value=>{try{return new URL(value!).origin===origin}catch{return false}});
}
function unavailable(error: unknown){
 // Do not log query parameters or client personal data.
 console.error('NAYA database request failed', {code:(error as {code?:string})?.code||'UNAVAILABLE'});
 return response({error:'Le service de réservation est indisponible. Réessayez dans un instant ou contactez l’atelier.'},503);
}
export async function GET(request:Request){
 try {
  const u=new URL(request.url), action=u.searchParams.get('action');
  if(action==='session') return response({authenticated:await isAdmin(),configured:configured()});
  if(action==='public'){const [shop,prices]=await Promise.all([getDb().pool.query('SELECT address,phone,hours,directions_note,currency FROM naya_shop WHERE id=1'),getDb().pool.query('SELECT * FROM naya_prices')]);return response({shop:shop.rows[0],prices:prices.rows.map(p=>({...p,labor:p.labor===null?null:Number(p.labor),fabric:p.fabric===null?null:Number(p.fabric),finishing:p.finishing===null?null:Number(p.finishing)}))})}
  if(action==='availability'){
   const [blocked,taken]=await Promise.all([getDb().pool.query('SELECT date FROM naya_blocked ORDER BY date'),getDb().pool.query("SELECT date,time FROM naya_orders WHERE date >= $1 AND appointment_status IN ('pending','confirmed')",[currentDate()])]);
   return response({blocked:blocked.rows,taken:taken.rows});
  }
  if(action==='track'){
   const code=z.string().uuid().safeParse(u.searchParams.get('code'));
   if(!code.success)return response({error:'Code de suivi invalide.'},400);
   const {rows}=await getDb().pool.query('SELECT model,date,time,pickup,status,appointment_status,appointment_note,quoted_total,quoted_currency FROM naya_orders WHERE code=$1',[code.data]);
   return rows[0]?response(rows[0]):response({error:'Aucune commande trouvée. Vérifiez votre code de suivi.'},404);
  }
  if(action==='admin'){
   if(!await isAdmin())return response({error:configured()?'Connectez-vous à l’espace atelier.':'La connexion de l’atelier n’est pas encore configurée.'},401);
   const [orders,blocked]=await Promise.all([getDb().pool.query('SELECT id,model,name,email,phone,notes,date,time,pickup,status,appointment_status,appointment_note FROM naya_orders ORDER BY created_at DESC'),getDb().pool.query('SELECT date FROM naya_blocked ORDER BY date')]);
   return response({orders:orders.rows,blocked:blocked.rows});
  }
  return response({error:'Requête inconnue.'},400);
 }catch(error){return unavailable(error)}
}
export async function POST(request:Request){
 if(!originAllowed(request))return response({error:'Origine non autorisée.'},403);
 let b: any;
 try {const raw=await request.text();if(raw.length>8192)return response({error:'Formulaire trop volumineux.'},413);b=JSON.parse(raw);if(!b||typeof b!=='object')throw Error();}catch{return response({error:'Formulaire invalide.'},400)}
 try {
  if(b.action==='login'){
   if(!configured())return response({error:'La connexion de l’atelier n’est pas encore configurée.'},503);
   if(typeof b.email!=='string'||typeof b.password!=='string'||b.email.length>150||b.password.length>512)return response({error:'Identifiants invalides.'},400);
   if(!await rateAllowed(request,'login',10,900))return response({error:'Trop de tentatives. Réessayez dans 15 minutes.'},429);
   const client=await authClient();const {data,error}=await client.auth.signInWithPassword({email:b.email,password:b.password});
   if(error||data.user?.app_metadata?.role!=='admin'){await client.auth.signOut();return response({error:'Identifiants incorrects ou accès non autorisé.'},401)}
   const factors=await client.auth.mfa.listFactors();if(factors.error)throw factors.error;
   const verified=factors.data.totp.find(f=>f.status==='verified');
   if(verified)return response({mfa:true,factorId:verified.id});
   for(const f of factors.data.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'))await client.auth.mfa.unenroll({factorId:f.id});
   const enrollment=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'NAYA Atelier'});if(enrollment.error)throw enrollment.error;
   return response({mfa:true,factorId:enrollment.data.id,qr:enrollment.data.totp.qr_code,secret:enrollment.data.totp.secret});
  }
  if(b.action==='verifyMfa'){
   const identity=await adminIdentity();if(!identity)return response({error:'Reconnectez-vous.'},401);
   if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code)||typeof b.factorId!=='string')return response({error:'Saisissez le code à 6 chiffres.'},400);
   if(!await rateAllowed(request,'mfa',10,900))return response({error:'Trop de tentatives. Réessayez plus tard.'},429);
   const {error}=await identity.client.auth.mfa.challengeAndVerify({factorId:b.factorId,code:b.code});
   return error?response({error:'Code incorrect ou expiré.'},400):response({ok:true});
  }
  if(b.action==='logout'){if(configured())await (await authClient()).auth.signOut();return response({ok:true})}
  if(b.action==='book'){
   const parsed=bookingSchema.safeParse(b);
   if(!parsed.success)return response({error:'Vérifiez vos coordonnées, votre modèle et les dates.'},400);
   const v=parsed.data;
   if(v.date<currentDate()||v.pickup<v.date)return response({error:'Choisissez un rendez-vous à venir et un retrait après ce rendez-vous.'},400);
   const nowTime=new Intl.DateTimeFormat('en-GB',{timeZone:process.env.ATELIER_TIMEZONE||'Europe/Paris',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
   if(v.date===currentDate()&&v.time<=nowTime)return response({error:'Cette heure est déjà passée. Choisissez un autre créneau.'},400);
   if(!await rateAllowed(request,'booking',20,3600))return response({error:'Trop de réservations depuis cette connexion. Réessayez plus tard.'},429);
   const id=randomUUID(),code=randomUUID();let quotedTotal:number|null=null;let quotedCurrency='EUR';
   const result=await transaction(async client=>{
    // Serialize reservation and calendar edits. Checks run AFTER acquiring the lock.
    await client.query('SELECT id FROM naya_calendar_lock WHERE id=1 FOR UPDATE');
    const blocked=await client.query('SELECT date FROM naya_blocked WHERE date IN ($1,$2)',[v.date,v.pickup]);
    if(blocked.rows.length)return 'blocked';
    const pricing=await client.query('SELECT * FROM naya_prices WHERE look_id=$1',[(v.model-1)%20+1]);const p=pricing.rows[0];
    quotedTotal=p?.labor==null?null:Number(p.labor)+(p.fabric_included?Number(p.fabric||0):0)+Number(p.finishing||0);
    const shop=await client.query('SELECT currency FROM naya_shop WHERE id=1');quotedCurrency=shop.rows[0]?.currency||'EUR';
    const inserted=await client.query(`INSERT INTO naya_orders(id,code,model,name,email,phone,notes,date,time,pickup,status,quoted_total,quoted_currency)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12) ON CONFLICT (date,time) WHERE appointment_status IN ('pending','confirmed') DO NOTHING RETURNING id`,[id,code,v.model,v.name,v.email,v.phone,v.notes,v.date,v.time,v.pickup,quotedTotal,quotedCurrency]);
    return inserted.rows.length?'ok':'taken';
   });
   if(result==='blocked')return response({error:'L’une de ces journées est bloquée. Choisissez une autre date.'},409);
   if(result==='taken')return response({error:'Ce créneau vient d’être réservé. Choisissez une autre heure.'},409);
   return response({code,order:{model:v.model,date:v.date,time:v.time,pickup:v.pickup,status:0,appointment_status:'pending',appointment_note:'',quoted_total:quotedTotal,quoted_currency:quotedCurrency}},201);
  }
  if(!await isAdmin())return response({error:'Votre session a expiré. Reconnectez-vous à l’espace atelier.'},401);
  if(b.action==='shop'){
   const parsed=z.object({address:z.string().trim().max(500),phone:z.string().max(50),hours:z.string().max(500),directions_note:z.string().max(1000),currency:z.enum(['EUR','XOF','USD'])}).safeParse(b.shop);
   if(!parsed.success)return response({error:'Vérifiez les informations de l’atelier.'},400);const v=parsed.data;
   await getDb().pool.query('UPDATE naya_shop SET address=$1,phone=$2,hours=$3,directions_note=$4,currency=$5 WHERE id=1',[v.address,v.phone,v.hours,v.directions_note,v.currency]);return response({ok:true});
  }
  if(b.action==='price'){
   const amount=z.number().finite().min(0).max(10000000).nullable();
   const parsed=z.object({look_id:z.number().int().min(1).max(20),labor:amount,fabric:amount,finishing:amount,fabric_included:z.boolean(),notes:z.string().max(1000)}).safeParse(b.price);
   if(!parsed.success)return response({error:'Vérifiez les tarifs.'},400);const v=parsed.data;
   await getDb().pool.query('INSERT INTO naya_prices(look_id,labor,fabric,finishing,fabric_included,notes) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(look_id) DO UPDATE SET labor=EXCLUDED.labor,fabric=EXCLUDED.fabric,finishing=EXCLUDED.finishing,fabric_included=EXCLUDED.fabric_included,notes=EXCLUDED.notes',[v.look_id,v.labor,v.fabric,v.finishing,v.fabric_included,v.notes]);return response({ok:true});
  }
  if(b.action==='appointment'){
   const parsed=z.object({id:z.string().uuid(),state:z.enum(['pending','confirmed','declined','cancelled']),note:z.string().trim().max(1500)}).safeParse(b);
   if(!parsed.success)return response({error:'Décision invalide.'},400);const v=parsed.data;
   if(v.state!=='confirmed'&&!v.note)return response({error:'Expliquez votre décision au client.'},400);
   const result=await transaction(async client=>{
    await client.query('SELECT id FROM naya_calendar_lock WHERE id=1 FOR UPDATE');
    const current=await client.query('SELECT date,time,status FROM naya_orders WHERE id=$1',[v.id]);if(!current.rows.length)return 'missing';const o=current.rows[0];
    if(['pending','confirmed'].includes(v.state)){
     const blocked=await client.query('SELECT date FROM naya_blocked WHERE date=$1',[o.date]);if(blocked.rows.length)return 'blocked';
     const taken=await client.query("SELECT id FROM naya_orders WHERE date=$1 AND time=$2 AND id<>$3 AND appointment_status IN ('pending','confirmed')",[o.date,o.time,v.id]);if(taken.rows.length)return 'taken';
    }
    await client.query('UPDATE naya_orders SET appointment_status=$1,appointment_note=$2,updated_at=now() WHERE id=$3',[v.state,v.note,v.id]);return 'ok';
   });
   if(result!=='ok')return response({error:result==='missing'?'Commande introuvable.':result==='blocked'?'Débloquez cette journée avant de confirmer ce rendez-vous.':'Ce créneau est déjà réservé par un autre client.'},409);
   return response({ok:true});
  }
  if(b.action==='block'||b.action==='unblock'){
   const parsed=dateSchema.safeParse(b.date);if(!parsed.success)return response({error:'Date invalide.'},400);
   await transaction(async client=>{
    await client.query('SELECT id FROM naya_calendar_lock WHERE id=1 FOR UPDATE');
    await client.query(b.action==='block'?'INSERT INTO naya_blocked(date) VALUES($1) ON CONFLICT DO NOTHING':'DELETE FROM naya_blocked WHERE date=$1',[parsed.data]);
   });return response({ok:true});
  }
  if(b.action==='status'){
   if(!Number.isInteger(b.status)||b.status<0||b.status>5||!z.string().uuid().safeParse(b.id).success)return response({error:'Statut invalide.'},400);
   const result=await getDb().pool.query("UPDATE naya_orders SET status=$1,updated_at=now() WHERE id=$2 AND appointment_status='confirmed' RETURNING id",[b.status,b.id]);
   return result.rows.length?response({ok:true}):response({error:'Commande introuvable.'},404);
  }
  return response({error:'Action inconnue.'},400);
 }catch(error){return unavailable(error)}
}
