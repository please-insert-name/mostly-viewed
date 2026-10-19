'use strict';
// Parst eine Claude-Code-Session (JSONL) in eine flache Nachrichtenliste.
// Nachrichten-IDs sind die UUIDs der JSONL-Zeilen und damit stabil.

const MAX_RESULT = 50000;

function toText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'string' ? c : c && c.type === 'text' ? c.text : c && c.type === 'image' ? '[Bild]' : JSON.stringify(c)))
      .join('\n');
  }
  return JSON.stringify(content, null, 2);
}

function clip(s) {
  return s.length > MAX_RESULT ? s.slice(0, MAX_RESULT) + `\n… (${s.length - MAX_RESULT} Zeichen gekürzt)` : s;
}

function parseSession(text) {
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch (_) {
      /* defekte Zeile überspringen */
    }
  }

  const messages = [];
  const toolUses = new Map();
  let last = null;

  for (const e of entries) {
    if (e.type !== 'user' && e.type !== 'assistant') continue;
    if (e.isMeta || !e.message || !e.uuid) continue;

    let content = e.message.content;
    if (typeof content === 'string') content = [{ type: 'text', text: content }];
    if (!Array.isArray(content)) continue;

    const blocks = [];
    content.forEach((b, i) => {
      const id = `${e.uuid}:${i}`;
      if (b.type === 'text') {
        if (b.text && b.text.trim()) blocks.push({ id, kind: 'text', text: b.text });
      } else if (b.type === 'thinking') {
        if (b.thinking && b.thinking.trim()) blocks.push({ id, kind: 'thinking', text: b.thinking });
      } else if (b.type === 'tool_use') {
        const blk = { id, kind: 'tool', name: b.name, input: b.input, result: null };
        toolUses.set(b.id, blk);
        blocks.push(blk);
      } else if (b.type === 'tool_result') {
        const target = toolUses.get(b.tool_use_id);
        if (target) target.result = { text: clip(toText(b.content)), isError: !!b.is_error };
      } else if (b.type === 'image') {
        blocks.push({ id, kind: 'image' });
      }
    });
    if (!blocks.length) continue;

    const role = e.type;
    const sidechain = !!e.isSidechain;
    const msgId = e.message.id || null;
    if (
      role === 'assistant' && last && last.role === 'assistant' &&
      last.sidechain === sidechain && msgId && last.msgId === msgId
    ) {
      last.blocks.push(...blocks);
      last.uuids.push(e.uuid);
      continue;
    }
    last = {
      id: e.uuid, uuids: [e.uuid], msgId, role, sidechain,
      ts: e.timestamp || null, model: e.message.model || null, blocks,
    };
    messages.push(last);
  }

  messages.forEach((m, i) => (m.n = i + 1));

  let title = '';
  for (const m of messages) {
    if (m.role === 'user' && !m.sidechain) {
      const t = m.blocks.find((b) => b.kind === 'text');
      if (t) { title = t.text.replace(/\s+/g, ' ').trim().slice(0, 80); break; }
    }
  }
  return { title, messages };
}

// Liest nur den Anfang einer Datei, um einen Titel für die Sessionliste zu finden.
function titleFromHead(head) {
  for (const line of head.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.type === 'user' && !e.isMeta && !e.isSidechain && e.message) {
        const c = e.message.content;
        const t = typeof c === 'string' ? c : Array.isArray(c) ? (c.find((x) => x.type === 'text') || {}).text : '';
        if (t && t.trim()) return t.replace(/\s+/g, ' ').trim().slice(0, 80);
      }
    } catch (_) { /* unvollständige letzte Zeile */ }
  }
  return '';
}

module.exports = { parseSession, titleFromHead };
