// Simple API helper for browser usage
(function(){
  // If the page is opened via file:// (local file), `fetch('/api')` resolves to file:///C:/api.
  // Detect file protocol and force local dev backend URL in that case.
  const isFileProtocol = location.protocol === 'file:';
  const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const API_BASE = isFileProtocol || isLocalHost ? 'http://localhost:4001' : '/api';

  async function request(path, opts = {}){
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch(e) { data = null; }
    return { ok: res.ok, status: res.status, data };
  }

  window.__BJ_API = { request, API_BASE };
})();
