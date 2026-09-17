import { Pool, type PoolClient } from 'pg';
let pool:Pool|undefined;
export function getDb(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is not configured');
 pool??=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
 return {pool};
}
export async function transaction<T>(operation:(client:PoolClient)=>Promise<T>){const client=await getDb().pool.connect();try{await client.query('BEGIN');const result=await operation(client);await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
