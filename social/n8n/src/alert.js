// Runs when the autopost workflow fails: log it and send a phone alert (if NTFY_TOPIC is set).
const e = $input.first().json;
const node = (e.execution && e.execution.lastNodeExecuted) || 'unknown step';
const msg = (e.execution && e.execution.error && e.execution.error.message) || 'Unknown error';
const url = (e.execution && e.execution.url) || '';
logLine(['', '', 'FAILED at ' + node, msg]);
// Release the publishing lock so the next 15-minute tick can retry.
try { const st = readState(); if (st.lock) { delete st.lock; writeState(st); } } catch (err) { /* ignore */ }
await notify(this.helpers, 'MENVA autopost failed', `Step: ${node}\n${msg}\nIt retries every 15 minutes (3 tries a day).`, url);
return [{ json: { node, msg, url } }];
