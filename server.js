import { createReadStream, watch, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);
const port = Number.parseInt(process.env.PORT ?? '8090', 10);
const host = process.env.HOST ?? '0.0.0.0';
const liveReload = process.env.LIVE_RELOAD !== '0';
const liveReloadPath = '/__live-reload';
const liveReloadScript = `
<script>
(() => {
  const source = new EventSource('${liveReloadPath}');
  source.addEventListener('reload', () => window.location.reload());
})();
</script>`;
const ignoredWatchDirs = new Set(['.git', '.idea', '.junie', 'node_modules']);
const watchedDirs = new Map();
const liveReloadClients = new Set();
let reloadTimer = null;

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function compareValues(left, right, direction) {
  const a = Array.isArray(left) ? left.join(' ') : left;
  const b = Array.isArray(right) ? right.join(' ') : right;
  const modifier = direction === 'desc' ? -1 : 1;

  return String(a ?? '').localeCompare(String(b ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) * modifier;
}

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function injectLiveReload(html) {
  if (!liveReload) return html;
  if (html.includes(liveReloadPath)) return html;
  if (html.includes('</body>')) return html.replace('</body>', `${liveReloadScript}\n</body>`);

  return `${html}${liveReloadScript}`;
}

function sendLiveReloadEvent() {
  for (const client of liveReloadClients) {
    client.write('event: reload\ndata: now\n\n');
  }
}

function scheduleLiveReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(sendLiveReloadEvent, 120);
}

function serveLiveReload(req, res) {
  if (!liveReload || req.method !== 'GET') {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  res.writeHead(200, {
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream; charset=utf-8',
  });
  res.write(': connected\n\n');
  liveReloadClients.add(res);
  req.on('close', () => liveReloadClients.delete(res));
}

function shouldWatchDirectory(directoryPath) {
  const name = path.basename(directoryPath);

  return !ignoredWatchDirs.has(name);
}

async function watchDirectory(directoryPath) {
  if (!liveReload || watchedDirs.has(directoryPath) || !shouldWatchDirectory(directoryPath)) return;

  try {
    const watcher = watch(directoryPath, async (_eventType, filename) => {
      if (filename) {
        const changedPath = path.join(directoryPath, filename.toString());

        try {
          const stats = await fs.stat(changedPath);
          if (stats.isDirectory()) {
            await watchDirectory(changedPath);
          }
        } catch {
          // Deleted or transient files are still a valid reason to refresh the browser.
        }
      }

      scheduleLiveReload();
    });

    watcher.on('error', () => {
      watchedDirs.delete(directoryPath);
    });

    watchedDirs.set(directoryPath, watcher);
  } catch {
    return;
  }

  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    await Promise.all(entries
      .filter(entry => entry.isDirectory())
      .map(entry => watchDirectory(path.join(directoryPath, entry.name))));
  } catch {
    // Ignore directories that disappear while watchers are being registered.
  }
}

async function serveEmployees(requestUrl, res) {
  const filePath = path.join(root, 'examples', 'employees.json');
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const page = Math.max(Number.parseInt(requestUrl.searchParams.get('page') ?? '1', 10), 1);
  const perPage = Math.max(Number.parseInt(requestUrl.searchParams.get('perPage') ?? '10', 10), 1);
  const search = (requestUrl.searchParams.get('search') ?? '').trim().toLowerCase();
  const sort = requestUrl.searchParams.get('sort') ?? 'name';
  const direction = requestUrl.searchParams.get('direction') === 'desc' ? 'desc' : 'asc';
  const searched = search
    ? data.filter(row => Object.values(row).flat().some(value => String(value).toLowerCase().includes(search)))
    : data;
  const sorted = [...searched].sort((a, b) => compareValues(a[sort], b[sort], direction));
  const start = (page - 1) * perPage;

  send(res, 200, JSON.stringify({
    data: sorted.slice(start, start + perPage),
    direction,
    page,
    perPage,
    sort,
    total: sorted.length,
  }), { 'Content-Type': 'application/json; charset=utf-8' });
}

function resolveRequestPath(url) {
  const requestUrl = new URL(url, `http://${host}:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const requestedPath = pathname === '/' ? '/examples/index.html' : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== root) {
    return null;
  }

  return filePath;
}

async function serveFile(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed', {
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    return;
  }

  const requestUrl = new URL(req.url, `http://${host}:${port}`);

  if (requestUrl.pathname === liveReloadPath) {
    serveLiveReload(req, res);
    return;
  }

  if (requestUrl.pathname === '/api/employees') {
    await serveEmployees(requestUrl, res);
    return;
  }

  const resolvedPath = resolveRequestPath(req.url);

  if (!resolvedPath) {
    send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const stats = await fs.stat(resolvedPath);
    const filePath = stats.isDirectory()
      ? path.join(resolvedPath, 'index.html')
      : resolvedPath;
    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes.get(extension) ?? 'application/octet-stream';
    const isHtml = extension === '.html';

    if (isHtml && req.method === 'GET') {
      const body = injectLiveReload(await fs.readFile(filePath, 'utf8'));

      send(res, 200, body, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': contentType,
      });
      return;
    }

    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': (await fs.stat(filePath)).size,
      'Content-Type': contentType,
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }

    console.error(error);
    send(res, 500, 'Internal server error', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}

createServer(serveFile).listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`Open http://localhost:${port}/`);
  if (liveReload) {
    watchDirectory(root);
    console.log('Live reload enabled. Set LIVE_RELOAD=0 to disable it.');
  }
});
