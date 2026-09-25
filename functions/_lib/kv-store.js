// Adapter for Cloudflare KV namespace to match Netlify Blobs interface.
// Expected interface: setJSON(key, value), get(key), list({ prefix })
export function kvStore(kv) {
  if (!kv) {
    return {
      async setJSON(key, value) {
        throw new Error('Analytics storage is not set up (bind KV namespace MENVA_EVENTS)');
      },
      async get(key) {
        throw new Error('Analytics storage is not set up (bind KV namespace MENVA_EVENTS)');
      },
      async list() {
        throw new Error('Analytics storage is not set up (bind KV namespace MENVA_EVENTS)');
      },
    };
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
