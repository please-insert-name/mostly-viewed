'use strict';
// Lokaler Server ohne Abhängigkeiten. Lauscht nur auf 127.0.0.1.

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { parseSession, titleFromHead } = require('./parser');

const PORT = Number(process.env.PORT) || 4173;
const HOST = '127.0.0.1';
const DATA = path.resolve(process.env.MW_DATA || path.join(__dirname, 'data'));
const PUBLIC = path.join(__dirname, 'public');
const SESSIONS = path.join(os.homedir(), '.claude', 'projects');
const MAX_BODY = 512 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

const emptyAnn = () => ({ version: 1, targets: {} });
const chatDir = (id) => path.join(DATA, id);
const validId = (id) => /^[a-z0-9][a-z0-9-]{0,80}$/.test(id);

function slug(s) {
  return (s || 'chat').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'chat';
}

async function exists(p) { try { await fsp.access(p); return true; } catch { return false; } }

async function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, file);
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return fallback; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Datei zu groß'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const json = (res, status, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
};
const fail = (status, msg) => Object.assign(new Error(msg), { status });

// ---- Chats -----------------------------------------------------------------

async function createChat(text, name, source) {
  const parsed = parseSession(text);
  if (!parsed.messages.length) throw fail(400, 'Keine Nachrichten gefunden. Ist das eine Claude-Code-Session (.jsonl)?');
  const hash = crypto.createHash('sha1').update(text).digest('hex').slice(0, 6);
  const id = `${slug(parsed.title || name)}-${hash}`;
  const dir = chatDir(id);
  if (!(await exists(dir))) {
    await fsp.mkdir(path.join(dir, 'attachments'), { recursive: true });
    await writeAtomic(path.join(dir, 'original.jsonl'), text);
    await writeAtomic(path.join(dir, 'annotations.json'), JSON.stringify(emptyAnn(), null, 2));
    await writeAtomic(path.join(dir, 'meta.json'), JSON.stringify({
      title: parsed.title || name || id, source: source || name || '', importedAt: new Date().toISOString(),
    }, null, 2));
  }
  return id;
}

async function listChats() {
  await fsp.mkdir(DATA, { recursive: true });
  const out = [];
  for (const d of await fsp.readdir(DATA, { withFileTypes: true })) {
    if (!d.isDirectory() || !validId(d.name)) continue;
    const meta = await readJson(path.join(chatDir(d.name), 'meta.json'), null);
    if (!meta) continue;
    const ann = await readJson(path.join(chatDir(d.name), 'annotations.json'), emptyAnn());
    let comments = 0, links = 0;
    for (const t of Object.values(ann.targets || {})) { comments += (t.comments || []).length; links += (t.links || []).length; }
    const st = await fsp.stat(path.join(chatDir(d.name), 'annotations.json')).catch(() => null);
    out.push({ id: d.name, title: meta.title, importedAt: meta.importedAt, comments, links, modified: st ? st.mtimeMs : 0 });
  }
  return out.sort((a, b) => b.modified - a.modified);
}

async function loadChat(id) {
  const dir = chatDir(id);
  if (!(await exists(dir))) throw fail(404, 'Chat nicht gefunden');
  const text = await fsp.readFile(path.join(dir, 'original.jsonl'), 'utf8');
  const meta = await readJson(path.join(dir, 'meta.json'), {});
  const annotations = await readJson(path.join(dir, 'annotations.json'), emptyAnn());
  const { messages } = parseSession(text);
  return { id, meta, messages, annotations };
}

