// Lunahub 论坛后端：静态托管 + 账户/话题/嵌套回复/点赞/管理员 API（Node 内置模块，零依赖）
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const WS_PATH = '/ws/go';
const WS = require('ws');
const DATA = path.join(ROOT, 'data', 'forum.json');
const DATA_USERS = path.join(ROOT, 'data', 'users.json');
const DATA_GALLERY = path.join(ROOT, 'data', 'gallery.json');
const DATA_WP = path.join(ROOT, 'data', 'wallpapers.json');
const DATA_MEDIA = path.join(ROOT, 'data', 'media.json');
const AVATAR_DIR = path.join(ROOT, 'assets', 'avatars');
const WP_USER_DIR = path.join(ROOT, 'assets', 'wallpapers', 'user');
const PORT = process.env.PORT || 3000;
const SECRET = process.env.FORUM_SECRET || 'lunahub-xp-forum-secret-v1';

/* ---------- 预置头像（assets/avatars 下的 BMP） ---------- */
const PRESET_AVATARS = (() => {
  try { return fs.readdirSync(AVATAR_DIR).filter(f => /\.bmp$/i.test(f)).map(f => f.replace(/\.bmp$/i, '')).sort(); }
  catch (e) { return []; }
})();
function avatarUrl(a) {
  if (!a) return null;
  if (a.startsWith('preset:')) {
    const id = a.slice(7);
    return PRESET_AVATARS.includes(id) ? '/assets/avatars/' + id + '.bmp' : null;
  }
  if (/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(a)) return a;
  return null;
}

/* ---------- 画廊种子数据 ---------- */
const SEED_GALLERY = {
  items: [
    { id: 'g1', title: 'Luna Glass 原型', type: 'gradient', g1: '#0058e6', g2: '#5bc0ff' },
    { id: 'g2', title: 'Longhorn 概念', type: 'gradient', g1: '#7b4397', g2: '#dc2430' },
    { id: 'g3', title: 'Userbar 设计', type: 'gradient', g1: '#11998e', g2: '#38ef7d' },
    { id: 'g4', title: 'Y2K 收藏', type: 'gradient', g1: '#f7971e', g2: '#ffd200' }
  ]
};
function loadGallery() {
  let d;
  try { d = JSON.parse(fs.readFileSync(DATA_GALLERY, 'utf8')); }
  catch (e) { d = JSON.parse(JSON.stringify(SEED_GALLERY)); saveGallery(d); return d; }
  if (!d || !Array.isArray(d.items)) d = { items: SEED_GALLERY.items.slice() };
  return d;
}
function saveGallery(d) {
  fs.mkdirSync(path.dirname(DATA_GALLERY), { recursive: true });
  fs.writeFileSync(DATA_GALLERY, JSON.stringify(d, null, 2));
}
if (!fs.existsSync(DATA_GALLERY)) saveGallery(JSON.parse(JSON.stringify(SEED_GALLERY)));

/* ---------- 种子数据（首次启动写入，之后以文件为准） ---------- */
function nowMinus(ms) { return Date.now() - ms; }

const SEED_FORUM = {
  categories: ['公告与指南', '资源共享区', '反馈与帮助', 'UI 设计', 'Windows（系统美化）', '一般讨论'],
  announcements: [
    {
      id: 'a1',
      title: '欢迎来到 Lunahub 论坛',
      body: '这里是保存旧时代的一片净土。发帖请遵守社区规范，友善交流，拒绝广告与人身攻击。',
      author: '管理员',
      createdAt: nowMinus(86400000)
    }
  ],
  topics: [
    {
      id: 't1',
      title: '【美化镜像】Vision Vista 7 v1',
      author: 'Faye',
      category: '公告与指南',
      createdAt: nowMinus(86400000),
      body: '分享一个 Vista 风格美化镜像，包含窗口玻璃与任务栏材质，欢迎下载体验。',
      pinned: true,
      hidden: false,
      likes: ['小吉祥妮露', 'V1sta'],
      replies: [
        { id: 'r1', author: '小吉祥妮露', body: '太香了！已经装上，谢谢 Faye！', createdAt: nowMinus(80000000), likes: ['Faye'], children: [] },
        { id: 'r2', author: 'V1sta', body: '求一个 4K 版本～', createdAt: nowMinus(70000000), likes: [], children: [
          { id: 'r3', author: 'Faye', body: '已安排，评论区置了 4K 链接。', createdAt: nowMinus(65000000), likes: ['V1sta'], children: [] }
        ] }
      ]
    },
    {
      id: 't2',
      title: 'Longhorn Tools 资源免费下载！',
      author: '小吉祥妮露',
      category: '资源共享区',
      createdAt: nowMinus(43200000),
      body: '整理了 Longhorn 时期的工具合集，免费分享给大家，链接在评论区。',
      pinned: false,
      hidden: false,
      likes: [],
      replies: []
    },
    {
      id: 't3',
      title: '小白求助：IE11 兼容问题',
      author: '水清鱼安',
      category: '反馈与帮助',
      createdAt: nowMinus(21600000),
      body: '最近搞老网页，IE11 下样式错位，求指教。',
      pinned: false,
      hidden: false,
      likes: ['Gua.'],
      replies: [
        { id: 'r4', author: 'Gua.', body: '试试 X-UA-Compatible 指定文档模式，或加 viewport 兜底。', createdAt: nowMinus(20000000), likes: ['水清鱼安'], children: [] }
      ]
    },
    {
      id: 't4',
      title: 'KDE Plasma 6.7 复活 Oxygen 主题',
      author: 'V1sta',
      category: 'UI 设计',
      createdAt: nowMinus(10800000),
      body: 'Oxygen 回来了，怀旧党狂喜，截图见画廊。',
      pinned: false,
      hidden: false,
      likes: [],
      replies: []
    },
    {
      id: 't5',
      title: '用 CSS 复刻 Win98 窗口风格',
      author: 'Gua.',
      category: 'Windows（系统美化）',
      createdAt: nowMinus(3600000),
      body: '纯 CSS 手搓，附代码，欢迎拍砖。',
      pinned: false,
      hidden: false,
      likes: [],
      replies: []
    }
  ]
};

