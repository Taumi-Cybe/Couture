import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function configured(){return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_PUBLISHABLE_KEY}
export async function authClient(){
 if(!configured())throw Error('Authentication is not configured');
 const jar=await cookies();
 return createServerClient(process.env.SUPABASE_URL!,process.env.SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll:values=>{for(const {name,value,options} of values)jar.set(name,value,{...options,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax'})}}});
}
export async function adminIdentity(){
 if(!configured())return null;
 const client=await authClient();const {data,error}=await client.auth.getUser();
 if(error||data.user?.app_metadata?.role!=='admin')return null;
 return {client,user:data.user};
}
export async function isAdmin(){const identity=await adminIdentity();if(!identity)return false;const {data,error}=await identity.client.auth.mfa.getAuthenticatorAssuranceLevel();return !error&&data?.currentLevel==='aal2'}
