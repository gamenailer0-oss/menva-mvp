/**
 * MENVA — "Show the waiter" tray (CLAUDE.md Phase 7).
 * A client-only list of dishes the diner has added to their table. Nothing is ever sent to a
 * server — this is not an order, just something to show the waiter.
 *
 * Storage: localStorage, one record per restaurant + table, keyed
 * `menva:tray:<restaurantId>:<table || 'none'>` as { updated, items: [{ id, qty, note }] }.
 * A record older than 4 hours is dropped the next time it's read (a diner's visit, not a session).
 *
 * Every localStorage access is wrapped in try/catch. If storage throws (private browsing, quota,
 * a locked-down browser) the tray still works for the visit, backed by an in-memory copy.
 */
(function () {
  'use strict';

  const PREFIX = 'menva:tray:';
  const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
  const MAX_QTY = 20;
  const MAX_NOTE = 80;

  const mem = new Map(); // key -> { updated, items } — in-memory fallback / mirror of localStorage
  const listeners = new Set();

  const key = (r, t) => `${PREFIX}${r}:${t || 'none'}`;
  const clampQty = (q) => Math.min(MAX_QTY, Math.max(1, Math.round(Number(q)) || 1));
  const cleanNote = (n) => String(n ?? '').trim().slice(0, MAX_NOTE);

  function readStore(k) {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return undefined; // storage unavailable — distinct from "nothing saved yet"
    }
  }
  function writeStore(k, value) {
    try {
      if (value) localStorage.setItem(k, JSON.stringify(value));
      else localStorage.removeItem(k);
    } catch { /* fall back to the in-memory mirror below */ }
  }

  // The record for (restaurant, table), dropping it once it's older than 4 hours. Falls back to
  // the in-memory mirror when localStorage threw on read.
  function load(r, t) {
    const k = key(r, t);
    const stored = readStore(k);
    const record = stored === undefined ? mem.get(k) : stored;
    if (!record || !Array.isArray(record.items)) return { updated: 0, items: [] };
    if (Date.now() - record.updated > TTL_MS) {
      mem.delete(k);
      writeStore(k, null);
      return { updated: 0, items: [] };
    }
    return record;
  }

  function save(r, t, record) {
    const k = key(r, t);
    mem.set(k, record);
    writeStore(k, record);
    notify();
  }

  function notify() {
    listeners.forEach((cb) => { try { cb(); } catch { /* one bad listener must not break the rest */ } });
  }

  // ─── Public API ─────────────────────────────────────────────
  function get(r, t) {
    return load(r, t).items.map((it) => ({ ...it }));
  }

  function count(r, t) {
    return load(r, t).items.reduce((n, it) => n + it.qty, 0);
  }

  // Adds the dish, or replaces its qty/note if it's already on the table.
  function add(r, t, id, qty, note) {
    const items = load(r, t).items.filter((it) => it.id !== id);
    items.push({ id, qty: clampQty(qty), note: cleanNote(note) });
    save(r, t, { updated: Date.now(), items });
  }

  function setQty(r, t, id, qty) {
    const items = load(r, t).items.map((it) => (it.id === id ? { ...it, qty: clampQty(qty) } : it));
    save(r, t, { updated: Date.now(), items });
  }

  function setNote(r, t, id, note) {
    const items = load(r, t).items.map((it) => (it.id === id ? { ...it, note: cleanNote(note) } : it));
    save(r, t, { updated: Date.now(), items });
  }

  function remove(r, t, id) {
    const items = load(r, t).items.filter((it) => it.id !== id);
    save(r, t, { updated: Date.now(), items });
  }

  function clear(r, t) {
    mem.delete(key(r, t));
    writeStore(key(r, t), null);
    notify();
  }

  // Subscribe to any tray change (any restaurant/table). Returns an unsubscribe function.
  function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  window.MenvaTray = { get, add, setQty, setNote, remove, clear, count, onChange };
})();
