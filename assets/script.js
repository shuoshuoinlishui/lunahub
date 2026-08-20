// ===== Lunahub · 网页版 Windows XP 窗口管理器 =====
(function () {
  'use strict';

  const desktop = document.getElementById('desktop');
  const running = document.getElementById('running');
  const taskbarH = 32;
  let zTop = 50;
  let cascade = 0;

  const APPS = {
    home:    { icon: '🖥️', title: '我的电脑' },
    forums:  { icon: '📂', title: '论坛分区' },
    topics:  { icon: '💬', title: '论坛' },
    chat:    { icon: '🗨️', title: '在线聊天室' },
    gallery: { icon: '🖼️', title: '画廊精选' },
    donate:  { icon: '💝', title: '捐赠支持' },
    about:   { icon: '🛖', title: '关于 Lunahub' },
    browser: { icon: '🌐', title: 'Internet Explorer' },
    notepad: { icon: '📝', title: '记事本' },
    mines:   { icon: '💣', title: '扫雷' },
    music:   { icon: '🎵', title: 'Luna媒体播放器' },
    photos:  { icon: '📷', title: 'Luna照片查看器' },
    paint:   { icon: '🎨', title: 'Luna画图' },
    pointer: { icon: '🖍️', title: '电子教鞭' },
    appearance: { icon: '🎨', title: '外观和个性化' },
    control:    { icon: '🛠️', title: '控制面板' },
    account:    { icon: '👤', title: '用户账户' },
    admin:     { icon: '🛡️', title: '管理后台' }
  };

  /* ---------- 窗口对象 ---------- */
  class Win {
    constructor(el) {
      this.el = el;
      this.id = el.id;
      this.taskBtn = null;
      this.prevRect = null;
      this.makeResizeHandles();
      this.bind();
      el.classList.add('closed');
    }

    get title() {
      const t = this.el.querySelector('.title');
      return t ? t.textContent : (APPS[this.id] ? APPS[this.id].title : this.id);
    }

    makeResizeHandles() {
      ['n','s','e','w','ne','nw','se','sw'].forEach(dir => {
        const h = document.createElement('div');
        h.className = 'rz ' + dir;
        h.dataset.dir = dir;
        this.el.appendChild(h);
        h.addEventListener('pointerdown', e => this.startResize(e, dir));
      });
    }

    bind() {
      const bar = this.el.querySelector('.titlebar');
      bar.addEventListener('pointerdown', e => this.startDrag(e));
      bar.addEventListener('dblclick', e => {
        if (e.target.closest('.wb')) return;
        this.toggleMax();
      });
      this.el.querySelectorAll('.wb').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          if (b.classList.contains('min')) this.minimize();
          else if (b.classList.contains('max')) this.toggleMax();
          else if (b.classList.contains('close')) this.close();
        });
      });
      this.el.addEventListener('pointerdown', () => WM.focus(this.id), true);
    }

    open() {
      if (this.el.classList.contains('closed')) {
        this.el.classList.remove('closed');
        if (!this.el.style.left) this.place();
      }
      WM.focus(this.id);
      this.ensureTaskBtn();
      if (this.taskBtn) this.taskBtn.style.display = '';
    }

    place() {
      const w = this.el.offsetWidth || 420;
      const h = this.el.offsetHeight || 300;
      const dw = desktop.clientWidth, dh = desktop.clientHeight - taskbarH;
      let left = Math.round((dw - w) / 2) + (cascade % 5) * 26 - 52;
      let top = Math.round((dh - h) / 3) + (cascade % 5) * 26;
      left = Math.max(4, Math.min(left, dw - w - 4));
      top = Math.max(4, Math.min(top, dh - 40));
      this.el.style.left = left + 'px';
      this.el.style.top = top + 'px';
      this.el.style.height = Math.min(h, dh - 20) + 'px';
      cascade++;
    }

    ensureTaskBtn() {
      if (this.taskBtn) return;
      const meta = APPS[this.id] || { icon: '📄', title: this.title };
      const b = document.createElement('button');
      b.className = 'task-btn';
      b.innerHTML = '<span>' + meta.icon + '</span><span>' + this.title + '</span>';
      b.addEventListener('click', () => {
        if (this.el.classList.contains('closed')) { this.open(); return; }
        if (WM.active === this.id) this.minimize();
        else WM.focus(this.id);
      });
      running.appendChild(b);
      this.taskBtn = b;
    }

    minimize() {
      this.el.classList.add('closed');
      if (this.taskBtn) this.taskBtn.classList.remove('active');
      WM.active = null;
      WM.focusTop();
    }

    close() {
      this.el.classList.add('closed');
      if (this.taskBtn) this.taskBtn.style.display = 'none';
      if (WM.active === this.id) { WM.active = null; WM.focusTop(); }
    }

    toggleMax() {
      if (this.el.classList.contains('maximized')) {
        this.el.classList.remove('maximized');
        if (this.prevRect) Object.assign(this.el.style, this.prevRect);
      } else {
        this.prevRect = {
          left: this.el.style.left, top: this.el.style.top,
          width: this.el.style.width, height: this.el.style.height
        };
        this.el.classList.add('maximized');
      }
      WM.focus(this.id);
    }

    startDrag(e) {
      if (e.target.closest('.wb')) return;
      if (this.el.classList.contains('maximized')) return;
      WM.focus(this.id);
      this.el.classList.add('dragging');
      const r = this.el.getBoundingClientRect();
      const offX = e.clientX - r.left, offY = e.clientY - r.top;
      const dh = desktop.clientHeight - taskbarH;
      const move = ev => {
        let x = ev.clientX - offX, y = ev.clientY - offY;
        x = Math.max(-r.width + 60, Math.min(x, desktop.clientWidth - 60));
        y = Math.max(0, Math.min(y, dh - 28));
        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
      };
      const up = () => {
        this.el.classList.remove('dragging');
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    }

    startResize(e, dir) {
      e.stopPropagation();
      if (this.el.classList.contains('maximized')) return;
      WM.focus(this.id);
      this.el.classList.add('dragging');
      const r = this.el.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      const sw = r.width, sh = r.height, sl = r.left, st = r.top;
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let nl = sl, nt = st, nw = sw, nh = sh;
        if (dir.includes('e')) nw = Math.max(240, sw + dx);
        if (dir.includes('s')) nh = Math.max(120, sh + dy);
        if (dir.includes('w')) { nw = Math.max(240, sw - dx); nl = sl + (sw - nw); }
        if (dir.includes('n')) { nh = Math.max(120, sh - dy); nt = st + (sh - nh); }
        const dh = desktop.clientHeight - taskbarH;
        nt = Math.max(0, Math.min(nt, dh - 28));
        this.el.style.left = nl + 'px';
        this.el.style.top = nt + 'px';
        this.el.style.width = nw + 'px';
        this.el.style.height = nh + 'px';
      };
      const up = () => {
        this.el.classList.remove('dragging');
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    }
  }

  /* ---------- 窗口管理器 ---------- */
  const WM = {
    wins: {},
    active: null,
    register(id) {
      const el = document.getElementById(id);
      if (el) this.wins[id] = new Win(el);
    },
    open(id) { if (this.wins[id]) this.wins[id].open(); },
    focus(id) {
      const w = this.wins[id];
      if (!w) return;
      zTop++;
      w.el.style.zIndex = zTop;
      Object.values(this.wins).forEach(o => {
        o.el.classList.toggle('active', o === w);
        if (o.taskBtn) o.taskBtn.classList.toggle('active', o === w);
      });
      this.active = id;
    },
    focusTop() {
      let top = null, max = -1;
      Object.values(this.wins).forEach(o => {
        if (!o.el.classList.contains('closed') &&
            parseInt(o.el.style.zIndex || 0) > max) { max = parseInt(o.el.style.zIndex || 0); top = o.id; }
      });
      if (top) this.focus(top);
    }
  };

  Object.keys(APPS).forEach(id => WM.register(id));

  // 轻量提示气泡（控制面板“日期和时间”等用）
  function showMsgToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:48px;transform:translateX(-50%);' +
        'background:#fffbe6;border:1px solid #e0c97a;color:#5a4a00;padding:8px 16px;border-radius:4px;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:12px;z-index:200;display:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 2600);
  }

  /* ---------- 桌面图标 / 快速启动 / 开始菜单项：打开应用 ---------- */
  document.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      WM.open(el.dataset.open);
      closeStart();
    });
  });

  const dicos = document.querySelectorAll('.dico');
  dicos.forEach(d => {
    d.addEventListener('click', () => {
      dicos.forEach(x => x.classList.remove('sel'));
      d.classList.add('sel');
    });
    d.addEventListener('dblclick', () => WM.open(d.dataset.app));
  });
  desktop.addEventListener('click', e => {
    if (e.target === desktop) dicos.forEach(x => x.classList.remove('sel'));
  });

  /* ---------- 开始菜单 ---------- */
  const startBtn = document.getElementById('startBtn');
  const startMenu = document.getElementById('startMenu');
  function openStart() { startMenu.hidden = false; startBtn.classList.add('active'); }
  function closeStart() { startMenu.hidden = true; startBtn.classList.remove('active'); }
  startBtn.addEventListener('click', e => {
    e.stopPropagation();
    startMenu.hidden ? openStart() : closeStart();
  });
  document.addEventListener('click', e => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== startBtn) closeStart();
  });

  /* ---------- 登录系统（带本地持久化） ---------- */
  const loginOverlay = document.getElementById('loginOverlay');
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const smUser = document.getElementById('smUser');
  const smAvatar = document.getElementById('smAvatar');
  const trayLogin = document.getElementById('trayLogin');
  const newTopicBtn = document.getElementById('newTopicBtn');
  const topicHint = document.getElementById('topicHint');
  const chatInput = document.getElementById('chatInput');
  const chatSend = document.getElementById('chatSend');
  const mchat = document.getElementById('mchat');
  const SAVE_KEY = 'lunahub_user';
  const TOKEN_KEY = 'lunahub_token';
  const ROLE_KEY = 'lunahub_role';

  let loggedIn = false;
  let authToken = null;
  let authRole = null;
  let myAvatarUrl = null;

  function setUserUI(u, avatar) {
    if (avatar !== undefined) myAvatarUrl = avatar;
    smUser.textContent = u;
    renderAvatar(smAvatar, u, myAvatarUrl);
    trayLogin.innerHTML = '👤<span>' + u + '</span>';
    trayLogin.title = '已登录：' + u;
    updateAuthUI();
    if (typeof window.__lunaRefreshWallpaper === 'function') window.__lunaRefreshWallpaper();
    if (typeof muRefreshAdminUI === 'function') muRefreshAdminUI();
  }
  function renderAvatar(el, name, url) {
    if (!el) return;
    if (url) { el.innerHTML = '<img src="' + esc(url) + '" alt="">'; }
    else { el.textContent = (name || 'XP').slice(0, 2).toUpperCase(); }
  }
  function currentUser() { return loggedIn ? smUser.textContent : null; }
  function updateAuthUI() {
    if (newTopicBtn) { newTopicBtn.disabled = !loggedIn; topicHint.style.display = loggedIn ? 'none' : 'inline'; }
    if (chatInput) { chatInput.disabled = !loggedIn; chatInput.placeholder = loggedIn ? '说点什么…' : '请先登录后再发言'; }
    if (chatSend) chatSend.disabled = !loggedIn;
    if (typeof adminBtn !== 'undefined' && adminBtn) adminBtn.hidden = authRole !== 'admin';
  }
  /* ---------- 登录 / 注册（接后端账号系统） ---------- */
  const loginPanel = document.getElementById('loginPanel');
  const regPanel = document.getElementById('regPanel');
  const loginMsg = document.getElementById('loginMsg');
  const regMsg = document.getElementById('regMsg');
  const loginTitle = document.getElementById('loginTitle');
  const loginBannerTitle = document.getElementById('loginBannerTitle');
  const loginBannerSub = document.getElementById('loginBannerSub');
  const loginSubmit = document.getElementById('loginSubmit');
  const regUser = document.getElementById('regUser');
  const regPass = document.getElementById('regPass');
  const regPass2 = document.getElementById('regPass2');
  const regSubmit = document.getElementById('regSubmit');

  function showMsg(el, msg) { el.textContent = msg || ''; el.style.display = msg ? 'block' : 'none'; }
  function showLoginPanel() {
    loginPanel.hidden = false; regPanel.hidden = true;
    loginTitle.textContent = '登录 Lunahub';
    loginBannerTitle.textContent = '欢迎使用 Lunahub';
    loginBannerSub.textContent = '请输入您的账户信息以继续';
    showMsg(loginMsg, ''); loginUser.focus();
  }
  function showRegPanel() {
    loginPanel.hidden = true; regPanel.hidden = false;
    loginTitle.textContent = '注册 Lunahub';
    loginBannerTitle.textContent = '创建新账号';
    loginBannerSub.textContent = '加入 Lunahub，参与论坛讨论';
    showMsg(regMsg, ''); regUser.focus();
  }
  async function postJSON(url, obj) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, data };
  }

  function openLogin() { closeStart(); showLoginPanel(); loginOverlay.hidden = false; }
  function closeLogin() {
    loginOverlay.hidden = true;
    loginPass.value = ''; regPass.value = ''; regPass2.value = '';
    showLoginPanel();
  }
  async function doLogin() {
    const u = loginUser.value.trim();
    if (!u) { showMsg(loginMsg, '请输入用户名'); loginUser.focus(); return; }
    if (!loginPass.value) { showMsg(loginMsg, '请输入密码'); loginPass.focus(); return; }
    loginSubmit.disabled = true;
    const res = await postJSON('/api/login', { user: u, pass: loginPass.value });
    loginSubmit.disabled = false;
    if (res.ok) {
      loggedIn = true; setUserUI(u, res.data.avatar || null);
      authToken = res.data.token; authRole = res.data.role;
      try { localStorage.setItem(SAVE_KEY, u); localStorage.setItem(TOKEN_KEY, res.data.token); localStorage.setItem(ROLE_KEY, res.data.role); } catch (e) {}
      closeLogin();
      if (typeof topicListView !== 'undefined' && topicListView && !topicListView.hidden) loadForum();
    } else {
      showMsg(loginMsg, (res.data && res.data.error) || '用户名或密码错误');
    }
  }
  async function doRegister() {
    const u = regUser.value.trim();
    const p = regPass.value, p2 = regPass2.value;
    if (!/^[一-龥A-Za-z0-9_]{3,20}$/.test(u)) { showMsg(regMsg, '用户名需 3-20 位（中文/字母/数字/下划线）'); regUser.focus(); return; }
    if (p.length < 6) { showMsg(regMsg, '密码至少 6 位'); regPass.focus(); return; }
    if (p !== p2) { showMsg(regMsg, '两次输入的密码不一致'); regPass2.focus(); return; }
    regSubmit.disabled = true;
    const res = await postJSON('/api/register', { user: u, pass: p });
    regSubmit.disabled = false;
    if (res.ok) {
      loggedIn = true; setUserUI(u, res.data.avatar || null);
      authToken = res.data.token; authRole = res.data.role;
      try { localStorage.setItem(SAVE_KEY, u); localStorage.setItem(TOKEN_KEY, res.data.token); localStorage.setItem(ROLE_KEY, res.data.role); } catch (e) {}
      closeLogin();
      if (typeof topicListView !== 'undefined' && topicListView && !topicListView.hidden) loadForum();
    } else {
      showMsg(regMsg, (res.data && res.data.error) || '注册失败');
    }
  }
  function doLogout() {
    loggedIn = false;
    authToken = null; authRole = null; myAvatarUrl = null;
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ROLE_KEY); } catch (e) {}
    smUser.textContent = '登录账户';
    renderAvatar(smAvatar, 'XP', null);
    trayLogin.innerHTML = '👤<span>登录</span>';
    trayLogin.title = '登录账户';
    updateAuthUI();
    if (typeof topicListView !== 'undefined' && topicListView && !topicListView.hidden) loadForum();
  }

  document.getElementById('trayLogin').addEventListener('click', openLogin);
  document.getElementById('accountBtn').addEventListener('click', openLogin);
  document.getElementById('loginClose').addEventListener('click', closeLogin);
  document.getElementById('loginCancel').addEventListener('click', closeLogin);
  document.getElementById('loginSubmit').addEventListener('click', doLogin);
  document.getElementById('smLogout').addEventListener('click', e => { e.preventDefault(); doLogout(); });
  document.getElementById('smAccount').addEventListener('click', e => { e.preventDefault(); openLogin(); });
  document.getElementById('smControl').addEventListener('click', e => { e.preventDefault(); closeStart(); WM.open('control'); });
  // 控制面板里的各个小程序
  const controlGrid = document.getElementById('controlGrid');
  if (controlGrid) {
    controlGrid.addEventListener('click', e => {
      const btn = e.target.closest('.cp-item');
      if (!btn) return;
      const act = btn.dataset.cp;
      if (act === 'appearance') WM.open('appearance');
      else if (act === 'network') WM.open('browser');
      else if (act === 'taskbar') WM.open('appearance');
      else if (act === 'account') {
        if (loggedIn) WM.open('account');
        else openLogin();
      }
      else if (act === 'logout') doLogout();
      else if (act === 'power') { closeStart(); shutdown(); }
      else if (act === 'addremove') showMsgToast('添加/删除程序：当前已安装 Lunahub 论坛系统 v1.0');
      else if (act === 'datetime') {
        const d = new Date();
        const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') +
                  ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
        showMsgToast('当前日期和时间：' + s);
      }
    });
  }
  document.getElementById('loginReg').addEventListener('click', e => { e.preventDefault(); showRegPanel(); });
  document.getElementById('regBack').addEventListener('click', e => { e.preventDefault(); showLoginPanel(); });
  document.getElementById('regCancel').addEventListener('click', closeLogin);
  document.getElementById('regSubmit').addEventListener('click', doRegister);

  // 关机（经典 XP 关机体验）
  const smShut = document.getElementById('smShut');
  function shutdown() {
    Object.values(WM.wins).forEach(w => w.el.classList.add('closed'));
    if (loggedIn) doLogout();
    const s = document.createElement('div');
    s.className = 'shutdown-screen';
    s.innerHTML = '<div class="sd-inner"><div class="sd-logo">⏻</div><div>Windows 正在关机…</div></div>';
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add('show'));
    setTimeout(() => { s.innerHTML = '<div class="sd-safe">可以安全地关闭计算机了。</div>'; }, 2600);
    s.addEventListener('click', () => {
      s.classList.remove('show');
      setTimeout(() => { s.remove(); WM.open('home'); }, 450);
    });
  }
  if (smShut) smShut.addEventListener('click', e => { e.preventDefault(); closeStart(); shutdown(); });
  loginOverlay.addEventListener('click', e => { if (e.target === loginOverlay) closeLogin(); });
  loginUser.addEventListener('keydown', e => { if (e.key === 'Enter') loginPass.focus(); });
  loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  regUser.addEventListener('keydown', e => { if (e.key === 'Enter') regPass.focus(); });
  regPass.addEventListener('keydown', e => { if (e.key === 'Enter') regPass2.focus(); });
  regPass2.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });

  function send() {
    if (!loggedIn) { openLogin(); return; }
    const v = chatInput.value.trim();
    if (!v) return;
    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = '<b>' + esc(smUser.textContent || '你') + '</b>：' + esc(v);
    mchat.appendChild(el); mchat.scrollTop = mchat.scrollHeight;
    chatInput.value = '';
  }
  if (chatSend) chatSend.addEventListener('click', send);
  if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  /* ---------- 论坛：真实后端（账户 / 话题 / 嵌套回复 / 点赞 / 管理员） ---------- */
  const API_OK = location.protocol.indexOf('http') === 0;
  const topicListView = document.getElementById('topicListView');
  const topicDetailView = document.getElementById('topicDetailView');
  const topicList = document.getElementById('topicList');
  const annBar = document.getElementById('annBar');
  const catFilter = document.getElementById('catFilter');
  const adminBtn = document.getElementById('adminBtn');

  let forumCache = null;
  let currentTopicId = null;

  async function api(method, path, data) {
    if (!API_OK) throw new Error('no-server');
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (authToken) opt.headers.Authorization = 'Bearer ' + authToken;
    if (data) opt.body = JSON.stringify(data);
    const r = await fetch(path, opt);
    let d = null; try { d = await r.json(); } catch (e) {}
    if (!r.ok) { const err = new Error((d && d.error) || ('http ' + r.status)); err.status = r.status; throw err; }
    return d;
  }
  function isAdmin() { return authRole === 'admin'; }

  async function loadForum() {
    topicDetailView.hidden = true;
    topicListView.hidden = false;
    topicList.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const d = await api('GET', '/api/forum');
      forumCache = d;
      renderAnnouncements(d.announcements || []);
      renderCatFilter(d.categories || []);
      if (pendingForumCat === '__ALL__') catFilter.value = '';
      else if (pendingForumCat && (d.categories || []).indexOf(pendingForumCat) >= 0) catFilter.value = pendingForumCat;
      pendingForumCat = null;
      renderTopicList(d.topics || []);
      renderForums();
    } catch (e) {
      topicList.innerHTML = '<div class="empty-hint">无法连接服务器，请确认 server.js 已启动。</div>';
      renderForums();
    }
  }

  function renderAnnouncements(list) {
    if (!list.length) { annBar.hidden = true; annBar.innerHTML = ''; return; }
    annBar.hidden = false; annBar.innerHTML = '';
    list.forEach(a => {
      const el = document.createElement('div'); el.className = 'ann-item';
      el.innerHTML = '<span class="ann-ico">📢</span><div class="ann-text"><b>' + esc(a.title) + '</b>' +
        (a.body ? ' — ' + esc(a.body) : '') +
        '<div class="ann-meta">by ' + esc(a.author || '管理员') + ' · ' + fmtDate(a.createdAt) + '</div></div>';
      annBar.appendChild(el);
    });
  }

  function renderCatFilter(cats) {
    const cur = catFilter.value;
    catFilter.innerHTML = '<option value="">全部板块</option>';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; catFilter.appendChild(o); });
    if (cats.indexOf(cur) >= 0) catFilter.value = cur;
  }
  catFilter.addEventListener('change', () => { if (forumCache) renderTopicList(forumCache.topics); });

  function renderTopicList(topics) {
    const cat = catFilter.value;
    let list = topics;
    if (cat) list = list.filter(t => t.category === cat);
    if (!list.length) { topicList.innerHTML = '<div class="empty-hint">该板块还没有话题，来发第一个吧！</div>'; return; }
    topicList.innerHTML = '';
    list.forEach(t => topicList.appendChild(makeTopicItem(t)));
  }

  /* ---------- 论坛分区导航（forums 窗口，数据驱动） ---------- */
  const forumsList = document.getElementById('forumsList');
  const forumsStat = document.getElementById('forumsStat');
  let pendingForumCat = null;
  // 板块图标 + 分组归属（未列出的 category 自动归入「其它」）
  const CAT_META = {
    '公告与指南': { ico: '📢', group: 'Lunahub 分区' },
    '反馈与帮助': { ico: '💡', group: 'Lunahub 分区' },
    '一般讨论':   { ico: '💬', group: 'Lunahub 分区' },
    '资源共享区': { ico: '🧰', group: 'Lunahub 分区' },
    'Windows（系统美化）': { ico: '🪟', group: '综合区' },
    'UI 设计':    { ico: '🎨', group: '综合区' },
    '没啥好说':   { ico: '🎭', group: '休息室' }
  };
  const GROUP_ORDER = ['Lunahub 分区', '综合区', '休息室', '其它'];
  function catMeta(cat) { return CAT_META[cat] || { ico: '📁', group: '其它' }; }
  function fmtRelative(ts) {
    if (!ts) return '—';
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前';
    return fmtDate(ts);
  }
  function renderForums() {
    if (!forumsList) return;
    if (!forumCache) { forumsList.innerHTML = '<div class="empty-hint">正在加载板块…</div>'; if (forumsStat) forumsStat.textContent = ''; return; }
    const cats = forumCache.categories || [];
    const topics = forumCache.topics || [];
    if (!cats.length) { forumsList.innerHTML = '<div class="empty-hint">暂无板块</div>'; if (forumsStat) forumsStat.textContent = ''; return; }
    const groups = {};
    cats.forEach(c => { const m = catMeta(c); (groups[m.group] = groups[m.group] || []).push(c); });
    let totalT = 0, totalR = 0;
    forumsList.innerHTML = '';
    GROUP_ORDER.forEach(gname => {
      const list = groups[gname];
      if (!list || !list.length) return;
      const grp = document.createElement('div'); grp.className = 'forum-group';
      const gh = document.createElement('div'); gh.className = 'forum-group-head';
      gh.innerHTML = '<span class="fg-name">' + esc(gname) + '</span><span class="fg-cnt">' + list.length + ' 个板块</span>';
      grp.appendChild(gh);
      const tbl = document.createElement('div'); tbl.className = 'forum-table';
      const hd = document.createElement('div'); hd.className = 'ft-row ft-head';
      hd.innerHTML = '<span class="ft-board">板块</span><span class="ft-num">主题</span><span class="ft-num">回复</span><span class="ft-last">最新动态</span>';
      tbl.appendChild(hd);
      list.forEach(cat => {
        const ts = topics.filter(t => t.category === cat);
        const tc = ts.length;
        const rc = ts.reduce((s, t) => s + (t.replyCount || 0), 0);
        totalT += tc; totalR += rc;
        let last = null;
        ts.forEach(t => { if (!last || t.createdAt > last.createdAt) last = t; });
        const m = catMeta(cat);
        const row = document.createElement('div'); row.className = 'ft-row'; row.dataset.cat = cat;
        row.innerHTML =
          '<span class="ft-board"><span class="ft-ico">' + m.ico + '</span><span class="ft-name">' + esc(cat) + '</span></span>' +
          '<span class="ft-num">' + tc + '</span>' +
          '<span class="ft-num">' + rc + '</span>' +
          '<span class="ft-last">' + (last ? '<b>' + esc(last.title) + '</b><span class="ft-last-sub">by ' + esc(last.author) + ' · ' + fmtRelative(last.createdAt) + '</span>' : '— 暂无 —') + '</span>';
        row.addEventListener('click', () => openTopicCategory(cat));
        tbl.appendChild(row);
      });
      grp.appendChild(tbl);
      forumsList.appendChild(grp);
    });
    if (forumsStat) forumsStat.innerHTML = '共 <b>' + cats.length + '</b> 个板块 · <b>' + totalT + '</b> 主题 · <b>' + totalR + '</b> 回复';
  }
  function openTopicCategory(cat) { pendingForumCat = cat; WM.open('topics'); }
  const forumsEnterAll = document.getElementById('forumsEnterAll');
  if (forumsEnterAll) forumsEnterAll.addEventListener('click', () => { pendingForumCat = '__ALL__'; WM.open('topics'); });

  function avatarHtml(name, avatars) {
    const url = avatars && avatars[name];
    if (url) return '<img class="uava" src="' + esc(url) + '" alt="">';
    return '<span class="uava uava-txt">' + esc(String(name || '?').slice(0, 1).toUpperCase()) + '</span>';
  }

  function makeTopicItem(t) {
    const li = document.createElement('div'); li.className = 'topic-item';
    if (t.pinned) li.classList.add('pinned');
    if (t.hidden) li.classList.add('hidden-topic');
    const left = document.createElement('div'); left.className = 'ti-left';
    const ava = document.createElement('div'); ava.className = 'ti-ava';
    ava.innerHTML = avatarHtml(t.author, forumCache && forumCache.avatars);
    const tt = document.createElement('div'); tt.className = 'tt';
    let badge = '';
    if (t.pinned) badge += '<span class="badge pin">📌 置顶</span>';
    if (t.hidden) badge += '<span class="badge hide">🙈 隐藏</span>';
    tt.innerHTML = badge + esc(t.title);
    const tm = document.createElement('div'); tm.className = 'tm';
    tm.textContent = '板块：' + (t.category || '—') + ' · ' + (t.author || '匿名') + ' · ' + fmtDate(t.createdAt);
    left.appendChild(ava); left.appendChild(tt); left.appendChild(tm);
    li.appendChild(left);

    const right = document.createElement('div'); right.className = 'ti-right';
    const stats = document.createElement('div'); stats.className = 'ti-stats';
    stats.innerHTML = '<span title="回复">💬 ' + (t.replyCount || 0) + '</span>';
    right.appendChild(stats);

    const likeBtn = document.createElement('button'); likeBtn.className = 'like-btn' + (t.likedByMe ? ' liked' : '');
    likeBtn.textContent = (t.likedByMe ? '❤️ ' : '🤍 ') + (t.likeCount || 0);
    likeBtn.addEventListener('click', e => { e.stopPropagation(); toggleTopicLike(t.id, likeBtn); });
    right.appendChild(likeBtn);

    if (isAdmin()) {
      const ad = document.createElement('div'); ad.className = 'ti-admin';
      const pin = document.createElement('button'); pin.className = 'mini-btn'; pin.textContent = t.pinned ? '取消置顶' : '置顶';
      pin.addEventListener('click', e => { e.stopPropagation(); adminPin(t.id, !t.pinned); });
      const hid = document.createElement('button'); hid.className = 'mini-btn'; hid.textContent = t.hidden ? '取消隐藏' : '隐藏';
      hid.addEventListener('click', e => { e.stopPropagation(); adminHide(t.id, !t.hidden); });
      ad.appendChild(pin); ad.appendChild(hid);
      right.appendChild(ad);
    }
    li.appendChild(right);
    li.addEventListener('click', () => openTopic(t.id));
    return li;
  }

  async function toggleTopicLike(id, btn) {
    if (!loggedIn) { openLogin(); return; }
    try {
      const d = await api('POST', '/api/topics/' + encodeURIComponent(id) + '/like');
      btn.classList.toggle('liked', d.liked);
      btn.textContent = (d.liked ? '❤️ ' : '🤍 ') + d.likes.length;
    } catch (e) { showMsgToast('操作失败：' + e.message); }
  }
  async function adminPin(id, pinned) {
    try { await api('POST', '/api/admin/topics/' + encodeURIComponent(id) + '/pin', { pinned }); loadForum(); }
    catch (e) { showMsgToast('操作失败：' + e.message); }
  }
  async function adminHide(id, hidden) {
    try { await api('POST', '/api/admin/topics/' + encodeURIComponent(id) + '/hide', { hidden }); loadForum(); }
    catch (e) { showMsgToast('操作失败：' + e.message); }
  }

  async function openTopic(id) {
    currentTopicId = id;
    topicListView.hidden = true;
    topicDetailView.hidden = false;
    const body = document.getElementById('topicDetailBody');
    body.innerHTML = '<div class="loading">加载中…</div>';
    let t, topicAvatars = {};
    try { const d = await api('GET', '/api/topics/' + encodeURIComponent(id)); t = d.topic; topicAvatars = d.avatars || {}; }
    catch (e) { body.innerHTML = '<div class="empty-hint">加载失败：' + esc(e.message) + '</div>'; return; }

    body.innerHTML = '';
    const head = document.createElement('div'); head.className = 'topic-head';
    const h = document.createElement('h3'); h.className = 'dh'; h.textContent = t.title;
    const meta = document.createElement('div'); meta.className = 'dmeta';
    meta.textContent = '板块：' + (t.category || '—') + ' · 作者：' + (t.author || '匿名') + ' · ' + fmtDate(t.createdAt) +
      (t.pinned ? ' · 📌 置顶' : '') + ((isAdmin() && t.hidden) ? ' · 🙈 隐藏' : '');
    head.appendChild(h); head.appendChild(meta);

    const likeBtn = document.createElement('button'); likeBtn.className = 'like-btn big' + (t.likedByMe ? ' liked' : '');
    likeBtn.textContent = (t.likedByMe ? '❤️ ' : '🤍 ') + '赞 ' + ((t.likes || []).length);
    likeBtn.addEventListener('click', () => {
      if (!loggedIn) { openLogin(); return; }
      api('POST', '/api/topics/' + encodeURIComponent(id) + '/like').then(d => {
        likeBtn.classList.toggle('liked', d.liked);
        likeBtn.textContent = (d.liked ? '❤️ ' : '🤍 ') + '赞 ' + d.likes.length;
      }).catch(e => showMsgToast('操作失败：' + e.message));
    });
    head.appendChild(likeBtn);

    if (isAdmin()) {
      const ad = document.createElement('div'); ad.className = 'ti-admin';
      const pin = document.createElement('button'); pin.className = 'mini-btn'; pin.textContent = t.pinned ? '取消置顶' : '置顶';
      pin.addEventListener('click', () => adminPin(t.id, !t.pinned).then(() => openTopic(id)));
      const hid = document.createElement('button'); hid.className = 'mini-btn'; hid.textContent = t.hidden ? '取消隐藏' : '隐藏';
      hid.addEventListener('click', () => adminHide(t.id, !t.hidden).then(() => openTopic(id)));
      ad.appendChild(pin); ad.appendChild(hid); head.appendChild(ad);
    }
    body.appendChild(head);

    const first = document.createElement('div'); first.className = 'post topic-post';
    first.innerHTML = avatarHtml(t.author, topicAvatars) + '<div class="post-main"><b>' + esc(t.author || '匿名') + '</b><div class="pmeta">' + fmtDate(t.createdAt) + '</div><div class="pcontent">' + esc(t.body || '(无正文)') + '</div></div>';
    body.appendChild(first);

    const repliesWrap = document.createElement('div'); repliesWrap.className = 'replies';
    body.appendChild(repliesWrap);
    const me = currentUser();
    function renderReplies(replies, depth) {
      (replies || []).forEach(r => {
        const el = document.createElement('div'); el.className = 'reply'; el.dataset.rid = r.id;
        el.style.marginLeft = Math.min(depth, 6) * 18 + 'px';
        const inner = document.createElement('div'); inner.className = 'reply-inner';
        inner.innerHTML = '<div class="reply-head">' + avatarHtml(r.author, topicAvatars) + '<b>' + esc(r.author) + '</b><span class="pmeta">' + fmtDate(r.createdAt) + '</span></div>' +
          '<div class="pcontent">' + esc(r.body || '') + '</div>';
        const foot = document.createElement('div'); foot.className = 'reply-foot';
        const rl = document.createElement('button'); rl.className = 'like-btn small' + ((r.likes || []).indexOf(me) >= 0 ? ' liked' : '');
        rl.textContent = ((r.likes || []).indexOf(me) >= 0 ? '❤️ ' : '🤍 ') + (r.likes ? r.likes.length : 0);
        rl.addEventListener('click', () => {
          if (!loggedIn) { openLogin(); return; }
          api('POST', '/api/replies/' + encodeURIComponent(r.id) + '/like').then(d => {
            rl.classList.toggle('liked', d.liked);
            rl.textContent = (d.liked ? '❤️ ' : '🤍 ') + d.likes.length;
          }).catch(e => showMsgToast('操作失败：' + e.message));
        });
        const rep = document.createElement('button'); rep.className = 'mini-btn'; rep.textContent = '回复';
        rep.addEventListener('click', () => openReplyBox(r.id, r.author));
        foot.appendChild(rl); foot.appendChild(rep);
        inner.appendChild(foot);
        el.appendChild(inner);
        repliesWrap.appendChild(el);
        if (r.children && r.children.length) renderReplies(r.children, depth + 1);
      });
    }
    renderReplies(t.replies, 0);

    buildReplyArea(body, id, null, t.author);
  }

  function buildReplyArea(container, topicId, parentId, parentAuthor) {
    const box = document.createElement('div'); box.className = 'reply-box root';
    const ta = document.createElement('textarea');
    ta.placeholder = loggedIn ? (parentId ? '回复 @' + (parentAuthor || '') + '…（Ctrl+Enter 发送）' : '写下你的回复…（Ctrl+Enter 发送）') : '请先登录后回复';
    const btn = document.createElement('button'); btn.className = 'xp-btn small primary'; btn.textContent = '回复';
    box.appendChild(ta); box.appendChild(btn);
    container.appendChild(box);
    async function send() {
      if (!loggedIn) { openLogin(); return; }
      const v = ta.value.trim(); if (!v) return;
      btn.disabled = true;
      try { await api('POST', '/api/topics/' + encodeURIComponent(topicId) + '/replies', { body: v, parentId: parentId || undefined }); openTopic(topicId); }
      catch (e) { showMsgToast('回复失败：' + e.message); btn.disabled = false; }
    }
    btn.addEventListener('click', send);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
  }

  function openReplyBox(replyId, replyAuthor) {
    const old = document.querySelector('.reply-box.target'); if (old) old.remove();
    const target = document.querySelector('.reply[data-rid="' + replyId + '"]');
    if (!target) return;
    const box = document.createElement('div'); box.className = 'reply-box target';
    const tag = document.createElement('div'); tag.className = 'reply-to'; tag.textContent = '↳ 正在回复 @' + (replyAuthor || '');
    const ta = document.createElement('textarea'); ta.placeholder = loggedIn ? '回复 @' + (replyAuthor || '') + '…（Ctrl+Enter 发送）' : '请先登录后回复';
    const btn = document.createElement('button'); btn.className = 'xp-btn small primary'; btn.textContent = '回复';
    box.appendChild(tag); box.appendChild(ta); box.appendChild(btn);
    target.appendChild(box);
    ta.focus();
    btn.addEventListener('click', async () => {
      if (!loggedIn) { openLogin(); return; }
      const v = ta.value.trim(); if (!v) return;
      btn.disabled = true;
      try { await api('POST', '/api/topics/' + encodeURIComponent(currentTopicId) + '/replies', { body: v, parentId: replyId }); openTopic(currentTopicId); }
      catch (e) { showMsgToast('回复失败：' + e.message); btn.disabled = false; }
    });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) btn.click(); });
  }

  document.getElementById('topicBack').addEventListener('click', () => loadForum());

  /* ---------- 发新话题模态 ---------- */
  const topicOverlay = document.getElementById('topicOverlay');
  const ntTitle = document.getElementById('ntTitle');
  const ntCat = document.getElementById('ntCat');
  const ntBody = document.getElementById('ntBody');
  const topicSubmit = document.getElementById('topicSubmit');

  function fillCatList() {
    const dl = document.getElementById('catList'); if (!dl) return;
    const cats = (forumCache && forumCache.categories) || [];
    dl.innerHTML = '';
    cats.forEach(c => { const o = document.createElement('option'); o.value = c; dl.appendChild(o); });
  }
  function openTopicModal() {
    if (!loggedIn) { openLogin(); return; }
    fillCatList();
    topicOverlay.hidden = false; ntTitle.focus();
  }
  function closeTopicModal() { topicOverlay.hidden = true; }
  document.getElementById('topicClose').addEventListener('click', closeTopicModal);
  document.getElementById('topicCancel').addEventListener('click', closeTopicModal);
  topicOverlay.addEventListener('click', e => { if (e.target === topicOverlay) closeTopicModal(); });
  topicSubmit.addEventListener('click', () => {
    const title = ntTitle.value.trim();
    const body = ntBody.value.trim();
    const cat = ntCat.value.trim();
    if (!title) { ntTitle.focus(); return; }
    topicSubmit.disabled = true;
    api('POST', '/api/topics', { title, category: cat, body })
      .then(d => { closeTopicModal(); ntTitle.value = ''; ntBody.value = ''; ntCat.value = ''; loadForum(); openTopic(d.topic.id); })
      .catch(e => { showMsgToast('发布失败：' + e.message); topicSubmit.disabled = false; });
  });
  if (newTopicBtn) newTopicBtn.addEventListener('click', openTopicModal);

  /* ---------- 管理后台 ---------- */
  const adminGate = document.getElementById('adminGate');
  const adminNoPerm = document.getElementById('adminNoPerm');
  const adminUserList = document.getElementById('adminUserList');

  const atabs = document.querySelectorAll('.atab');
  atabs.forEach(t => t.addEventListener('click', () => {
    atabs.forEach(x => x.classList.remove('active')); t.classList.add('active');
    document.getElementById('adminUsersView').hidden = t.dataset.tab !== 'users';
    document.getElementById('adminAnnView').hidden = t.dataset.tab !== 'ann';
  }));

  async function openAdmin() {
    const ok = isAdmin();
    if (adminGate) adminGate.hidden = !ok;
    if (adminNoPerm) adminNoPerm.hidden = ok;
    if (ok) loadAdminUsers();
  }
  async function loadAdminUsers() {
    adminUserList.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const d = await api('GET', '/api/admin/users');
      adminUserList.innerHTML = '';
      d.users.forEach(u => {
        const row = document.createElement('div'); row.className = 'admin-user';
        const info = document.createElement('div'); info.className = 'au-info';
        info.innerHTML = '<b>' + esc(u.user) + '</b> <span class="badge ' + (u.role === 'admin' ? 'adm' : 'usr') + '">' + (u.role === 'admin' ? '管理员' : '用户') + '</span>';
        const acts = document.createElement('div'); acts.className = 'au-acts';
        const roleBtn = document.createElement('button'); roleBtn.className = 'mini-btn'; roleBtn.textContent = u.role === 'admin' ? '降为普通用户' : '设为管理员';
        roleBtn.addEventListener('click', async () => {
          try { await api('POST', '/api/admin/users/' + encodeURIComponent(u.user) + '/role', { role: u.role === 'admin' ? 'user' : 'admin' }); loadAdminUsers(); }
          catch (e) { showMsgToast('操作失败：' + e.message); }
        });
        const delBtn = document.createElement('button'); delBtn.className = 'mini-btn danger'; delBtn.textContent = '删除';
        delBtn.addEventListener('click', async () => {
          if (!confirm('确定删除用户 “' + u.user + '” 吗？此操作不可恢复。')) return;
          try { await api('POST', '/api/admin/users/' + encodeURIComponent(u.user) + '/delete'); loadAdminUsers(); if (forumCache) loadForum(); }
          catch (e) { showMsgToast('操作失败：' + e.message); }
        });
        if (u.user === currentUser()) { delBtn.disabled = true; delBtn.title = '不能删除自己'; }
        acts.appendChild(roleBtn); acts.appendChild(delBtn);
        row.appendChild(info); row.appendChild(acts);
        adminUserList.appendChild(row);
      });
    } catch (e) { adminUserList.innerHTML = '<div class="empty-hint">加载失败：' + esc(e.message) + '</div>'; }
  }
  const annSubmit = document.getElementById('annSubmit');
  if (annSubmit) annSubmit.addEventListener('click', async () => {
    const title = document.getElementById('annTitle').value.trim();
    if (!title) { document.getElementById('annTitle').focus(); return; }
    annSubmit.disabled = true;
    try {
      await api('POST', '/api/announcements', { title, body: document.getElementById('annBody').value.trim() });
      document.getElementById('annTitle').value = ''; document.getElementById('annBody').value = '';
      showMsgToast('公告已发布'); if (forumCache) loadForum();
    } catch (e) { showMsgToast('发布失败：' + e.message); }
    finally { annSubmit.disabled = false; }
  });

  // WM.open 覆盖在浏览器模块中统一处理

  /* ---------- 外观和个性化（壁纸 + 窗口颜色） ---------- */
  const WALLPAPERS = [
    // 经典 XP 主题壁纸
    { id: 'azul',    name: 'Azul 海洋',     value: "url('assets/wallpapers/Azul.jpg') center/cover no-repeat #1a3a6a" },
    { id: 'ascent',  name: 'Ascent 山月',   value: "url('assets/wallpapers/Ascent.jpg') center/cover no-repeat #2a3a5a" },
    { id: 'autumn',  name: 'Autumn 枫径',   value: "url('assets/wallpapers/Autumn.jpg') center/cover no-repeat #6a3a12" },
    { id: 'bliss',   name: 'Bliss 经典',    value: "url('assets/wallpapers/Bliss.jpg') center/cover no-repeat #4a7a3a" },
    { id: 'crystal', name: 'Crystal 水晶',  value: "url('assets/wallpapers/Crystal.jpg') center/cover no-repeat #1a4a6a" },
    { id: 'follow',  name: 'Follow 跟随',   value: "url('assets/wallpapers/Follow.jpg') center/cover no-repeat #3a3a3a" },
    { id: 'friend',  name: 'Friend 友谊',   value: "url('assets/wallpapers/Friend.jpg') center/cover no-repeat #2a3a4a" },
    { id: 'home',    name: 'Home 红墙',     value: "url('assets/wallpapers/Home.jpg') center/cover no-repeat #6a3a3a" },
    { id: 'moonflower', name: 'Moon Flower 月光花', value: "url('assets/wallpapers/MoonFlower.jpg') center/cover no-repeat #1a1a2a" },
    { id: 'peace',   name: 'Peace 静谧',    value: "url('assets/wallpapers/Peace.jpg') center/cover no-repeat #2a4a5a" },
    { id: 'power',   name: 'Power 力量',    value: "url('assets/wallpapers/Power.jpg') center/cover no-repeat #1a2a3a" },
    { id: 'purpleflower', name: 'Purple Flower 紫花', value: "url('assets/wallpapers/PurpleFlower.jpg') center/cover no-repeat #3a1a4a" },
    { id: 'radiance', name: 'Radiance 光辉', value: "url('assets/wallpapers/Radiance.jpg') center/cover no-repeat #1a3a5a" },
    { id: 'redmoondesert', name: 'Red Moon Desert 红月沙漠', value: "url('assets/wallpapers/RedMoonDesert.jpg') center/cover no-repeat #5a1a1a" },
    { id: 'ripple',  name: 'Ripple 涟漪',   value: "url('assets/wallpapers/Ripple.jpg') center/cover no-repeat #2a3a4a" },
    { id: 'stonehenge', name: 'Stonehenge 巨石阵', value: "url('assets/wallpapers/Stonehenge.jpg') center/cover no-repeat #3a3a4a" },
    { id: 'tulips',  name: 'Tulips 郁金香', value: "url('assets/wallpapers/Tulips.jpg') center/cover no-repeat #3a4a2a" },
    { id: 'vortecspace', name: 'Vortec Space 太空漩涡', value: "url('assets/wallpapers/VortecSpace.jpg') center/cover no-repeat #1a1a3a" },
    { id: 'wind',    name: 'Wind 风行',     value: "url('assets/wallpapers/Wind.jpg') center/cover no-repeat #2a4a3a" },
    // XP 各版本主题预览图
    { id: 'xphome',  name: 'XP Home 版',    value: "url('assets/wallpapers/XpHome.jpg') center/cover no-repeat #3a6a2a" },
    { id: 'xppro',   name: 'XP Pro 版',     value: "url('assets/wallpapers/XpPro.jpg') center/cover no-repeat #1a3a6a" },
    { id: 'xp64',    name: 'XP 64-Bit 版',  value: "url('assets/wallpapers/Xp64Bit.jpg') center/cover no-repeat #1a3a5a" },
    { id: 'xpprof',  name: 'XP ProFr 法语', value: "url('assets/wallpapers/XpProFr.jpg') center/cover no-repeat #1a3a6a" },
    { id: 'xpfamfr', name: 'XP FamFr 法语', value: "url('assets/wallpapers/XpFrFamiliale.jpg') center/cover no-repeat #3a6a2a" },
    // Embedded 2009 / POSReady
    { id: 'posready',     name: 'POSReady 蓝标',     value: "url('assets/wallpapers/POSReady.jpg') center/cover no-repeat #1062b8" },
    { id: 'posready-lg',  name: 'POSReady 品牌 LOGO', value: "url('assets/wallpapers/POSReady_Lg.jpg') center/cover no-repeat #1062b8" },
    { id: 'posready-sm',  name: 'POSReady 简约 LOGO', value: "url('assets/wallpapers/POSReady_Sm.jpg') center/cover no-repeat #1472c8" },
    // Media Center Edition & Plus! XP 系列
    { id: 'energy-bliss', name: 'Energy Bliss 能量',  value: "url('assets/wallpapers/Energy Bliss.jpg') center/cover no-repeat #4a7a3a" },
    { id: 'ocean',        name: 'Ocean 海洋之光',     value: "url('assets/wallpapers/Ocean.jpg') center/cover no-repeat #0e3a8a" },
    { id: 'space',        name: 'Space 蓝色地球',     value: "url('assets/wallpapers/Space.jpg') center/cover no-repeat #050a20" },
    { id: 'spring',       name: 'Spring 春芽',         value: "url('assets/wallpapers/Spring.jpg') center/cover no-repeat #2a5a2a" },
    { id: 'star-tracks',  name: 'Star Tracks 星轨',    value: "url('assets/wallpapers/StarTracks.jpg') center/cover no-repeat #0a1a3a" },
    { id: 'stream',       name: 'Stream 流瀑',         value: "url('assets/wallpapers/Stream.jpg') center/cover no-repeat #2a4a7a" },
    { id: 'aquarium',     name: 'Aquarium 水族馆',     value: "url('assets/wallpapers/Aquarium.jpg') center/cover no-repeat #1a6a7a" },
    { id: 'davinci',      name: 'Da Vinci 达芬奇手稿', value: "url('assets/wallpapers/DaVinci.jpg') center/cover no-repeat #5a3010" },
    { id: 'freestyle',    name: 'Freestyle 自由风',     value: "url('assets/wallpapers/Windows XP Freestyle.jpg') center/cover no-repeat #2050a0" },
    { id: 'media-center', name: 'Media Center 媒体中心版', value: "url('assets/wallpapers/Windows XP Media Center Edition.jpg') center/cover no-repeat #2050a0" },
    // 国产系统主题壁纸（用户上传）
    { id: 'ylmf-greenmist', name: '雨林·绿光',  value: "url('assets/wallpapers/ylmf-greenmist.jpg') center/cover no-repeat #1a4a1a" },
    { id: 'ylmf-maple',     name: '雨林·枫叶',  value: "url('assets/wallpapers/ylmf-maple.jpg') center/cover no-repeat #4a7a3a" },
    { id: 'deepin-water',   name: 'Deepin·涟漪', value: "url('assets/wallpapers/deepin-water.jpg') center/cover no-repeat #0a2a5a" },
    { id: 'deepin-rose',    name: 'Deepin·玫瑰', value: "url('assets/wallpapers/deepin-rose.jpg') center/cover no-repeat #5a1a1a" },
    { id: 'addy-blue',      name: '番茄园·Addy', value: "url('assets/wallpapers/addy-blue.jpg') center/cover no-repeat #0e3a8a" },
    { id: 'longhorn-grass', name: '草原与天空',  value: "url('assets/wallpapers/longhorn-grass.jpg') center/cover no-repeat #2050a0" },
    // 纯色
    { id: 'luna',    name: 'Luna 纯蓝',    value: "linear-gradient(160deg,#2a6fd6,#0a3f8f)" },
    { id: 'royale',  name: 'Royale 紫',    value: "linear-gradient(160deg,#6a3aa0,#2a1a5a)" },
    { id: 'olive',   name: 'Olive 绿',     value: "linear-gradient(160deg,#7a9a3a,#3a5a1a)" },
    { id: 'rose',    name: 'Rose 红',      value: "linear-gradient(160deg,#d6607a,#8a1a3a)" }
  ];
  const ACCENTS = [
    { id: 'blue',     name: '默认蓝',       c1: '#3c7fb1', c2: '#245edb' },
    { id: 'green',    name: '橄榄绿',       c1: '#5b9b4a', c2: '#2f7a2f' },
    { id: 'purple',   name: '高贵紫',       c1: '#7b5bbf', c2: '#4a2a9a' },
    { id: 'red',      name: '玫瑰红',       c1: '#d6607a', c2: '#a01a3a' },
    { id: 'orange',   name: '日落橙',       c1: '#e08a3a', c2: '#c14a1a' },
    { id: 'teal',     name: '青绿',         c1: '#3aa8a0', c2: '#1a7a72' },
    { id: 'posblue',  name: 'POS 深蓝',     c1: '#1062b8', c2: '#062e6a' },
    { id: 'mce',      name: 'MCE 深海蓝',   c1: '#08306a', c2: '#04163a' },
    { id: 'sepia',    name: '达芬奇棕',     c1: '#a0622a', c2: '#6a3e14' },
    { id: 'midnight', name: '午夜蓝',       c1: '#1a2a5a', c2: '#0a1a4a' },
    { id: 'aquarium', name: '水族馆蓝',     c1: '#3aa8d0', c2: '#1a6a8a' },
    { id: 'classic',  name: 'Windows 经典', c1: '#d4d0c8', c2: '#b8b4a4' }
  ];
  // 一键主题（点一下同时应用：壁纸 + 标题栏/任务栏色 + 字体大小）
  // 命名严格对齐 Windows XP 真实预制主题：亮蓝色 / Windows 经典 / Plus! 系列
  const THEMES = [
    { id: 'xp',             name: '亮蓝色（XP 默认）', wp: 'energy-bliss', accent: 'blue',     fs: 'md', desc: 'Windows XP 出厂默认' },
    { id: 'plus-nature',    name: 'Plus! 自然',        wp: 'spring',       accent: 'green',    fs: 'md', desc: 'Plus! 自然之声' },
    { id: 'plus-davinci',   name: 'Plus! 达芬奇',      wp: 'davinci',      accent: 'sepia',    fs: 'md', desc: 'Plus! 达芬奇手稿' },
    { id: 'plus-space',     name: 'Plus! 太空',        wp: 'space',        accent: 'mce',      fs: 'md', desc: 'Plus! 太空遨游' },
    { id: 'plus-aquarium',  name: 'Plus! 水族馆',      wp: 'aquarium',     accent: 'aquarium', fs: 'md', desc: 'Plus! 水族馆' },
    { id: 'plus-freestyle', name: 'Plus! Freestyle',   wp: 'freestyle',    accent: 'midnight', fs: 'md', desc: 'MCE 2005 自由风' },
    { id: 'classic',        name: 'Windows 经典',      wp: 'luna',         accent: 'classic',  fs: 'md', desc: 'Windows 9x 风格灰色' }
  ];

  // 当前选中的壁纸（含用户上传）—— 用 localStorage 记住时也可还原
  let currentWpId = null;
  function applyWallpaper(wp) {
    if (!wp) return;
    desktop.style.background = wp.value;
    currentWpId = wp.id;
    try { localStorage.setItem('lunahub_wp', wp.id); } catch (e) {}
    document.querySelectorAll('#wpGrid .wp, #wpUserGrid .wp').forEach(el => el.classList.toggle('sel', el.dataset.id === wp.id));
    document.querySelectorAll('#themeGrid .theme-card').forEach(el => el.classList.remove('sel'));
  }
  function applyAccent(a) {
    document.documentElement.style.setProperty('--acc1', a.c1);
    document.documentElement.style.setProperty('--acc2', a.c2);
    try { localStorage.setItem('lunahub_accent', a.id); } catch (e) {}
    document.querySelectorAll('#accentGrid .accent').forEach(el => el.classList.toggle('sel', el.dataset.id === a.id));
    document.querySelectorAll('#themeGrid .theme-card').forEach(el => el.classList.remove('sel'));
  }
  function applyFontSize(fs) {
    document.body.setAttribute('data-fs', fs);
    try { localStorage.setItem('lunahub_fs', fs); } catch (e) {}
    document.querySelectorAll('#fsRow .fs-btn').forEach(el => el.classList.toggle('sel', el.dataset.fs === fs));
    document.querySelectorAll('#themeGrid .theme-card').forEach(el => el.classList.remove('sel'));
  }
  function applyTheme(t) {
    const wp = wpById(t.wp);
    const ac = ACCENTS.find(a => a.id === t.accent);
    if (wp) applyWallpaper(wp);
    if (ac) applyAccent(ac);
    if (t.fs) applyFontSize(t.fs);
    try { localStorage.setItem('lunahub_theme', t.id); } catch (e) {}
    if (t.id === 'classic') document.body.classList.add('theme-classic');
    else document.body.classList.remove('theme-classic');
    document.querySelectorAll('#themeGrid .theme-card').forEach(el => el.classList.toggle('sel', el.dataset.theme === t.id));
  }

  const wpGrid = document.getElementById('wpGrid');
  const wpUserGrid = document.getElementById('wpUserGrid');
  let customWPs = [];   // 从 /api/wallpapers 加载
  function wpById(id) {
    if (!id) return null;
    const built = WALLPAPERS.find(w => w.id === id);
    if (built) return built;
    const u = customWPs.find(x => x.id === id);
    if (u) return { id: u.id, name: u.name, value: "url('/assets/wallpapers/user/" + u.file + "') center/cover no-repeat #1a3a6a", custom: true };
    return null;
  }

  /* ---------- 用户上传壁纸：上传 / 删除 / 提取 ---------- */
  function isAdminRole() { try { return localStorage.getItem(ROLE_KEY) === 'admin'; } catch (e) { return false; } }
  const wpUploadBtn = document.getElementById('wpUpload');
  const wpExtractBtn = document.getElementById('wpExtract');
  const wpMenuUploadBtn = document.getElementById('wpMenuUpload');
  const wpFileInput = document.getElementById('wpFile');
  const wpTip = document.getElementById('wpTip');

  function refreshWpUI() {
    // 上传按钮：未登录禁用
    if (loggedIn) {
      wpUploadBtn.disabled = false; wpUploadBtn.title = '';
      wpExtractBtn.disabled = false;
      wpTip.textContent = isAdminRole()
        ? '你是管理员：登录后可上传壁纸，可删除任意上传项'
        : '已登录：可上传壁纸，管理员可删除上传项';
    } else {
      wpUploadBtn.disabled = true; wpUploadBtn.title = '请先登录';
      wpExtractBtn.disabled = false;
      wpTip.textContent = '登录后可上传自己的壁纸，管理员可删除上传项';
    }
  }
  refreshWpUI();

  function renderUserWPs() {
    wpUserGrid.innerHTML = '';
    if (!customWPs.length) {
      const empty = document.createElement('div');
      empty.className = 'wp-empty';
      empty.textContent = '（还没有上传的壁纸）';
      wpUserGrid.appendChild(empty);
      return;
    }
    const isAdmin = isAdminRole();
    customWPs.forEach(u => {
      const el = document.createElement('div');
      el.className = 'wp wp-custom'; el.dataset.id = u.id; el.title = (u.name || '未命名') + ' · 由 ' + u.uploader + ' 上传';
      el.style.background = "url('/assets/wallpapers/user/" + u.file + "') center/cover no-repeat";
      el.innerHTML = '<span>' + (u.name || '未命名') + '</span>'; // +
        // (isAdmin ? '<button class="wp-del" title="删除" data-id="' + u.id + '">✕</button>' : '');
      if (isAdmin) {
        const del = document.createElement('button');
        del.className = 'wp-del'; del.title = '删除'; del.textContent = '✕';
        del.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          if (!confirm('确定要删除这张壁纸「' + (u.name || '未命名') + '」吗？此操作不可恢复。')) return;
          try {
            await api('POST', '/api/admin/wallpapers/' + u.id + '/delete');
            showMsgToast('已删除');
            if (currentWpId === u.id) applyWallpaper(WALLPAPERS[0]); // 删的是当前 → 回退
            await loadCustomWPs();
          } catch (e) { showMsgToast('删除失败：' + e.message); }
        });
        el.appendChild(del);
      }
      el.addEventListener('click', () => applyWallpaper({ id: u.id, name: u.name, value: el.style.background }));
      wpUserGrid.appendChild(el);
    });
  }

  async function loadCustomWPs() {
    try {
      const d = await api('GET', '/api/wallpapers');
      customWPs = (d && d.uploaded) || [];
    } catch (e) { customWPs = []; }
    renderUserWPs();
    // 应用 localStorage 还原（如果是用户上传的）
    try {
      const saved = localStorage.getItem('lunahub_wp');
      if (saved && !WALLPAPERS.some(w => w.id === saved)) {
        const u = customWPs.find(x => x.id === saved);
        if (u) applyWallpaper({ id: u.id, name: u.name, value: "url('/assets/wallpapers/user/" + u.file + "') center/cover no-repeat #1a3a6a" });
      }
    } catch (e) {}
  }

  wpUploadBtn.addEventListener('click', () => {
    if (!loggedIn) { showMsgToast('请先登录后再上传壁纸'); return; }
    wpFileInput.click();
  });
  wpFileInput.addEventListener('change', () => {
    const f = wpFileInput.files && wpFileInput.files[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|gif|webp|bmp)$/i.test(f.type)) {
      showMsgToast('仅支持 PNG/JPG/GIF/WebP/BMP 格式');
      wpFileInput.value = ''; return;
    }
    if (f.size > 5 * 1024 * 1024) { showMsgToast('图片超过 5MB'); wpFileInput.value = ''; return; }
    const defaultName = f.name.replace(/\.[^.]+$/, '').slice(0, 30) || '我的壁纸';
    const name = prompt('给壁纸起个名字：', defaultName) || defaultName;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const d = await api('POST', '/api/wallpapers', { name, data: reader.result });
        showMsgToast('已上传：' + (d.item && d.item.name));
        wpFileInput.value = '';
        if (!wpUserGrid.hidden) await loadCustomWPs();
        else { wpUserGrid.hidden = false; await loadCustomWPs(); }
        if (d.item) {
          const u = d.item;
          applyWallpaper({ id: u.id, name: u.name, value: "url('/assets/wallpapers/user/" + u.file + "') center/cover no-repeat #1a3a6a" });
        }
      } catch (e) { showMsgToast('上传失败：' + e.message); wpFileInput.value = ''; }
    };
    reader.onerror = () => { showMsgToast('读取文件失败'); wpFileInput.value = ''; };
    reader.readAsDataURL(f);
  });
  wpExtractBtn.addEventListener('click', async () => {
    if (!currentWpId) { showMsgToast('请先选择一张壁纸'); return; }
    const wp = wpById(currentWpId);
    if (!wp) { showMsgToast('当前壁纸未找到'); return; }
    // 从 value 字符串里抽出 url('...')
    const m = wp.value && wp.value.match(/url\((['"]?)([^'")]+)\1\)/i);
    if (!m) { showMsgToast('当前壁纸无法提取（纯色/渐变）'); return; }
    let url = m[2];
    // 相对路径补全
    if (url.startsWith('/')) url = location.origin + url;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const blob = await r.blob();
      let ext = 'jpg';
      const t = blob.type.split('/')[1] || 'jpeg';
      if (/^(png|jpeg|jpg|gif|webp|bmp)$/i.test(t)) ext = t === 'jpeg' ? 'jpg' : t;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ((wp.name || 'wallpaper') + '.' + ext).replace(/[\\/:*?"<>|]/g, '_');
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      showMsgToast('已提取：' + a.download);
    } catch (e) { showMsgToast('提取失败：' + e.message); }
  });
  wpMenuUploadBtn.addEventListener('click', async () => {
    if (!loggedIn) { showMsgToast('请先登录后再查看我的上传'); return; }
    wpUserGrid.hidden = !wpUserGrid.hidden;
    wpMenuUploadBtn.textContent = wpUserGrid.hidden ? '🖼️ 我的上传' : '🖼️ 隐藏我的上传';
    if (!wpUserGrid.hidden && !customWPs.length) await loadCustomWPs();
  });
  // 进入外观窗口时（首次）异步拉一次；isAdminRole/UI 变化时 refreshWpUI
  // 暴露给 setUserUI 钩子：登入登出后 UI 状态由 setUserUI 内部刷新
  window.__lunaRefreshWallpaper = () => { refreshWpUI(); if (!wpUserGrid.hidden) loadCustomWPs(); };
  // 渲染内建壁纸（一次性）
  WALLPAPERS.forEach(wp => {
    const el = document.createElement('div');
    el.className = 'wp'; el.dataset.id = wp.id; el.title = wp.name;
    el.style.background = wp.value;
    el.innerHTML = '<span>' + wp.name + '</span>';
    el.addEventListener('click', () => applyWallpaper(wp));
    wpGrid.appendChild(el);
  });
  const accentGrid = document.getElementById('accentGrid');
  ACCENTS.forEach(a => {
    const el = document.createElement('div');
    el.className = 'accent'; el.dataset.id = a.id; el.title = a.name;
    el.style.background = 'linear-gradient(180deg,' + a.c1 + ',' + a.c2 + ')';
    el.addEventListener('click', () => applyAccent(a));
    accentGrid.appendChild(el);
  });
  // 主题预设卡片
  const themeGrid = document.getElementById('themeGrid');
  THEMES.forEach(t => {
    const wp = WALLPAPERS.find(w => w.id === t.wp);
    const ac = ACCENTS.find(a => a.id === t.accent);
    const el = document.createElement('div');
    el.className = 'theme-card'; el.dataset.theme = t.id; el.title = t.name + '（一键应用）';
    el.innerHTML =
      '<div class="theme-preview" style="background:' + (wp ? wp.value : '#ccc') + ';' +
        '--tp-acc:linear-gradient(180deg,' + (ac ? ac.c1 : '#3c7fb1') + ',' + (ac ? ac.c2 : '#245edb') + ')">' +
        '<div class="tp-win"><span class="tp-title"></span></div></div>' +
      '<div class="theme-meta"><span class="ti">' + t.name + '</span>' +
      '<span class="ts">' + ({sm:'小',md:'中',lg:'大',xl:'超大'})[t.fs] + '</span></div>' +
      '<div class="theme-desc">' + (t.desc || '') + '</div>';
    el.addEventListener('click', () => applyTheme(t));
    themeGrid.appendChild(el);
  });
  // 字体按钮
  document.querySelectorAll('#fsRow .fs-btn').forEach(btn => {
    btn.addEventListener('click', () => applyFontSize(btn.dataset.fs));
  });

  // 恢复上次的偏好（主题优先 > 分项 > 默认）
  let savedWp = null, savedAc = null, savedFs = null, savedTheme = null;
  try {
    savedWp = localStorage.getItem('lunahub_wp');
    savedAc = localStorage.getItem('lunahub_accent');
    savedFs = localStorage.getItem('lunahub_fs');
    savedTheme = localStorage.getItem('lunahub_theme');
  } catch (e) {}
  applyWallpaper(WALLPAPERS.find(w => w.id === savedWp) || WALLPAPERS[0]);
  applyAccent(ACCENTS.find(a => a.id === savedAc) || ACCENTS[0]);
  applyFontSize(savedFs || 'md');
  if (savedTheme) {
    const t = THEMES.find(x => x.id === savedTheme);
    if (t) {
      // 选中状态高亮 + 恢复主题 class（如经典主题）
      const el = themeGrid.querySelector('[data-theme="' + t.id + '"]');
      if (el) el.classList.add('sel');
      if (t.id === 'classic') document.body.classList.add('theme-classic');
    }
  }

  /* ---------- 桌面右键菜单 ---------- */
  const ctxMenu = document.getElementById('ctxMenu');
  let ctxSubTimer = null;

  function showCtx(x, y) {
    closeAllSubs();
    ctxMenu.hidden = false;
    const mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
    let X = Math.min(x, window.innerWidth - mw - 4);
    let Y = Math.min(y, window.innerHeight - mh - 4);
    if (X < 0) X = 0;
    if (Y < 0) Y = 0;
    ctxMenu.style.left = X + 'px';
    ctxMenu.style.top = Y + 'px';
  }
  function hideCtx() { ctxMenu.hidden = true; closeAllSubs(); }
  function closeAllSubs() {
    ctxMenu.querySelectorAll('.ctx-sub').forEach(s => s.hidden = true);
    ctxMenu.querySelectorAll('.ci.has-sub').forEach(c => c.classList.remove('open'));
  }
  function openSub(parentCi) {
    closeAllSubs();
    parentCi.classList.add('open');
    const sub = parentCi.querySelector('.ctx-sub');
    if (sub) {
      sub.hidden = false;
      // 防止子菜单超出右边界：如果右边放不下就放左边
      const r = parentCi.getBoundingClientRect();
      const sw = sub.offsetWidth;
      if (r.right + sw > window.innerWidth - 4) {
        sub.style.left = 'auto';
        sub.style.right = '100%';
      } else {
        sub.style.left = '100%';
        sub.style.right = 'auto';
      }
    }
  }

  // 桌面空白处右键
  desktop.addEventListener('contextmenu', e => {
    if (e.target.closest('.window') || e.target.closest('.taskbar') || e.target.closest('.startmenu') || e.target.closest('.ctx-menu') || e.target.closest('.dico')) return;
    e.preventDefault();
    showCtx(e.clientX, e.clientY);
  });

  // 点其他处关闭
  document.addEventListener('click', e => { if (!ctxMenu.hidden && !e.target.closest('.ctx-menu')) hideCtx(); });
  document.addEventListener('contextmenu', e => { if (!ctxMenu.hidden && !e.target.closest('.ctx-menu')) hideCtx(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ctxMenu.hidden) hideCtx(); });

  // has-sub 悬停展开子菜单
  ctxMenu.querySelectorAll('.ci.has-sub').forEach(ci => {
    ci.addEventListener('mouseenter', () => {
      clearTimeout(ctxSubTimer);
      ctxSubTimer = setTimeout(() => openSub(ci), 250);
    });
    ci.addEventListener('mouseleave', () => {
      clearTimeout(ctxSubTimer);
      // 延迟关闭，允许鼠标移入子菜单
      ctxSubTimer = setTimeout(() => {
        if (!ci.querySelector('.ctx-sub:hover')) closeAllSubs();
      }, 300);
    });
  });

  // 子菜单项点击
  ctxMenu.querySelectorAll('.ctx-sub .ci').forEach(ci => {
    ci.addEventListener('click', e => {
      e.stopPropagation();
      const sub = ci.dataset.sub;
      if (sub === 'arr-name' || sub === 'arr-size' || sub === 'arr-type' || sub === 'arr-date') {
        // 排列桌面图标（演示）
        const icons = [...deskIcons.querySelectorAll('.dico')];
        const key = { 'arr-name': 1, 'arr-size': 2, 'arr-type': 3, 'arr-date': 0 }[sub];
        icons.sort((a, b) => {
          const ta = a.querySelector('.di-txt').textContent, tb = b.querySelector('.di-txt').textContent;
          return key === 0 ? 0 : ta.localeCompare(tb, 'zh');
        });
        icons.forEach(ic => deskIcons.appendChild(ic));
      }
      else if (sub === 'arr-auto' || sub === 'arr-grid') {
        ci.classList.toggle('checked');
        const ic = ci.querySelector('.ic');
        ic.textContent = ci.classList.contains('checked') ? '✓' : '';
      }
      else if (sub === 'new-txt') {
        spawnNotepad('新建文本文档');
      }
      hideCtx();
    });
  });

  // 主菜单项点击
  ctxMenu.querySelectorAll('.ci[data-act]').forEach(ci => {
    if (ci.classList.contains('has-sub')) return; // 子菜单项单独处理
    ci.addEventListener('click', e => {
      if (ci.classList.contains('disabled')) return;
      const act = ci.dataset.act;
      if (act === 'refresh') {
        if (!topicListView.hidden) loadForum();
        if (desktop.animate) desktop.animate([{ filter: 'brightness(1.35)' }, { filter: 'brightness(1)' }], { duration: 260 });
      }
      else if (act === 'personalize') { WM.open('appearance'); }
      else if (act === 'properties') { WM.open('about'); }
      hideCtx();
    });
  });

  function spawnNotepad(name) {
    const id = 'np' + Date.now();
    const sec = document.createElement('section');
    sec.className = 'window'; sec.id = id; sec.style.width = '360px';
    sec.innerHTML = '<div class="titlebar"><span class="ico">📝</span><span class="title">' + (name || '无标题') + ' - 记事本</span>' +
      '<span class="winbtns"><button class="wb min">_</button><button class="wb max">▢</button><button class="wb close">✕</button></span></div>' +
      '<div class="menubar"><span>文件</span><span>编辑</span><span>格式</span><span>查看</span><span>帮助</span></div>' +
      '<div class="winbody" style="padding:0"><textarea class="notepad-area" placeholder="在这里输入…（演示）"></textarea></div>';
    desktop.appendChild(sec);
    WM.register(id);
    WM.open(id);
    // 在桌面生成一个文件图标，双击可重新打开（XP 行为）
    const di = document.createElement('button');
    di.className = 'dico';
    di.dataset.app = id;
    di.innerHTML = '<span class="di-ico">📄</span><span class="di-txt">' + (name || '新建文本文档') + '</span>';
    deskIcons.appendChild(di);
    di.addEventListener('click', () => { document.querySelectorAll('.dico').forEach(x => x.classList.remove('sel')); di.classList.add('sel'); });
    di.addEventListener('dblclick', () => WM.open(id));
  }

  /* ---------- Internet Explorer 6 风格浏览器 ---------- */
  const brwAddr = document.getElementById('brwAddr');
  const brwContent = document.getElementById('brwContent');
  const brwStatus = document.getElementById('brwStatus');
  const brwTitle = document.getElementById('brwTitle');
  const brwBack = document.getElementById('brwBack');
  const brwFwd = document.getElementById('brwFwd');
  const brwStop = document.getElementById('brwStop');
  const brwRefresh = document.getElementById('brwRefresh');
  const brwHome = document.getElementById('brwHome');
  const brwGo = document.getElementById('brwGo');
  const brwLinks = document.getElementById('brwLinks');

  let brwHistory = [];
  let brwHistIdx = -1;
  let brwTimer = null;

  function normalizeUrl(input) {
    input = input.trim();
    if (!input) return null;
    if (input === 'about:home' || input === 'home') return 'about:home';
    if (!/^https?:\/\//i.test(input)) {
      if (/^[\w.-]+\.[a-z]{2,}/i.test(input)) input = 'https://' + input;
      else input = 'https://www.bing.com/search?q=' + encodeURIComponent(input);
    }
    return input;
  }

  function showHome() {
    brwContent.innerHTML = '<div class="ie-home">' +
      '<h1>🌐 Internet Explorer</h1>' +
      '<p style="color:#666;font-size:13px;margin:8px 0 16px">Lunahub 内置浏览器 — 在地址栏输入网址或点击收藏夹访问</p>' +
      '<div class="ie-bookmarks">' +
      '<button class="ie-bm" data-url="https://www.bing.com"><span class="bm-ico">🔍</span><span>Bing 搜索</span></button>' +
      '<button class="ie-bm" data-url="https://www.wikipedia.org"><span class="bm-ico">📚</span><span>Wikipedia</span></button>' +
      '<button class="ie-bm" data-url="https://example.com"><span class="bm-ico">📄</span><span>Example.com</span></button>' +
      '<button class="ie-bm" data-url="https://www.w3.org"><span class="bm-ico">🌍</span><span>W3C</span></button>' +
      '<button class="ie-bm" data-url="https://archive.org"><span class="bm-ico">💾</span><span>Internet Archive</span></button>' +
      '</div>' +
      '<p style="color:#aaa;font-size:11px;margin-top:20px">页面通过内置代理加载；需要登录的网站、部分动态站点可能显示异常，属正常现象。</p>' +
      '</div>';
    bindBookmarks();
    brwAddr.value = '';
    brwTitle.textContent = 'Internet Explorer';
    brwStatus.textContent = '完成';
  }

  function bindBookmarks() {
    brwContent.querySelectorAll('.ie-bm').forEach(b => {
      b.addEventListener('click', () => navigate(b.dataset.url));
    });
  }

  function navigate(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    if (url === 'about:home') { showHome(); brwHistIdx++; brwHistory = brwHistory.slice(0, brwHistIdx).concat(['about:home']); updateNav(); return; }

    brwStatus.textContent = '正在打开 ' + url.replace(/^https?:\/\//, '') + ' …';
    brwStop.disabled = false;
    // 加载提示与 iframe 并存（不要清空整个容器，否则 iframe 会被反复移除导致重载）
    brwContent.innerHTML = '<div class="ie-loading"><span class="ie-spin"></span> 正在加载页面…</div>';

    clearTimeout(brwTimer);
    brwTimer = setTimeout(() => {
      brwContent.innerHTML = '<div class="ie-fallback">' +
        '<div class="ie-fb-ico">⚠️</div>' +
        '<h3>无法加载页面</h3>' +
        '<p>' + esc(url) + '</p>' +
        '<p class="ie-fb-hint">加载超时，可能是网络问题或该网站不可用。</p>' +
        '<a href="' + esc(url) + '" target="_blank" rel="noopener" class="ie-open-ext">在新标签页打开 ↗</a>' +
        '</div>';
      brwStop.disabled = true;
      brwStatus.textContent = '错误';
    }, 20000);

    const iframe = document.createElement('iframe');
    iframe.className = 'ie-frame';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.src = '/api/proxy?url=' + encodeURIComponent(url);

    iframe.addEventListener('load', () => {
      clearTimeout(brwTimer);
      const tip = brwContent.querySelector('.ie-loading');
      if (tip) tip.remove();
      brwStop.disabled = true;
      brwStatus.textContent = '完成';
      brwTitle.textContent = url.replace(/^https?:\/\//, '').split('/')[0] + ' - Internet Explorer';
    });

    iframe.addEventListener('error', () => {
      clearTimeout(brwTimer);
      showLoadError(url);
    });

    brwContent.appendChild(iframe);

    brwAddr.value = url;
    brwHistIdx++;
    brwHistory = brwHistory.slice(0, brwHistIdx).concat([url]);
    updateNav();
  }

  function showLoadError(url) {
    brwContent.innerHTML = '<div class="ie-fallback">' +
      '<div class="ie-fb-ico">⚠️</div>' +
      '<h3>无法加载页面</h3>' +
      '<p>' + esc(url) + '</p>' +
      '<p class="ie-fb-hint">网络连接失败或该网站不可用。</p>' +
      '</div>';
    brwStop.disabled = true;
    brwStatus.textContent = '错误';
  }

  function updateNav() {
    brwBack.disabled = brwHistIdx <= 0;
    brwFwd.disabled = brwHistIdx >= brwHistory.length - 1;
  }

  brwGo.addEventListener('click', () => navigate(brwAddr.value));
  brwAddr.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(brwAddr.value); });
  brwBack.addEventListener('click', () => {
    if (brwHistIdx <= 0) return;
    brwHistIdx--;
    const url = brwHistory[brwHistIdx];
    if (url === 'about:home') showHome(); else { brwAddr.value = url; navigateSilent(url); }
    updateNav();
  });
  brwFwd.addEventListener('click', () => {
    if (brwHistIdx >= brwHistory.length - 1) return;
    brwHistIdx++;
    const url = brwHistory[brwHistIdx];
    if (url === 'about:home') showHome(); else { brwAddr.value = url; navigateSilent(url); }
    updateNav();
  });
  brwStop.addEventListener('click', () => { clearTimeout(brwTimer); const f = brwContent.querySelector('iframe'); if (f) f.src = 'about:blank'; brwStop.disabled = true; brwStatus.textContent = '已停止'; });
  brwRefresh.addEventListener('click', () => { if (brwHistIdx >= 0) { const u = brwHistory[brwHistIdx]; if (u === 'about:home') showHome(); else navigateSilent(u); } });
  brwHome.addEventListener('click', () => navigate('about:home'));
  brwLinks.addEventListener('click', e => { const b = e.target.closest('.ie-link'); if (b) navigate(b.dataset.url); });

  function navigateSilent(url) {
    brwStatus.textContent = '正在刷新…';
    brwContent.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = '/api/proxy?url=' + encodeURIComponent(url); iframe.className = 'ie-frame';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    brwContent.appendChild(iframe);
    iframe.addEventListener('load', () => { brwStatus.textContent = '完成'; brwTitle.textContent = url.replace(/^https?:\/\//, '').split('/')[0] + ' - Internet Explorer'; });
  }

  /* ---------- 画廊（管理员可编辑） ---------- */
  const galleryGrid = document.getElementById('galleryGrid');
  const galAdminBar = document.getElementById('galAdminBar');
  const galAddBtn = document.getElementById('galAddBtn');
  let galItems = [];

  async function loadGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const d = await api('GET', '/api/gallery');
      galItems = d.items || [];
    } catch (e) {
      galleryGrid.innerHTML = '<div class="empty-hint">无法连接服务器，请确认 server.js 已启动。</div>';
      return;
    }
    renderGallery();
  }
  function renderGallery() {
    galleryGrid.innerHTML = '';
    if (!galItems.length) { galleryGrid.innerHTML = '<div class="empty-hint">画廊还是空的，等待管理员添加作品。</div>'; return; }
    galAdminBar.hidden = !isAdmin();
    galItems.forEach(item => {
      const cell = document.createElement('div');
      cell.className = 'g';
      if (item.type === 'image') {
        cell.classList.add('g-img');
        cell.innerHTML = '<img src="' + esc(item.image) + '" alt="" loading="lazy">';
      } else {
        cell.style.setProperty('--g1', item.g1 || '#3c7fb1');
        cell.style.setProperty('--g2', item.g2 || '#245edb');
      }
      cell.insertAdjacentHTML('beforeend', '<span class="g-label">' + esc(item.title) + '</span>');
      if (isAdmin()) {
        const tools = document.createElement('div');
        tools.className = 'g-tools';
        const ed = document.createElement('button');
        ed.className = 'g-tool'; ed.title = '编辑'; ed.textContent = '✎';
        ed.addEventListener('click', e => { e.stopPropagation(); openGalleryEditor(item); });
        const del = document.createElement('button');
        del.className = 'g-tool'; del.title = '删除'; del.textContent = '✕';
        del.addEventListener('click', e => { e.stopPropagation(); deleteGalleryItem(item); });
        tools.appendChild(ed); tools.appendChild(del);
        cell.appendChild(tools);
      }
      galleryGrid.appendChild(cell);
    });
  }
  async function deleteGalleryItem(item) {
    if (!confirm('确定从画廊删除「' + item.title + '」吗？')) return;
    try {
      await api('POST', '/api/admin/gallery/' + encodeURIComponent(item.id) + '/delete');
      showMsgToast('已删除：' + item.title);
      loadGallery();
    } catch (e) { showMsgToast('操作失败：' + e.message); }
  }
  function openGalleryEditor(item) {
    const isNew = !item;
    const box = document.createElement('div');
    box.className = 'gal-editor';
    box.innerHTML =
      '<div class="gal-ed-row"><label>标题</label><input type="text" class="gal-ed-title" maxlength="60" value="' + esc(item ? item.title : '') + '"></div>' +
      '<div class="gal-ed-row"><label>类型</label><select class="gal-ed-type">' +
        '<option value="gradient"' + (!item || item.type !== 'image' ? ' selected' : '') + '>渐变色块</option>' +
        '<option value="image"' + (item && item.type === 'image' ? ' selected' : '') + '>图片</option>' +
      '</select></div>' +
      '<div class="gal-ed-row gal-ed-grad"><label>颜色 1</label><input type="color" class="gal-ed-g1" value="' + esc(item && item.g1 || '#0058e6') + '">' +
        '<label>颜色 2</label><input type="color" class="gal-ed-g2" value="' + esc(item && item.g2 || '#5bc0ff') + '"></div>' +
      '<div class="gal-ed-row gal-ed-img" hidden><label>图片</label>' +
        '<input type="text" class="gal-ed-url" placeholder="图片 URL（https://…）" value="' + esc(item && item.type === 'image' ? item.image.replace(/^data:.*/, '') : '') + '">' +
        '<button type="button" class="xp-btn small gal-ed-file">📁 本地图片…</button>' +
        '<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp" hidden></div>' +
      '<div class="gal-ed-preview"></div>' +
      '<div class="gal-ed-btns"><button class="xp-btn small gal-ed-cancel">取消</button><button class="xp-btn small primary gal-ed-save">' + (isNew ? '添加' : '保存') + '</button></div>';
    galleryGrid.parentNode.insertBefore(box, galleryGrid);
    if (item) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const typeSel = box.querySelector('.gal-ed-type');
    const gradRow = box.querySelector('.gal-ed-grad');
    const imgRow = box.querySelector('.gal-ed-img');
    const fileBtn = box.querySelector('.gal-ed-file');
    const fileInput = box.querySelector('input[type=file]');
    const urlInput = box.querySelector('.gal-ed-url');
    const preview = box.querySelector('.gal-ed-preview');
    function syncType() {
      gradRow.hidden = typeSel.value !== 'gradient';
      imgRow.hidden = typeSel.value !== 'image';
    }
    typeSel.addEventListener('change', syncType);
    syncType();
    function updatePreview() {
      if (typeSel.value === 'gradient') {
        preview.innerHTML = '<div class="gal-prev-block" style="background:linear-gradient(135deg,' + box.querySelector('.gal-ed-g1').value + ',' + box.querySelector('.gal-ed-g2').value + ')"></div>';
      } else if (urlInput.value) {
        preview.innerHTML = '<img class="gal-prev-img" src="' + esc(urlInput.value) + '" alt="">';
      } else preview.innerHTML = '';
    }
    box.querySelector('.gal-ed-g1').addEventListener('input', updatePreview);
    box.querySelector('.gal-ed-g2').addEventListener('input', updatePreview);
    urlInput.addEventListener('input', updatePreview);
    fileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (!f) return;
      if (f.size > 300 * 1024) { showMsgToast('图片太大，请控制在 300KB 以内'); fileInput.value = ''; return; }
      const rd = new FileReader();
      rd.onload = () => { urlInput.value = rd.result; updatePreview(); };
      rd.readAsDataURL(f);
    });
    box.querySelector('.gal-ed-cancel').addEventListener('click', () => box.remove());
    box.querySelector('.gal-ed-save').addEventListener('click', async () => {
      const payload = { title: box.querySelector('.gal-ed-title').value, type: typeSel.value };
      if (payload.type === 'gradient') {
        payload.g1 = box.querySelector('.gal-ed-g1').value;
        payload.g2 = box.querySelector('.gal-ed-g2').value;
      } else {
        payload.image = urlInput.value.trim();
        if (!payload.image) { showMsgToast('请填写图片地址或选择本地图片'); return; }
      }
      try {
        if (isNew) await api('POST', '/api/admin/gallery', payload);
        else await api('POST', '/api/admin/gallery/' + encodeURIComponent(item.id), payload);
        box.remove();
        showMsgToast(isNew ? '已添加到画廊' : '画廊已更新');
        loadGallery();
      } catch (e) { showMsgToast('保存失败：' + e.message); }
    });
  }
  if (galAddBtn) galAddBtn.addEventListener('click', () => {
    const exist = galleryGrid.parentNode.querySelector('.gal-editor');
    if (exist) exist.remove();
    openGalleryEditor(null);
  });

  /* ---------- 用户账户（头像管理） ---------- */
  const acctGrid = document.getElementById('acctGrid');
  const acctBigAva = document.getElementById('acctBigAva');
  const acctName = document.getElementById('acctName');
  const acctRole = document.getElementById('acctRole');
  const acctImportBtn = document.getElementById('acctImportBtn');
  const acctResetBtn = document.getElementById('acctResetBtn');
  const acctFile = document.getElementById('acctFile');
  let acctList = null;

  async function loadAccount() {
    if (!acctGrid) return;
    acctName.textContent = loggedIn ? currentUser() : '未登录';
    acctRole.textContent = loggedIn ? (authRole === 'admin' ? '管理员' : '普通用户') : '';
    renderAvatar(acctBigAva, currentUser(), myAvatarUrl);
    if (!loggedIn) {
      acctGrid.innerHTML = '<div class="empty-hint">请先登录后更换头像。</div>';
      return;
    }
    if (acctList === null) {
      try { acctList = (await api('GET', '/api/avatars')).avatars || []; }
      catch (e) { acctList = []; }
    }
    acctGrid.innerHTML = '';
    acctList.forEach(id => {
      const b = document.createElement('button');
      b.className = 'acct-ava'; b.type = 'button'; b.title = id;
      b.innerHTML = '<img src="/assets/avatars/' + encodeURIComponent(id) + '.bmp" alt="">';
      b.addEventListener('click', () => saveAvatar('preset:' + id));
      acctGrid.appendChild(b);
    });
  }
  async function saveAvatar(value) {
    if (!loggedIn) { openLogin(); return; }
    try {
      const d = await api('POST', '/api/me/avatar', { avatar: value });
      myAvatarUrl = d.avatar || null;
      renderAvatar(smAvatar, currentUser(), myAvatarUrl);
      renderAvatar(acctBigAva, currentUser(), myAvatarUrl);
      showMsgToast('头像已更新');
      if (typeof topicListView !== 'undefined' && topicListView && !topicListView.hidden) loadForum();
    } catch (e) { showMsgToast('保存失败：' + e.message); }
  }
  if (acctImportBtn) acctImportBtn.addEventListener('click', () => {
    if (!loggedIn) { openLogin(); return; }
    acctFile.click();
  });
  if (acctFile) acctFile.addEventListener('change', () => {
    const f = acctFile.files[0];
    if (!f) return;
    if (f.size > 300 * 1024) { showMsgToast('图片太大，请控制在 300KB 以内'); acctFile.value = ''; return; }
    if (!/^image\/(png|jpe?g|gif|webp|bmp)$/i.test(f.type)) { showMsgToast('仅支持 PNG / JPG / GIF / WebP / BMP 图片'); acctFile.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => saveAvatar(rd.result);
    rd.readAsDataURL(f);
    acctFile.value = '';
  });
  if (acctResetBtn) acctResetBtn.addEventListener('click', () => {
    if (!loggedIn) { openLogin(); return; }
    saveAvatar('');
  });

  /* ---------- 记事本 ---------- */
  const npText = document.getElementById('npText');
  const npTitle = document.getElementById('npTitle');
  const npPos = document.getElementById('npPos');
  const npCount = document.getElementById('npCount');
  const NP_SAVE = 'lunahub_notepad';

  if (npText) {
    try {
      const saved = localStorage.getItem(NP_SAVE);
      if (saved) {
        npText.value = saved.text || '';
        if (saved.title) npTitle.textContent = saved.title;
      }
    } catch (e) {}
    // 自动保存（输入停止 500ms 后）
    let npTimer = null;
    npText.addEventListener('input', () => {
      updateNpStatus();
      clearTimeout(npTimer);
      npTimer = setTimeout(() => {
        try { localStorage.setItem(NP_SAVE, JSON.stringify({ text: npText.value, title: npTitle.textContent })); } catch (e) {}
      }, 500);
    });
    npText.addEventListener('keyup', updateNpStatus);
    npText.addEventListener('click', updateNpStatus);
    function updateNpStatus() {
      const pos = npText.selectionStart || 0;
      const before = npText.value.slice(0, pos);
      const lines = before.split('\n');
      npPos.textContent = '第 ' + lines.length + ' 行，第 ' + (lines[lines.length - 1].length + 1) + ' 列';
      npCount.textContent = npText.value.length + ' 个字符';
    }
    // 文件菜单：清空
    const npFileMenu = document.getElementById('npFileMenu');
    if (npFileMenu) npFileMenu.addEventListener('click', () => {
      if (confirm('清空当前内容并新建文档吗？（当前内容已自动保存，将丢失）')) {
        npText.value = '';
        npTitle.textContent = '无标题 - 记事本';
        updateNpStatus();
        try { localStorage.setItem(NP_SAVE, JSON.stringify({ text: '', title: '无标题 - 记事本' })); } catch (e) {}
      }
    });
    // 编辑菜单：全选
    const npEditMenu = document.getElementById('npEditMenu');
    if (npEditMenu) npEditMenu.addEventListener('click', () => { npText.focus(); npText.select(); });
    updateNpStatus();
  }

  /* ---------- 扫雷 ---------- */
  const msGrid = document.getElementById('msGrid');
  const msFace = document.getElementById('msFace');
  const msMines = document.getElementById('msMines');
  const msTime = document.getElementById('msTime');
  const msDiff = document.getElementById('msDiff');
  const MS_DIFFS = [
    { key: '初级',   w: 9,  h: 9,  n: 10 },
    { key: '中级',   w: 16, h: 16, n: 40 },
    { key: '高级',   w: 30, h: 16, n: 99 }
  ];
  const NUM_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
  let msW = 9, msH = 9, msN = 10, msDiffIdx = 0;
  let msBoard = null, msState = 'ready', msTimer = null, msSec = 0, msFlags = 0, msOpened = 0;

  function msLcd(el, v) {
    v = Math.max(-99, Math.min(999, v));
    let s = v < 0 ? '-' + String(Math.abs(v)).padStart(2, '0') : String(v).padStart(3, '0');
    el.textContent = s;
  }
  function msNewGame() {
    clearInterval(msTimer); msTimer = null;
    msSec = 0; msFlags = 0; msOpened = 0; msState = 'ready';
    msLcd(msTime, 0); msLcd(msMines, msN);
    msFace.textContent = '🙂';
    msGrid.innerHTML = '';
    msGrid.style.gridTemplateColumns = 'repeat(' + msW + ', 20px)';
    msBoard = [];
    for (let r = 0; r < msH; r++) {
      const row = [];
      for (let c = 0; c < msW; c++) {
        const cell = document.createElement('button');
        cell.className = 'ms-c';
        cell.type = 'button';
        cell.dataset.r = r; cell.dataset.c = c;
        msGrid.appendChild(cell);
        row.push({ el: cell, mine: false, open: false, flag: 0, near: 0 });
      }
      msBoard.push(row);
    }
  }
  function msNeighbors(r, c) {
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < msH && nc >= 0 && nc < msW) out.push([nr, nc]);
    }
    return out;
  }
  function msPlant(safeR, safeC) {
    let placed = 0;
    const forbidden = new Set([safeR + ',' + safeC].concat(msNeighbors(safeR, safeC).map(x => x[0] + ',' + x[1])));
    while (placed < msN) {
      const r = Math.floor(Math.random() * msH), c = Math.floor(Math.random() * msW);
      if (msBoard[r][c].mine || forbidden.has(r + ',' + c)) continue;
      msBoard[r][c].mine = true; placed++;
    }
    for (let r = 0; r < msH; r++) for (let c = 0; c < msW; c++)
      msBoard[r][c].near = msNeighbors(r, c).filter(x => msBoard[x[0]][x[1]].mine).length;
  }
  function msStartTimer() {
    msTimer = setInterval(() => { msSec++; msLcd(msTime, msSec); if (msSec >= 999) clearInterval(msTimer); }, 1000);
  }
  function msOpenCell(r, c) {
    const cell = msBoard[r][c];
    if (msState === 'lost' || msState === 'won') return;
    if (cell.open || cell.flag === 1) return;
    if (msState === 'ready') { msPlant(r, c); msState = 'playing'; msStartTimer(); }
    if (cell.mine) return msExplode(r, c);
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const cur = msBoard[cr][cc];
      if (cur.open || cur.flag === 1 || cur.mine) continue;
      cur.open = true; msOpened++;
      cur.el.classList.add('open');
      if (cur.near) {
        cur.el.textContent = cur.near;
        cur.el.style.color = NUM_COLORS[cur.near];
      }
      if (cur.near === 0) msNeighbors(cr, cc).forEach(x => { if (!msBoard[x[0]][x[1]].open) stack.push(x); });
    }
    if (msOpened === msW * msH - msN) msWin();
  }
  function msExplode(r, c) {
    msState = 'lost';
    clearInterval(msTimer);
    msFace.textContent = '😵';
    for (let rr = 0; rr < msH; rr++) for (let cc = 0; cc < msW; cc++) {
      const cell = msBoard[rr][cc];
      if (cell.mine && cell.flag !== 1) { cell.el.classList.add('open', 'boom'); cell.el.textContent = '💣'; }
      if (!cell.mine && cell.flag === 1) { cell.el.classList.add('wrong'); cell.el.textContent = '❌'; }
    }
    msBoard[r][c].el.classList.add('hit');
    showMsgToast('💥 踩雷了！点击笑脸重新开始');
  }
  function msWin() {
    msState = 'won';
    clearInterval(msTimer);
    msFace.textContent = '😎';
    for (let r = 0; r < msH; r++) for (let c = 0; c < msW; c++) {
      const cell = msBoard[r][c];
      if (cell.mine && cell.flag !== 1) { cell.flag = 1; cell.el.textContent = '🚩'; msFlags++; }
    }
    msLcd(msMines, 0);
    showMsgToast('🎉 扫雷成功！用时 ' + msSec + ' 秒');
  }
  if (msGrid) {
    msGrid.addEventListener('mousedown', e => {
      if (msState === 'playing' || msState === 'ready') {
        if (e.button === 0 && !e.target.classList.contains('open')) msFace.textContent = '😮';
      }
    });
    msGrid.addEventListener('mouseup', () => { if (msState === 'playing' || msState === 'ready') msFace.textContent = '🙂'; });
    msGrid.addEventListener('click', e => {
      const t = e.target.closest('.ms-c');
      if (!t) return;
      msOpenCell(parseInt(t.dataset.r, 10), parseInt(t.dataset.c, 10));
    });
    msGrid.addEventListener('contextmenu', e => {
      e.preventDefault();
      const t = e.target.closest('.ms-c');
      if (!t || msState === 'lost' || msState === 'won') return;
      const cell = msBoard[t.dataset.r][t.dataset.c];
      if (cell.open) return;
      cell.flag = (cell.flag + 1) % 3;
      cell.el.textContent = cell.flag === 1 ? '🚩' : cell.flag === 2 ? '❓' : '';
      msFlags += cell.flag === 1 ? 1 : cell.flag === 2 ? -1 : 0;
      msLcd(msMines, msN - msFlags);
    });
    msGrid.addEventListener('dblclick', e => {
      const t = e.target.closest('.ms-c');
      if (!t) return;
      const r = parseInt(t.dataset.r, 10), c = parseInt(t.dataset.c, 10);
      const cell = msBoard[r][c];
      if (!cell.open || !cell.near || msState !== 'playing') return;
      const near = msNeighbors(r, c);
      const flagged = near.filter(x => msBoard[x[0]][x[1]].flag === 1).length;
      if (flagged === cell.near) near.forEach(x => msOpenCell(x[0], x[1]));
    });
    if (msFace) msFace.addEventListener('click', msNewGame);
    const msGameMenu = document.getElementById('msGameMenu');
    if (msGameMenu) msGameMenu.addEventListener('click', () => {
      const names = MS_DIFFS.map(d => d.key + '（' + d.w + '×' + d.h + '，' + d.n + ' 雷）').join('\n');
      const pick = prompt('选择难度，输入数字：\n1. 初级（9×9，10 雷）\n2. 中级（16×16，40 雷）\n3. 高级（30×16，99 雷）\n\n当前：' + names.split('\n')[msDiffIdx], String(msDiffIdx + 1));
      if (!pick) return;
      const i = parseInt(pick, 10) - 1;
      if (i >= 0 && i < MS_DIFFS.length && i !== msDiffIdx) {
        const d = MS_DIFFS[i];
        msDiffIdx = i; msW = d.w; msH = d.h; msN = d.n;
        msDiff.textContent = '难度：' + d.key + '（' + d.w + '×' + d.h + '，' + d.n + ' 雷）';
        const win = document.getElementById('mines');
        win.style.width = Math.min(Math.max(d.w * 20 + 70, 230), 760) + 'px';
        win.style.height = '';
        msNewGame();
      }
    });
    msNewGame();
  }

  /* ---------- Luna媒体播放器（音乐 + 视频） ---------- */
  const muAudio = document.getElementById('muAudio');
  const muList = document.getElementById('muList');
  const muName = document.getElementById('muName');
  const muArtist = document.getElementById('muArtist');
  const muPlay = document.getElementById('muPlay');
  const muPrev = document.getElementById('muPrev');
  const muNext = document.getElementById('muNext');
  const muMode = document.getElementById('muMode');
  const muSeek = document.getElementById('muSeek');
  const muVol = document.getElementById('muVol');
  const muCur = document.getElementById('muCur');
  const muDur = document.getElementById('muDur');
  const muDisc = document.getElementById('muDisc');
  const muWinTitle = document.getElementById('muTitle');
  const muTabMusic = document.getElementById('muTabMusic');
  const muTabVideo = document.getElementById('muTabVideo');
  const muPaneMusic = document.getElementById('muPaneMusic');
  const muPaneVideo = document.getElementById('muPaneVideo');
  const muVideo = document.getElementById('muVideo');
  const muVideoList = document.getElementById('muVideoList');
  const muVideoName = document.getElementById('muVideoName');
  const muAdminBar = document.getElementById('muAdminBar');
  const muAdd = document.getElementById('muAdd');
  const muFile = document.getElementById('muFile');
  let MU_ITEMS = [];    // 音乐条目（管理员可见已隐藏项）
  let MU_VIDEOS = [];   // 视频条目
  let muIdx = -1, muModes = ['list', 'one', 'shuffle'], muModeIdx = 0, muSeeking = false, muCurId = null, muMediaLoaded = false;

  function muFmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function muSrc(it) { return '/assets/' + it.file; }
  function muEmpty(container, txt) {
    const d = document.createElement('div');
    d.className = 'mu-empty';
    d.textContent = txt;
    container.appendChild(d);
  }
  function muOpBtn(cls, title, txt, onClick) {
    const b = document.createElement('span');
    b.className = 'mu-op ' + cls; b.title = title; b.textContent = txt;
    b.addEventListener('click', function (ev) { ev.stopPropagation(); onClick(); });
    return b;
  }
  async function muToggleHidden(it) {
    try {
      await api('POST', '/api/admin/media/' + it.id + '/hide', { hidden: !it.hidden });
      showMsgToast(it.hidden ? '已显示：' + it.name : '已隐藏：' + it.name);
      await loadMedia(true);
    } catch (e) { showMsgToast('操作失败：' + e.message); }
  }
  async function muDeleteItem(it) {
    if (!confirm('确定要删除「' + it.name + '」吗？文件将被移除，此操作不可恢复。')) return;
    try {
      await api('POST', '/api/admin/media/' + it.id + '/delete');
      showMsgToast('已删除：' + it.name);
      await loadMedia(true);
    } catch (e) { showMsgToast('删除失败：' + e.message); }
  }
  function muAdminButtons(it) {
    const frag = document.createDocumentFragment();
    frag.appendChild(muOpBtn('mu-op-hide', it.hidden ? '取消隐藏' : '隐藏', it.hidden ? '👁' : '🚫', () => muToggleHidden(it)));
    frag.appendChild(muOpBtn('mu-op-del', '删除', '✕', () => muDeleteItem(it)));
    return frag;
  }
  function muRenderList() {
    if (!muList) return;
    muList.innerHTML = '';
    if (!MU_ITEMS.length) { muEmpty(muList, '（播放列表为空）'); return; }
    const admin = isAdminRole();
    MU_ITEMS.forEach((t, i) => {
      const li = document.createElement('button');
      li.type = 'button';
      li.className = 'mu-item' + (i === muIdx ? ' active' : '') + (t.hidden ? ' dim' : '');
      li.innerHTML = '<span class="mu-item-idx">' + (i === muIdx && !muAudio.paused ? '▶' : String(i + 1)) + '</span>' +
        '<span class="mu-item-name">' + esc(t.name) + (t.hidden ? ' <i class="mu-tag">已隐藏</i>' : '') + '</span>' +
        '<span class="mu-item-artist">' + esc(t.artist || '') + '</span>';
      if (admin) li.appendChild(muAdminButtons(t));
      li.addEventListener('click', () => muPlayIdx(i));
      muList.appendChild(li);
    });
  }
  function muRenderVideoList() {
    if (!muVideoList) return;
    muVideoList.innerHTML = '';
    if (!MU_VIDEOS.length) { muEmpty(muVideoList, '（暂无视频）'); return; }
    const admin = isAdminRole();
    MU_VIDEOS.forEach(t => {
      const li = document.createElement('button');
      li.type = 'button';
      li.className = 'mu-item mu-item-video' + (muVideoName.textContent === t.name ? ' active' : '') + (t.hidden ? ' dim' : '');
      li.innerHTML = '<span class="mu-item-idx">🎬</span>' +
        '<span class="mu-item-name">' + esc(t.name) + (t.hidden ? ' <i class="mu-tag">已隐藏</i>' : '') + '</span>';
      if (admin) li.appendChild(muAdminButtons(t));
      li.addEventListener('click', () => muPlayVideo(t));
      muVideoList.appendChild(li);
    });
  }
  function muSafePlay(a) {
    try { const p = a.play(); if (p && typeof p.catch === 'function') p.catch(function() {}); } catch (e) {}
  }
  function muPlayVideo(t) {
    if (!t) return;
    muVideo.src = muSrc(t);
    muVideoName.textContent = t.name;
    muSafePlay(muVideo);
    muRenderVideoList();
  }
  function muPlayIdx(i, autoplay) {
    if (!MU_ITEMS.length) { showMsgToast('播放列表为空'); return; }
    muIdx = (i + MU_ITEMS.length) % MU_ITEMS.length;
    const t = MU_ITEMS[muIdx];
    muCurId = t.id;
    muAudio.src = muSrc(t);
    muName.textContent = t.name;
    muArtist.textContent = t.artist || '—';
    muWinTitle.textContent = t.name + ' - Luna媒体播放器';
    if (autoplay !== false) muSafePlay(muAudio);
    muRenderList();
  }
  async function loadMedia(force) {
    try {
      const d = await api('GET', '/api/media');
      const items = (d && d.items) || [];
      MU_ITEMS = items.filter(x => x.type === 'music');
      MU_VIDEOS = items.filter(x => x.type === 'video');
    } catch (e) { if (force) showMsgToast('媒体列表加载失败：' + e.message); }
    // 当前播放的曲目被删掉 → 复位
    if (muCurId !== null) {
      const ni = MU_ITEMS.findIndex(x => x.id === muCurId);
      if (ni < 0 && muIdx >= 0) {
        try { muAudio.pause(); muAudio.removeAttribute('src'); muAudio.load(); } catch (e) {}
        muIdx = -1; muCurId = null;
        muName.textContent = '未在播放';
        muArtist.textContent = 'Luna媒体播放器';
        muWinTitle.textContent = 'Luna媒体播放器';
        muCur.textContent = '00:00'; muDur.textContent = '00:00'; muSeek.value = 0;
      } else if (ni >= 0) muIdx = ni;
    }
    muMediaLoaded = true;
    muRenderList();
    muRenderVideoList();
  }
  function muRefreshAdminUI() {
    if (muAdminBar) muAdminBar.hidden = !isAdminRole();
  }
  // 标签页切换（切换时暂停另一侧）
  if (muTabMusic && muTabVideo) {
    muTabMusic.addEventListener('click', () => {
      muTabMusic.classList.add('active'); muTabVideo.classList.remove('active');
      muPaneMusic.hidden = false; muPaneVideo.hidden = true;
      try { if (!muVideo.paused) muVideo.pause(); } catch (e) {}
    });
    muTabVideo.addEventListener('click', () => {
      muTabVideo.classList.add('active'); muTabMusic.classList.remove('active');
      muPaneVideo.hidden = false; muPaneMusic.hidden = true;
      try { muAudio.pause(); } catch (e) {}
    });
  }
  // 管理员上传音乐/视频
  if (muAdd && muFile) {
    muAdd.addEventListener('click', () => {
      if (!isAdminRole()) { showMsgToast('仅管理员可添加媒体'); return; }
      muFile.click();
    });
    muFile.addEventListener('change', () => {
      const f = muFile.files && muFile.files[0];
      if (!f) return;
      const okRe = /\.(mp3|wav|ogg|flac|m4a|aac|mp4|webm|mkv|mov)$/i;
      const isAudio = /^audio\//i.test(f.type);
      const isVideo = /^video\//i.test(f.type);
      if (!isAudio && !isVideo && !okRe.test(f.name)) {
        showMsgToast('不支持的格式（WMA/WMV 请先转成 MP3/MP4）'); muFile.value = ''; return;
      }
      if (/\.wma$|\.wmv$/i.test(f.name) || /ms-wma|ms-wmv/i.test(f.type)) {
        showMsgToast('浏览器不支持 WMA/WMV，请先转换成 MP3/MP4'); muFile.value = ''; return;
      }
      if (f.size > 50 * 1024 * 1024) { showMsgToast('文件超过 50MB 上限'); muFile.value = ''; return; }
      const defaultName = f.name.replace(/\.[^.]+$/, '').slice(0, 40) || '未命名';
      const name = prompt('媒体名称：', defaultName) || defaultName;
      const type = isVideo ? '视频' : '音乐';
      const artist = isVideo ? '' : (prompt('艺术家（可留空）：', '') || '');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const d = await api('POST', '/api/admin/media', { name, artist, type: isVideo ? 'video' : 'music', data: reader.result });
          showMsgToast('已添加' + type + '：' + (d.item && d.item.name));
          muFile.value = '';
          await loadMedia(true);
          const it = d.item;
          if (it && it.type === 'music') {
            const ni = MU_ITEMS.findIndex(x => x.id === it.id);
            if (ni >= 0) { muTabMusic.click(); muPlayIdx(ni); }
          } else if (it) {
            muTabVideo.click();
            muPlayVideo(MU_VIDEOS.find(x => x.id === it.id) || it);
          }
        } catch (e) { showMsgToast('上传失败：' + e.message); muFile.value = ''; }
      };
      reader.onerror = () => { showMsgToast('读取文件失败'); muFile.value = ''; };
      reader.readAsDataURL(f);
    });
  }
  if (muAudio) {
    muAudio.volume = 0.8;
    muAudio.addEventListener('play', () => { muPlay.textContent = '⏸'; muDisc.classList.add('spin'); muRenderList(); });
    muAudio.addEventListener('pause', () => { muPlay.textContent = '▶'; muDisc.classList.remove('spin'); muRenderList(); });
    muAudio.addEventListener('loadedmetadata', () => { muDur.textContent = muFmt(muAudio.duration); });
    muAudio.addEventListener('timeupdate', () => {
      muCur.textContent = muFmt(muAudio.currentTime);
      if (!muSeeking && muAudio.duration) muSeek.value = Math.round(muAudio.currentTime / muAudio.duration * 1000);
    });
    muAudio.addEventListener('ended', () => {
      const mode = muModes[muModeIdx];
      if (mode === 'one') { muAudio.currentTime = 0; muSafePlay(muAudio); }
      else if (mode === 'shuffle') { let n; do { n = Math.floor(Math.random() * MU_ITEMS.length); } while (n === muIdx && MU_ITEMS.length > 1); muPlayIdx(n); }
      else if (muIdx === MU_ITEMS.length - 1) muPlayIdx(0);
      else muPlayIdx(muIdx + 1);
    });
    muAudio.addEventListener('error', () => {
      if (muIdx >= 0 && MU_ITEMS[muIdx]) showMsgToast('无法播放：' + MU_ITEMS[muIdx].name + '（文件缺失或格式不支持）');
    });
    muPlay.addEventListener('click', () => {
      if (muIdx < 0) { muPlayIdx(0); return; }
      if (muAudio.paused) muSafePlay(muAudio); else muAudio.pause();
    });
    muPrev.addEventListener('click', () => {
      if (muAudio.currentTime > 3) { muAudio.currentTime = 0; return; }
      muPlayIdx(muIdx < 0 ? 0 : muIdx - 1);
    });
    muNext.addEventListener('click', () => muPlayIdx(muIdx < 0 ? 0 : muIdx + 1));
    muMode.addEventListener('click', () => {
      muModeIdx = (muModeIdx + 1) % muModes.length;
      muMode.textContent = { list: '🔁', one: '🔂', shuffle: '🔀' }[muModes[muModeIdx]];
      muMode.title = { list: '列表循环', one: '单曲循环', shuffle: '随机播放' }[muModes[muModeIdx]];
      showMsgToast('播放模式：' + { list: '列表循环', one: '单曲循环', shuffle: '随机播放' }[muModes[muModeIdx]]);
    });
    muSeek.addEventListener('input', () => { muSeeking = true; });
    muSeek.addEventListener('change', () => {
      if (muAudio.duration) muAudio.currentTime = muSeek.value / 1000 * muAudio.duration;
      muSeeking = false;
    });
    muVol.addEventListener('input', () => { muAudio.volume = muVol.value / 100; });
    if (muVideo) muVideo.volume = 0.9;
  }

  /* ---------- Luna照片查看器 ---------- */
  const phImg = document.getElementById('phImg');
  const phStage = document.getElementById('phStage');
  const phEmpty = document.getElementById('phEmpty');
  const phWinTitle = document.getElementById('phWinTitle');
  const phName = document.getElementById('phName');
  const phDim = document.getElementById('phDim');
  const phZoomInfo = document.getElementById('phZoomInfo');
  const phCount = document.getElementById('phCount');
  const phFile = document.getElementById('phFile');
  let PH_LIST = [];            // [{ name, url }]
  let phIdx = -1;
  let phZoom = 1;              // 缩放倍率
  let phRot = 0;               // 旋转角度（0/90/180/270）
  let phFitMode = true;        // true = 最佳大小自适应
  let phPanX = 0, phPanY = 0;  // 平移偏移（放大后拖动）
  let phSlideTimer = null;

  function phStopSlide() {
    if (phSlideTimer) { clearInterval(phSlideTimer); phSlideTimer = null; document.getElementById('phSlide').textContent = '⏵'; }
  }

  function phApply() {
    if (!phImg.src) return;
    phImg.style.transform = 'translate(' + phPanX + 'px,' + phPanY + 'px) rotate(' + phRot + 'deg) scale(' + phZoom + ')';
    phZoomInfo.textContent = '缩放 ' + Math.round(phZoom * 100) + '%';
    phDim.textContent = phImg.naturalWidth ? (phImg.naturalWidth + ' × ' + phImg.naturalHeight + (phRot % 180 ? '（旋转 ' + phRot + '°）' : '')) : '';
    phCount.textContent = PH_LIST.length ? (phIdx + 1) + ' / ' + PH_LIST.length : '';
  }

  function phFitCalc() {
    const iw = phImg.naturalWidth, ih = phImg.naturalHeight;
    if (!iw || !ih) return 1;
    const sw = phStage.clientWidth - 24, sh = phStage.clientHeight - 24;
    return Math.min(sw / iw, sh / ih, 8);
  }

  function phShow(i) {
    if (!PH_LIST.length) {
      phIdx = -1; phImg.removeAttribute('src'); phEmpty.hidden = false;
      phName.textContent = '未打开图片'; phDim.textContent = ''; phZoomInfo.textContent = '';
      phCount.textContent = ''; phWinTitle.textContent = 'Luna照片查看器'; phStopSlide();
      return;
    }
    phIdx = ((i % PH_LIST.length) + PH_LIST.length) % PH_LIST.length;
    const it = PH_LIST[phIdx];
    phPanX = 0; phPanY = 0; phRot = 0; phFitMode = true;
    phEmpty.hidden = true;
    phImg.src = it.url;
    phName.textContent = it.name;
    phCount.textContent = PH_LIST.length ? (phIdx + 1) + ' / ' + PH_LIST.length : '';
    phZoomInfo.textContent = '';
    phDim.textContent = '';
    phWinTitle.textContent = it.name + ' - Luna照片查看器';
    phImg.onload = () => { if (phFitMode) phZoom = phFitCalc(); phApply(); };
    if (phImg.complete && phImg.naturalWidth) { if (phFitMode) phZoom = phFitCalc(); phApply(); }
  }

  // 示例图片：从预置壁纸提取真实图片项
  const XP_SAMPLES = [
    { name: 'Blue hills',    url: 'assets/samples/blue-hills.jpg' },
    { name: 'Sunset',        url: 'assets/samples/sunset.jpg' },
    { name: 'Water lilies',  url: 'assets/samples/water-lilies.jpg' },
    { name: 'Winter',        url: 'assets/samples/winter.jpg' }
  ];
  function phLoadSample() {
    const list = XP_SAMPLES.slice();
    WALLPAPERS.forEach(w => {
      const m = /url\('([^']+)'\)/.exec(w.value || '');
      if (m) list.push({ name: w.name, url: m[1] });
    });
    customWPs.forEach(u => { if (u.file) list.push({ name: u.name + '（上传）', url: '/assets/wallpapers/user/' + u.file }); });
    if (list.length) { PH_LIST = list; phShow(0); }
  }

  document.getElementById('phOpen').addEventListener('click', () => phFile.click());
  document.getElementById('phSample').addEventListener('click', phLoadSample);
  document.getElementById('phPrev').addEventListener('click', () => phShow(phIdx - 1));
  document.getElementById('phNext').addEventListener('click', () => phShow(phIdx + 1));
  document.getElementById('phFit').addEventListener('click', () => {
    phFitMode = true; phPanX = 0; phPanY = 0; phZoom = phFitCalc(); phApply();
  });
  document.getElementById('phFull').addEventListener('click', () => {
    phFitMode = false; phZoom = 1; phPanX = 0; phPanY = 0; phApply();
  });
  document.getElementById('phZoomIn').addEventListener('click', () => {
    phFitMode = false; phZoom = Math.min(8, phZoom * 1.25); phApply();
  });
  document.getElementById('phZoomOut').addEventListener('click', () => {
    phFitMode = false; phZoom = Math.max(0.05, phZoom / 1.25); phApply();
  });
  document.getElementById('phRotL').addEventListener('click', () => { phRot = (phRot + 270) % 360; phApply(); });
  document.getElementById('phRotR').addEventListener('click', () => { phRot = (phRot + 90) % 360; phApply(); });
  document.getElementById('phSlide').addEventListener('click', function () {
    if (phSlideTimer) { phStopSlide(); return; }
    if (!PH_LIST.length) { showMsgToast('请先打开图片'); return; }
    this.textContent = '⏸';
    phSlideTimer = setInterval(() => phShow(phIdx + 1), 3000);
  });

  // 滚轮缩放
  phStage.addEventListener('wheel', e => {
    if (!phImg.src) return;
    e.preventDefault();
    phFitMode = false;
    phZoom = e.deltaY < 0 ? Math.min(8, phZoom * 1.15) : Math.max(0.05, phZoom / 1.15);
    phApply();
  }, { passive: false });

  // 放大后拖动平移
  let phDragging = false, phDragSX = 0, phDragSY = 0, phBaseX = 0, phBaseY = 0;
  phImg.addEventListener('pointerdown', e => {
    if (!phImg.src) return;
    phDragging = true; phDragSX = e.clientX; phDragSY = e.clientY; phBaseX = phPanX; phBaseY = phPanY;
    phImg.setPointerCapture(e.pointerId);
    phImg.style.cursor = 'grabbing';
  });
  phImg.addEventListener('pointermove', e => {
    if (!phDragging) return;
    phPanX = phBaseX + e.clientX - phDragSX;
    phPanY = phBaseY + e.clientY - phDragSY;
    phApply();
  });
  phImg.addEventListener('pointerup', e => {
    phDragging = false;
    try { phImg.releasePointerCapture(e.pointerId); } catch (err) {}
    phImg.style.cursor = phZoom > 1 ? 'grab' : 'default';
  });

  // 打开本地图片（可多选，替换当前列表）
  phFile.addEventListener('change', () => {
    const files = Array.from(phFile.files || []);
    phFile.value = '';
    if (!files.length) return;
    PH_LIST = files.map(f => {
      let url = '';
      if (typeof URL !== 'undefined' && URL.createObjectURL) {
        try { url = URL.createObjectURL(f); } catch (e) { url = ''; }
      }
      return { name: f.name, url, file: url ? null : f };
    });
    // 无 createObjectURL 的环境退回 FileReader dataURL
    const needRead = PH_LIST.filter(x => !x.url);
    let done = 0;
    const finish = () => { if (done >= needRead.length) phShow(0); };
    if (!needRead.length) { phShow(0); return; }
    needRead.forEach(item => {
      const r = new FileReader();
      r.onload = () => { item.url = r.result; done++; finish(); };
      r.onerror = () => { done++; finish(); };
      r.readAsDataURL(item.file);
    });
  });

  // 窗口尺寸变化时保持最佳大小
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { if (phFitMode && phImg.src) { phZoom = phFitCalc(); phApply(); } }).observe(phStage);
  }

  /* ---------- Luna画图 ---------- */
  const ptCanvas = document.getElementById('ptCanvas');
  const ptCtx = ptCanvas && ptCanvas.getContext ? ptCanvas.getContext('2d') : null;
  const ptCurFg = document.getElementById('ptCurFg');
  const ptPos = document.getElementById('ptPos');
  let ptTool = 'pencil', ptSize = 2, ptColor = '#000000';
  let ptUndoStack = [];
  let ptDrawing = false, ptSX = 0, ptSY = 0, ptSnapshot = null;

  if (ptCtx) {
    ptCtx.fillStyle = '#ffffff';
    ptCtx.fillRect(0, 0, ptCanvas.width, ptCanvas.height);
    ptCtx.lineCap = 'round';
    ptCtx.lineJoin = 'round';
  }

  function ptPushUndo() {
    if (!ptCtx) return;
    try {
      ptUndoStack.push(ptCtx.getImageData(0, 0, ptCanvas.width, ptCanvas.height));
      if (ptUndoStack.length > 25) ptUndoStack.shift();
    } catch (e) {}
  }

  function ptPosOnCanvas(e) {
    const r = ptCanvas.getBoundingClientRect();
    const sx = ptCanvas.width / (r.width || 1), sy = ptCanvas.height / (r.height || 1);
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  function ptFloodFill(sx, sy, hex) {
    const W = ptCanvas.width, H = ptCanvas.height;
    sx = Math.floor(sx); sy = Math.floor(sy);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
    const img = ptCtx.getImageData(0, 0, W, H), d = img.data;
    const idx = (x, y) => (y * W + x) * 4;
    const t = idx(sx, sy);
    const tr = d[t], tg = d[t + 1], tb = d[t + 2], ta = d[t + 3];
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    if (tr === r && tg === g && tb === b && ta === 255) return;
    const stack = [[sx, sy]];
    while (stack.length) {
      const [x, y] = stack.pop();
      let xx = x;
      while (xx >= 0 && idx(xx, y) >= 0) {
        const i = idx(xx, y);
        if (d[i] !== tr || d[i + 1] !== tg || d[i + 2] !== tb || d[i + 3] !== ta) break;
        xx--;
      }
      xx++;
      let spanUp = false, spanDown = false;
      while (xx < W) {
        const i = idx(xx, y);
        if (d[i] !== tr || d[i + 1] !== tg || d[i + 2] !== tb || d[i + 3] !== ta) break;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        if (y > 0) {
          const u = idx(xx, y - 1);
          const up = d[u] === tr && d[u + 1] === tg && d[u + 2] === tb && d[u + 3] === ta;
          if (up && !spanUp) { stack.push([xx, y - 1]); spanUp = true; }
          else if (!up) spanUp = false;
        }
        if (y < H - 1) {
          const dn = idx(xx, y + 1);
          const dw = d[dn] === tr && d[dn + 1] === tg && d[dn + 2] === tb && d[dn + 3] === ta;
          if (dw && !spanDown) { stack.push([xx, y + 1]); spanDown = true; }
          else if (!dw) spanDown = false;
        }
        xx++;
      }
    }
    ptCtx.putImageData(img, 0, 0);
  }

  if (ptCtx) {
    ptCanvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = ptPosOnCanvas(e);
      if (ptTool === 'fill') { ptPushUndo(); ptFloodFill(p.x, p.y, ptColor); return; }
      ptPushUndo();
      ptDrawing = true;
      ptSX = p.x; ptSY = p.y;
      try { ptCanvas.setPointerCapture(e.pointerId); } catch (err) {}
      if (ptTool === 'pencil' || ptTool === 'brush' || ptTool === 'eraser') {
        ptCtx.strokeStyle = ptTool === 'eraser' ? '#ffffff' : ptColor;
        ptCtx.lineWidth = ptTool === 'pencil' ? 1 : ptSize;
        if (ptTool === 'eraser') ptCtx.lineWidth = Math.max(ptSize, 8);
        ptCtx.beginPath();
        ptCtx.moveTo(p.x, p.y);
        ptCtx.lineTo(p.x + 0.01, p.y + 0.01);
        ptCtx.stroke();
      } else {
        try { ptSnapshot = ptCtx.getImageData(0, 0, ptCanvas.width, ptCanvas.height); } catch (err) { ptSnapshot = null; }
      }
    });
    ptCanvas.addEventListener('pointermove', e => {
      const p = ptPosOnCanvas(e);
      ptPos.textContent = Math.round(p.x) + ', ' + Math.round(p.y);
      if (!ptDrawing) return;
      if (ptTool === 'pencil' || ptTool === 'brush' || ptTool === 'eraser') {
        ptCtx.lineTo(p.x, p.y);
        ptCtx.stroke();
      } else {
        if (ptSnapshot) ptCtx.putImageData(ptSnapshot, 0, 0);
        ptCtx.strokeStyle = ptColor;
        ptCtx.lineWidth = ptSize;
        ptCtx.beginPath();
        if (ptTool === 'line') { ptCtx.moveTo(ptSX, ptSY); ptCtx.lineTo(p.x, p.y); }
        else if (ptTool === 'rect') { ptCtx.rect(Math.min(ptSX, p.x), Math.min(ptSY, p.y), Math.abs(p.x - ptSX), Math.abs(p.y - ptSY)); }
        else if (ptTool === 'ellipse') {
          const cx = (ptSX + p.x) / 2, cy = (ptSY + p.y) / 2;
          ptCtx.ellipse(cx, cy, Math.abs(p.x - ptSX) / 2, Math.abs(p.y - ptSY) / 2, 0, 0, Math.PI * 2);
        }
        ptCtx.stroke();
      }
    });
    const ptEnd = e => {
      if (!ptDrawing) return;
      ptDrawing = false;
      ptSnapshot = null;
      try { ptCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    ptCanvas.addEventListener('pointerup', ptEnd);
    ptCanvas.addEventListener('pointercancel', ptEnd);
  }

  // 工具切换
  document.querySelectorAll('#paint .pt-tool[data-tool]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#paint .pt-tool[data-tool]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ptTool = b.dataset.tool;
    });
  });
  // 笔刷粗细
  document.querySelectorAll('#paint .pt-size').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#paint .pt-size').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ptSize = parseInt(b.dataset.size, 10) || 2;
    });
  });
  // 调色板（XP 画图 28 色）
  (function () {
    const pal = document.getElementById('ptPalette');
    if (!pal) return;
    const colors = [
      '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
      '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
      '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
      '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'
    ];
    colors.forEach(c => {
      const s = document.createElement('button');
      s.className = 'pt-swatch';
      s.type = 'button';
      s.style.background = c;
      s.title = c;
      s.addEventListener('click', () => {
        ptColor = c;
        if (ptCurFg) ptCurFg.style.background = c;
      });
      pal.appendChild(s);
    });
  })();
  // 新建 / 撤销 / 保存
  document.getElementById('ptNew').addEventListener('click', () => {
    if (!ptCtx) return;
    if (!confirm('清空画布并重新开始吗？')) return;
    ptPushUndo();
    ptCtx.fillStyle = '#ffffff';
    ptCtx.fillRect(0, 0, ptCanvas.width, ptCanvas.height);
  });
  document.getElementById('ptUndo').addEventListener('click', () => {
    if (!ptCtx || !ptUndoStack.length) return;
    ptCtx.putImageData(ptUndoStack.pop(), 0, 0);
  });
  document.getElementById('ptSave').addEventListener('click', () => {
    if (!ptCtx) return;
    try {
      const a = document.createElement('a');
      a.href = ptCanvas.toDataURL('image/png');
      a.download = 'Luna画图-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showMsgToast('已保存为 PNG 图片');
    } catch (e) { showMsgToast('保存失败：' + e.message); }
  });
  // Ctrl+Z 撤销（画图窗口打开时）
  document.addEventListener('keydown', e => {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && ptCanvas && !document.getElementById('paint').classList.contains('closed')) {
      e.preventDefault();
      document.getElementById('ptUndo').click();
    }
  });

  /* ---------- 电子教鞭（全屏批注） ---------- */
  const ptrOverlay = document.getElementById('ptrOverlay');
  const ptrCanvas = document.getElementById('ptrCanvas');
  const ptrToolbar = document.getElementById('ptrToolbar');
  const ptrCtx = ptrCanvas && ptrCanvas.getContext ? ptrCanvas.getContext('2d') : null;
  let ptrTool = 'pen', ptrColor2 = '#ff2d2d', ptrActive = false;
  let ptrDrawing = false, ptrLast = null;

  function ptrResize(keep) {
    if (!ptrCtx) return;
    const w = window.innerWidth || document.documentElement.clientWidth || 1280;
    const h = window.innerHeight || document.documentElement.clientHeight || 720;
    let old = null;
    if (keep && ptrCanvas.width && ptrCanvas.height) {
      try { old = document.createElement('canvas'); old.width = ptrCanvas.width; old.height = ptrCanvas.height; old.getContext('2d').drawImage(ptrCanvas, 0, 0); } catch (e) { old = null; }
    }
    ptrCanvas.width = w; ptrCanvas.height = h;
    ptrCtx.lineCap = 'round';
    ptrCtx.lineJoin = 'round';
    if (old) ptrCtx.drawImage(old, 0, 0);
  }

  function ptrOpen() {
    ptrActive = true;
    ptrOverlay.hidden = false;
    ptrResize(false);
  }
  function ptrClose() {
    ptrActive = false;
    ptrOverlay.hidden = true;
    ptrDrawing = false;
  }

  if (ptrCtx) {
    ptrCanvas.addEventListener('pointerdown', e => {
      ptrDrawing = true;
      ptrLast = { x: e.clientX, y: e.clientY };
      try { ptrCanvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    ptrCanvas.addEventListener('pointermove', e => {
      if (!ptrDrawing) return;
      const p = { x: e.clientX, y: e.clientY };
      ptrCtx.globalCompositeOperation = 'source-over';
      if (ptrTool === 'eraser') {
        ptrCtx.globalCompositeOperation = 'destination-out';
        ptrCtx.strokeStyle = 'rgba(0,0,0,1)';
        ptrCtx.lineWidth = 32;
      } else if (ptrTool === 'marker') {
        ptrCtx.strokeStyle = ptrColor2;
        ptrCtx.globalAlpha = 0.35;
        ptrCtx.lineWidth = 18;
      } else {
        ptrCtx.strokeStyle = ptrColor2;
        ptrCtx.globalAlpha = 1;
        ptrCtx.lineWidth = 4;
      }
      ptrCtx.beginPath();
      ptrCtx.moveTo(ptrLast.x, ptrLast.y);
      ptrCtx.lineTo(p.x, p.y);
      ptrCtx.stroke();
      ptrLast = p;
      ptrCtx.globalAlpha = 1;
    });
    const ptrEnd = e => {
      ptrDrawing = false;
      try { ptrCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    ptrCanvas.addEventListener('pointerup', ptrEnd);
    ptrCanvas.addEventListener('pointercancel', ptrEnd);
  }

  document.getElementById('ptrClose').addEventListener('click', ptrClose);
  document.getElementById('ptrClear').addEventListener('click', () => {
    if (ptrCtx) ptrCtx.clearRect(0, 0, ptrCanvas.width, ptrCanvas.height);
  });
  document.querySelectorAll('.ptr-tool[data-pto]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ptr-tool[data-pto]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ptrTool = b.dataset.pto;
    });
  });
  document.querySelectorAll('.ptr-color').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ptr-color').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ptrColor2 = b.dataset.color;
    });
  });
  // 工具条拖动（按住标题栏）
  (function () {
    const head = document.getElementById('ptrTbHead');
    let drag = false, sx = 0, sy = 0, bx = 0, by = 0;
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('#ptrClose')) return;
      drag = true; sx = e.clientX; sy = e.clientY;
      const r = ptrToolbar.getBoundingClientRect();
      bx = r.left; by = r.top;
      try { head.setPointerCapture(e.pointerId); } catch (err) {}
    });
    head.addEventListener('pointermove', e => {
      if (!drag) return;
      ptrToolbar.style.left = (bx + e.clientX - sx) + 'px';
      ptrToolbar.style.top = (by + e.clientY - sy) + 'px';
    });
    head.addEventListener('pointerup', e => {
      drag = false;
      try { head.releasePointerCapture(e.pointerId); } catch (err) {}
    });
  })();
  // Esc 退出教鞭
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && ptrActive) ptrClose();
  });
  // 窗口尺寸变化时保持批注（重设画布前先备份）
  window.addEventListener('resize', () => { if (ptrActive) ptrResize(true); });

  // 打开窗口时自动初始化对应内容
  const _openOrig = WM.open.bind(WM);
  WM.open = function (id) { _openOrig(id); if (id === 'browser' && brwHistIdx < 0) showHome(); else if (id === 'topics') loadForum(); else if (id === 'forums') { if (!forumCache) loadForum(); else renderForums(); } else if (id === 'admin') openAdmin(); else if (id === 'gallery') loadGallery(); else if (id === 'account') loadAccount(); else if (id === 'music') { muRefreshAdminUI(); if (!muMediaLoaded) loadMedia(); } else if (id === 'photos') { if (!PH_LIST.length) phLoadSample(); } else if (id === 'pointer') { ptrOpen(); } };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const p = n => ('' + (n < 10 ? '0' : '') + n);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------- 时钟 ---------- */
  const clock = document.getElementById('clock');
  function tick() {
    const d = new Date();
    const p = n => (n < 10 ? '0' : '') + n;
    clock.textContent = p(d.getHours()) + ':' + p(d.getMinutes());
  }
  tick(); setInterval(tick, 1000 * 30);

  /* ---------- 启动 ---------- */
  try {
    const u = localStorage.getItem(SAVE_KEY);
    const tk = localStorage.getItem(TOKEN_KEY);
    const rl = localStorage.getItem(ROLE_KEY);
    if (u && tk) { loggedIn = true; authToken = tk; authRole = rl; setUserUI(u); }
  } catch (e) {}
  updateAuthUI();
  // 校验 token 是否仍然有效，并刷新角色与头像
  if (authToken) {
    api('GET', '/api/me').then(d => { authRole = d.role; setUserUI(currentUser(), d.avatar === undefined ? undefined : (d.avatar || null)); updateAuthUI(); })
      .catch(() => { /* token 失效，下次操作会提示登录 */ });
  }
  WM.open('home');

})();
