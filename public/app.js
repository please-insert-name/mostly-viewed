'use strict';
/* Mostly Wise – Frontend. Keine Abhängigkeiten, läuft komplett offline. */

// ---------- Helfer ----------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
};

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

const ICONS = {
  comment: 'M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  hide: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  side: 'M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm12 2H3v14h12V5z',
  chev: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  open: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z',
  show: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
};
const icon = (name) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', ICONS[name]); s.append(p);
  return s;
};
const iconBtn = (name, title, onclick, cls = '') => h('button', { class: `icon-btn ${cls}`, title, onclick }, icon(name));

// ---------- Markdown --------------------------------------------------------
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function inline(raw) {
  let s = esc(raw);
  const codes = [];
  s = s.replace(/`([^`\n]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

function renderList(items) {
  let html = '';
  const stack = [];
  for (const it of items) {
    while (stack.length && it.indent < stack[stack.length - 1].indent) html += `</li></${stack.pop().tag}>`;
    const top = stack[stack.length - 1];
    if (!top || it.indent > top.indent) {
      const tag = it.ordered ? 'ol' : 'ul';
      stack.push({ indent: it.indent, tag });
      html += `<${tag}><li>${inline(it.text)}`;
    } else html += `</li><li>${inline(it.text)}`;
  }
  while (stack.length) html += `</li></${stack.pop().tag}>`;
  return html;
}

function renderMd(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out = [];
  const isBlockStart = (l) => /^(#{1,4}\s|>|\s*([-*+]|\d+\.)\s|\s*\|)/.test(l) || /^\s*([-*_])\1{2,}\s*$/.test(l);
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (l.startsWith('>')) {
      const q = [];
      while (i < lines.length && lines[i].startsWith('>')) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${renderMd(q.join('\n'))}</blockquote>`); continue;
    }
    if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(l); i += 2;
      let html = '<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
      while (i < lines.length && /^\s*\|/.test(lines[i])) html += '<tr>' + cells(lines[i++]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
      out.push(html + '</tbody></table>'); continue;
    }
    if ((m = l.match(/^(\s*)([-*+]|\d+\.)\s+(.*)/))) {
      const items = [];
      while (i < lines.length && (m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)/))) {
        items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), text: m[3] }); i++;
      }
      out.push(renderList(items)); continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++]);
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }
  return out.join('');
}

function splitFences(text) {
  const out = [];
  const re = /^[ \t]*```([^\n`]*)\n([\s\S]*?)\n?^[ \t]*```[ \t]*$/gm;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'md', s: text.slice(last, m.index) });
    out.push({ t: 'code', lang: m[1].trim(), s: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 'md', s: text.slice(last) });
  return out;
}
const codeCount = (text) => splitFences(text).filter((s) => s.t === 'code').length;

// ---------- Zustand ---------------------------------------------------------
const store = {
  get(k, d) { try { const v = localStorage.getItem('mw.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mw.' + k, JSON.stringify(v)); } catch { /* ignorieren */ } },
};
const prefs = {
  theme: store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  scale: store.get('scale', 1), side: store.get('side', true), lib: store.get('lib', true),
};
const st = {
  chats: [], chat: null, sel: null, tab: 'sel', editing: null, form: { kind: 'url' },
  tech: false, only: false, raw: false, targets: new Map(), msgIds: new Map(),
  dirty: false, timer: null, saving: false,
};

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch { /* ignorieren */ }
    throw new Error(msg);
  }
  return res.json();
}

function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

// ---------- Annotationen & Speichern ---------------------------------------
function tgt(id, create = false) {
  const t = st.chat.annotations.targets;
  if (!t[id] && create) t[id] = { comments: [], links: [], hidden: false };
  return t[id];
}
const count = (id) => { const t = tgt(id); return t ? t.comments.length + t.links.length : 0; };
const msgCount = (mid) => (st.msgIds.get(mid) || []).reduce((n, id) => n + count(id), 0);
const msgSplit = (mid) => (st.msgIds.get(mid) || []).reduce((a, id) => {
  const t = tgt(id); if (t) { a.c += t.comments.length; a.l += t.links.length; } return a;
}, { c: 0, l: 0 });

function setStatus(text, cls = '') { const s = $('#status'); s.textContent = text; s.className = 'status ' + cls; }

function changed() {
  st.dirty = true;
  setStatus('Änderungen …', 'saving');
  clearTimeout(st.timer);
  st.timer = setTimeout(flush, 400);
}

async function flush() {
  clearTimeout(st.timer);
  if (!st.dirty || !st.chat) return;
  if (st.saving) { st.timer = setTimeout(flush, 300); return; }
  st.saving = true; st.dirty = false;
  try {
    await api(`/chats/${st.chat.id}/annotations`, { method: 'PUT', body: JSON.stringify(st.chat.annotations) });
    if (!st.dirty) setStatus('Gespeichert ' + new Date().toLocaleTimeString('de-DE'));
  } catch (e) {
    st.dirty = true; setStatus('Speichern fehlgeschlagen – neuer Versuch', 'error');
    st.timer = setTimeout(flush, 3000);
  } finally { st.saving = false; }
}
window.addEventListener('beforeunload', () => {
  if (st.dirty && st.chat) fetch(`/api/chats/${st.chat.id}/annotations`, { method: 'PUT', body: JSON.stringify(st.chat.annotations), keepalive: true });
});

// ---------- Zielobjekte -----------------------------------------------------
function buildTargets() {
  st.targets = new Map(); st.msgIds = new Map();
  for (const m of st.chat.messages) {
    const ids = [m.id];
    st.targets.set(m.id, { m, label: `Nachricht #${m.n} · ${m.role === 'user' ? 'Du' : 'Claude'}` });
    for (const b of m.blocks) {
      if (b.kind === 'text') {
        ids.push(b.id); // Text selbst nicht eigenständig, aber Basis für Code-IDs
        for (let k = 0, n = codeCount(b.text); k < n; k++) {
          const cid = `${b.id}#c${k}`; ids.push(cid);
          st.targets.set(cid, { m, label: `Code-Block ${k + 1} in Nachricht #${m.n}` });
        }
      } else if (b.kind === 'thinking') {
        ids.push(b.id); st.targets.set(b.id, { m, label: `Thinking in Nachricht #${m.n}` });
      } else if (b.kind === 'tool') {
        ids.push(b.id); st.targets.set(b.id, { m, label: `Tool-Call ${b.name} in Nachricht #${m.n}` });
      }
    }
    st.msgIds.set(m.id, ids);
  }
}

// ---------- Chat rendern ----------------------------------------------------
function commentBtn(id) {
  const b = h('button', { class: 'icon-btn cbtn', title: 'Kommentieren / Link hinzufügen', dataset: { for: id },
    onclick: (e) => { e.preventDefault(); e.stopPropagation(); select(id); } }, icon('comment'));
  return b;
}

function codeEl(seg, id) {
  return h('div', { class: 'code-wrap', dataset: { tid: id } },
    seg.lang && h('span', { class: 'lang' }, seg.lang),
    h('div', { class: 'tools' }, commentBtn(id)),
    h('pre', {}, h('code', {}, seg.s)));
}

function mdEl(text, baseId) {
  const root = h('div', { class: 'md' });
  let k = 0;
  for (const seg of splitFences(text)) {
    if (seg.t === 'code') root.append(codeEl(seg, `${baseId}#c${k++}`));
    else root.append(h('div', { html: renderMd(seg.s) }));
  }
  return root;
}

const brief = (b) => {
  const i = b.input || {};
  const v = i.command || i.file_path || i.path || i.pattern || i.query || i.url || i.description || i.prompt || JSON.stringify(i);
  return String(v).replace(/\s+/g, ' ').slice(0, 140);
};

function details(cls, id, kind, sum, body, open) {
  const d = h('details', { class: `blk ${cls}`, dataset: { tid: id } });
  if (open) d.open = true;
  d.append(
    h('summary', {}, h('span', { class: 'chev' }, icon('chev')), h('span', { class: 'kind' }, kind), h('span', { class: 'sum' }, sum),
      h('span', { class: 'tools' }, commentBtn(id))),
    h('div', { class: 'blk-body' }, body));
  return d;
}

function blockEl(b) {
  if (b.kind === 'text') return h('div', { class: 'blk' }, mdEl(b.text, b.id));
  if (b.kind === 'image') return h('div', { class: 'hidden-chip blk' }, 'Bild (wird nicht dargestellt)');
  if (b.kind === 'thinking') {
    return details('thinking tech', b.id, 'Thinking', b.text.replace(/\s+/g, ' ').slice(0, 120), mdEl(b.text, b.id + '~t'), st.tech);
  }
  const body = [];
  const inp = b.input || {};
  for (const [k, v] of Object.entries(inp)) {
    body.push(h('h4', {}, k), h('pre', { class: 'plain' }, typeof v === 'string' ? v : JSON.stringify(v, null, 2)));
  }
  if (b.result) body.push(h('h4', {}, b.result.isError ? 'Ergebnis (Fehler)' : 'Ergebnis'), h('pre', { class: 'plain' }, b.result.text || '(leer)'));
  return details('tool tech' + (b.result && b.result.isError ? ' err' : ''), b.id, `Tool · ${b.name}`, brief(b), body, st.tech);
}

function msgEl(m) {
  const el = h('article', { class: `msg ${m.role}`, id: 'm-' + m.n, dataset: { tid: m.id, n: m.n } });
  const ann = tgt(m.id);
  const head = h('div', { class: 'msg-head' },
    h('span', { class: 'who' }, m.role === 'user' ? 'Du' : 'Claude'),
    h('span', {}, `#${m.n}`), m.ts && h('span', {}, fmtTime(m.ts)),
    h('span', { class: 'grow' }),
    h('span', { class: 'tools' },
      iconBtn('hide', 'Für die Anzeige ausblenden', () => { tgt(m.id, true).hidden = true; changed(); rerenderMsg(m); }),
      commentBtn(m.id)));
  el.append(head);
  if (ann && ann.hidden) {
    el.append(h('div', { class: 'hidden-chip' }, icon('hide'), 'Inhalt ausgeblendet',
      h('button', { class: 'btn text small', onclick: () => { tgt(m.id).hidden = false; changed(); rerenderMsg(m); } }, 'Einblenden')));
    head.querySelector('.tools .icon-btn').remove();
  } else {
    for (const b of m.blocks) el.append(blockEl(b));
    if (st.raw) {
      const d = h('details', { class: 'raw' }, h('summary', {}, 'Rohdaten (JSONL)'));
      d.addEventListener('toggle', async () => {
        if (!d.open || d.dataset.loaded) return;
        d.dataset.loaded = '1';
        try {
          const rows = await api(`/chats/${st.chat.id}/raw?uuids=${m.uuids.join(',')}`);
          d.append(h('pre', { class: 'plain' }, JSON.stringify(rows, null, 2)));
        } catch (e) { d.append(String(e.message)); }
      });
      el.append(d);
    }
  }
  return el;
}

function rerenderMsg(m) {
  const old = document.querySelector(`.msg[data-tid="${CSS.escape(m.id)}"]`);
  if (old) old.replaceWith(msgEl(m));
  refreshMarks();
}

function renderChat() {
  const root = $('#chat');
  root.replaceChildren();
  if (!st.chat) {
    root.append(h('div', { class: 'welcome' },
      h('h2', {}, 'Chat importieren'),
      h('p', {}, 'Ziehe eine Claude-Code-Session (.jsonl) oder ein exportiertes Bundle in dieses Fenster – oder wähle links eine Datei bzw. eine Session aus.')));
    return;
  }
  const inner = h('div', { class: 'chat-inner' });
  let group = null, groupInner = null, shown = 0;
  for (const m of st.chat.messages) {
    if (st.only && !msgCount(m.id) && !(tgt(m.id) || {}).hidden) continue;
    shown++;
    const el = msgEl(m);
    if (m.sidechain) {
      if (!group) {
        group = h('details', { class: 'sidechain-group tech' }, h('summary', {}), groupInner = h('div', { class: 'inner' }));
        if (st.tech) group.open = true;
        inner.append(group);
      }
      groupInner.append(el);
    } else { group = null; inner.append(el); }
  }
  inner.querySelectorAll('.sidechain-group').forEach((g) => {
    g.querySelector('summary').textContent = `Subagent-Verlauf · ${g.querySelectorAll('.msg').length} Nachrichten`;
  });
  if (!shown) inner.append(h('div', { class: 'empty' }, 'Keine kommentierten Nachrichten.'));
  root.append(inner);
  refreshMarks();
}

function refreshMarks() {
  if (!st.chat) return;
  document.querySelectorAll('.cbtn').forEach((b) => {
    // Am Nachrichten-Button zählt alles in der Nachricht (inkl. Blöcke), sonst nur das Ziel selbst.
    const n = st.msgIds.has(b.dataset.for) ? msgCount(b.dataset.for) : count(b.dataset.for);
    let bd = b.querySelector('.badge');
    if (n && !bd) b.append((bd = h('span', { class: 'badge' })));
    if (bd) { if (n) bd.textContent = n; else bd.remove(); }
    b.parentElement.classList.toggle('keep', n > 0);
  });
  document.querySelectorAll('[data-tid]').forEach((el) => {
    const id = el.dataset.tid;
    el.classList.toggle('selected', id === st.sel);
    if (el.classList.contains('msg')) {
      el.classList.toggle('annotated', msgCount(id) > 0);
    } else el.classList.toggle('annotated', count(id) > 0);
  });
}

// ---------- Auswahl & Navigation -------------------------------------------
function select(id) {
  st.sel = id; st.tab = 'sel'; st.editing = null;
  if (!prefs.side) { prefs.side = true; store.set('side', true); applyLayout(); }
  refreshMarks(); renderSidebar();
}

function jump(id) {
  const el = document.querySelector(`[data-tid="${CSS.escape(id)}"]`);
  if (!el) { toast('Ziel ist gerade nicht sichtbar (Filter aktiv?)'); return; }
  for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const msg = el.closest('.msg') || el;
  msg.classList.remove('flash'); void msg.offsetWidth; msg.classList.add('flash');
}

// ---------- Seitenleiste ----------------------------------------------------
function allAnnotated() {
  const rows = [];
  for (const [id, t] of Object.entries(st.chat.annotations.targets)) {
    const info = st.targets.get(id);
    if (!info || !(t.comments.length || t.links.length)) continue;
    rows.push({ id, info, t });
  }
  return rows.sort((a, b) => a.info.m.n - b.info.m.n);
}

function renderSidebar() {
  const root = $('#sidebar');
  root.replaceChildren();
  if (!st.chat) return;
  root.append(h('div', { class: 'tabs' },
    h('button', { class: st.tab === 'sel' ? 'on' : '', onclick: () => { st.tab = 'sel'; renderSidebar(); } }, 'Auswahl'),
    h('button', { class: st.tab === 'all' ? 'on' : '', onclick: () => { st.tab = 'all'; renderSidebar(); } }, 'Übersicht')));
  const body = h('div', { class: 'side-body' });
  root.append(body);

  if (st.tab === 'all') {
    const rows = allAnnotated();
    if (!rows.length) body.append(h('div', { class: 'empty' }, 'Noch keine Kommentare oder Links.'));
    for (const r of rows) {
      body.append(h('button', { class: 'ov-item', onclick: () => { select(r.id); jump(r.id); } },
        h('div', { class: 'h' }, `${r.info.label} · ${r.t.comments.length} Komm. · ${r.t.links.length} Links`),
        h('div', {}, (r.t.comments[0] ? r.t.comments[0].text : r.t.links[0].title).slice(0, 110))));
    }
    return;
  }

  const info = st.sel && st.targets.get(st.sel);
  if (!info) {
    body.append(h('div', { class: 'empty' }, 'Klicke bei einer Nachricht oder einem Block auf das Kommentar-Symbol, um Kommentare und Links hinzuzufügen.'));
    return;
  }
  const t = tgt(st.sel);
  body.append(h('div', { class: 'side-title' }, info.label));

  if (t && t.comments.length) body.append(h('h3', { class: 'sec' }, 'Kommentare'));
  for (const c of (t ? t.comments : [])) body.append(commentCard(c, t));
  body.append(commentForm());

  if (t && t.links.length) body.append(h('h3', { class: 'sec' }, 'Links & Dateien'));
  for (const l of (t ? t.links : [])) body.append(linkCard(l, t));
  body.append(linkForm());
}

function commentCard(c, t) {
  if (st.editing === c.id) {
    const ta = h('textarea', {}, c.text);
    ta.value = c.text;
    return h('div', { class: 'card form' }, h('label', { class: 'field' }, 'Kommentar bearbeiten', ta),
      h('div', { class: 'actions' },
        h('button', { class: 'btn text small', onclick: () => { st.editing = null; renderSidebar(); } }, 'Abbrechen'),
        h('button', { class: 'btn small', onclick: () => {
          if (!ta.value.trim()) return;
          c.text = ta.value.trim(); c.edited = new Date().toISOString(); st.editing = null;
          changed(); renderSidebar();
        } }, 'Speichern')));
  }
  return h('div', { class: 'card' },
    h('div', { class: 'meta' }, h('span', { class: 'grow' }, fmtTime(c.created) + (c.edited ? ' · bearbeitet' : '')),
      iconBtn('edit', 'Bearbeiten', () => { st.editing = c.id; renderSidebar(); }),
      iconBtn('del', 'Löschen', () => {
        t.comments = t.comments.filter((x) => x.id !== c.id); changed(); refreshMarks(); renderSidebar();
      })),
    h('div', { class: 'md', html: renderMd(c.text) }));
}

function commentForm() {
  const ta = h('textarea', { placeholder: 'Kommentar (Markdown möglich) – Strg+Enter zum Hinzufügen' });
  const add = () => {
    const text = ta.value.trim();
    if (!text) return;
    tgt(st.sel, true).comments.push({ id: uid(), text, created: new Date().toISOString() });
    changed(); refreshMarks(); renderSidebar();
  };
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); add(); } });
  return h('div', { class: 'form' }, h('label', { class: 'field' }, 'Neuer Kommentar', ta),
    h('div', { class: 'actions' }, h('button', { class: 'btn small', onclick: add }, icon('add'), 'Kommentar')));
}

