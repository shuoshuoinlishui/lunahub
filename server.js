// Lunahub 论坛后端：静态托管 + 账户/话题/嵌套回复/点赞/管理员 API（Node 内置模块，零依赖）
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'data', 'forum.json');
const DATA_USERS = path.join(ROOT, 'data', 'users.json');
const PORT = process.env.PORT || 3000;
const SECRET = process.env.FORUM_SECRET || 'lunahub-xp-forum-secret-v1';

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
    req.on('data', c => { chunks.push(c); size += c.length; if (size > 2e6) req.destroy(); });
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      try { resolve(JSON.parse(s || '{}')); } catch (e) { resolve({}); }
    });
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
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function serveStatic(p, res) {
  let rel = decodeURIComponent(p);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep) && !file.startsWith(ROOT + '/')) {
    res.writeHead(403); return res.end('forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
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
    return sendJSON(res, 201, { ok: true, user, role: 'user', token: makeToken(user, 'user') });
  }

  if (p === '/api/login' && req.method === 'POST') {
    const b = await readBody(req);
    const user = String(b.user || '').trim();
    const pass = String(b.pass || '');
    const d = loadUsers();
    const rec = d.users.find(x => x.user.toLowerCase() === user.toLowerCase());
    if (!rec || rec.pass !== hashPass(pass, rec.salt))
      return sendJSON(res, 401, { error: '用户名或密码错误' });
    return sendJSON(res, 200, { ok: true, user: rec.user, role: rec.role, token: makeToken(rec.user, rec.role) });
  }

  if (p === '/api/me' && req.method === 'GET') {
    if (!auth) return sendJSON(res, 401, { error: '未登录' });
    return sendJSON(res, 200, { ok: true, user: auth.user, role: auth.role });
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
    return sendJSON(res, 200, { topic: { ...t, likedByMe: me ? (t.likes || []).includes(me) : false } });
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
  const mud = p.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (mud && req.method === 'POST' && /delete/.test(p)) {
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

  if (p.startsWith('/api/')) return sendJSON(res, 404, { error: 'not found' });

  // === 静态文件 ===
  serveStatic(p, res);
});

server.listen(PORT, () => {
  console.log('Lunahub 论坛已启动： http://localhost:' + PORT);
});