/* ---------- 文件读写 ---------- */
function loadForum() {
  let d;
  try { d = JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch (e) { d = JSON.parse(JSON.stringify(SEED_FORUM)); saveForum(d); return d; }
  // 字段归一化：兼容旧数据 / 损坏文件
  if (!d || typeof d !== 'object') d = {};
  if (!Array.isArray(d.topics)) d.topics = [];
  if (!Array.isArray(d.categories)) d.categories = SEED_FORUM.categories.slice();
  if (!Array.isArray(d.announcements)) d.announcements = SEED_FORUM.announcements.slice();
  d.topics.forEach(t => {
    if (!Array.isArray(t.replies)) t.replies = [];
    if (!Array.isArray(t.likes)) t.likes = [];
  });
  return d;
}
function saveForum(d) {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(d, null, 2));
}
if (!fs.existsSync(DATA)) saveForum(JSON.parse(JSON.stringify(SEED_FORUM)));

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(DATA_USERS, 'utf8')); }
  catch (e) { return { users: [] }; }
}
function saveUsers(d) {
  fs.mkdirSync(path.dirname(DATA_USERS), { recursive: true });
  fs.writeFileSync(DATA_USERS, JSON.stringify(d, null, 2));
}
if (!fs.existsSync(DATA_USERS)) saveUsers({ users: [] });

// 首次启动确保存在一个管理员账号（admin / admin123）
(function ensureAdmin() {
  const d = loadUsers();
  if (!d.users.some(u => u.role === 'admin')) {
    const salt = crypto.randomBytes(8).toString('hex');
    d.users.push({ user: 'admin', salt, pass: hashPass('admin123', salt), role: 'admin', createdAt: Date.now() });
    saveUsers(d);
  }
})();

function hashPass(pass, salt) {
  return crypto.createHash('sha256').update(pass + ':' + salt).digest('hex');
}

/* ---------- Token（HMAC 签名，零依赖） ---------- */
function makeToken(user, role) {
  const payload = Buffer.from(JSON.stringify({ user, role, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function verifyToken(tok) {
  if (!tok) return null;
  const parts = String(tok).split('.');
  if (parts.length !== 2) return null;
  const [p, s] = parts;
  const sig = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  if (sig !== s) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (!o.exp || o.exp < Date.now()) return null;
    return o;
  } catch (e) { return null; }
}

/* ---------- 辅助 ---------- */
function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    let size = 0;
    req.on('data', c => { chunks.push(c); size += c.length; if (size > 68e6) { req.destroy(); resolve({}); return; } });
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      try { resolve(JSON.parse(s || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}
function getAuth(req) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/);
  return m ? verifyToken(m[1]) : null;
}
function countReplies(replies) {
  let n = 0;
  (replies || []).forEach(r => { n += 1 + countReplies(r.children); });
  return n;
}
function findReply(replies, id) {
  for (const r of (replies || [])) {
    if (r.id === id) return r;
    const f = findReply(r.children, id);
    if (f) return f;
  }
  return null;
}
function topicSummary(t, me) {
  return {
    id: t.id, title: t.title, author: t.author, category: t.category,
    createdAt: t.createdAt, pinned: !!t.pinned, hidden: !!t.hidden,
    likeCount: (t.likes || []).length,
    likedByMe: me ? (t.likes || []).includes(me) : false,
    replyCount: countReplies(t.replies)
  };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.flac': 'audio/flac',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.mov': 'video/quicktime'
};

function serveStatic(p, res, req) {
  let rel = decodeURIComponent(p);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep) && !file.startsWith(ROOT + '/')) {
    res.writeHead(403); return res.end('forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(file).toLowerCase();
    const ctype = TYPES[ext] || 'application/octet-stream';
    // Range 请求支持（音频拖动进度条必需）
    const range = req && req.headers.range;
    const m = range && range.match(/^bytes=(\d*)-(\d*)$/);
    if (m && (m[1] !== '' || m[2] !== '')) {
      let start = m[1] === '' ? 0 : parseInt(m[1], 10);
      let end = m[2] === '' ? st.size - 1 : parseInt(m[2], 10);
      if (m[1] === '' && m[2] !== '') { start = Math.max(0, st.size - parseInt(m[2], 10)); end = st.size - 1; }
      if (isNaN(start) || isNaN(end) || start > end || start >= st.size) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size });
        return res.end();
      }
      end = Math.min(end, st.size - 1);
      res.writeHead(206, {
        'Content-Type': ctype,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      fs.createReadStream(file, { start, end }).on('error', () => { res.writeHead(500); res.end(); }).pipe(res);
      return;
    }
    res.writeHead(200, {
      'Content-Type': ctype,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(file).on('error', () => { res.writeHead(500); res.end(); }).pipe(res);
  });
}

/* ---------- 内置浏览器代理（绕过 X-Frame-Options 限制） ---------- */
const PROXY_UA = 'Mozilla/5.0 (Windows XP; LunahubIE/6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const PRIVATE_HOST = /^(localhost$|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$|0\.0\.0\.0$)/i;

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function proxyBlocked(u2) {
  if (!/^https?:$/.test(u2.protocol)) return true;
  return PRIVATE_HOST.test(u2.hostname);
}
function proxyError(res, msg, url) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': 'sandbox allow-popups',
    'Cache-Control': 'no-store'
  });
  res.end('<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:Tahoma,SimSun,sans-serif;background:#fff;padding:48px 24px;color:#333;text-align:center}' +
    'h2{color:#c00;font-size:15px;margin:0 0 10px}p{font-size:12px;color:#888;word-break:break-all;margin:4px 0}' +
    'a{color:#06c;font-size:12px}</style></head><body>' +
    '<h2>⚠️ ' + escHtml(msg) + '</h2>' +
    '<p>' + escHtml(url || '') + '</p>' +
    (url ? '<p style="margin-top:14px"><a href="' + escHtml(url) + '" target="_blank" rel="noopener">在新窗口中打开 ↗</a></p>' : '') +
    '</body></html>');
}
function decodeBuf(buf, contentType) {
  let charset = (String(contentType).match(/charset=([\w-]+)/i) || [])[1];
  if (!charset) {
    const head = buf.slice(0, 4096).toString('latin1');
    charset = (head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i) || [])[1];
  }
  charset = (charset || 'utf-8').toLowerCase();
  try { return new TextDecoder(charset).decode(buf); }
  catch (e) { return buf.toString('utf8'); }
}
function proxyWrap(u) { return '/api/proxy?url=' + encodeURIComponent(u); }
function rewriteHtml(html, baseUrl) {
  return html.replace(/\s(href|src|action|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, attr, _q, d1, d2) => {
    const val = d1 !== undefined ? d1 : d2;
    if (!val || /^(#|javascript:|mailto:|tel:|data:|about:|blob:)/i.test(val)) return m;
    let abs;
    try { abs = new URL(val, baseUrl).href; } catch (e) { return m; }
    if (!/^https?:$/i.test(new URL(abs).protocol)) return m;
    return ' ' + attr + '="' + proxyWrap(abs) + '"';
  });
}
function rewriteCss(css, baseUrl) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, _q, val) => {
    if (/^(data:|#)/i.test(val)) return m;
    let abs;
    try { abs = new URL(val, baseUrl).href; } catch (e) { return m; }
    if (!/^https?:$/i.test(new URL(abs).protocol)) return m;
    return 'url("' + proxyWrap(abs) + '")';
  });
}
function proxyFetch(target, res, depth) {
  let done = false;
  const fail = msg => { if (done) return; done = true; proxyError(res, msg, target); };
  if (!target) return fail('缺少 url 参数');
  let u2;
  try { u2 = new URL(target); } catch (e) { return fail('无效的网址'); }
  if (proxyBlocked(u2)) return fail('出于安全考虑，不允许代理访问本地 / 内网地址');
  if (depth > 5) return fail('重定向次数过多');
  const mod = u2.protocol === 'https:' ? https : http;
  const preq = mod.request({
    hostname: u2.hostname,
    port: u2.port || (u2.protocol === 'https:' ? 443 : 80),
    path: u2.pathname + u2.search,
    method: 'GET',
    headers: {
      'User-Agent': PROXY_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'identity',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    },
    timeout: 12000
  }, pres => {
    const code = pres.statusCode || 0;
    const loc = pres.headers.location;
    if ([301, 302, 303, 307, 308].includes(code) && loc) {
      pres.resume();
      let next;
      try { next = new URL(loc, u2).href; } catch (e) { return fail('重定向地址无效'); }
      return proxyFetch(next, res, depth + 1);
    }
    if (code >= 400) { pres.resume(); return fail('对方服务器返回 ' + code); }
    const ctype = String(pres.headers['content-type'] || 'application/octet-stream');
    const chunks = [];
    let size = 0;
    pres.on('data', c => {
      size += c.length;
      if (size > 8e6) { pres.destroy(); return fail('页面太大（超过 8MB）'); }
      chunks.push(c);
    });
    pres.on('error', () => fail('数据传输中断'));
    pres.on('end', () => {
      if (done) return;
      done = true;
      const buf = Buffer.concat(chunks);
      if (/text\/html|application\/xhtml/i.test(ctype)) {
        const html = rewriteHtml(decodeBuf(buf, ctype), u2.href);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': 'sandbox allow-scripts allow-forms allow-popups',
          'Cache-Control': 'no-store'
        });
        return res.end(html);
      }
      if (/text\/css/i.test(ctype)) {
        const css = rewriteCss(decodeBuf(buf, ctype), u2.href);
        res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(css);
      }
      res.writeHead(200, { 'Content-Type': ctype, 'Cache-Control': 'no-store' });
      res.end(buf);
    });
  });
  preq.on('timeout', () => { preq.destroy(); fail('连接超时'); });
  preq.on('error', () => fail('无法连接到服务器（网络错误或站点不可用）'));
  preq.end();
}

