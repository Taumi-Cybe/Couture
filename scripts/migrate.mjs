import {Pool} from 'pg';
import {readdir,readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL manquant');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
try {
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(731924)');
 await client.query('CREATE TABLE IF NOT EXISTS naya_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())');
 await client.query('ALTER TABLE naya_migrations ENABLE ROW LEVEL SECURITY');
 for(const name of (await readdir(new URL('../db/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
  if((await client.query('SELECT 1 FROM naya_migrations WHERE name=$1',[name])).rowCount)continue;
  await client.query(await readFile(new URL('../db/migrations/'+name,import.meta.url),'utf8'));
  await client.query('INSERT INTO naya_migrations(name) VALUES($1)',[name]);
  console.log('Migration appliquée :',name);
 }
 await client.query('COMMIT');
} catch(e){await client.query('ROLLBACK');throw e}finally{client.release();await pool.end()}
