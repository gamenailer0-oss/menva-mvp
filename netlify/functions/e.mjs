// POST /api/e — analytics ingest (navigator.sendBeacon from js/analytics.js).
// Validates and stores one batch per blob (key: <Lahore day>/<time>-<random>), so concurrent
// diners never overwrite each other. Stores no IP, no user agent, nothing personal.
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/ingest.mjs';

export const config = { path: '/api/e' };

const STORE = 'menva-events';

export default (req) => handle(req, getStore(STORE));