function avatarMap() {
  const m = {};
  loadUsers().users.forEach(u => { const url = avatarUrl(u.avatar); if (url) m[u.user] = url; });
  return m;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  const auth = getAuth(req);
  const isAdmin = auth && auth.role === 'admin';

  // === 账户 ===
  if (p === '/api/register' && req.method === 'POST') {
    const b = await readBody(req);
    const user = String(b.user || '').trim();
    const pass = String(b.pass || '');
    if (!/^[一-龥A-Za-z0-9_]{3,20}$/.test(user))
      return sendJSON(res, 400, { error: '用户名需 3-20 位（中文 / 字母 / 数字 / 下划线）' });
    if (pass.length < 6) return sendJSON(res, 400, { error: '密码至少 6 位' });
    const d = loadUsers();
    if (d.users.some(x => x.user.toLowerCase() === user.toLowerCase()))
      return sendJSON(res, 409, { error: '用户名已被占用' });
    const salt = crypto.randomBytes(8).toString('hex');
    d.users.push({ user, salt, pass: hashPass(pass, salt), role: 'user', createdAt: Date.now() });
    saveUsers(d);
    return sendJSON(res, 201, { ok: true, user, role: 'user', token: makeToken(user, 'user'), avatar: null });
  }

  if (p === '/api/login' && req.method === 'POST') {
    const b = await readBody(req);
    const user = String(b.user || '').trim();
    const pass = String(b.pass || '');
    const d = loadUsers();
    const rec = d.users.find(x => x.user.toLowerCase() === user.toLowerCase());
    if (!rec || rec.pass !== hashPass(pass, rec.salt))
      return sendJSON(res, 401, { error: '用户名或密码错误' });
    return sendJSON(res, 200, { ok: true, user: rec.user, role: rec.role, token: makeToken(rec.user, rec.role), avatar: avatarUrl(rec.avatar) });
  }

  if (p === '/api/me' && req.method === 'GET') {
    if (!auth) return sendJSON(res, 401, { error: '未登录' });
    const rec = loadUsers().users.find(x => x.user.toLowerCase() === auth.user.toLowerCase());
    return sendJSON(res, 200, { ok: true, user: auth.user, role: auth.role, avatar: avatarUrl(rec && rec.avatar) });
  }

  // === 头像列表 / 修改自己的头像 ===
  if (p === '/api/avatars' && req.method === 'GET') {
    return sendJSON(res, 200, { avatars: PRESET_AVATARS });
  }
  if (p === '/api/me/avatar' && req.method === 'POST') {
    if (!auth) return sendJSON(res, 401, { error: '请先登录' });
    const b = await readBody(req);
    const a = String(b.avatar || '');
    if (a && !avatarUrl(a)) return sendJSON(res, 400, { error: '头像无效（仅支持预置头像或图片文件）' });
    if (a.startsWith('data:') && a.length > 400000) return sendJSON(res, 400, { error: '图片太大，请控制在 300KB 以内' });
    const d = loadUsers();
    const rec = d.users.find(x => x.user.toLowerCase() === auth.user.toLowerCase());
    if (!rec) return sendJSON(res, 404, { error: '用户不存在' });
    if (a) rec.avatar = a; else delete rec.avatar;
    saveUsers(d);
    return sendJSON(res, 200, { ok: true, avatar: avatarUrl(rec.avatar) });
  }

  // === 论坛只读 ===
  if (p === '/api/forum' && req.method === 'GET') {
    const d = loadForum();
    let topics = d.topics.slice();
    if (!isAdmin) topics = topics.filter(t => !t.hidden);
    topics.sort((a, b) => (b.pinned === a.pinned) ? (b.createdAt - a.createdAt) : (b.pinned ? 1 : -1));
    const me = auth ? auth.user : null;
    return sendJSON(res, 200, {
      me: auth ? { user: auth.user, role: auth.role } : null,
      categories: d.categories || [],
      announcements: d.announcements || [],
      avatars: avatarMap(),
      topics: topics.map(t => topicSummary(t, me))
    });
  }

  const mt = p.match(/^\/api\/topics\/([^/]+)$/);
  if (mt && req.method === 'GET') {
    const d = loadForum();
    const t = d.topics.find(x => x.id === mt[1]);
    if (!t) return sendJSON(res, 404, { error: 'not found' });
    if (t.hidden && !isAdmin) return sendJSON(res, 404, { error: 'not found' });
    const me = auth ? auth.user : null;
    return sendJSON(res, 200, { topic: { ...t, likedByMe: me ? (t.likes || []).includes(me) : false }, avatars: avatarMap() });
  }

  // 发新话题（需登录）
  if (p === '/api/topics' && req.method === 'POST') {
    if (!auth) return sendJSON(res, 401, { error: '请先登录' });
    const b = await readBody(req);
    const title = String(b.title || '').trim();
    if (!title) return sendJSON(res, 400, { error: '标题不能为空' });
    const d = loadForum();
    let cat = String(b.category || '').trim() || '一般讨论';
    if (!d.categories.includes(cat)) d.categories.push(cat);
    const t = {
      id: 't' + Date.now(),
      title: title.slice(0, 120),
      author: auth.user,
      category: cat,
      body: String(b.body || '').slice(0, 8000),
      createdAt: Date.now(),
      pinned: false, hidden: false,
      likes: [], replies: []
    };
    d.topics.unshift(t); saveForum(d);
    return sendJSON(res, 201, { topic: topicSummary(t, auth.user) });
  }

  // 回复话题（嵌套，需登录）
  const mr = p.match(/^\/api\/topics\/([^/]+)\/replies$/);
  if (mr && req.method === 'POST') {
    if (!auth) return sendJSON(res, 401, { error: '请先登录' });
    const b = await readBody(req);
    const body = String(b.body || '').trim();
    if (!body) return sendJSON(res, 400, { error: '回复内容不能为空' });
    const d = loadForum();
    const t = d.topics.find(x => x.id === mr[1]);
    if (!t || (t.hidden && !isAdmin)) return sendJSON(res, 404, { error: 'not found' });
    const reply = {
      id: 'r' + Date.now() + Math.floor(Math.random() * 1000),
      author: auth.user,
      body: body.slice(0, 5000),
      createdAt: Date.now(),
      likes: [], children: []
    };
    const parentId = String(b.parentId || '');
    if (parentId) {
      const parent = findReply(t.replies, parentId);
      if (parent) parent.children.push(reply);
      else t.replies.push(reply);
    } else {
      t.replies.push(reply);
    }
    saveForum(d);
    return sendJSON(res, 201, { reply });
  }

  // 给话题点赞（需登录）
  const mlk = p.match(/^\/api\/topics\/([^/]+)\/like$/);
  if (mlk && req.method === 'POST') {
    if (!auth) return sendJSON(res, 401, { error: '请先登录' });
    const d = loadForum();
    const t = d.topics.find(x => x.id === mlk[1]);
    if (!t) return sendJSON(res, 404, { error: 'not found' });
    t.likes = t.likes || [];
    const i = t.likes.indexOf(auth.user);
    if (i >= 0) t.likes.splice(i, 1); else t.likes.push(auth.user);
    saveForum(d);
    return sendJSON(res, 200, { likes: t.likes, liked: t.likes.includes(auth.user) });
  }

  // 给回复点赞（需登录）
  const mlr = p.match(/^\/api\/replies\/([^/]+)\/like$/);
  if (mlr && req.method === 'POST') {
    if (!auth) return sendJSON(res, 401, { error: '请先登录' });
    const d = loadForum();
    let found = null;
    for (const t of d.topics) { const r = findReply(t.replies, mlr[1]); if (r) { found = r; break; } }
    if (!found) return sendJSON(res, 404, { error: 'not found' });
    found.likes = found.likes || [];
    const i = found.likes.indexOf(auth.user);
    if (i >= 0) found.likes.splice(i, 1); else found.likes.push(auth.user);
    saveForum(d);
    return sendJSON(res, 200, { likes: found.likes, liked: found.likes.includes(auth.user) });
  }

  // === 管理员 ===
  if (p === '/api/admin/users' && req.method === 'GET') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const d = loadUsers();
    return sendJSON(res, 200, { users: d.users.map(u => ({ user: u.user, role: u.role, createdAt: u.createdAt })) });
  }
  const mur = p.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
  if (mur && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const target = decodeURIComponent(mur[1]);
    const role = String(b.role || '');
    if (!['admin', 'user'].includes(role)) return sendJSON(res, 400, { error: '角色无效' });
    const d = loadUsers();
    const rec = d.users.find(x => x.user.toLowerCase() === target.toLowerCase());
    if (!rec) return sendJSON(res, 404, { error: '用户不存在' });
    rec.role = role; saveUsers(d);
    return sendJSON(res, 200, { ok: true, user: rec.user, role });
  }
  const mud = p.match(/^\/api\/admin\/users\/([^/]+)\/delete$/);
  if (mud && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const target = decodeURIComponent(mud[1]);
    if (auth.user.toLowerCase() === target.toLowerCase())
      return sendJSON(res, 400, { error: '不能删除自己' });
    const d = loadUsers();
    const before = d.users.length;
    d.users = d.users.filter(x => x.user.toLowerCase() !== target.toLowerCase());
    if (d.users.length === before) return sendJSON(res, 404, { error: '用户不存在' });
    saveUsers(d);
    return sendJSON(res, 200, { ok: true, user: target });
  }
  const mup = p.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
  if (mup && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const pass = String(b.pass || '');
    if (pass.length < 6) return sendJSON(res, 400, { error: '新密码至少 6 位' });
    const target = decodeURIComponent(mup[1]);
    const d = loadUsers();
    const rec = d.users.find(x => x.user.toLowerCase() === target.toLowerCase());
    if (!rec) return sendJSON(res, 404, { error: '用户不存在' });
    rec.salt = crypto.randomBytes(8).toString('hex');
    rec.pass = hashPass(pass, rec.salt);
    saveUsers(d);
    return sendJSON(res, 200, { ok: true, user: rec.user });
  }

  const mtp = p.match(/^\/api\/admin\/topics\/([^/]+)\/pin$/);
  if (mtp && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const d = loadForum();
    const t = d.topics.find(x => x.id === mtp[1]);
    if (!t) return sendJSON(res, 404, { error: 'not found' });
    t.pinned = !!(b.pinned === undefined ? !t.pinned : b.pinned);
    saveForum(d);
    return sendJSON(res, 200, { ok: true, id: t.id, pinned: t.pinned });
  }
  const mth = p.match(/^\/api\/admin\/topics\/([^/]+)\/hide$/);
  if (mth && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const d = loadForum();
    const t = d.topics.find(x => x.id === mth[1]);
    if (!t) return sendJSON(res, 404, { error: 'not found' });
    t.hidden = !!(b.hidden === undefined ? !t.hidden : b.hidden);
    saveForum(d);
    return sendJSON(res, 200, { ok: true, id: t.id, hidden: t.hidden });
  }
  const mtd = p.match(/^\/api\/admin\/topics\/([^/]+)\/delete$/);
  if (mtd && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const d = loadForum();
    const before = d.topics.length;
    d.topics = d.topics.filter(t => t.id !== mtd[1]);
    if (d.topics.length === before) return sendJSON(res, 404, { error: '话题不存在' });
    saveForum(d);
    return sendJSON(res, 200, { ok: true, id: mtd[1] });
  }
  const mcd = p.match(/^\/api\/admin\/categories\/([^/]+)\/delete$/);
  if (mcd && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const cat = decodeURIComponent(mcd[1]);
    const d = loadForum();
    const before = d.categories.length;
    d.categories = d.categories.filter(c => c !== cat);
    if (d.categories.length === before) return sendJSON(res, 404, { error: '板块不存在' });
    saveForum(d);
    return sendJSON(res, 200, { ok: true, category: cat });
  }
  if (p === '/api/announcements' && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const title = String(b.title || '').trim();
    if (!title) return sendJSON(res, 400, { error: '公告标题不能为空' });
    const d = loadForum();
    d.announcements = d.announcements || [];
    d.announcements.unshift({
      id: 'a' + Date.now(),
      title: title.slice(0, 120),
      body: String(b.body || '').slice(0, 4000),
      author: auth.user,
      createdAt: Date.now()
    });
    saveForum(d);
    return sendJSON(res, 201, { ok: true, announcement: d.announcements[0] });
  }
  const mad = p.match(/^\/api\/announcements\/([^/]+)\/delete$/);
  if (mad && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const d = loadForum();
    const before = (d.announcements || []).length;
    d.announcements = (d.announcements || []).filter(a => a.id !== mad[1]);
    if ((d.announcements || []).length === before) return sendJSON(res, 404, { error: '公告不存在' });
    saveForum(d);
    return sendJSON(res, 200, { ok: true, id: mad[1] });
  }

  // === 画廊（管理员可编辑） ===
  if (p === '/api/gallery' && req.method === 'GET') {
    return sendJSON(res, 200, { items: loadGallery().items });
  }
  function validGalleryItem(b) {
    const title = String(b.title || '').trim();
    if (!title) return { error: '标题不能为空' };
    const type = b.type === 'image' ? 'image' : 'gradient';
    if (type === 'gradient') {
      const g1 = String(b.g1 || '').trim(), g2 = String(b.g2 || '').trim();
      if (!/^#[0-9a-f]{3,8}$/i.test(g1) || !/^#[0-9a-f]{3,8}$/i.test(g2)) return { error: '渐变颜色格式无效' };
      return { item: { title: title.slice(0, 60), type, g1, g2 } };
    }
    const image = String(b.image || '').trim();
    if (!image) return { error: '图片地址不能为空' };
    if (!/^(https?:\/\/|\/|data:image\/(png|jpe?g|gif|webp|bmp);base64,)/i.test(image)) return { error: '仅支持图片 URL 或上传的图片文件' };
    if (image.startsWith('data:') && image.length > 400000) return { error: '图片太大，请控制在 300KB 以内' };
    return { item: { title: title.slice(0, 60), type, image } };
  }
  if (p === '/api/admin/gallery' && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const v = validGalleryItem(b);
    if (v.error) return sendJSON(res, 400, { error: v.error });
    const d = loadGallery();
    const item = { id: 'g' + Date.now() + Math.floor(Math.random() * 1000), createdAt: Date.now(), ...v.item };
    d.items.push(item); saveGallery(d);
    return sendJSON(res, 201, { ok: true, item });
  }
  const mgd = p.match(/^\/api\/admin\/gallery\/([^/]+)\/delete$/);
  if (mgd && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const d = loadGallery();
    const before = d.items.length;
    d.items = d.items.filter(x => x.id !== mgd[1]);
    if (d.items.length === before) return sendJSON(res, 404, { error: '作品不存在' });
    saveGallery(d);
    return sendJSON(res, 200, { ok: true });
  }
  const mgu = p.match(/^\/api\/admin\/gallery\/([^/]+)$/);
  if (mgu && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const v = validGalleryItem(b);
    if (v.error) return sendJSON(res, 400, { error: v.error });
    const d = loadGallery();
    const item = d.items.find(x => x.id === mgu[1]);
    if (!item) return sendJSON(res, 404, { error: '作品不存在' });
    Object.assign(item, v.item);
    saveGallery(d);
    return sendJSON(res, 200, { ok: true, item });
  }

  // === 壁纸（用户上传 / 管理员删除） ===
  function loadWp() {
    try { return JSON.parse(fs.readFileSync(DATA_WP, 'utf8')); }
    catch (e) { return { uploaded: [] }; }
  }
  function saveWp(d) {
    fs.mkdirSync(path.dirname(DATA_WP), { recursive: true });
    fs.writeFileSync(DATA_WP, JSON.stringify(d, null, 2));
  }
  if (!fs.existsSync(DATA_WP)) saveWp({ uploaded: [] });
  // 启动时确保 user 目录存在
  try { fs.mkdirSync(WP_USER_DIR, { recursive: true }); } catch (e) {}
  // 启动时清理悬挂文件：list 不存在的物理文件直接删记录
  (function gcWpFiles() {
    const d = loadWp();
    const keep = d.uploaded.filter(it => {
      try { fs.accessSync(path.join(WP_USER_DIR, it.file)); return true; }
      catch (e) { return false; }
    });
    if (keep.length !== d.uploaded.length) { d.uploaded = keep; saveWp(d); }
  })();

  if (p === '/api/wallpapers' && req.method === 'GET') {
    return sendJSON(res, 200, { uploaded: loadWp().uploaded || [] });
  }
  if (p === '/api/wallpapers' && req.method === 'POST') {
    if (!auth) return sendJSON(res, 401, { error: '请先登录后再上传壁纸' });
    const b = await readBody(req);
    const data = String(b.data || '');
    const m = data.match(/^data:(image\/(png|jpe?g|gif|webp|bmp));base64,([A-Za-z0-9+/=]+)$/i);
    if (!m) return sendJSON(res, 400, { error: '仅支持 PNG/JPG/GIF/WebP/BMP 图片' });
    const mime = m[1].toLowerCase();
    const b64 = m[3];
    // 估算字节：base64 长度 * 3/4 - padding
    const approx = Math.floor(b64.length * 0.75);
    if (approx > 5 * 1024 * 1024) return sendJSON(res, 400, { error: '图片超过 5MB，请压缩后再上传' });
    const ext = ({ 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/bmp': 'bmp' })[mime] || 'jpg';
    const id = crypto.randomBytes(8).toString('hex');
    const file = id + '.' + ext;
    const buf = Buffer.from(b64, 'base64');
    try {
      fs.mkdirSync(WP_USER_DIR, { recursive: true });
      fs.writeFileSync(path.join(WP_USER_DIR, file), buf);
    } catch (e) { return sendJSON(res, 500, { error: '保存失败：' + e.message }); }
    const name = String(b.name || '未命名壁纸').trim().slice(0, 40) || '未命名壁纸';
    const item = { id, file, name, uploader: auth.user, createdAt: Date.now() };
    const d = loadWp();
    d.uploaded.push(item);
    saveWp(d);
    return sendJSON(res, 201, { ok: true, item });
  }
  const mwd = p.match(/^\/api\/admin\/wallpapers\/([^/]+)\/delete$/);
  if (mwd && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const d = loadWp();
    const before = d.uploaded.length;
    const target = d.uploaded.find(x => x.id === mwd[1]);
    d.uploaded = d.uploaded.filter(x => x.id !== mwd[1]);
    if (d.uploaded.length === before) return sendJSON(res, 404, { error: '壁纸不存在' });
    saveWp(d);
    if (target) { try { fs.unlinkSync(path.join(WP_USER_DIR, target.file)); } catch (e) {} }
    return sendJSON(res, 200, { ok: true });
  }

  // === 媒体库（音乐 + 视频 / 管理员增删改隐） ===
  const ASSETS_DIR = path.join(ROOT, 'assets');
  const MEDIA_UPLOAD_DIR = path.join(ASSETS_DIR, 'media');
  const SEED_MEDIA = [
    { id: 'm-welcome',  type: 'music', file: 'music/welcome.mp3',        name: 'Windows 欢迎音乐',   artist: 'Microsoft', builtin: true },
    { id: 'm-flourish', type: 'music', file: 'music/flourish.mp3',       name: 'Flourish',           artist: 'Microsoft 示例音乐', builtin: true },
    { id: 'm-onestop',  type: 'music', file: 'music/onestop.mp3',        name: 'Onestop',            artist: 'Microsoft 示例音乐', builtin: true },
    { id: 'm-town',     type: 'music', file: 'music/town.mp3',           name: 'Town',               artist: 'Microsoft 示例音乐', builtin: true },
    { id: 'm-dusk',     type: 'music', file: 'music/黄昏-周传雄.mp3',    name: '黄昏',               artist: '周传雄', builtin: true },
    { id: 'm-ten',      type: 'music', file: 'music/十年-陈奕迅.mp3',    name: '十年',               artist: '陈奕迅', builtin: true },
    { id: 'v-winme',    type: 'video', file: 'videos/winme.mp4',         name: 'Windows Me',         artist: '', builtin: true },
    { id: 'v-clip',     type: 'video', file: 'videos/clip-74615908.mp4', name: '视频片段',           artist: '', builtin: true }
  ];
  function mediaFileOk(f) {
    return typeof f === 'string' && !f.includes('..') && !path.isAbsolute(f);
  }
  function mediaFileExists(it) {
    try { fs.accessSync(path.join(ASSETS_DIR, it.file)); return true; } catch (e) { return false; }
  }
  function loadMedia() {
    try { return JSON.parse(fs.readFileSync(DATA_MEDIA, 'utf8')); }
    catch (e) { return { items: [] }; }
  }
  function saveMedia(d) {
    fs.mkdirSync(path.dirname(DATA_MEDIA), { recursive: true });
    fs.writeFileSync(DATA_MEDIA, JSON.stringify(d, null, 2));
  }
  try { fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true }); } catch (e) {}
  (function seedMedia() {
    let d;
    try { d = JSON.parse(fs.readFileSync(DATA_MEDIA, 'utf8')); }
    catch (e) { d = { items: [] }; }
    let changed = false;
    // 补种：物理文件存在但没有记录的内置条目
    SEED_MEDIA.forEach(s => {
      if (!d.items.some(x => x.id === s.id) && mediaFileExists(s)) { d.items.push(Object.assign({ hidden: false, uploader: 'system', createdAt: 0 }, s)); changed = true; }
    });
    // GC：记录在但物理文件丢失 → 删记录（上传项直接删；内置项保留 hidden 标记，等文件回来）——统一删，seed 会在文件回来时补
    const keep = d.items.filter(it => it.builtin || mediaFileExists(it));
    if (keep.length !== d.items.length) { d.items = keep; changed = true; }
    if (changed || !fs.existsSync(DATA_MEDIA)) saveMedia(d);
  })();

  if (p === '/api/media' && req.method === 'GET') {
    const items = loadMedia().items
      .filter(it => isAdmin || !it.hidden)
      .map(it => ({ id: it.id, type: it.type, file: it.file, name: it.name, artist: it.artist || '', hidden: !!it.hidden, builtin: !!it.builtin }));
    return sendJSON(res, 200, { items });
  }
  const MEDIA_MIMES = {
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
    'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/x-matroska': 'mkv'
  };
  if (p === '/api/admin/media' && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const data = String(b.data || '');
    const m = data.match(/^data:([a-z0-9\/+.-]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (!m) return sendJSON(res, 400, { error: '仅支持 base64 dataURL 上传' });
    const mime = m[1].toLowerCase();
    const ext = MEDIA_MIMES[mime];
    if (!ext) {
      if (mime === 'audio/x-ms-wma' || mime === 'video/x-ms-wmv' || /\.wma$|\.wmv$/i.test(String(b.name || '')))
        return sendJSON(res, 400, { error: '浏览器不支持 WMA/WMV，请先转换成 MP3/MP4 再上传' });
      return sendJSON(res, 400, { error: '不支持的媒体格式：' + mime });
    }
    const b64 = m[2];
    const approx = Math.floor(b64.length * 0.75);
    if (approx > 50 * 1024 * 1024) return sendJSON(res, 400, { error: '文件超过 50MB 上限' });
    let type = (b.type === 'video' || /^video\//.test(mime)) ? 'video' : 'music';
    const name = String(b.name || '未命名').trim().slice(0, 60) || '未命名';
    const artist = String(b.artist || '').trim().slice(0, 40);
    const id = 'u-' + crypto.randomBytes(8).toString('hex');
    const file = 'media/' + id + '.' + ext;
    try {
      fs.mkdirSync(MEDIA_UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(ASSETS_DIR, file), Buffer.from(b64, 'base64'));
    } catch (e) { return sendJSON(res, 500, { error: '保存失败：' + e.message }); }
    const item = { id, type, file, name, artist, hidden: false, builtin: false, uploader: auth.user, createdAt: Date.now() };
    const d = loadMedia();
    d.items.push(item);
    saveMedia(d);
    return sendJSON(res, 201, { ok: true, item: { id: item.id, type: item.type, file: item.file, name: item.name, artist: item.artist, hidden: false, builtin: false } });
  }
  const mMediaHide = p.match(/^\/api\/admin\/media\/([^/]+)\/hide$/);
  if (mMediaHide && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const d = loadMedia();
    const it = d.items.find(x => x.id === mMediaHide[1]);
    if (!it) return sendJSON(res, 404, { error: '媒体不存在' });
    it.hidden = b.hidden !== undefined ? !!b.hidden : !it.hidden;
    saveMedia(d);
    return sendJSON(res, 200, { ok: true, id: it.id, hidden: it.hidden });
  }
  const mMediaDel = p.match(/^\/api\/admin\/media\/([^/]+)\/delete$/);
  if (mMediaDel && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const d = loadMedia();
    const it = d.items.find(x => x.id === mMediaDel[1]);
    if (!it) return sendJSON(res, 404, { error: '媒体不存在' });
    if (!mediaFileOk(it.file)) return sendJSON(res, 400, { error: '非法文件路径' });
    d.items = d.items.filter(x => x.id !== mMediaDel[1]);
    saveMedia(d);
    try { fs.unlinkSync(path.join(ASSETS_DIR, it.file)); } catch (e) {}
    return sendJSON(res, 200, { ok: true });
  }

  // === 系统音效（开机 / 关机，管理员配置） ===
  const SOUNDS_DIR = path.join(ASSETS_DIR, 'media', 'sounds');
  const DATA_SOUNDS = path.join(ROOT, 'data', 'sounds.json');
  const SOUND_MIMES = {
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
    'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac'
  };
  function loadSounds() {
    try { return JSON.parse(fs.readFileSync(DATA_SOUNDS, 'utf8')); }
    catch (e) { return { boot: null, shutdown: null }; }
  }
  function saveSounds(d) {
    fs.mkdirSync(path.dirname(DATA_SOUNDS), { recursive: true });
    fs.writeFileSync(DATA_SOUNDS, JSON.stringify(d, null, 2));
  }
  try { fs.mkdirSync(SOUNDS_DIR, { recursive: true }); } catch (e) {}
  if (!fs.existsSync(DATA_SOUNDS)) saveSounds({ boot: null, shutdown: null });

  if (p === '/api/sounds' && req.method === 'GET') {
    const s = loadSounds();
    return sendJSON(res, 200, {
      boot: s.boot ? '/assets/media/sounds/' + s.boot : null,
      shutdown: s.shutdown ? '/assets/media/sounds/' + s.shutdown : null
    });
  }
  if (p === '/api/admin/sound' && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const b = await readBody(req);
    const slot = b.slot === 'shutdown' ? 'shutdown' : 'boot';
    const data = String(b.data || '');
    const m = data.match(/^data:([a-z0-9\/+.-]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (!m) return sendJSON(res, 400, { error: '仅支持 base64 dataURL 上传' });
    const mime = m[1].toLowerCase();
    const ext = SOUND_MIMES[mime];
    if (!ext) return sendJSON(res, 400, { error: '不支持的音频格式：' + mime });
    const approx = Math.floor(m[2].length * 0.75);
    if (approx > 5 * 1024 * 1024) return sendJSON(res, 400, { error: '音效文件超过 5MB' });
    const file = slot + '.' + ext;
    try { fs.mkdirSync(SOUNDS_DIR, { recursive: true }); fs.writeFileSync(path.join(SOUNDS_DIR, file), Buffer.from(m[2], 'base64')); }
    catch (e) { return sendJSON(res, 500, { error: '保存失败：' + e.message }); }
    const d = loadSounds();
    // 切换格式时清理旧文件
    if (d[slot] && d[slot] !== file) { try { fs.unlinkSync(path.join(SOUNDS_DIR, d[slot])); } catch (e) {} }
    d[slot] = file; saveSounds(d);
    return sendJSON(res, 200, { ok: true, slot, url: '/assets/media/sounds/' + file });
  }
  const msd = p.match(/^\/api\/admin\/sound\/([^/]+)\/delete$/);
  if (msd && req.method === 'POST') {
    if (!isAdmin) return sendJSON(res, 403, { error: '需要管理员权限' });
    const slot = msd[1] === 'shutdown' ? 'shutdown' : 'boot';
    const d = loadSounds();
    if (d[slot]) { try { fs.unlinkSync(path.join(SOUNDS_DIR, d[slot])); } catch (e) {} d[slot] = null; saveSounds(d); }
    return sendJSON(res, 200, { ok: true, slot });
  }

  // === 内置浏览器代理 ===
  if (p === '/api/proxy' && req.method === 'GET') {
    return proxyFetch(u.searchParams.get('url'), res, 0);
  }

  if (p.startsWith('/api/')) return sendJSON(res, 404, { error: 'not found' });

  // === 静态文件 ===
  serveStatic(p, res, req);
});

server.listen(PORT, () => {
  console.log('Lunahub 论坛已启动： http://localhost:' + PORT);
});

/* ---------- 围棋联机（WebSocket，复用 3000 端口） ---------- */
const wss = new WS.Server({ server, path: WS_PATH });
const rooms = new Map(); // code -> { board, turn, players: [ws1, ws2], seq }

function genCode() {
  let c;
  do { c = Math.random().toString(36).slice(2, 7).toUpperCase(); } while (rooms.has(c));
  return c;
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.type === 'create') {
      const code = genCode();
      rooms.set(code, { board: Array(19 * 19).fill(0), turn: 1, players: [ws], seq: 0 });
      ws.room = code; ws.color = 1;
      ws.send(JSON.stringify({ type: 'created', code, color: 1 }));
    } else if (m.type === 'join') {
      const r = rooms.get(String(m.code || '').toUpperCase());
      if (!r) { ws.send(JSON.stringify({ type: 'error', msg: '房间不存在' })); return; }
      if (r.players.length >= 2) { ws.send(JSON.stringify({ type: 'error', msg: '房间已满' })); return; }
      r.players.push(ws); ws.room = String(m.code).toUpperCase(); ws.color = 2;
      ws.send(JSON.stringify({ type: 'joined', code: String(m.code).toUpperCase(), color: 2, board: r.board, turn: r.turn }));
      r.players[0].send(JSON.stringify({ type: 'start' }));
    } else if (m.type === 'move') {
      const r = ws.room && rooms.get(ws.room);
      if (!r) return;
      const i = m.i;
      if (!Number.isInteger(i) || i < 0 || i >= 19 * 19) return;
      if (r.turn !== ws.color) return;          // 只能走自己的颜色
      if (r.board[i] !== 0) return;            // 已有子
      r.board[i] = ws.color;
      r.turn = ws.color === 1 ? 2 : 1;
      r.seq++;
      const payload = JSON.stringify({ type: 'move', i, color: ws.color, turn: r.turn, seq: r.seq });
      r.players.forEach(p => { if (p.readyState === WS.OPEN) p.send(payload); });
    } else if (m.type === 'reset') {
      const r = ws.room && rooms.get(ws.room);
      if (!r) return;
      r.board = Array( 19 * 19).fill(0); r.turn = 1; r.seq++;
      const payload = JSON.stringify({ type: 'reset', turn: 1, seq: r.seq });
      r.players.forEach(p => { if (p.readyState === WS.OPEN) p.send(payload); });
    } else if (m.type === 'leave') {
      const r = ws.room && rooms.get(ws.room);
      if (r) {
        const payload = JSON.stringify({ type: 'opponentLeft' });
        r.players.forEach(p => { if (p !== ws && p.readyState === WS.OPEN) p.send(payload); });
        rooms.delete(ws.room);
      }
    }
  });
  ws.on('close', () => {
    const r = ws.room && rooms.get(ws.room);
    if (r) {
      const payload = JSON.stringify({ type: 'opponentLeft' });
      r.players.forEach(p => { if (p !== ws && p.readyState === WS.OPEN) p.send(payload); });
      rooms.delete(ws.room);
    }
  });
});

// 心跳清理
const wsTimer = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30000);
wss.on('close', () => clearInterval(wsTimer));
