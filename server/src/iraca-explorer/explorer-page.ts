import { EndpointDoc } from "./types";

export function renderExplorerPage(config: {
  title: string;
  intro: string;
  endpoints: EndpointDoc[];
  streamPath: string | null;
}): string {
  const payload = JSON.stringify({
    endpoints: config.endpoints,
    streamPath: config.streamPath,
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.title)}</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --surface: #fffcf6;
      --ink: #1c1914;
      --muted: #6b6458;
      --line: #e4ddd0;
      --accent: #0f5c4c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: "Iowan Old Style", Palatino, Georgia, serif;
    }
    header {
      padding: 1.4rem 1.6rem 0.4rem;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }
    header p { color: var(--muted); margin: 0.35rem 0 1rem; max-width: 46rem; }
    h1 { margin: 0; font-size: 1.8rem; }
    .kicker {
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-size: 0.72rem;
      color: var(--accent);
      font-weight: 700;
    }
    main {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 1rem;
      padding: 1rem 1.4rem 2rem;
    }
    .list, .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0.9rem;
      min-height: 70vh;
    }
    article {
      border-top: 1px solid var(--line);
      padding: 0.85rem 0.1rem;
      cursor: pointer;
    }
    article:first-of-type { border-top: 0; }
    article.active {
      background: #e3f2ed;
      margin: 0 -0.5rem;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      border-radius: 8px;
    }
    .path { font-family: ui-monospace, monospace; font-size: 0.82rem; }
    .method {
      display: inline-block;
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: #e3f2ed;
      color: var(--accent);
      margin-right: 0.4rem;
    }
    .method.get { background: #e8eef8; color: #1d3b8a; }
    h2 { font-size: 1.05rem; margin: 0 0 0.7rem; }
    label { display: grid; gap: 0.3rem; font-size: 0.9rem; margin-bottom: 0.7rem; }
    textarea, pre {
      width: 100%;
      font-family: ui-monospace, monospace;
      font-size: 0.78rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0.7rem;
      background: #fff;
    }
    textarea { min-height: 140px; }
    pre { min-height: 160px; overflow: auto; white-space: pre-wrap; }
    button {
      font: inherit;
      border: 0;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      padding: 0.55rem 1rem;
      cursor: pointer;
    }
    .events { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.5rem 0 0.8rem; }
    .chip {
      font-size: 0.72rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.15rem 0.5rem;
      color: var(--muted);
    }
    .live {
      margin-top: 1rem;
      border-top: 1px solid var(--line);
      padding-top: 0.8rem;
    }
    .live[hidden] { display: none; }
    .log { max-height: 220px; overflow: auto; font-size: 0.8rem; color: var(--muted); }
    .log div { padding: 0.25rem 0; border-bottom: 1px solid var(--line); }
    .note { color: var(--muted); font-size: 0.9rem; margin: 0 0 0.8rem; }
    code { font-size: 0.85em; }
    @media (max-width: 900px) {
      main { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Iraca · DomainEvent explorer</p>
    <h1>${escapeHtml(config.title)}</h1>
    <p>${escapeHtml(config.intro)}</p>
  </header>
  <main>
    <section class="list" id="list"></section>
    <section class="panel">
      <h2 id="heading">Elige un caso de uso</h2>
      <p class="note" id="note"></p>
      <div class="events" id="events"></div>
      <label>
        Comando (JSON). En GET se manda como query.
        <textarea id="body"></textarea>
      </label>
      <button type="button" id="run">Ejecutar caso de uso</button>
      <p class="note" id="meta"></p>
      <pre id="out">{}</pre>
      <div class="live" id="live">
        <h2>Live feed</h2>
        <p class="note">SSE de DomainEvent. El adapter HTTP no es el dominio.</p>
        <div class="log" id="log"></div>
      </div>
    </section>
  </main>
  <script id="catalog" type="application/json">${payload}</script>
  <script>
    const catalog = JSON.parse(document.getElementById('catalog').textContent);
    const endpoints = catalog.endpoints || [];
    const list = document.getElementById('list');
    const heading = document.getElementById('heading');
    const note = document.getElementById('note');
    const events = document.getElementById('events');
    const body = document.getElementById('body');
    const out = document.getElementById('out');
    const meta = document.getElementById('meta');
    const log = document.getElementById('log');
    const live = document.getElementById('live');
    let current = endpoints[0];

    function paintList() {
      list.innerHTML = endpoints.map((item, i) => \`
        <article data-i="\${i}" class="\${item === current ? 'active' : ''}">
          <div><span class="method \${item.method.toLowerCase()}">\${item.method}</span>
          <span class="path">\${item.path}</span></div>
          <strong>\${item.usecase}</strong>
        </article>\`).join('');
    }

    function paintCurrent() {
      if (!current) return;
      heading.textContent = current.usecase;
      note.textContent = (current.note || '') + ' · ' + current.method + ' ' + current.path;
      events.innerHTML = (current.events || []).map((name) =>
        '<span class="chip">' + name + '</span>').join('')
        || '<span class="chip">sin DomainEvent inferido</span>';
      body.value = current.sample ? JSON.stringify(current.sample, null, 2) : '';
    }

    list.addEventListener('click', (ev) => {
      const article = ev.target.closest('article');
      if (!article) return;
      current = endpoints[Number(article.dataset.i)];
      paintList();
      paintCurrent();
    });

    document.getElementById('run').addEventListener('click', async () => {
      if (!current) return;
      meta.textContent = 'Ejecutando…';
      let payload = {};
      const raw = body.value.trim();
      if (raw) {
        try { payload = JSON.parse(raw); }
        catch (err) {
          meta.textContent = 'JSON inválido';
          return;
        }
      }
      const url = new URL(current.path, location.origin);
      const init = { method: current.method, headers: { 'Content-Type': 'application/json' } };
      if (current.method === 'GET') {
        Object.entries(payload).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      } else {
        init.body = JSON.stringify(payload);
      }
      try {
        const response = await fetch(url, init);
        const json = await response.json();
        out.textContent = JSON.stringify(json, null, 2);
        meta.textContent = (json.meta && json.meta.code) || ('HTTP ' + response.status);
      } catch (err) {
        meta.textContent = String(err);
      }
    });

    if (catalog.streamPath) {
      const source = new EventSource(catalog.streamPath);
      source.addEventListener('domain', (message) => {
        const data = JSON.parse(message.data);
        const row = document.createElement('div');
        row.textContent = data.name;
        log.prepend(row);
      });
    } else {
      live.hidden = true;
    }

    paintList();
    paintCurrent();
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
