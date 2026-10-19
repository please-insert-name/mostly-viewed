# Mostly-Viewed

Lokaler Viewer, um Claude-Code-Chats in der Vorlesung zu zeigen, zu kommentieren und mit Links zu versehen.
Läuft komplett offline (nur Node.js, keine Abhängigkeiten, keine CDNs).

## Starten

- Doppelklick auf `start.cmd` (öffnet den Browser), oder
- `npm start` und dann <http://127.0.0.1:4173> öffnen. Anderer Port: `PORT=5000 npm start`.

## Bedienung

- **Import**: `.jsonl`-Session per Drag & Drop, per Knopf oder über „Claude-Code-Session wählen“ (liest `~/.claude/projects`). Ein exportiertes Bundle (`.chatpack.json`) lässt sich auf demselben Weg wieder laden.
- **Kommentieren / Links**: Kommentar-Symbol an Nachrichten, Tool-Calls, Thinking und Code-Blöcken. Links: URL, Datei als Kopie im Chat-Ordner, Datei per Pfad (öffnet im Standardprogramm, z. B. PowerPoint) oder Verweis auf eine Nachricht.
- **Technisches**: Tool-Calls, Thinking und Subagenten sind eingeklappt; Schalter „Technische Details“ klappt alles auf/zu. Artefakte werden nie gerendert.
- **Ausblenden**: Auge-Symbol blendet eine Nachricht für die Projektion aus (im Original bleibt sie).
- **Speichern**: automatisch nach jeder Änderung. Bundle-Export (Download-Symbol) enthält Original, Kommentare, Links und angehängte Dateien.

## Daten

`data/<chat>/original.jsonl`, `annotations.json`, `meta.json`, `attachments/`. Mit `MW_DATA=<ordner>` verlegbar.
Der Server lauscht nur auf 127.0.0.1 und öffnet nur Dateien, die als Link im jeweiligen Chat eingetragen sind.
