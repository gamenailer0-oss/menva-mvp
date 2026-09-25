// GET /api/stats?key=…&days=14[&format=csv] — pilot results for the private /stats page.
// The key is the STATS_KEY environment variable (set it in Netlify: Site configuration →
// Environment variables; use 32+ random characters). Compared in constant time.
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/stats.mjs';

export const config = { path: '/api/stats' };

const STORE = 'menva-events';

export default (req) => handle(req, getStore(STORE), { STATS_KEY: Netlify.env.get('STATS_KEY') });
