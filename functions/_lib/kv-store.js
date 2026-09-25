// Adapter for Cloudflare KV namespace to match Netlify Blobs interface.
// Expected interface: setJSON(key, value), get(key), list({ prefix })
// binding: the namespace's binding name, for the "not set up" error only.
export function kvStore(kv, binding = 'MENVA_EVENTS') {
  if (!kv) {
    const missing = () => { throw new Error(`Storage is not set up (bind KV namespace ${binding})`); };
    return { async setJSON() { missing(); }, async get() { missing(); }, async list() { missing(); } };
  }

  return {
    async setJSON(key, value) {
      await kv.put(key, JSON.stringify(value));
    },
    async get(key) {
      const val = await kv.get(key, 'text');
      return val ? JSON.parse(val) : null;
    },
    async list({ prefix = '' } = {}) {
      const blobs = [];
      let cursor;
      // KV list paginates with cursor; iterate through all pages
      do {
        const result = await kv.list({ prefix, cursor, limit: 1000 });
        blobs.push(...result.keys.map((k) => ({ key: k.name })));
        cursor = result.cursor;
      } while (cursor);
      return { blobs };
    },
  };
}