function safeAttachmentName(name) {
  const base = path.basename(String(name || 'datei')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return base || 'datei';
}

async function uniqueName(dir, name) {
  const ext = path.extname(name), stem = path.basename(name, ext);
  let n = name, i = 1;
  while (await exists(path.join(dir, n))) n = `${stem} (${++i})${ext}`;
  return n;
}

function openWithDefaultApp(target) {
  const [cmd, args] =
    process.platform === 'win32' ? ['explorer.exe', [target]]
    : process.platform === 'darwin' ? ['open', [target]]
    : ['xdg-open', [target]];
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
}

function findLink(ann, linkId) {
  for (const t of Object.values(ann.targets || {})) {
    for (const l of t.links || []) if (l.id === linkId) return l;
  }
  return null;
}

// ---- Bundle ----------------------------------------------------------------

async function exportBundle(id) {
  const dir = chatDir(id);
  if (!(await exists(dir))) throw fail(404, 'Chat nicht gefunden');
  const attachments = {};
  const adir = path.join(dir, 'attachments');
  if (await exists(adir)) {
    for (const f of await fsp.readdir(adir)) {
      attachments[f] = (await fsp.readFile(path.join(adir, f))).toString('base64');
    }
  }
  return {
    format: 'mostly-wise-bundle', version: 1,
    meta: await readJson(path.join(dir, 'meta.json'), {}),
    original: await fsp.readFile(path.join(dir, 'original.jsonl'), 'utf8'),
    annotations: await readJson(path.join(dir, 'annotations.json'), emptyAnn()),
    attachments,
  };
}

async function importBundle(b) {
  if (!b || b.format !== 'mostly-wise-bundle' || typeof b.original !== 'string') throw fail(400, 'Kein gültiges Bundle');
  const id = await createChat(b.original, (b.meta && b.meta.title) || 'chat', b.meta && b.meta.source);
  const dir = chatDir(id);
  // Bundle hat Vorrang: Kommentare, Links und Titel übernehmen.
  await writeAtomic(path.join(dir, 'annotations.json'), JSON.stringify(b.annotations || emptyAnn(), null, 2));
  if (b.meta) await writeAtomic(path.join(dir, 'meta.json'), JSON.stringify(b.meta, null, 2));
  for (const [name, b64] of Object.entries(b.attachments || {})) {
    await fsp.writeFile(path.join(dir, 'attachments', safeAttachmentName(name)), Buffer.from(b64, 'base64'));
  }
  return id;
}

// ---- Claude-Code-Sessions durchsuchen --------------------------------------

async function listSessions() {
  const files = [];
  if (!(await exists(SESSIONS))) return files;
  for (const proj of await fsp.readdir(SESSIONS, { withFileTypes: true })) {
    if (!proj.isDirectory()) continue;
    for (const f of await fsp.readdir(path.join(SESSIONS, proj.name), { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
      const full = path.join(SESSIONS, proj.name, f.name);
      const st = await fsp.stat(full);
      files.push({ rel: `${proj.name}/${f.name}`, project: proj.name, mtime: st.mtimeMs, size: st.size, full });
    }
  }
  files.sort((a, b) => b.mtime - a.mtime);
  const top = files.slice(0, 150);
  for (const f of top) {
    const fh = await fsp.open(f.full, 'r');
    try {
      const buf = Buffer.alloc(Math.min(65536, f.size));
      await fh.read(buf, 0, buf.length, 0);
      f.title = titleFromHead(buf.toString('utf8'));
    } finally { await fh.close(); }
    delete f.full;
  }
  return top;
}

// ---- Routing ---------------------------------------------------------------

async function api(req, res, url) {
  const p = url.pathname.replace(/^\/api\//, '').split('/').map(decodeURIComponent);
  const m = req.method;

  if (p[0] === 'chats' && p.length === 1) {
    if (m === 'GET') return json(res, 200, await listChats());
    if (m === 'POST') {
      const name = url.searchParams.get('name') || 'chat.jsonl';
      const text = (await readBody(req)).toString('utf8');
      let id;
      if (text.trimStart().startsWith('{') && text.includes('"mostly-wise-bundle"')) {
        try { id = await importBundle(JSON.parse(text)); } catch (e) { if (e.status) throw e; }
      }
      if (!id) id = await createChat(text, name.replace(/\.jsonl?$/i, ''), name);
      return json(res, 200, { id });
    }
  }
  if (p[0] === 'sessions' && p.length === 1 && m === 'GET') return json(res, 200, await listSessions());
  if (p[0] === 'sessions' && p[1] === 'import' && m === 'POST') {
    const { rel } = JSON.parse((await readBody(req)).toString('utf8'));
    const full = path.resolve(SESSIONS, rel);
    if (!full.startsWith(SESSIONS + path.sep) || !full.endsWith('.jsonl')) throw fail(400, 'Ungültiger Pfad');
    const id = await createChat(await fsp.readFile(full, 'utf8'), path.basename(full, '.jsonl'), rel);
    return json(res, 200, { id });
  }

  if (p[0] === 'chats' && p[1] && validId(p[1])) {
    const id = p[1];
    const dir = chatDir(id);
    if (p.length === 2) {
      if (m === 'GET') return json(res, 200, await loadChat(id));
      if (m === 'DELETE') {
        if (!(await exists(dir))) throw fail(404, 'Chat nicht gefunden');
        await fsp.rm(dir, { recursive: true, force: true });
        return json(res, 200, { ok: true });
      }
    }
    if (p[2] === 'annotations' && m === 'PUT') {
      const ann = JSON.parse((await readBody(req)).toString('utf8'));
      if (!ann || typeof ann.targets !== 'object') throw fail(400, 'Ungültige Annotationen');
      if (!(await exists(dir))) throw fail(404, 'Chat nicht gefunden');
      await writeAtomic(path.join(dir, 'annotations.json'), JSON.stringify(ann, null, 2));
      return json(res, 200, { ok: true, savedAt: new Date().toISOString() });
    }
    if (p[2] === 'meta' && m === 'PUT') {
      const { title } = JSON.parse((await readBody(req)).toString('utf8'));
      const meta = await readJson(path.join(dir, 'meta.json'), {});
      meta.title = String(title || '').slice(0, 200) || meta.title;
      await writeAtomic(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
      return json(res, 200, meta);
    }
    if (p[2] === 'raw' && m === 'GET') {
      const want = new Set((url.searchParams.get('uuids') || '').split(','));
      const out = [];
      for (const line of (await fsp.readFile(path.join(dir, 'original.jsonl'), 'utf8')).split(/\r?\n/)) {
        if (!line.trim()) continue;
        try { const e = JSON.parse(line); if (want.has(e.uuid)) out.push(e); } catch { /* ignorieren */ }
      }
      return json(res, 200, out);
    }
    if (p[2] === 'export' && m === 'GET') {
      const bundle = await exportBundle(id);
      const fname = `${id}.chatpack.json`;
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fname}"`,
      });
      return res.end(JSON.stringify(bundle));
    }
    if (p[2] === 'attachments') {
      const adir = path.join(dir, 'attachments');
      if (m === 'POST') {
        const name = await (async () => { await fsp.mkdir(adir, { recursive: true }); return uniqueName(adir, safeAttachmentName(url.searchParams.get('name'))); })();
        await fsp.writeFile(path.join(adir, name), await readBody(req));
        return json(res, 200, { name });
      }
      if (m === 'GET' && p[3]) {
        const file = path.join(adir, safeAttachmentName(p[3]));
        if (!(await exists(file))) throw fail(404, 'Datei nicht gefunden');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(p[3])}` });
        return fs.createReadStream(file).pipe(res);
      }
    }
    if (p[2] === 'open' && m === 'POST') {
      // Öffnet nur Dateien, die als Link in den Annotationen dieses Chats eingetragen sind.
      const { linkId } = JSON.parse((await readBody(req)).toString('utf8'));
      const link = findLink(await readJson(path.join(dir, 'annotations.json'), emptyAnn()), linkId);
      if (!link || link.kind !== 'file') throw fail(404, 'Link nicht gefunden');
      const target = link.mode === 'path'
        ? path.resolve(String(link.path || ''))
        : path.join(dir, 'attachments', safeAttachmentName(link.file));
      if (!(await exists(target))) throw fail(404, `Datei nicht gefunden: ${target}`);
      openWithDefaultApp(target);
      return json(res, 200, { ok: true });
    }
  }
  throw fail(404, 'Unbekannte Route');
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep) || !(await exists(file))) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    // Schutz gegen DNS-Rebinding und fremde Webseiten: nur eigener Host/Origin.
    const okHosts = [`${HOST}:${PORT}`, `localhost:${PORT}`];
    if (!okHosts.includes(req.headers.host || '')) { res.writeHead(403); return res.end('Forbidden'); }
    const origin = req.headers.origin;
    if (origin && !okHosts.includes(origin.replace(/^https?:\/\//, ''))) { res.writeHead(403); return res.end('Forbidden'); }

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    return await serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { error: e.message || String(e) });
    else res.end();
  }
});

server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE') throw e;
  const url = `http://${HOST}:${PORT}`;
  console.error(`Port ${PORT} ist belegt – vermutlich läuft mostly-wise schon: ${url}\nAnderer Port: PORT=${PORT + 1} npm start (PowerShell: .\\start.ps1 -Port ${PORT + 1})`);
  if (process.argv.includes('--open') && process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`mostly-wise läuft auf ${url}\nDaten: ${DATA}`);
  if (process.argv.includes('--open')) {
    if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  }
});