function linkCard(l, t) {
  let main;
  if (l.kind === 'url') main = h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.title || l.url);
  else if (l.kind === 'file') main = h('button', { class: 'lnk', onclick: async () => {
    try { await flush(); await api(`/chats/${st.chat.id}/open`, { method: 'POST', body: JSON.stringify({ linkId: l.id }) }); }
    catch (e) { toast(e.message); }
  } }, l.title || l.file || l.path);
  else main = h('button', { class: 'lnk', onclick: () => jump(l.target) }, l.title);
  const sub = l.kind === 'url' ? l.url : l.kind === 'file' ? (l.mode === 'copy' ? `Kopie: ${l.file}` : `Pfad: ${l.path}`) : 'Verweis auf Nachricht';
  return h('div', { class: 'card link' },
    h('div', { class: 'row' }, icon(l.kind === 'file' ? 'file' : l.kind === 'url' ? 'open' : 'link'), h('span', { class: 'grow', style: 'flex:1' }, main),
      iconBtn('del', 'Link entfernen', () => { t.links = t.links.filter((x) => x.id !== l.id); changed(); refreshMarks(); renderSidebar(); })),
    h('div', { class: 'sub' }, sub));
}

function linkForm() {
  const f = st.form;
  const kind = h('select', { onchange: () => { f.kind = kind.value; renderSidebar(); } },
    ...[['url', 'Webseite (URL)'], ['file-copy', 'Datei (Kopie im Chat-Ordner)'], ['file-path', 'Datei (Pfad auf diesem Rechner)'], ['msg', 'Nachricht in diesem Chat']]
      .map(([v, t]) => h('option', { value: v, selected: f.kind === v }, t)));
  const title = h('input', { type: 'text', placeholder: 'Titel (optional)' });
  let input;
  if (f.kind === 'url') input = h('input', { type: 'text', placeholder: 'https://…' });
  else if (f.kind === 'file-copy') input = h('input', { type: 'file' });
  else if (f.kind === 'file-path') input = h('input', { type: 'text', placeholder: 'C:\\Users\\…\\Folien.pptx' });
  else input = h('input', { type: 'number', min: 1, max: st.chat.messages.length, placeholder: `Nachrichtennummer (1–${st.chat.messages.length})` });

  const add = async () => {
    const t = title.value.trim();
    let link;
    try {
      if (f.kind === 'url') {
        let u = input.value.trim(); if (!u) return;
        if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
        if (!/^(https?|mailto):/i.test(u)) { toast('Nur http(s)- und mailto-Links erlaubt'); return; }
        link = { kind: 'url', url: u, title: t || u };
      } else if (f.kind === 'file-copy') {
        const file = input.files[0]; if (!file) return;
        const res = await api(`/chats/${st.chat.id}/attachments?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: await file.arrayBuffer() });
        link = { kind: 'file', mode: 'copy', file: res.name, title: t || res.name };
      } else if (f.kind === 'file-path') {
        const p = input.value.trim().replace(/^"|"$/g, ''); if (!p) return;
        link = { kind: 'file', mode: 'path', path: p, title: t || p.split(/[\\/]/).pop() };
      } else {
        const n = Number(input.value); const m = st.chat.messages.find((x) => x.n === n);
        if (!m) { toast('Diese Nachricht gibt es nicht'); return; }
        link = { kind: 'msg', target: m.id, title: t || `Nachricht #${n}` };
      }
    } catch (e) { toast(e.message); return; }
    link.id = uid();
    tgt(st.sel, true).links.push(link);
    changed(); refreshMarks(); renderSidebar();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  return h('div', { class: 'form' },
    h('label', { class: 'field' }, 'Link hinzufügen', kind), h('label', { class: 'field' }, 'Ziel', input), h('label', { class: 'field' }, 'Titel', title),
    h('div', { class: 'actions' }, h('button', { class: 'btn tonal small', onclick: add }, icon('link'), 'Link')));
}

// ---------- Bibliothek ------------------------------------------------------
async function loadChats() { st.chats = await api('/chats'); renderLibrary(); }

function renderLibrary() {
  const root = $('#library');
  root.replaceChildren(
    h('div', { style: 'display:flex;flex-direction:column;gap:.5rem' },
      h('button', { class: 'btn', onclick: () => $('#file-import').click() }, icon('add'), 'Datei / Bundle importieren'),
      h('button', { class: 'btn tonal', onclick: openSessions }, icon('file'), 'Claude-Code-Session wählen')),
    h('h2', {}, 'Gespeicherte Chats'));
  if (!st.chats.length) root.append(h('div', { class: 'empty' }, 'Noch nichts importiert.'));
  for (const c of st.chats) {
    root.append(h('div', { style: 'display:flex;align-items:center' },
      h('button', { class: 'chat-item' + (st.chat && st.chat.id === c.id ? ' active' : ''), style: 'flex:1', onclick: () => openChat(c.id) },
        h('div', { class: 't' }, c.title), h('div', { class: 's' }, `${c.comments} Kommentare · ${c.links} Links`)),
      iconBtn('del', 'Chat löschen', async () => {
        if (!confirm(`„${c.title}“ samt Kommentaren und Dateien endgültig löschen?\nTipp: vorher als Bundle exportieren.`)) return;
        await api(`/chats/${c.id}`, { method: 'DELETE' });
        if (st.chat && st.chat.id === c.id) { st.chat = null; st.sel = null; store.set('last', null); renderAll(); }
        loadChats();
      })));
  }
}

async function openChat(id) {
  await flush();
  try {
    st.chat = await api(`/chats/${id}`);
  } catch (e) { toast(e.message); return; }
  st.chat.annotations.targets ||= {};
  for (const t of Object.values(st.chat.annotations.targets)) { t.comments ||= []; t.links ||= []; }
  st.sel = null; st.tab = 'sel'; st.only = false; $('#chip-only').classList.remove('on');
  store.set('last', id);
  buildTargets(); renderAll(); setStatus('Gespeichert'); $('#chat').scrollTop = 0;
}

function renderAll() {
  $('#title').textContent = st.chat ? st.chat.meta.title : 'Mostly Wise';
  $('#title').title = st.chat ? 'Doppelklick zum Umbenennen' : '';
  renderLibrary(); renderChat(); renderSidebar();
}

async function importFile(file) {
  try {
    setStatus('Importiere …', 'saving');
    const { id } = await api(`/chats?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: await file.text() });
    await loadChats(); await openChat(id);
    toast('Importiert');
  } catch (e) { setStatus('Import fehlgeschlagen', 'error'); toast(e.message); }
}

async function openSessions() {
  const dlg = $('#dlg-sessions'), list = $('#session-list');
  list.replaceChildren(h('div', { class: 'empty' }, 'Lade …'));
  dlg.showModal();
  try {
    const rows = await api('/sessions');
    list.replaceChildren();
    if (!rows.length) list.append(h('div', { class: 'empty' }, 'Keine Sessions unter ~/.claude/projects gefunden.'));
    for (const r of rows) {
      list.append(h('button', { class: 'chat-item', onclick: async () => {
        dlg.close();
        try {
          setStatus('Importiere …', 'saving');
          const { id } = await api('/sessions/import', { method: 'POST', body: JSON.stringify({ rel: r.rel }) });
          await loadChats(); await openChat(id);
        } catch (e) { setStatus('Import fehlgeschlagen', 'error'); toast(e.message); }
      } },
      h('div', { class: 't' }, r.title || '(ohne Titel)'),
      h('div', { class: 's' }, `${fmtTime(new Date(r.mtime).toISOString())} · ${(r.size / 1024).toFixed(0)} KB · ${r.project.replace(/^C--Users-[^-]+-/, '').replace(/-/g, '/')}`)));
    }
  } catch (e) { list.replaceChildren(h('div', { class: 'empty' }, e.message)); }
}

// ---------- Layout, Einstellungen, Ereignisse -------------------------------
function applyLayout() {
  document.documentElement.dataset.theme = prefs.theme;
  document.documentElement.style.setProperty('--scale', prefs.scale);
  const l = $('#layout');
  l.classList.toggle('no-side', !prefs.side); l.classList.toggle('no-lib', !prefs.lib);
}

function init() {
  $('#btn-lib').append(icon('menu')); $('#btn-theme').append(icon('moon'));
  $('#btn-export').append(icon('download')); $('#btn-side').append(icon('side'));
  applyLayout();

  $('#btn-lib').onclick = () => { prefs.lib = !prefs.lib; store.set('lib', prefs.lib); applyLayout(); };
  $('#btn-side').onclick = () => { prefs.side = !prefs.side; store.set('side', prefs.side); applyLayout(); };
  $('#btn-theme').onclick = () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; store.set('theme', prefs.theme); applyLayout(); };
  const zoom = (d) => { prefs.scale = Math.min(2, Math.max(0.8, Math.round((prefs.scale + d) * 10) / 10)); store.set('scale', prefs.scale); applyLayout(); };
  $('#btn-bigger').onclick = () => zoom(0.1); $('#btn-smaller').onclick = () => zoom(-0.1);
  $('#btn-export').onclick = async () => {
    if (!st.chat) return toast('Zuerst einen Chat öffnen');
    await flush();
    const a = h('a', { href: `/api/chats/${st.chat.id}/export`, download: `${st.chat.id}.chatpack.json` });
    document.body.append(a); a.click(); a.remove();
  };

  $('#chip-tech').onclick = (e) => {
    st.tech = !st.tech; e.currentTarget.classList.toggle('on', st.tech);
    document.querySelectorAll('details.tech, details.blk.tool, details.blk.thinking, .sidechain-group').forEach((d) => { d.open = st.tech; });
  };
  $('#chip-only').onclick = (e) => { st.only = !st.only; e.currentTarget.classList.toggle('on', st.only); renderChat(); };
  $('#chip-raw').onclick = (e) => { st.raw = !st.raw; e.currentTarget.classList.toggle('on', st.raw); renderChat(); };

  $('#title').ondblclick = async () => {
    if (!st.chat) return;
    const t = prompt('Titel', st.chat.meta.title);
    if (!t || !t.trim()) return;
    st.chat.meta = await api(`/chats/${st.chat.id}/meta`, { method: 'PUT', body: JSON.stringify({ title: t }) });
    renderAll(); loadChats();
  };

  $('#file-import').onchange = async (e) => { for (const f of e.target.files) await importFile(f); e.target.value = ''; };
  document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => b.closest('dialog').close()));

  let depth = 0;
  const drop = $('#drop');
  addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { depth++; drop.classList.add('show'); } });
  addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; drop.classList.remove('show'); } });
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', async (e) => {
    e.preventDefault(); depth = 0; drop.classList.remove('show');
    for (const f of e.dataTransfer.files) await importFile(f);
  });

  renderAll(); renderSidebar(); setStatus('bereit');
  loadChats().then(() => {
    const last = store.get('last', null);
    if (last && st.chats.some((c) => c.id === last)) openChat(last);
  }).catch((e) => toast(e.message));
}

init();
