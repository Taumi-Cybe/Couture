import {createHash} from 'node:crypto';
import {getDb} from './database';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function rateAllowed(request: Request, action: string, max: number, seconds: number) {
 // Trust the last proxy-added IP only on Render; default to a shared bucket.
 const ip = process.env.TRUST_RENDER_PROXY === 'true' ? (request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || 'unknown') : 'shared';
 const key = hash(action + ':' + ip);
 const {rows} = await getDb().pool.query(`INSERT INTO naya_rate_limits (key,hits,expires_at) VALUES ($1,1,now()+$2 * interval '1 second')
 ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN naya_rate_limits.expires_at <= now() THEN 1 ELSE naya_rate_limits.hits+1 END,
 expires_at=CASE WHEN naya_rate_limits.expires_at <= now() THEN now()+$2 * interval '1 second' ELSE naya_rate_limits.expires_at END RETURNING hits`,[key,seconds]);
 await getDb().pool.query('DELETE FROM naya_rate_limits WHERE expires_at < now()');
 return rows[0].hits <= max;
}
