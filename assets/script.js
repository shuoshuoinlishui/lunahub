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
    calculator: { icon: '🧮', title: '计算器' },
    pptlou: { icon: '📽️', title: 'PowerPoint' },
    excel:   { icon: '📊', title: 'Excel' },
    whack:   { icon: '🐹', title: '打地鼠' },
    memo:    { icon: '🃏', title: '记忆翻牌' },
    gomoku:  { icon: '⚫', title: '五子棋' },
    go:      { icon: '⚫', title: 'Luna围棋大师' },
    tictactoe:{ icon: '🔲', title: '井字棋' },
    convert: { icon: '🔁', title: '单位换算' },
    calendar:{ icon: '📅', title: '日历' },
    help:    { icon: '📖', title: '使用说明' },
    appearance: { icon: '🎨', title: '外观和个性化' },
    control:    { icon: '🛠️', title: '控制面板' },
    account:    { icon: '👤', title: '用户账户' },
    admin:     { icon: '🛡️', title: '管理后台' }
  };

  /* ---------- 桌面应用清单（管理员可在后台控制显示/隐藏） ---------- */
  const DESK_APPS = [
    { id: 'home',      icon: '🖥️', title: '我的电脑' },
    { id: 'browser',   icon: '🌐', title: 'Internet Explorer' },
    { id: 'pptlou',    icon: '📽️', title: 'PowerPoint' },
    { id: 'excel',     icon: '📊', title: 'Excel' },
    { id: 'notepad',   icon: '📝', title: '记事本' },
    { id: 'mines',     icon: '💣', title: '扫雷' },
    { id: 'music',     icon: '🎵', title: 'Luna媒体播放 器' },
    { id: 'photos',    icon: '📷', title: 'Luna照片查看器' },
    { id: 'gallery',   icon: '🖼️', title: '画廊精选' },
    { id: 'paint',     icon: '🎨', title: 'Luna画图' },
    { id: 'pointer',   icon: '🖍️', title: '电子教鞭' },
    { id: 'forums',    icon: '📂', title: '论坛分区' },
    { id: 'donate',    icon: '💝', title: '捐赠支持' },
    { id: 'calendar',  icon: '📅', title: '日历' },
    { id: 'whack',     icon: '🐹', title: '打地鼠' },
    { id: 'memo',      icon: '🃏', title: '记忆翻牌' },
    { id: 'gomoku',    icon: '⚫', title: '五子棋' },
    { id: 'go',        icon: '⚫', title: 'Luna围棋大师' },
    { id: 'tictactoe', icon: '🔲', title: '井字棋' },
    { id: 'convert',   icon: '🔁', title: '单位换算' }
  ];
  const DESK_KEY = 'lunahub_deskapps';
  function loadDeskApps() {
    try { const s = JSON.parse(localStorage.getItem(DESK_KEY)); if (Array.isArray(s) && s.length) return new Set(s); } catch (e) {}
    return new Set(DESK_APPS.map(a => a.id));
  }
  function saveDeskApps(set) { try { localStorage.setItem(DESK_KEY, JSON.stringify([...set])); } catch (e) {} }
  function renderDesktopIcons() {
    if (!deskIcons) return;
    const enabled = loadDeskApps();
    deskIcons.querySelectorAll('[data-deskapp]').forEach(el => el.remove());
    DESK_APPS.forEach(a => {
      if (!enabled.has(a.id)) return;
      const b = document.createElement('button');
      b.className = 'dico'; b.dataset.app = a.id; b.dataset.deskapp = '1';
      b.innerHTML = '<span class="di-ico">' + a.icon + '</span><span class="di-txt">' + a.title + '</span>';
      deskIcons.appendChild(b);
    });
  }

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
      b.addEventListener('mouseenter', () => { if (__tpTimer) { clearTimeout(__tpTimer); __tpTimer = null; } showTaskPreview(this, b); });
      b.addEventListener('mouseleave', () => { __tpTimer = setTimeout(hideTaskPreview, 160); });
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

    shakeOthers() {
      if (!document.body.classList.contains('theme-aero')) return;
      const others = Object.values(WM.wins).filter(o => o.id !== this.id && !o.el.classList.contains('closed'));
      if (others.length) {
        others.forEach(o => o.minimize());
      } else {
        Object.values(WM.wins).forEach(o => {
          if (o.id !== this.id && o.taskBtn && o.taskBtn.style.display !== 'none' && o.el.classList.contains('closed')) o.open();
        });
      }
    }

    startDrag(e) {
      if (e.target.closest('.wb')) return;
      if (this.el.classList.contains('maximized')) return;
      WM.focus(this.id);
      this.el.classList.add('dragging');
      this.el.classList.remove('snapped');
      const r = this.el.getBoundingClientRect();
      const offX = e.clientX - r.left, offY = e.clientY - r.top;
      const dw = desktop.clientWidth, dh = desktop.clientHeight - taskbarH;
      const aero = document.body.classList.contains('theme-aero');
      let preview = null;
      // —— Aero Shake：拖拽时左右反复甩动 → 最小化/恢复其余窗口 ——
      let shakePrevX = e.clientX, shakeLastDir = 0, shakeAccum = 0, shakeReversals = 0, shakeTotal = 0, shook = false;
      const getSnap = (x, y) => {
        if (y <= 24) return 'top';
        if (x <= 24) return 'left';
        if (x >= dw - 24) return 'right';
        return null;
      };
      const showPreview = zone => {
        if (!aero) return;
        if (!zone) { if (preview) preview.style.display = 'none'; return; }
        if (!preview) { preview = document.createElement('div'); preview.id = 'snapPreview'; document.body.appendChild(preview); }
        preview.style.display = 'block';
        if (zone === 'left') preview.style.cssText = 'display:block;left:0;top:0;width:' + (dw / 2) + 'px;height:' + dh + 'px';
        else if (zone === 'right') preview.style.cssText = 'display:block;left:' + (dw / 2) + 'px;top:0;width:' + (dw / 2) + 'px;height:' + dh + 'px';
        else preview.style.cssText = 'display:block;left:0;top:0;width:' + dw + 'px;height:' + dh + 'px';
      };
      const move = ev => {
        let x = ev.clientX - offX, y = ev.clientY - offY;
        x = Math.max(-r.width + 60, Math.min(x, desktop.clientWidth - 60));
        y = Math.max(0, Math.min(y, dh - 28));
        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';
        // Aero Shake 检测（仅 Aero 主题生效）
        if (aero && !shook) {
          const dx = ev.clientX - shakePrevX; shakePrevX = ev.clientX;
          if (dx !== 0) {
            const d = dx > 0 ? 1 : -1;
            if (shakeLastDir !== 0 && d !== shakeLastDir) {
              if (shakeAccum > 28) shakeReversals++;
              shakeAccum = 0;
            }
            shakeLastDir = d;
            shakeAccum += Math.abs(dx);
            shakeTotal += Math.abs(dx);
            if (shakeReversals >= 2 && shakeTotal > 110) { shook = true; this.shakeOthers(); }
          }
        }
        showPreview(getSnap(ev.clientX, ev.clientY));
      };
      const up = ev => {
        this.el.classList.remove('dragging');
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        const zone = aero ? getSnap(ev.clientX, ev.clientY) : null;
        if (preview) preview.remove();
        if (!zone) return;
        this.prevRect = { left: this.el.style.left, top: this.el.style.top, width: this.el.style.width, height: this.el.style.height };
        if (zone === 'top') {
          this.el.classList.add('maximized');
        } else {
          this.el.classList.remove('maximized');
          const half = Math.floor(dw / 2);
          this.el.style.top = '0px';
          this.el.style.height = dh + 'px';
          if (zone === 'left') { this.el.style.left = '0px'; this.el.style.width = half + 'px'; }
          else { this.el.style.left = half + 'px'; this.el.style.width = (dw - half) + 'px'; }
          this.el.classList.add('snapped');
        }
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

  /* Aero 任务栏悬停缩略图预览（Win7 风格） */
  let __tp = null, __tpTimer = null;
  function hideTaskPreview() {
    if (__tp) { __tp.remove(); __tp = null; }
    if (__tpTimer) { clearTimeout(__tpTimer); __tpTimer = null; }
  }
  function showTaskPreview(win, btn) {
    hideTaskPreview();
    if (!document.body.classList.contains('theme-aero')) return;
    if (win.el.classList.contains('closed')) return;
    const W = win.el.offsetWidth || 420, H = win.el.offsetHeight || 300;
    const scale = Math.min(0.28, 240 / W);
    const pw = Math.max(160, Math.round(W * scale)), ph = Math.round(H * scale);
    const preview = document.createElement('div');
    preview.className = 'task-preview';
    const wrap = document.createElement('div');
    wrap.className = 'tp-wrap';
    wrap.style.width = pw + 'px'; wrap.style.height = ph + 'px';
    const clone = win.el.cloneNode(true);
    clone.classList.remove('closed', 'active', 'dragging', 'snapped', 'maximized');
    clone.style.cssText += ';position:relative;left:0;top:0;margin:0;width:' + W + 'px;height:' + H + 'px;transform:scale(' + scale + ');transform-origin:top left;pointer-events:none;box-shadow:none;';
    clone.querySelectorAll('video,audio').forEach(m => { try { m.pause(); } catch (e) {} m.removeAttribute('autoplay'); });
    wrap.appendChild(clone);
    preview.appendChild(wrap);
    const cap = document.createElement('div');
    cap.className = 'tp-cap';
    cap.textContent = win.title;
    preview.appendChild(cap);
    document.body.appendChild(preview);
    __tp = preview;
    const rb = btn.getBoundingClientRect();
    let left = rb.left + rb.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 16));
    preview.style.left = left + 'px';
    preview.style.top = (rb.top - ph - 34) + 'px';
    preview.addEventListener('mouseenter', () => { if (__tpTimer) { clearTimeout(__tpTimer); __tpTimer = null; } });
    preview.addEventListener('mouseleave', () => { __tpTimer = setTimeout(hideTaskPreview, 160); });
    preview.addEventListener('click', () => {
      if (win.el.classList.contains('closed')) win.open(); else WM.focus(win.id);
      hideTaskPreview();
    });
  }

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

  /* ---------- 桌面图标 / 快速启动 / 开始菜单项：打开应用（含权限检查） ---------- */
  // 仅「管理后台」需要管理员权限；其余应用（论坛/画廊/话题/关于/浏览器/外观/媒体 等）游客均可直接打开
  const ADMIN_ONLY = new Set(['admin']);
  function canOpenApp(appId) {
    if (!appId) return true;
    if (ADMIN_ONLY.has(appId)) return isAdmin();
    return true;
  }
  document.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const id = el.dataset.open;
      if (!canOpenApp(id)) {
        if (!loggedIn) openLogin();
        else showMsgToast('当前账号无权限访问该应用');
        closeStart();
        return;
      }
      WM.open(id);
      closeStart();
    });
  });

  const deskIcons = document.getElementById('deskIcons');
  deskIcons.addEventListener('click', e => {
    const di = e.target.closest('.dico'); if (!di) return;
    document.querySelectorAll('.dico').forEach(x => x.classList.remove('sel'));
    di.classList.add('sel');
  });
  deskIcons.addEventListener('dblclick', e => {
    const di = e.target.closest('.dico'); if (!di) return;
    WM.open(di.dataset.app);
  });
  desktop.addEventListener('click', e => {
    if (e.target === desktop) document.querySelectorAll('.dico').forEach(x => x.classList.remove('sel'));
  });
  renderDesktopIcons();

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

  /* ---------- 开始菜单「所有程序」折叠 ---------- */
  const smAllProgBtn = document.getElementById('smAllProgBtn');
  const smPinned = document.getElementById('smPinned');
  const smAllProg = document.getElementById('smAllProg');
  if (smAllProgBtn) {
    smAllProgBtn.addEventListener('click', e => {
      e.stopPropagation();
      const expanded = smAllProgBtn.classList.toggle('expanded');
      smPinned.hidden = expanded;
      smAllProg.hidden = !expanded;
    });
  }
  document.querySelectorAll('.sm-folder-head').forEach(h => {
    h.addEventListener('click', e => {
      e.stopPropagation();
      h.parentElement.classList.toggle('open');
    });
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
  function shutdown() { showShutdownChoice(); }
  function sdScreen(cls) {
    const s = document.createElement('div');
    s.className = 'shutdown-screen' + (cls ? ' ' + cls : '');
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add('show'));
    return s;
  }
  function showShutdownChoice() {
    closeStart();
    Object.values(WM.wins).forEach(w => w.el.classList.add('closed'));
    const s = sdScreen('sd-choice');
    s.innerHTML =
      '<div class="sd-choice-inner">' +
        '<div class="sd-choice-logo">⏻</div>' +
        '<div class="sd-choice-title">Windows XP</div>' +
        '<div class="sd-choice-sub">您希望计算机做什么？</div>' +
        '<div class="sd-choice-btns">' +
          '<button class="sd-opt" data-act="poweroff"><span class="sd-ico">⏻</span>关机<span class="sd-sub2">退出账号</span></button>' +
          '<button class="sd-opt" data-act="restart"><span class="sd-ico">🔄</span>重启</button>' +
          '<button class="sd-opt" data-act="sleep"><span class="sd-ico">💤</span>睡眠</button>' +
        '</div>' +
      '</div>';
    s.querySelectorAll('.sd-opt').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'poweroff') powerOff();
      else if (act === 'restart') restart();
      else if (act === 'sleep') sleep();
    }));
  }
  function powerOff() {
    const old = document.querySelector('.shutdown-screen'); if (old) old.remove();
    if (loggedIn) doLogout();
    playSound(shutdownSoundUrl);
    const s = sdScreen();
    s.innerHTML = '<div class="sd-inner"><div class="sd-logo">⏻</div><div>Windows 正在关机…</div></div>';
    setTimeout(() => { s.innerHTML = '<div class="sd-safe">现在可以安全地关闭计算机了。</div>'; }, 2200);
    s.addEventListener('click', () => { s.classList.remove('show'); setTimeout(() => { s.remove(); WM.open('home'); }, 450); });
  }
  function restart() {
    const old = document.querySelector('.shutdown-screen'); if (old) old.remove();
    const s = sdScreen();
    s.innerHTML = '<div class="sd-inner"><div class="sd-logo">⏻</div><div>Windows 正在重启…</div></div>';
    setTimeout(() => {
      s.classList.remove('show');
      setTimeout(() => {
        s.remove();
        const b = document.createElement('div');
        b.className = 'boot-screen';
        b.innerHTML = '<div class="bs-inner"><div class="bs-logo">Windows XP</div><div class="bs-tip">正在启动 Lunahub…</div></div>';
        document.body.appendChild(b);
        requestAnimationFrame(() => b.classList.add('show'));
        playSound(bootSoundUrl);
        b.addEventListener('click', () => { b.classList.remove('show'); setTimeout(() => { b.remove(); WM.open('home'); }, 480); });
        setTimeout(() => { b.classList.remove('show'); setTimeout(() => { b.remove(); WM.open('home'); }, 480); }, 2000);
      }, 450);
    }, 1800);
  }
  function sleep() {
    const old = document.querySelector('.shutdown-screen'); if (old) old.remove();
    const sl = sdScreen('sleep-screen');
    sl.innerHTML = '<div class="sd-inner"><div class="sd-logo">💤</div><div>计算机已处于睡眠状态</div><div class="sd-safe2">点击任意位置唤醒</div></div>';
    sl.addEventListener('click', () => { sl.classList.remove('show'); setTimeout(() => sl.remove(), 400); });
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
      if (isAdmin()) {
        const del = document.createElement('button'); del.className = 'ann-del'; del.type = 'button'; del.title = '删除公告'; del.textContent = '✕';
        del.addEventListener('click', () => adminDeleteAnnouncement(a.id));
        el.appendChild(del);
      }
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
        if (isAdmin()) {
          const del = document.createElement('button'); del.className = 'ft-del'; del.type = 'button'; del.title = '删除板块'; del.textContent = '✕';
          del.addEventListener('click', e => { e.stopPropagation(); adminDeleteCategory(cat); });
          row.appendChild(del);
        }
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
      const del = document.createElement('button'); del.className = 'mini-btn danger'; del.textContent = '删除';
      del.addEventListener('click', e => { e.stopPropagation(); adminDeleteTopic(t.id); });
      ad.appendChild(pin); ad.appendChild(hid); ad.appendChild(del);
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
  async function adminDeleteTopic(id) {
    if (!confirm('确定删除该话题吗？此操作不可恢复。')) return;
    try { await api('POST', '/api/admin/topics/' + encodeURIComponent(id) + '/delete'); showMsgToast('已删除话题'); loadForum(); }
    catch (e) { showMsgToast('删除失败：' + e.message); }
  }
  async function adminDeleteAnnouncement(id) {
    if (!confirm('确定删除该公告吗？此操作不可恢复。')) return;
    try { await api('POST', '/api/announcements/' + encodeURIComponent(id) + '/delete'); showMsgToast('已删除公告'); loadForum(); }
    catch (e) { showMsgToast('删除失败：' + e.message); }
  }
  async function adminDeleteCategory(cat) {
    if (!confirm('确定删除板块「' + cat + '」吗？\n该板块下的话题不会被删除，会归入「其它」板块。')) return;
    try { await api('POST', '/api/admin/categories/' + encodeURIComponent(cat) + '/delete'); showMsgToast('已删除板块：' + cat); loadForum(); }
    catch (e) { showMsgToast('删除失败：' + e.message); }
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
      const del = document.createElement('button'); del.className = 'mini-btn danger'; del.textContent = '删除';
      del.addEventListener('click', () => adminDeleteTopic(t.id));
      ad.appendChild(pin); ad.appendChild(hid); ad.appendChild(del); head.appendChild(ad);
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
    const sv = document.getElementById('adminSoundView'); if (sv) sv.hidden = t.dataset.tab !== 'sound';
    const dv = document.getElementById('adminDeskView'); if (dv) dv.hidden = t.dataset.tab !== 'desk';
    if (t.dataset.tab === 'sound') refreshSoundStatus();
    if (t.dataset.tab === 'desk') renderDeskManage();
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
        const pwdBtn = document.createElement('button'); pwdBtn.className = 'mini-btn'; pwdBtn.textContent = '重置密码';
        pwdBtn.addEventListener('click', async () => {
          const np = prompt('为 “' + u.user + '” 设置新密码（至少 6 位）：');
          if (!np) return;
          if (np.length < 6) { showMsgToast('密码至少 6 位'); return; }
          try { await api('POST', '/api/admin/users/' + encodeURIComponent(u.user) + '/password', { pass: np }); showMsgToast('已为 ' + u.user + ' 重置密码'); }
          catch (e) { showMsgToast('操作失败：' + e.message); }
        });
        const delBtn = document.createElement('button'); delBtn.className = 'mini-btn danger'; delBtn.textContent = '删除';
        delBtn.addEventListener('click', async () => {
          if (!confirm('确定删除用户 “' + u.user + '” 吗？此操作不可恢复。')) return;
          try { await api('POST', '/api/admin/users/' + encodeURIComponent(u.user) + '/delete'); loadAdminUsers(); if (forumCache) loadForum(); }
          catch (e) { showMsgToast('操作失败：' + e.message); }
        });
        if (u.user === currentUser()) { delBtn.disabled = true; delBtn.title = '不能删除自己'; }
        acts.appendChild(roleBtn); acts.appendChild(pwdBtn); acts.appendChild(delBtn);
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

  /* ---------- 管理后台：桌面应用管理 ---------- */
  function renderDeskManage() {
    const list = document.getElementById('deskAppList');
    if (!list) return;
    const enabled = loadDeskApps();
    list.innerHTML = '';
    DESK_APPS.forEach(a => {
      const row = document.createElement('label');
      row.className = 'desk-app-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = enabled.has(a.id);
      cb.addEventListener('change', () => {
        const set = loadDeskApps();
        if (cb.checked) set.add(a.id); else set.delete(a.id);
        saveDeskApps(set);
        renderDesktopIcons();
      });
      const txt = document.createElement('span');
      txt.innerHTML = '<span class="di-ico">' + a.icon + '</span> ' + a.title;
      row.appendChild(cb); row.appendChild(txt);
      list.appendChild(row);
    });
  }

  /* ---------- 管理后台：系统音效（开机 / 关机） ---------- */
  async function refreshSoundStatus() {
    try {
      const d = await api('GET', '/api/sounds');
      const bs = document.getElementById('sndBootStatus'), bd = document.getElementById('sndBootDel');
      const ss = document.getElementById('sndShutStatus'), sd = document.getElementById('sndShutDel');
      if (bs) bs.textContent = d.boot ? '已设置' : '未设置';
      if (bd) bd.hidden = !d.boot;
      if (ss) ss.textContent = d.shutdown ? '已设置' : '未设置';
      if (sd) sd.hidden = !d.shutdown;
    } catch (e) {}
  }
  function wireSoundSlot(slot, btnId, fileId, statusId, delId) {
    const btn = document.getElementById(btnId);
    const file = document.getElementById(fileId);
    const status = document.getElementById(statusId);
    const del = document.getElementById(delId);
    if (!btn || !file) return;
    btn.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { showMsgToast('音效文件超过 5MB'); file.value = ''; return; }
      const rd = new FileReader();
      rd.onload = async () => {
        try {
          await api('POST', '/api/admin/sound', { slot, data: rd.result });
          showMsgToast((slot === 'boot' ? '开机' : '关机') + '音效已设置');
          file.value = '';
          if (status) status.textContent = '已设置：' + (f.name || '');
          if (del) del.hidden = false;
          loadSoundsConfig();
        } catch (e) { showMsgToast('上传失败：' + e.message); file.value = ''; }
      };
      rd.readAsDataURL(f);
    });
    if (del) del.addEventListener('click', async () => {
      try {
        await api('POST', '/api/admin/sound/' + slot + '/delete');
        if (status) status.textContent = '未设置';
        del.hidden = true;
        showMsgToast('已删除' + (slot === 'boot' ? '开机' : '关机') + '音效');
        loadSoundsConfig();
      } catch (e) { showMsgToast('删除失败：' + e.message); }
    });
  }
  wireSoundSlot('boot', 'sndBootBtn', 'sndBootFile', 'sndBootStatus', 'sndBootDel');
  wireSoundSlot('shutdown', 'sndShutBtn', 'sndShutFile', 'sndShutStatus', 'sndShutDel');

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
    { id: 'classic',  name: 'Windows 经典', c1: '#d4d0c8', c2: '#b8b4a4' },
    { id: 'aero',     name: 'Aero 玻璃蓝',   c1: '#5a9be0', c2: '#1e63b0' }
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
    { id: 'classic',        name: 'Windows 经典',      wp: 'luna',         accent: 'classic',  fs: 'md', desc: 'Windows 9x 风格灰色' },
    { id: 'aero',           name: 'Windows Aero',      wp: 'ocean',        accent: 'aero',     fs: 'md', desc: 'Windows 7 玻璃拟态' }
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
    document.body.classList.toggle('theme-classic', t.id === 'classic');
    document.body.classList.toggle('theme-aero', t.id === 'aero');
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
        ? '你是管理员：可上传壁纸，可删除任意上传项'
        : '已登录：可上传壁纸，也能删除自己上传的壁纸';
    } else {
      wpUploadBtn.disabled = true; wpUploadBtn.title = '请先登录';
      wpExtractBtn.disabled = false;
      wpTip.textContent = '登录后可上传自己的壁纸，管理员可删除上传项';
    }
  }
  refreshWpUI();

  function renderUserWPs() {
    wpUserGrid.innerHTML = '';
    if (!loggedIn) {
      const empty = document.createElement('div');
      empty.className = 'wp-empty';
      empty.textContent = '登录后查看你上传的壁纸';
      wpUserGrid.appendChild(empty);
      return;
    }
    const mine = customWPs.filter(u => u.uploader === currentUser());
    if (!mine.length) {
      const empty = document.createElement('div');
      empty.className = 'wp-empty';
      empty.textContent = '（你还没有上传壁纸，点上方「📤 上传壁纸」试试）';
      wpUserGrid.appendChild(empty);
      return;
    }
    const isAdmin = isAdminRole();
    mine.forEach(u => {
      const el = document.createElement('div');
      el.className = 'wp wp-custom'; el.dataset.id = u.id; el.title = (u.name || '未命名') + ' · 由 ' + u.uploader + ' 上传';
      el.style.background = "url('/assets/wallpapers/user/" + u.file + "') center/cover no-repeat";
      el.innerHTML = '<span>' + (u.name || '未命名') + '</span>';
      if (isAdmin || u.uploader === currentUser()) {
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
    await loadCustomWPs();
    if (wpUserGrid.scrollIntoView) wpUserGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  // 进入外观窗口时（首次）异步拉一次；isAdminRole/UI 变化时 refreshWpUI
  // 暴露给 setUserUI 钩子：登入登出后 UI 状态由 setUserUI 内部刷新
  window.__lunaRefreshWallpaper = () => { refreshWpUI(); loadCustomWPs(); };
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

  /* —— 自定义窗口颜色拾取器 —— */
  const wccC1 = document.getElementById('wccC1');
  const wccC2 = document.getElementById('wccC2');
  const wccApply = document.getElementById('wccApply');
  const wccReset = document.getElementById('wccReset');
  const wccPreview = document.getElementById('wccPreview');
  function wccPreviewUpdate() {
    if (!wccPreview) return;
    wccPreview.querySelector('.wcc-titlebar').style.background =
      'linear-gradient(180deg,' + (wccC1.value) + ',' + (wccC2.value) + ')';
  }
  function applyCustomAccent(c1, c2) {
    document.documentElement.style.setProperty('--acc1', c1);
    document.documentElement.style.setProperty('--acc2', c2);
    try { localStorage.setItem('lunahub_accent_custom', JSON.stringify({ c1, c2 })); } catch (e) {}
    document.querySelectorAll('#accentGrid .accent').forEach(el => el.classList.remove('sel'));
    document.querySelectorAll('#themeGrid .theme-card').forEach(el => el.classList.remove('sel'));
    if (wccC1) wccC1.value = c1;
    if (wccC2) wccC2.value = c2;
    wccPreviewUpdate();
  }
  if (wccC1) wccC1.addEventListener('input', wccPreviewUpdate);
  if (wccC2) wccC2.addEventListener('input', wccPreviewUpdate);
  if (wccApply) wccApply.addEventListener('click', () => {
    applyCustomAccent(wccC1.value, wccC2.value);
    showMsgToast('已应用自定义窗口颜色');
  });
  if (wccReset) wccReset.addEventListener('click', () => {
    try { localStorage.removeItem('lunahub_accent_custom'); } catch (e) {}
    applyAccent(ACCENTS[0]);
    if (wccC1) wccC1.value = ACCENTS[0].c1;
    if (wccC2) wccC2.value = ACCENTS[0].c2;
    wccPreviewUpdate();
    showMsgToast('已恢复默认蓝色');
  });
  // 选择预设色块时同步拾色器 + 清除自定义记录
  const _applyAccentOrig = applyAccent;
  applyAccent = function(a) {
    _applyAccentOrig(a);
    try { localStorage.removeItem('lunahub_accent_custom'); } catch (e) {}
    if (wccC1) wccC1.value = a.c1;
    if (wccC2) wccC2.value = a.c2;
    wccPreviewUpdate();
  };

  /* —— 外观窗口 menubar 导航（滚动到分区） —— */
  document.querySelectorAll('#appMenubar .mb-item').forEach(s => {
    s.addEventListener('click', () => {
      const target = document.getElementById(s.dataset.scroll);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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

  /* —— 鼠标指针皮肤 —— */
  function svgCursor(fill, stroke) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'>" +
      "<path d='M4 3 L4 22 L9 17 L12 25 L15 24 L12 16 L20 16 Z' fill='" + fill + "' stroke='" + stroke + "' stroke-width='1.5' stroke-linejoin='round'/></svg>";
    return "url(\"data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, '%27') + "\") 3 3, auto";
  }
  const CURSORS = [
    { id: 'default', name: '系统默认', cur: '' },
    { id: 'blue', name: 'XP 蓝箭头', cur: svgCursor('#2d6cff', '#ffffff') },
    { id: 'green', name: '绿野箭头', cur: svgCursor('#2ecc40', '#0a3a1a') },
    { id: 'gold', name: '金黄箭头', cur: svgCursor('#e0a000', '#5a3a00') },
    { id: 'classic', name: '经典白箭头', cur: svgCursor('#ffffff', '#000000') }
  ];
  const cursorGrid = document.getElementById('cursorGrid');
  function applyCursor(id) {
    const c = CURSORS.find(x => x.id === id) || CURSORS[0];
    document.documentElement.style.cursor = c.cur || 'auto';
    try { localStorage.setItem('lunahub_cursor', id); } catch (e) {}
    if (cursorGrid) cursorGrid.querySelectorAll('.cursor-opt').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  }
  function initCursor() {
    let savedCur = null;
    try { savedCur = localStorage.getItem('lunahub_cursor'); } catch (e) {}
    if (cursorGrid) {
      CURSORS.forEach(c => {
        const el = document.createElement('div'); el.className = 'cursor-opt'; el.dataset.id = c.id; el.title = c.name;
        el.style.cursor = c.cur || 'default';
        el.innerHTML = '<span class="co-ico"></span><span class="co-name">' + c.name + '</span>';
        el.addEventListener('click', () => applyCursor(c.id));
        cursorGrid.appendChild(el);
      });
      applyCursor(savedCur || 'default');
    } else {
      const c = CURSORS.find(x => x.id === savedCur) || CURSORS[0];
      document.documentElement.style.cursor = c.cur || 'auto';
    }
  }
  initCursor();

  // 恢复上次的偏好（主题优先 > 自定义颜色 > 预设 > 默认）
  let savedWp = null, savedAc = null, savedFs = null, savedTheme = null, savedCustom = null;
  try {
    savedWp = localStorage.getItem('lunahub_wp');
    savedAc = localStorage.getItem('lunahub_accent');
    savedFs = localStorage.getItem('lunahub_fs');
    savedTheme = localStorage.getItem('lunahub_theme');
    savedCustom = localStorage.getItem('lunahub_accent_custom');
  } catch (e) {}
  applyWallpaper(WALLPAPERS.find(w => w.id === savedWp) || WALLPAPERS[0]);
  if (savedCustom) {
    try { const c = JSON.parse(savedCustom); applyCustomAccent(c.c1, c.c2); } catch (e) { applyAccent(ACCENTS.find(a => a.id === savedAc) || ACCENTS[0]); }
  } else {
    applyAccent(ACCENTS.find(a => a.id === savedAc) || ACCENTS[0]);
  }
  applyFontSize(savedFs || 'md');
  if (savedTheme && !savedCustom) {
    const t = THEMES.find(x => x.id === savedTheme);
    if (t) {
      // 选中状态高亮 + 恢复主题 class（如经典主题）
      const el = themeGrid.querySelector('[data-theme="' + t.id + '"]');
      if (el) el.classList.add('sel');
      document.body.classList.toggle('theme-classic', t.id === 'classic');
      document.body.classList.toggle('theme-aero', t.id === 'aero');
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
    muAudio.volume = muVol.value / 100;
    if (muVideo) muVideo.volume = muVol.value / 100;
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

  /* ===== 我的电脑：模拟文件系统 + 菜单 + 驱动器导航 ===== */
  const MYDOCS = [
    { name: '欢迎.txt', type: 'txt', body: '欢迎来到 Lunahub！\n\n这里保存着旧时代的一片净土。\n\n双击文本文件可以用记事本打开，双击图片可以用 Luna照片查看器浏览。\n\n—— Lunahub 团队' },
    { name: '使用说明.txt', type: 'txt', body: 'Lunahub 使用说明\n\n1. 桌面图标双击打开应用\n2. 开始菜单 → 所有程序\n3. 论坛分区可查看各板块动态\n4. 控制面板可更换主题与字体\n5. 画图 / 电子教鞭 / 照片查看器 随时可用\n\n遇到问题请到「反馈与帮助」板块留言。' },
    { name: 'Blue hills.jpg', type: 'img', url: 'assets/samples/blue-hills.jpg' },
    { name: 'Sunset.jpg', type: 'img', url: 'assets/samples/sunset.jpg' },
    { name: 'Water lilies.jpg', type: 'img', url: 'assets/samples/water-lilies.jpg' },
    { name: 'Winter.jpg', type: 'img', url: 'assets/samples/winter.jpg' }
  ];
  const DRIVE_C = [
    { name: 'Documents and Settings', type: 'folder', items: [
      { name: 'Administrator', type: 'folder', items: [
        { name: 'My Documents', type: 'folder', items: MYDOCS },
        { name: '桌面', type: 'folder', items: [] }
      ] }
    ]},
    { name: 'Program Files', type: 'folder', items: [
      { name: 'Lunahub', type: 'folder', items: [
        { name: 'readme.txt', type: 'txt', body: 'Lunahub 应用程序目录。\n\n本目录包含 Lunahub 桌面环境运行所需的资源文件，请勿随意删除。' },
        { name: 'changelog.txt', type: 'txt', body: '更新日志\n\nv1.0 初始版本\n- Windows XP 风格桌面\n- 论坛 / 画廊 / 媒体播放器\n- 画图 / 照片查看器 / 电子教鞭' }
      ] }
    ]},
    { name: 'WINDOWS', type: 'folder', items: [
      { name: 'notepad.exe', type: 'app', app: 'notepad' },
      { name: 'explorer.exe', type: 'app', app: 'home' },
      { name: 'system32', type: 'folder', items: [] }
    ]},
    { name: 'autoexec.bat', type: 'txt', body: '@echo off\nPATH C:\\WINDOWS;C:\\WINDOWS\\system32\n' }
  ];
  const DRIVE_D = [
    { name: 'AUTORUN.INF', type: 'txt', body: '[autorun]\nopen=setup.exe\nicon=setup.exe,0' },
    { name: 'setup.txt', type: 'txt', body: 'Lunahub 安装程序\n\n运行 setup.exe 开始安装 Lunahub 桌面环境。' }
  ];
  const VFS = { '我的文档': MYDOCS, '本地磁盘 (C:)': DRIVE_C, '光盘 (D:)': DRIVE_D };

  const homeHero = document.getElementById('homeHero');
  const homeBrowser = document.getElementById('homeBrowser');
  const homeFiles = document.getElementById('homeFiles');
  const homePath = document.getElementById('homePath');
  const homeStatus = document.getElementById('homeStatus');
  let homeStack = [];
  let homeSelected = null;

  function homeFileIcon(it) {
    if (it.type === 'folder') return '📁';
    if (it.type === 'txt') return '📄';
    if (it.type === 'img') return '🖼️';
    if (it.type === 'app') return '⚙️';
    return '📦';
  }
  function homePathText() { return homeStack.length ? homeStack.map(s => s.name).join(' \\ ') : '我的电脑'; }
  function homeRenderItems(items) {
    homeFiles.innerHTML = '';
    homeSelected = null;
    if (!items || !items.length) { homeFiles.innerHTML = '<div class="empty-hint">此文件夹为空</div>'; homeStatus.textContent = '0 个项目'; return; }
    items.forEach(it => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'file-item' + (it.type === 'folder' ? ' is-folder' : '');
      el.innerHTML = '<span class="fi-ico">' + homeFileIcon(it) + '</span><span class="fi-name">' + esc(it.name) + '</span>';
      el.addEventListener('click', () => {
        homeFiles.querySelectorAll('.file-item').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        homeSelected = it;
        homeStatus.textContent = '选中: ' + it.name;
      });
      el.addEventListener('dblclick', () => homeOpen(it));
      homeFiles.appendChild(el);
    });
    homeStatus.textContent = items.length + ' 个项目';
  }
  function homeShowHero() {
    if (!homeHero) return;
    homeHero.hidden = false; homeBrowser.hidden = true;
    homePath.textContent = '我的电脑'; homeStatus.textContent = ''; homeStack = []; homeSelected = null;
  }
  function homeEnter(loc) {
    const items = VFS[loc]; if (!items) { showMsgToast('无法访问 ' + loc); return; }
    homeStack = [{ name: loc, items }];
    homeRenderItems(items);
    homeHero.hidden = true; homeBrowser.hidden = false;
    homePath.textContent = homePathText();
  }
  function homeEnterFolder(folder) {
    homeStack.push({ name: folder.name, items: folder.items || [] });
    homeRenderItems(folder.items || []);
    homeHero.hidden = true; homeBrowser.hidden = false;
    homePath.textContent = homePathText();
  }
  function homeUp() {
    if (!homeStack.length) return;
    if (homeStack.length <= 1) { homeShowHero(); return; }
    homeStack.pop();
    const cur = homeStack[homeStack.length - 1];
    homeRenderItems(cur.items);
    homePath.textContent = homePathText();
  }
  function homeOpen(it) {
    if (it.type === 'folder') { homeEnterFolder(it); }
    else if (it.type === 'txt') {
      WM.open('notepad');
      const np = document.getElementById('npText');
      const npt = document.getElementById('npTitle');
      if (np) np.value = it.body || '';
      if (npt) npt.textContent = it.name + ' - 记事本';
      try { localStorage.setItem('lunahub_notepad', JSON.stringify({ text: it.body || '', title: it.name + ' - 记事本' })); } catch (e) {}
    }
    else if (it.type === 'img') { WM.open('photos'); PH_LIST = [{ name: it.name, url: it.url }]; phShow(0); }
    else if (it.type === 'app') { if (it.app) WM.open(it.app); }
    else showMsgToast('无法打开：' + it.name);
  }
  document.querySelectorAll('#homeDrives .drive').forEach(b => {
    if (b.hasAttribute('data-net')) b.addEventListener('click', () => WM.open('browser'));
    else b.addEventListener('click', () => homeEnter(b.dataset.loc));
  });
  const homeUpBtn = document.getElementById('homeUp');
  if (homeUpBtn) homeUpBtn.addEventListener('click', homeUp);
  const homeRootBtn = document.getElementById('homeRoot');
  if (homeRootBtn) homeRootBtn.addEventListener('click', homeShowHero);

  /* —— 菜单下拉组件 —— */
  const homeMenubar = document.getElementById('homeMenubar');
  const homeMenuDD = document.createElement('div');
  homeMenuDD.className = 'menu-dropdown'; homeMenuDD.hidden = true;
  if (homeMenubar) homeMenubar.appendChild(homeMenuDD);
  const HOME_MENUS = {
    file: [
      { label: '新建窗口\tCtrl+N', act: () => { WM.open('home'); showMsgToast('已打开新的「我的电脑」窗口'); } },
      { sep: true },
      { label: '打开', act: () => { if (homeSelected) homeOpen(homeSelected); else showMsgToast('请先选中一个项目'); } },
      { label: '属性', act: () => { showMsgToast(homeSelected ? ('选中: ' + homeSelected.name + '（' + homeSelected.type + '）') : '未选中项目'); } },
      { sep: true },
      { label: '关闭', act: () => WM.close('home') }
    ],
    edit: [
      { label: '全选\tCtrl+A', act: () => { homeFiles.querySelectorAll('.file-item').forEach(c => c.classList.add('selected')); } },
      { label: '反向选择', act: () => { homeFiles.querySelectorAll('.file-item').forEach(c => c.classList.toggle('selected')); } },
      { sep: true },
      { label: '刷新', act: () => { if (homeStack.length) homeRenderItems(homeStack[homeStack.length - 1].items); } }
    ],
    view: [
      { label: '图标', act: () => { homeBrowser.classList.remove('view-list'); homeBrowser.classList.add('view-icons'); } },
      { label: '详细信息', act: () => { homeBrowser.classList.remove('view-icons'); homeBrowser.classList.add('view-list'); } },
      { sep: true },
      { label: '刷新\tF5', act: () => { if (homeStack.length) homeRenderItems(homeStack[homeStack.length - 1].items); } }
    ],
    fav: [
      { label: '添加到收藏夹...', act: () => showMsgToast('已添加到收藏夹') },
      { sep: true },
      { label: '💬 浏览论坛', act: () => WM.open('forums') },
      { label: '🖼️ 查看画廊', act: () => WM.open('gallery') },
      { label: '📷 Luna照片查看器', act: () => WM.open('photos') },
      { label: '🎨 Luna画图', act: () => WM.open('paint') },
      { sep: true },
      { label: '🌐 Lunahub 首页', act: () => WM.open('browser') }
    ],
    tools: [
      { label: '文件夹选项...', act: () => showMsgToast('文件夹选项：XP 风格 · 单击打开 · 显示扩展名') },
      { label: '映射网络驱动器...', act: () => WM.open('browser') },
      { sep: true },
      { label: '控制面板', act: () => WM.open('control') }
    ],
    help: [
      { label: '帮助主题', act: () => WM.open('browser') },
      { sep: true },
      { label: '关于 Lunahub', act: () => WM.open('about') }
    ]
  };
  function openHomeMenu(key, anchor) {
    const items = HOME_MENUS[key] || [];
    homeMenuDD.innerHTML = '';
    items.forEach(mi => {
      if (mi.sep) { const s = document.createElement('div'); s.className = 'menu-sep'; homeMenuDD.appendChild(s); return; }
      const el = document.createElement('div');
      el.className = 'menu-item'; el.textContent = mi.label;
      el.addEventListener('click', () => { closeHomeMenu(); mi.act(); });
      homeMenuDD.appendChild(el);
    });
    if (anchor) homeMenuDD.style.left = anchor.offsetLeft + 'px';
    homeMenuDD.hidden = false;
  }
  function closeHomeMenu() { homeMenuDD.hidden = true; }
  if (homeMenubar) {
    homeMenubar.querySelectorAll('.mb-item').forEach(s => {
      s.addEventListener('click', () => { if (homeMenuDD.hidden) openHomeMenu(s.dataset.menu, s); else closeHomeMenu(); });
      s.addEventListener('mouseenter', () => { if (!homeMenuDD.hidden) openHomeMenu(s.dataset.menu, s); });
    });
    document.addEventListener('click', e => {
      if (homeMenuDD.hidden) return;
      if (homeMenuDD.contains(e.target) || (e.target && e.target.classList && e.target.classList.contains('mb-item'))) return;
      closeHomeMenu();
    });
  }

  // 打开窗口时自动初始化对应内容
  const _openOrig = WM.open.bind(WM);
  WM.open = function (id) {
    _openOrig(id);
    if (id === 'browser' && brwHistIdx < 0) showHome();
    else if (id === 'topics') loadForum();
    else if (id === 'forums') { if (!forumCache) loadForum(); else renderForums(); }
    else if (id === 'admin') openAdmin();
    else if (id === 'appearance') { if (typeof loadCustomWPs === 'function') loadCustomWPs(); }
    else if (id === 'gallery') loadGallery();
    else if (id === 'account') loadAccount();
    else if (id === 'music') { muRefreshAdminUI(); if (!muMediaLoaded) loadMedia(); }
    else if (id === 'photos') { if (!PH_LIST.length) phLoadSample(); }
    else if (id === 'pointer') { ptrOpen(); }
    else if (id === 'calculator') { initCalculator(); }
    else if (id === 'pptlou') { initPptLou(); }
    else if (id === 'excel') { initExcel(); }
    else if (id === 'whack') { initWhack(); }
    else if (id === 'memo') { initMemo(); }
    else if (id === 'gomoku') { initGomoku(); }
    else if (id === 'go') { initGo(); }
    else if (id === 'tictactoe') { initTic(); }
    else if (id === 'convert') { initConvert(); }
    else if (id === 'calendar') { initCalendar(); }
    else if (id === 'home') homeShowHero();
  };
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

  /* ---------- 系统音效（开机 / 关机） ---------- */
  let bootSoundUrl = null, shutdownSoundUrl = null;
  let SYS_VOL = 0.85, SYS_MUTE = false;
  try {
    const sv = parseFloat(localStorage.getItem('lunahub_sysvol')); if (!isNaN(sv)) SYS_VOL = sv;
    if (localStorage.getItem('lunahub_sysmute') === '1') SYS_MUTE = true;
  } catch (e) {}
  function sysEffectiveVol() { return SYS_MUTE ? 0 : SYS_VOL; }
  function playSound(url) {
    if (!url) return;
    try { const a = new Audio(url); a.volume = sysEffectiveVol(); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  async function loadSoundsConfig() {
    try { const d = await api('GET', '/api/sounds'); bootSoundUrl = d.boot ||  null; shutdownSoundUrl = d.shutdown || null; } catch (e) {}
  }
  loadSoundsConfig();

  /* ---------- 任务栏音量 / 静音（独立窗口） ---------- */
  (function initTrayVolume() {
    const muteBtn = document.getElementById('trayMute');
    if (!muteBtn) return;
    let lastVol = 80; // 静音前的音量记忆（0-100）
    function getMuVolEl() { return document.getElementById('muVol'); }
    function curVol() {
      if (typeof muAudio !== 'undefined' && muAudio) return Math.round(muAudio.volume * 100);
      const v = getMuVolEl();
      return v ? parseInt(v.value, 10) : lastVol;
    }
    function applyVol(v) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      const aud = (typeof muAudio !== 'undefined') ? muAudio : null;
      const vEl = getMuVolEl();
      if (aud) aud.volume = v / 100;
      if (typeof muVideo !== 'undefined' && muVideo) muVideo.volume = v / 100;
      if (vEl) vEl.value = v;
      muteBtn.textContent = v === 0 ? '🔇' : '🔊';
    }
    // 任务栏图标点击 → 切换静音（直接作用于媒体播放器）
    muteBtn.addEventListener('click', () => {
      if (curVol() > 0) { lastVol = curVol(); applyVol( 0); }
      else { applyVol(lastVol || 80); }
    });
    // 滚轮调节音量（直接作用于媒体播放器）
    muteBtn.addEventListener('wheel', (e) => {
      e.preventDefault();
      applyVol(curVol() + (e.deltaY < 0 ? 6 : -6));
    }, { passive: false });
  })();

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
      .catch(() => { /* token 失效：自动登出，下次操作会提示登录 */ doLogout(); });
  }

  // 启动画面（可点击跳过）——默认关闭，如需恢复设为 true
  const SHOW_BOOT = false;
  if (SHOW_BOOT) {
  (function showBoot() {
    const b = document.createElement('div');
    b.className = 'boot-screen';
    b.innerHTML = '<div class="bs-inner"><div class="bs-logo">Windows XP</div><div class="bs-tip">正在启动 Lunahub…</div></div>';
    document.body.appendChild(b);
    playSound(bootSoundUrl);
    requestAnimationFrame(() => b.classList.add('show'));
    const onDone = () => { b.classList.remove('show'); setTimeout(() => { b.remove(); }, 480); };
    b.addEventListener('click', onDone);
    setTimeout(onDone, 2000);
  })();
  }

  // 初始化计算器（仿 Windows XP 标准计算器：内存 / 函数键 / 绿色 LCD / 安全解析）
  function initCalculator() {
    if (window._calcInited) return; // 只初始化一次，状态跨开关保留
    window._calcInited = true;
    const disp = document.getElementById('calcDisplay');
    const keys = document.getElementById('calcKeys');
    const winEl = document.getElementById('calculator');
    const memEl = document.getElementById('calcMem');
    if (!disp || !keys) return;

    let expr = '';
    let memory = 0;
    let hasMem = false;
    let justErrored = false;

    // ---- 安全表达式求值（shunting-yard，支持括号与一元负号）----
    function tokenize(s) {
      const tokens = [];
      const re = /\s*([0-9]*\.?[0-9]+|[+\-*/()])\s*/g;
      let m; let last = null;
      while ((m = re.exec(s)) !== null) {
        let t = m[1];
        if (t === '-' && (last === null || /[+\-*/(]/.test(last))) tokens.push('u'); // 一元负号
        else tokens.push(t);
        last = t;
      }
      return tokens;
    }
    function toRPN(tokens) {
      const out = []; const ops = [];
      const prec = { '+': 1, '-': 1, '*': 2, '/': 2, 'u': 3 };
      tokens.forEach(t => {
        if (/^[0-9]/.test(t)) out.push(t);
        else if ('+-*/'.includes(t)) {
          while (ops.length) {
            const o = ops[ops.length - 1];
            if (o !== '(' && prec[o] >= prec[t]) out.push(ops.pop()); else break;
          }
          ops.push(t);
        } else if (t === 'u') {
          while (ops.length) {
            const o = ops[ops.length - 1];
            if (('+-*/'.includes(o) || o === 'u') && prec[o] >= prec.u) out.push(ops.pop()); else break;
          }
          ops.push(t);
        } else if (t === '(') ops.push(t);
        else if (t === ')') { while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()); if (ops.length) ops.pop(); }
      });
      while (ops.length) out.push(ops.pop());
      return out;
    }
    function evalRPN(rpn) {
      const st = [];
      rpn.forEach(t => {
        if (/^[0-9]/.test(t)) st.push(parseFloat(t));
        else if (t === 'u') { const b = st.pop(); if (b === undefined) throw new Error('Invalid'); st.push(-b); }
        else {
          const b = st.pop(), a = st.pop();
          if (a === undefined || b === undefined) throw new Error('Invalid');
          let r = 0;
          if (t === '+') r = a + b;
          else if (t === '-') r = a - b;
          else if (t === '*') r = a * b;
          else if (t === '/') { if (b === 0) throw new Error('Div0'); r = a / b; }
          st.push(r);
        }
      });
      if (st.length !== 1) throw new Error('Invalid');
      return st[0];
    }
    function safeEval(s) {
      const v = evalRPN(toRPN(tokenize(s)));
      if (!isFinite(v)) throw new Error('非有限数');
      return v;
    }

    function formatNum(n) {
      if (typeof n !== 'number' || !isFinite(n)) return '错误';
      return parseFloat(n.toPrecision(12)).toString();
    }
    function updateDisplay() {
      disp.value = expr === '' ? '0' : expr;
      if (memEl) memEl.style.visibility = hasMem ? 'visible' : 'hidden';
    }
    // 取表达式末尾的数字（含可选的一元负号）
    function getLastNumber() {
      const m = expr.match(/(-?\d*\.?\d+)$/);
      return m ? { raw: m[0], index: m.index } : null;
    }
    function currentValue() {
      const m = getLastNumber();
      if (m) return parseFloat(m.raw);
      try { return safeEval(expr || '0'); } catch (e) { return 0; }
    }
    function applyToLast(fn) {
      const m = getLastNumber();
      const base = m ? parseFloat(m.raw) : 0;
      const r = fn(base);
      if (!isFinite(r)) { disp.value = '错误'; expr = ''; justErrored = true; return; }
      if (!m) expr = formatNum(r);
      else expr = expr.slice(0, m.index) + formatNum(r) + expr.slice(m.index + m.raw.length);
    }
    function freshIfError() { if (justErrored) { expr = ''; justErrored = false; } }

    function pressKey(k) {
      freshIfError();
      if (/^[0-9]$/.test(k)) { expr += k; }
      else if (k === '.') {
        const m = getLastNumber();
        if (m && m.raw.includes('.')) return;
        expr += (m ? '' : (expr === '' || /[+\-*/()]$/.test(expr) ? '0' : '')) + '.';
      }
      else if (k === '(' || k === ')') { expr += k; }
      else if ('+-*/'.includes(k)) {
        if (expr === '') { if (k === '-') expr = '-'; return; }
        if (/[+\-*/]$/.test(expr)) { expr = expr.slice(0, -1) + k; } // 替换连续运算符
        else expr += k;
      }
      else if (k === 'neg') {
        const m = getLastNumber();
        if (m) expr = expr.slice(0, m.index) + (m.raw[0] === '-' ? m.raw.slice(1) : '-' + m.raw) + expr.slice(m.index + m.raw.length);
        else if (expr === '' || /[+\-*/()]$/.test(expr)) { if (!expr.endsWith('-')) expr += '-'; }
      }
      else if (k === 'sqrt') applyToLast(Math.sqrt);
      else if (k === 'sq') applyToLast(x => x * x);
      else if (k === 'pct') applyToLast(x => x / 100);
      else if (k === 'back') { expr = expr.slice(0, -1); }
      else if (k === 'ce') {
        const m = getLastNumber();
        if (m) expr = expr.slice(0, m.index); else expr = expr.slice(0, -1);
      }
      else if (k === 'c') { expr = ''; }
      else if (k === 'mc') { memory = 0; hasMem = false; }
      else if (k === 'mr') {
        const mnum = getLastNumber();
        if (expr !== '' && mnum && !/[+\-*/()]$/.test(expr)) expr = expr.slice(0, mnum.index) + formatNum(memory);
        else expr += formatNum(memory);
      }
      else if (k === 'ms') { memory = currentValue(); hasMem = true; }
      else if (k === 'm+') { memory += currentValue(); hasMem = true; }
      else if (k === '=') {
        try { expr = formatNum(safeEval(expr || '0')); }
        catch (e) { disp.value = '错误'; expr = ''; justErrored = true; return; }
      }
      updateDisplay();
    }

    keys.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => pressKey(btn.dataset.k || btn.textContent.trim()));
    });

    // 菜单栏（编辑 / 帮助）
    if (winEl) {
      winEl.querySelectorAll('.mb-item').forEach(mb => {
        mb.addEventListener('click', e => {
          e.stopPropagation();
          winEl.querySelectorAll('.calc-menu-popup').forEach(p => p.remove());
          const pop = document.createElement('div');
          pop.className = 'calc-menu-popup';
          pop.innerHTML = mb.dataset.calc === 'edit'
            ? '<div class="cmp-item" data-act="copy">复制</div><div class="cmp-item" data-act="paste">粘贴</div>'
            : '<div class="cmp-item" data-act="about">关于计算器</div>';
          mb.appendChild(pop);
          pop.querySelectorAll('.cmp-item').forEach(it => it.addEventListener('click', () => {
            pop.remove();
            const act = it.dataset.act;
            if (act === 'copy') { try { navigator.clipboard.writeText(disp.value); showMsgToast('已复制：' + disp.value); } catch (e) {} }
            else if (act === 'paste') { try { navigator.clipboard.readText().then(t => { expr = (expr || '') + t.replace(/[^0-9.+\-*/()%]/g, ''); updateDisplay(); }); } catch (e) {} }
            else if (act === 'about') { alert('Lunahub 计算器\n仿 Windows XP 标准计算器\n支持 + − × ÷、括号、√、x²、%、±、内存 MC/MR/MS/M+'); }
          }));
        });
      });
      if (!window._calcMenuClose) {
        window._calcMenuClose = true;
        document.addEventListener('mousedown', e => {
          document.querySelectorAll('.calc-menu-popup').forEach(p => { if (!p.contains(e.target)) p.remove(); });
        });
      }
    }

    // 键盘支持（仅计算器窗口打开时）
    function onKey(e) {
      if (!winEl || winEl.classList.contains('closed')) return;
      const k = e.key;
      if (/^[0-9]$/.test(k) || k === '.' || k === '(' || k === ')' || '+-*/'.includes(k)) { pressKey(k); e.preventDefault(); }
      else if (k === 'Enter' || k === '=') { pressKey('='); e.preventDefault(); }
      else if (k === 'Backspace') { pressKey('back'); e.preventDefault(); }
      else if (k === 'Escape') { pressKey('c'); e.preventDefault(); }
      else if (k === '%') { pressKey('pct'); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);

    updateDisplay();
  }

  // 初始化 PPT lou
  function initPptLou() {
    const slideEl = document.getElementById('pptSlide');
    const thumbsEl = document.getElementById('pptThumbs');
    if (!slideEl) return;
    const PPT_KEY = 'pptlou_slides';
    let slides = [{ type: 'text', content: '（空白幻灯片）' }];
    let idx = 0;
    try {
      const raw = localStorage.getItem(PPT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) slides = parsed;
      }
    } catch (e) {}
    let saveWarned = false;
    function saveSlides() {
      try { localStorage.setItem(PPT_KEY, JSON.stringify(slides)); saveWarned = false; }
      catch (e) {
        // 存储 quota 溢出（base64 图片过大）：不再静默吞掉，提示用户导出备份
        if (!saveWarned) { saveWarned = true; showMsgToast('保存失败：浏览器存储空间不足，请用「导出」备份后精简图片'); }
      }
    }
    function render() {
      const s = slides[idx] || { type: 'text', content: '（空白幻灯片）' };
      if (s.type === 'image') {
        slideEl.innerHTML = '<img src="' + s.content + '" alt="slide" style="max-width:100%;max-height:100%;object-fit:contain">';
      } else {
        slideEl.innerHTML = '<div style="padding:10px;text-align:center;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">' + (s.content || '') + '</div>';
      }
      renderThumbs();
    }

    function renderThumbs() {
      if (!thumbsEl) return;
      thumbsEl.innerHTML = '';
      slides.forEach((sld, i) => {
        const t = document.createElement('div'); t.className = 'ppt-thumb'; t.draggable = true; t.dataset.i = i;
        const idxLabel = document.createElement('div'); idxLabel.className = 'thumb-index'; idxLabel.textContent = (i + 1);
        t.appendChild(idxLabel);
        if (sld.type === 'image') {
          const im = document.createElement('img'); im.src = sld.content; t.appendChild(im);
        } else {
          const tt = document.createElement('div'); tt.className = 'tt-text'; tt.textContent = sld.content || '（空白）'; t.appendChild(tt);
        }
        const del = document.createElement('button'); del.className = 'thumb-del'; del.textContent = '✕';
        del.addEventListener('click', (ev) => { ev.stopPropagation(); if (!confirm('删除幻灯片 ' + (i+1) + '？')) return; slides.splice(i,1); if (idx >= slides.length) idx = Math.max(0, slides.length - 1); if (!slides.length) { slides = [{ type: 'text', content: '（空白幻灯片）' }]; idx = 0; } saveSlides(); render(); });
        t.appendChild(del);
        t.addEventListener('click', () => { idx = i; render(); });

        // drag handlers
        t.addEventListener('dragstart', (ev) => { t.classList.add('dragging'); ev.dataTransfer.setData('text/plain', String(i)); ev.dataTransfer.effectAllowed = 'move'; });
        t.addEventListener('dragend', () => { t.classList.remove('dragging'); document.querySelectorAll('.ppt-thumb.over').forEach(x => x.classList.remove('over')); });
        t.addEventListener('dragover', (ev) => { ev.preventDefault(); t.classList.add('over'); ev.dataTransfer.dropEffect = 'move'; });
        t.addEventListener('dragleave', () => { t.classList.remove('over'); });
        t.addEventListener('drop', (ev) => {
          ev.preventDefault(); t.classList.remove('over'); const src = parseInt(ev.dataTransfer.getData('text/plain'), 10); const dst = i;
          if (isNaN(src) || src === dst) return;
          const item = slides.splice(src, 1)[0];
          // src 在 dst 之前时，移除后目标位已前移一格，需插到 dst-1 才是"落在目标前面"
          const insertAt = (src < dst) ? dst - 1 : dst;
          slides.splice(insertAt, 0, item);
          saveSlides(); idx = slides.indexOf(item); render();
        });

        thumbsEl.appendChild(t);
      });
    }

    render();
    const prev = document.getElementById('pptPrev');
    const next = document.getElementById('pptNext');
    const nw = document.getElementById('pptNew');
    const imgBtn = document.getElementById('pptImg');
    const delBtn = document.getElementById('pptDel');
    const fileInput = document.getElementById('pptFile');
    const exportBtn = document.getElementById('pptExport');
    const importBtn = document.getElementById('pptImport');
    const importFile = document.getElementById('pptImportFile');
    if (prev) prev.addEventListener('click', () => { idx = Math.max(0, idx - 1); render(); });
    if (next) next.addEventListener('click', () => { idx = Math.min(slides.length - 1, idx + 1); render(); });
    if (nw) nw.addEventListener('click', () => {
      const t = prompt('幻灯片内容：', '新幻灯片');
      if (t != null) { slides.push({ type: 'text', content: t }); idx = slides.length - 1; saveSlides(); render(); }
    });
    if (imgBtn && fileInput) {
      imgBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        if (!/^image\//i.test(f.type)) { showMsgToast('仅支持图片文件'); fileInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => {
          slides.push({ type: 'image', content: reader.result });
          idx = slides.length - 1; saveSlides(); render(); fileInput.value = '';
        };
        reader.onerror = () => { showMsgToast('读取图片失败'); fileInput.value = ''; };
        reader.readAsDataURL(f);
      });
    }
    if (delBtn) delBtn.addEventListener('click', () => {
      if (!confirm('确定删除当前幻灯片吗？此操作不可撤销。')) return;
      slides.splice(idx, 1);
      if (idx >= slides.length) idx = Math.max(0, slides.length - 1);
      if (!slides.length) { slides = [{ type: 'text', content: '（空白幻灯片）' }]; idx = 0; }
      saveSlides(); render();
    });

    // export/import
    if (exportBtn) exportBtn.addEventListener('click', () => {
      try {
        const blob = new Blob([JSON.stringify(slides)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'powerpoint.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      } catch (e) { showMsgToast('导出失败：' + e.message); }
    });
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', () => {
        const f = importFile.files && importFile.files[0];
        if (!f) return; const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            if (!Array.isArray(parsed)) throw new Error('格式不正确');
            // basic validation
            const ok = parsed.every(it => it && (it.type === 'text' || it.type === 'image') && typeof it.content === 'string');
            if (!ok) throw new Error('内容不符合预期');
            slides = parsed; idx = 0; saveSlides(); render(); importFile.value = '';
            showMsgToast('导入成功，已加载 ' + slides.length + ' 张幻灯片');
          } catch (e) { showMsgToast('导入失败：' + e.message); importFile.value = ''; }
        };
        reader.onerror = () => { showMsgToast('读取文件失败'); importFile.value = ''; };
        reader.readAsText(f);
      });
    }
  }

  // 初始化 Excel（仿 XP 表格：单元格编辑 + =公式 + 单元格引用 + SUM/AVG/MIN/MAX）
  function initExcel() {
    if (window._xlInited) return;
    window._xlInited = true;
    const rowsEl = document.getElementById('xlRows');
    if (!rowsEl) return;
    const COLS = 8, ROWS = 20;
    const LETTERS = 'ABCDEFGH';
    const KEY = 'lunahub_excel';
    let cells = {};
    try { const raw = localStorage.getItem(KEY); if (raw) cells = JSON.parse(raw) || {}; } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(cells)); } catch (e) { showMsgToast('保存失败：存储空间不足'); } }
    function colName(i) { return LETTERS[i]; }
    function ref(r, c) { return colName(c) + (r + 1); }
    function rangeCells(a, b) {
      const pa = parseRef(a), pb = parseRef(b);
      const r1 = Math.min(pa.r, pb.r), r2 = Math.max(pa.r, pb.r);
      const c1 = Math.min(pa.c, pb.c), c2 = Math.max(pa.c, pb.c);
      const list = [];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) list.push(ref(r, c));
      return list;
    }
    function parseRef(s) {
      const m = String(s).match(/^([A-Z]+)(\d+)$/);
      if (!m) return { r: -1, c: -1 };
      let c = -1; for (let i = 0; i < LETTERS.length; i++) if (LETTERS[i] === m[1]) c = i;
      return { r: parseInt(m[2], 10) - 1, c };
    }
    // —— 表达式求值（shunting-yard，支持 + - * / 与一元负号、括号）——
    function toksArith(s) {
      const out = []; const re = /\s*(\d+\.?\d*|\.\d+|[+\-*/()])/g;
      let m, last = null;
      while ((m = re.exec(s)) !== null) {
        let t = m[1];
        if (t === '-' && (last === null || /[+\-*/(]/.test(last))) out.push('u');
        else out.push(t);
        last = t;
      }
      return out;
    }
    function evalArith(s) {
      const toks = toksArith(s);
      const out = [], ops = []; const prec = { '+': 1, '-': 1, '*': 2, '/': 2, 'u': 3 };
      toks.forEach(t => {
        if (/^[\d.]/.test(t)) out.push(parseFloat(t));
        else if ('+-*/'.includes(t)) {
          while (ops.length) { const o = ops[ops.length - 1]; if (o !== '(' && prec[o] >= prec[t]) out.push(ops.pop()); else break; }
          ops.push(t);
        } else if (t === 'u') {
          while (ops.length) { const o = ops[ops.length - 1]; if (('+-*/'.includes(o) || o === 'u') && prec[o] >= prec.u) out.push(ops.pop()); else break; }
          ops.push(t);
        } else if (t === '(') ops.push(t);
        else if (t === ')') { while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()); if (ops.length) ops.pop(); }
      });
      while (ops.length) out.push(ops.pop());
      const st = [];
      out.forEach(t => {
        if (typeof t === 'number') st.push(t);
        else if (t === 'u') { const b = st.pop(); if (b === undefined) throw new Error('Invalid'); st.push(-b); }
        else { const b = st.pop(), a = st.pop(); if (a === undefined || b === undefined) throw new Error('Invalid'); let r = 0; if (t === '+') r = a + b; else if (t === '-') r = a - b; else if (t === '*') r = a * b; else if (t === '/') { if (b === 0) throw new Error('Div0'); r = a / b; } st.push(r); }
      });
      if (st.length !== 1) throw new Error('Invalid');
      return st[0];
    }
    const FN = {
      SUM: a => a.reduce((x, y) => x + y, 0),
      AVG: a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0,
      MIN: a => a.length ? Math.min.apply(null, a) : 0,
      MAX: a => a.length ? Math.max.apply(null, a) : 0,
      COUNT: a => a.length,
      ABS: a => Math.abs(a[0] || 0),
      ROUND: a => Math.round((a[0] || 0) * Math.pow(10, a[1] || 0)) / Math.pow(10, a[1] || 0)
    };
    function getValue(k, stack) {
      const raw = cells[k];
      if (raw == null || raw === '') return 0;
      if (raw[0] !== '=') { const n = parseFloat(raw); return isNaN(n) ? 0 : n; }
      if (stack && stack.indexOf(k) >= 0) return 0; // 循环引用
      try { return computeFormula(raw.slice(1), (stack || []).concat(k)); }
      catch (e) { return 0; }
    }
    function computeFormula(s, stack) {
      // 反复解析最内层函数调用（参数中无括号）
      let prev, cur = s;
      let guard = 0;
      do {
        prev = cur;
        cur = prev.replace(/([A-Za-z]+)\s*\(([^()]*)\)/g, (m, name, args) => {
          const fn = FN[name.toUpperCase()];
          if (!fn) throw new Error('未知函数 ' + name);
          const nums = [];
          args.split(',').forEach(arg => {
            arg = arg.trim(); if (!arg) return;
            if (/^[A-Z]+\d+:[A-Z]+\d+$/.test(arg)) {
              const [a, b] = arg.split(':');
              rangeCells(a, b).forEach(c => nums.push(getValue(c, stack)));
            } else if (/^[A-Z]+\d+$/.test(arg)) {
              nums.push(getValue(arg, stack));
            } else { const n = parseFloat(arg); if (!isNaN(n)) nums.push(n); }
          });
          return String(fn(nums));
        });
      } while (cur !== prev && ++guard < 50);
      // 解析单元格引用 → 数值
      cur = cur.replace(/[A-Z]+\d+/g, ref => String(getValue(ref, stack)));
      // 求值算术
      return evalArith(cur);
    }
    function displayValue(k) {
      const raw = cells[k];
      if (raw == null || raw === '') return '';
      if (raw[0] !== '=') return raw;
      try { const v = computeFormula(raw.slice(1), [k]); return (typeof v === 'number' && isFinite(v)) ? formatNum(v) : '错误'; }
      catch (e) { return '错误'; }
    }
    function formatNum(n) { return parseFloat(n.toPrecision(12)).toString(); }
    function rebuild() {
      rowsEl.innerHTML = '';
      // 表头行：角标 + A..H
      const corner = document.createElement('div'); corner.className = 'xl-cell xl-corner'; rowsEl.appendChild(corner);
      for (let c = 0; c < COLS; c++) {
        const h = document.createElement('div'); h.className = 'xl-cell xl-hd'; h.textContent = colName(c);
        rowsEl.appendChild(h);
      }
      // 数据行
      for (let r = 0; r < ROWS; r++) {
        const num = document.createElement('div'); num.className = 'xl-cell xl-rn'; num.textContent = (r + 1);
        rowsEl.appendChild(num);
        for (let c = 0; c < COLS; c++) {
          const k = ref(r, c);
          const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'xl-in'; inp.dataset.cell = k;
          inp.value = displayValue(k);
          inp.addEventListener('focus', () => { inp.value = cells[k] || ''; inp.select(); });
          inp.addEventListener('blur', () => { cells[k] = inp.value; save(); repaint(); });
          inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
          });
          rowsEl.appendChild(inp);
        }
      }
    }
    function repaint() {
      rowsEl.querySelectorAll('input.xl-in').forEach(inp => {
        if (document.activeElement === inp) return;
        inp.value = displayValue(inp.dataset.cell);
      });
    }
    rebuild();
    // 工具栏
    const clr = document.getElementById('xlClear');
    const exp = document.getElementById('xlExport');
    const imp = document.getElementById('xlImport');
    const file = document.getElementById('xlFile');
    if (clr) clr.addEventListener('click', () => {
      if (!confirm('清空所有单元格？此操作不可撤销。')) return;
      cells = {}; save(); rebuild();
    });
    if (exp) exp.addEventListener('click', () => {
      let csv = '';
      for (let r = 0; r < ROWS; r++) {
        const cols = [];
        for (let c = 0; c < COLS; c++) { const v = cells[ref(r, c)] || ''; cols.push('"' + String(v).replace(/"/g, '""') + '"'); }
        csv += cols.join(',') + '\r\n';
      }
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sheet.csv'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
      showMsgToast('已导出 CSV');
    });
    if (imp && file) {
      imp.addEventListener('click', () => file.click());
      file.addEventListener('change', () => {
        const f = file.files && file.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          const text = rd.result;
          const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.length);
          cells = {};
          lines.forEach((line, r) => {
            const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(s => s.replace(/,$/, ''));
            cols.forEach((raw, c) => {
              if (c >= COLS) return;
              let v = raw.replace(/^"(.*)"$/, '$1').replace(/""/g, '"');
              if (v !== '') cells[ref(r, c)] = v;
            });
          });
          save(); rebuild(); showMsgToast('已导入 CSV');
          file.value = '';
        };
        rd.readAsText(f);
      });
    }
  }


  /* ===== 日历 ===== */
  function initCalendar() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calTitle');
    const note = document.getElementById('calNote');
    const dateLabel = document.getElementById('calDateLabel');
    const KEY = 'lunahub_calendar_notes';
    let notes = {};
    try { notes = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { notes = {}; }
    let view = new Date(); view.setDate(1);
    let sel = null;

    function keyOf(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      title.textContent = y + '年 ' + (m + 1) + '月';
      grid.innerHTML = '';
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const today = new Date();
      for (let i = 0; i < first; i++) {
        const e = document.createElement('span'); e.className = 'cal-cell empty'; grid.appendChild(e);
      }
      for (let d = 1; d <= days; d++) {
        const e = document.createElement('button');
        e.className = 'cal-cell'; e.textContent = d;
        const k = y + '-' + (m + 1) + '-' + d;
        if (notes[k]) e.classList.add('has-note');
        if (y === today.getFullYear() && m === today.getMonth() && d === today.getDate()) e.classList.add('today');
        if (sel && sel === k) e.classList.add('sel');
        e.onclick = () => { sel = k; dateLabel.textContent = (m + 1) + '月' + d + '日'; note.value = notes[k] || ''; render(); };
        grid.appendChild(e);
      }
    }
    document.getElementById('calPrev').onclick = () => { view.setMonth(view.getMonth() - 1); render(); };
    document.getElementById('calNext').onclick = () => { view.setMonth(view.getMonth() + 1); render(); };
    const saveNote = () => {
      if (!sel) return;
      const v = note.value.trim();
      if (v) notes[sel] = v; else delete notes[sel];
      try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) { showMsgToast('备注保存失败：空间不足'); }
      render();
    };
    note.addEventListener('blur', saveNote);
    document.getElementById('calClearNote').onclick = () => {
      if (!sel) { showMsgToast('先点选一个日期'); return; }
      delete notes[sel]; note.value = '';
      try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) {}
      render(); showMsgToast('已清除该日备注');
    };
    // 默认选中今天
    sel = keyOf(today); dateLabel.textContent = (today.getMonth() + 1) + '月' + today.getDate() + '日';
    note.value = notes[sel] || '';
    render();
  }

  /* ===== 打地鼠 ===== */
  function initWhack() {
    const grid = document.getElementById('whGrid');
    if (!grid || grid.dataset.inited) return; grid.dataset.inited = '1';
    const scoreEl = document.getElementById('whScore');
    const timeEl = document.getElementById('whTime');
    const startBtn = document.getElementById('whStart');
    const holes = [];
    let score = 0, time = 0, timer = null, mole = null, busy = false;
    for (let i = 0; i < 9; i++) {
      const h = document.createElement('button'); h.className = 'wh-hole';
      const m = document.createElement('span'); m.className = 'wh-mole'; m.textContent = '🐹';
      h.appendChild(m); grid.appendChild(h); holes.push(h);
      h.onclick = () => {
        if (h.classList.contains('up')) {
          score += 1; scoreEl.textContent = score; h.classList.remove('up');
        }
      };
    }
    function spawn() {
      if (mole) mole.classList.remove('up');
      const i = (Math.random() * 9) | 0; mole = holes[i]; mole.classList.add('up');
    }
    function end() {
      clearInterval(timer); busy = false; startBtn.disabled = false;
      if (mole) mole.classList.remove('up');
      showMsgToast('时间到！得分 ' + score);
      score = 0; time = 0; scoreEl.textContent = '0'; timeEl.textContent = '30';
    }
    startBtn.onclick = () => {
      if (busy) return; busy = true; startBtn.disabled = true;
      score = 0; time = 30; scoreEl.textContent = '0'; timeEl.textContent = '30';
      spawn(); timer = setInterval(() => {
        time--; timeEl.textContent = time; spawn();
        if (time <= 0) end();
      }, 1000);
    };
  }

  /* ===== 记忆翻牌 ===== */
  function initMemo() {
    const grid = document.getElementById('mmGrid');
    if (!grid || grid.dataset.inited) return; grid.dataset.inited = '1';
    const scoreEl = document.getElementById('mmScore');
    const restart = document.getElementById('mmRestart');
    const ICONS = ['🍎','🍌','🍇','🍓','🍊','🍉','🍒','🥝'];
    let deck = [], first = null, lock = false, pairs = 0, moves = 0;
    function build() {
      deck = []; const pool = ICONS.concat(ICONS);
      for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
      grid.innerHTML = '';
      pool.forEach((ic, idx) => {
        const c = document.createElement('button'); c.className = 'mm-card'; c.dataset.ic = ic; c.dataset.idx = idx;
        c.innerHTML = '<span class="mm-face">？</span>';
        c.onclick = () => flip(c); grid.appendChild(c); deck.push(c);
      });
      first = null; lock = false; pairs = 0; moves = 0; scoreEl.textContent = '0 / 8';
    }
    function flip(c) {
      if (lock || c.classList.contains('open') || c === first) return;
      c.classList.add('open'); c.querySelector('.mm-face').textContent = c.dataset.ic;
      if (!first) { first = c; return; }
      moves++; const a = first, b = c; first = null;
      if (a.dataset.ic === b.dataset.ic) {
        pairs++; scoreEl.textContent = pairs + ' / 8';
        if (pairs === ICONS.length) showMsgToast('全部配对完成！用了 ' + moves + ' 步');
      } else {
        lock = true; setTimeout(() => {
          a.classList.remove('open'); b.classList.remove('open');
          a.querySelector('.mm-face').textContent = '？'; b.querySelector('.mm-face').textContent = '？';
          lock = false;
        }, 700);
      }
    }
    restart.onclick = build; build();
  }

  /* ===== 五子棋（黑白棋） ===== */
  function initGomoku() {
    const cv = document.getElementById('gmCanvas');
    if (!cv || cv.dataset.inited) return; cv.dataset.inited = '1';
    const ctx = cv.getContext('2d');
    const N = 15, LEN = 19 * 19; // LEN 与后端房间棋盘长度(361)对齐以兼容联机
    const SZ = cv.width / N;
    const status = document.getElementById('gmStatus');
    const restart = document.getElementById('gmRestart');
    const modeLocal = document.getElementById('gmModeLocal');
    const modeCreate = document.getElementById('gmModeCreate');
    const modeJoin = document.getElementById('gmModeJoin');
    const roomInfo = document.getElementById('gmRoomInfo');
    let board, turn, over;
    let mode = 'local', ws = null, roomCode = '', myColor = 0;
    function idx(r, c) { return r * N + c; }
    function reset() {
      board = Array(LEN).fill(0);
      turn = 1; over = false; status.textContent = '黑棋先手'; draw();
    }
    function draw() {
      ctx.fillStyle = '#e3b96b'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        ctx.beginPath(); ctx.moveTo(i * SZ + SZ / 2, SZ / 2); ctx.lineTo(i * SZ + SZ / 2, cv.height - SZ / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(SZ / 2, i * SZ + SZ / 2); ctx.lineTo(cv.width - SZ / 2, i * SZ + SZ / 2); ctx.stroke();
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!board[idx(r, c)]) continue;
        ctx.beginPath(); ctx.arc(c * SZ + SZ / 2, r * SZ + SZ / 2, SZ / 2 - 3, 0, Math.PI * 2);
        ctx.fillStyle = board[idx(r, c)] === 1 ? '#111' : '#fff';
        ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#888'; ctx.stroke();
      }
    }
    function win(r, c, p) {
      const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (const [dr, dc] of dirs) {
        let n = 1;
        for (let s = 1; s < 5; s++) { const rr = r + dr * s, cc = c + dc * s; if (rr < 0 || rr >= N || cc < 0 || cc >= N || board[idx(rr, cc)] !== p) break; n++; }
        for (let s = 1; s < 5; s++) { const rr = r - dr * s, cc = c - dc * s; if (rr < 0 || rr >= N || cc < 0 || cc >= N || board[idx(rr, cc)] !== p) break; n++; }
        if (n >= 5) return true;
      }
      return false;
    }
    function placeLocal(r, c) {
      if (over || board[idx(r, c)]) return;
      const color = turn;
      board[idx(r, c)] = color;
      if (win(r, c, color)) { over = true; status.textContent = (color === 1 ? '⚫ 黑棋' : '⚪ 白棋') + '获胜！'; draw(); return; }
      turn = turn === 1 ? 2 : 1; status.textContent = turn === 1 ? '黑棋落子' : '白棋落子';
      draw();
    }
    function tryPlace(r, c) {
      if (mode === 'local') { placeLocal(r, c); return; }
      if (myColor !== turn) { status.textContent = '请等待对方落子'; return; }
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'move', i: idx(r, c) }));
    }
    cv.onclick = e => {
      if (over) return;
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const c = Math.floor(x / SZ), r = Math.floor(y / SZ);
      if (r < 0 || r >= N || c < 0 || c >= N || board[idx(r, c)]) return;
      tryPlace(r, c);
    };
    restart.onclick = () => {
      if (mode !== 'local' && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'reset' }));
      reset();
    };
    function applyRemoteMove(i, color, newTurn) {
      const r = Math.floor(i / N), c = i % N;
      board[idx(r, c)] = color;
      if (win(r, c, color)) { over = true; status.textContent = (color === 1 ? '⚫ 黑棋' : '⚪ 白棋') + '获胜！'; }
      else { turn = newTurn; status.textContent = turn === 1 ? '黑棋落子' : '白棋落子'; }
      draw();
    }
    function connectWS(code, asHost) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = proto + '://' + location.host + '/ws/go';
      try { ws = new WebSocket(url); } catch (e) { status.textContent = '无法连接服务器'; return; }
      ws.onopen = () => { ws.send(JSON.stringify(asHost ? { type: 'create' } : { type: 'join', code })); };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'created') {
          roomCode = m.code; myColor = m.color; mode = 'host';
          roomInfo.textContent = '房间号：' + roomCode + '（你是黑棋）';
          status.textContent = '等待对手加入…';
        } else if (m.type === 'joined') {
          roomCode = m.code; myColor = m.color; mode = 'guest';
          board = (m.board && m.board.length === LEN) ? m.board.slice() : Array(LEN).fill(0);
          turn = m.turn; over = false;
          roomInfo.textContent = '房间号：' + roomCode + '（你是白棋）';
          draw(); status.textContent = '对手已加入，黑棋先手';
        } else if (m.type === 'start') {
          status.textContent = '对手已加入，黑棋先手';
        } else if (m.type === 'move') {
          applyRemoteMove(m.i, m.color, m.turn);
        } else if (m.type === 'reset') {
          reset();
        } else if (m.type === 'opponentLeft') {
          status.textContent = '对手已离开，房间关闭'; mode = 'local'; roomInfo.textContent = '';
          if (ws) { try { ws.close(); } catch (e) {} ws = null; }
        } else if (m.type === 'error') {
          status.textContent = m.msg || '发生错误';
        }
      };
      ws.onclose = () => { if (mode !== 'local') { status.textContent = '连接已断开'; roomInfo.textContent = ''; mode = 'local'; } };
    }
    function leaveRoom() {
      if (ws) { try { ws.send(JSON.stringify({ type: 'leave' })); ws.close(); } catch (e) {} ws = null; }
      mode = 'local'; roomInfo.textContent = ''; reset();
    }
    modeLocal.onclick = () => { leaveRoom(); status.textContent = '本地双人模式'; };
    modeCreate.onclick = () => { if (ws) leaveRoom(); connectWS(null, true); };
    modeJoin.onclick = () => {
      const code = (window.prompt('输入房间号：') || '').trim().toUpperCase();
      if (!code) return;
      if (ws) leaveRoom();
      connectWS(code, false);
    };
    reset();
  }

  /* ===== 围棋（19 路，含提子/禁着/打劫） ===== */
  function initGo() {
    const cv = document.getElementById('goCanvas');
    if (!cv || cv.dataset.inited) return; cv.dataset.inited = '1';
    const ctx = cv.getContext('2d');
    const N = 19;
    const MARGIN = 22, CELL = 28;
    const status = document.getElementById('goStatus');
    const blackEl = document.getElementById('goBlack');
    const whiteEl = document.getElementById('goWhite');
    const restart = document.getElementById('goRestart');
    const undo = document.getElementById('goUndo');
    const modeLocal = document.getElementById('goModeLocal');
    const modeCreate = document.getElementById('goModeCreate');
    const modeJoin = document.getElementById('goModeJoin');
    const roomInfo = document.getElementById('goRoomInfo');
    const BLACK = 1, WHITE = 2;
    let board, turn, over, ko, history;
    let mode = 'local', ws = null, roomCode = '', myColor = 0;
    function idx(r, c) { return r * N + c; }
    function reset() {
      board = Array(N * N).fill(0);
      turn = BLACK; over = false; ko = -1; history = [];
      status.textContent = '黑棋先手'; updateCount(); draw();
    }
    function updateCount() {
      let b = 0, w = 0;
      for (const v of board) { if (v === BLACK) b++; else if (v === WHITE) w++; }
      blackEl.textContent = b; whiteEl.textContent = w;
    }
    function draw() {
      ctx.fillStyle = '#e3b96b'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        const p = MARGIN + i * CELL;
        ctx.beginPath(); ctx.moveTo(p, MARGIN); ctx.lineTo(p, cv.height - MARGIN); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(MARGIN, p); ctx.lineTo(cv.width - MARGIN, p); ctx.stroke();
      }
      // 星位
      const stars = [3, 9, 15];
      ctx.fillStyle = '#3a2a12';
      for (const r of stars) for (const c of stars) {
        ctx.beginPath(); ctx.arc(MARGIN + c * CELL, MARGIN + r * CELL, 3, 0, Math.PI * 2); ctx.fill();
      }
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = board[idx(r, c)];
        if (!v) continue;
        const x = MARGIN + c * CELL, y = MARGIN + r * CELL;
        ctx.beginPath(); ctx.arc(x, y, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = v === BLACK ? '#111' : '#fff'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#888'; ctx.stroke();
        if (v === BLACK) { ctx.beginPath(); ctx.arc(x - 3, y - 3, CELL / 2 - 5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(); }
      }
      // 最后一手标记
      if (history.length) {
        const last = history[history.length - 1];
        const x = MARGIN + last.c * CELL, y = MARGIN + last.r * CELL;
        ctx.strokeStyle = '#d22'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.stroke();
      }
    }
    function neighbors(i) {
      const r = Math.floor(i / N), c = i % N, out = [];
      if (r > 0) out.push(i - N); if (r < N - 1) out.push(i + N);
      if (c > 0) out.push(i - 1); if (c < N - 1) out.push(i + 1);
      return out;
    }
    function group(i, color) {
      const seen = new Set(), stack = [i];
      while (stack.length) {
        const x = stack.pop();
        if (seen.has(x) || board[x] !== color) continue;
        seen.add(x);
        for (const n of neighbors(x)) if (board[n] === color) stack.push(n);
      }
      return seen;
    }
    function hasLiberty(g) {
      for (const i of g) for (const n of neighbors(i)) if (board[n] === 0) return true;
      return false;
    }
    // 本地落子（黑白交替），返回是否成功
    function placeLocal(r, c) {
      const i = idx(r, c);
      if (over || board[i] !== 0) return;
      if (i === ko) { status.textContent = '打劫：不可立即回提此处'; return; }
      const color = turn, opp = color === BLACK ? WHITE : BLACK;
      board[i] = color;
      let captured = [];
      for (const n of neighbors(i)) {
        if (board[n] === opp) {
          const g = group(n, opp);
          if (!hasLiberty(g)) { for (const x of g) { board[x] = 0; captured.push(x); } }
        }
      }
      // 自杀判定：落子后自身无气且未提子
      const myGroup = group(i, color);
      if (!hasLiberty(myGroup) && captured.length === 0) {
        board[i] = 0; status.textContent = '禁着：不可自杀'; return;
      }
      // 打劫：只提掉对方一枚孤子时，该点成为 ko
      if (captured.length === 1) ko = captured[0]; else ko = -1;
      history.push({ board: board.slice(), turn: turn, ko, r, c });
      turn = turn === BLACK ? WHITE : BLACK;
      updateCount(); draw();
      status.textContent = turn === BLACK ? '黑棋落子' : '白棋落子';
    }
    function tryPlace(r, c) {
      const i = idx(r, c);
      if (mode === 'local') { placeLocal(r, c); return; }
      if (myColor !== turn) { status.textContent = '请等待对方落子'; return; }
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'move', i }));
    }
    cv.addEventListener('click', e => {
      const rect = cv.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const c = Math.round((x - MARGIN) / CELL), r = Math.round((y - MARGIN) / CELL);
      if (r < 0 || r >= N || c < 0 || c >= N) return;
      tryPlace(r, c);
    });
    undo.onclick = () => {
      if (!history.length) return;
      const snap = history.pop();
      board = snap.board.slice(); turn = snap.turn; ko = snap.ko;
      updateCount(); draw();
      status.textContent = turn === BLACK ? '黑棋落子' : '白棋落子';
    };
    // 联机：远端落子应用到本地棋盘
    function applyRemoteMove(i, color, newTurn) {
      const r = Math.floor(i / N), c = i % N;
      board[i] = color;
      const opp = color === BLACK ? WHITE : BLACK;
      let captured = [];
      for (const n of neighbors(i)) {
        if (board[n] === opp) {
          const g = group(n, opp);
          if (!hasLiberty(g)) { for (const x of g) { board[x] = 0; captured.push(x); } }
        }
      }
      const myGroup = group(i, color);
      if (!hasLiberty(myGroup) && captured.length === 0) { board[i] = 0; }
      history.push({ board: board.slice(), turn: newTurn, ko: -1, r, c });
      turn = newTurn; updateCount(); draw();
      status.textContent = (turn === BLACK ? '黑棋' : '白棋') + '落子';
    }
    function connectWS(code, asHost) {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = proto + '://' + location.host + '/ws/go';
      try { ws = new WebSocket(url); } catch (e) { status.textContent = '无法连接服务器'; return; }
      ws.onopen = () => { ws.send(JSON.stringify(asHost ? { type: 'create' } : { type: 'join', code })); };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.type === 'created') {
          roomCode = m.code; myColor = m.color; mode = 'host';
          roomInfo.textContent = '房间号：' + roomCode + '（你是黑棋）';
          status.textContent = '等待对手加入…';
        } else if (m.type === 'joined') {
          roomCode = m.code; myColor = m.color; mode = 'guest';
          board = m.board.slice(); turn = m.turn; history = [];
          roomInfo.textContent = '房间号：' + roomCode + '（你是白棋）';
          updateCount(); draw();
          status.textContent = '对手已加入，黑棋先手';
        } else if (m.type === 'start') {
          status.textContent = '对手已加入，黑棋先手';
        } else if (m.type === 'move') {
          applyRemoteMove(m.i, m.color, m.turn);
        } else if (m.type === 'reset') {
          reset();
        } else if (m.type === 'opponentLeft') {
          status.textContent = '对手已离开，房间关闭'; mode = 'local'; roomInfo.textContent = '';
          if (ws) { try { ws.close(); } catch (e) {} ws = null; }
        } else if (m.type === 'error') {
          status.textContent = m.msg || '发生错误';
        }
      };
      ws.onclose = () => { if (mode !== 'local') { status.textContent = '连接已断开'; roomInfo.textContent = ''; mode = 'local'; } };
    }
    function leaveRoom() {
      if (ws) { try { ws.send(JSON.stringify({ type: 'leave' })); ws.close(); } catch (e) {} ws = null; }
      mode = 'local'; roomInfo.textContent = ''; reset();
    }
    modeLocal.onclick = () => { leaveRoom(); status.textContent = '本地双人模式'; };
    modeCreate.onclick = () => { if (ws) leaveRoom(); connectWS(null, true); };
    modeJoin.onclick = () => {
      const code = (window.prompt('输入房间号：') || '').trim().toUpperCase();
      if (!code) return;
      if (ws) leaveRoom();
      connectWS(code, false);
    };
    restart.onclick = () => {
      if (mode !== 'local' && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'reset' }));
      reset();
    };
    reset();
  }

  /* ===== 井字棋（九宫格） ===== */
  function initTic() {
    const grid = document.getElementById('ttGrid');
    if (!grid || grid.dataset.inited) return; grid.dataset.inited = '1';
    const status = document.getElementById('ttStatus');
    const restart = document.getElementById('ttRestart');
    let board, turn, over;
    function reset() {
      board = Array(9).fill(''); turn = 'X'; over = false; status.textContent = '轮到 ❌'; render();
    }
    function render() {
      grid.innerHTML = '';
      board.forEach((v, i) => {
        const b = document.createElement('button'); b.className = 'tt-cell'; b.textContent = v;
        b.onclick = () => {
          if (over || board[i]) return;
          board[i] = turn;
          const w = check();
          if (w) { over = true; status.textContent = (w === 'X' ? '❌' : '⭕') + ' 获胜！'; render(); return; }
          if (board.every(x => x)) { over = true; status.textContent = '平局'; render(); return; }
          turn = turn === 'X' ? 'O' : 'X'; status.textContent = '轮到 ' + (turn === 'X' ? '❌' : '⭕'); render();
        };
        grid.appendChild(b);
      });
    }
    function check() {
      const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b,c] of L) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
      return null;
    }
    reset();
  }

  /* ===== 单位换算器 ===== */
  function initConvert() {
    const catSel = document.getElementById('cvCat');
    if (!catSel || catSel.dataset.inited) return; catSel.dataset.inited = '1';
    const fromSel = document.getElementById('cvFrom');
    const toSel = document.getElementById('cvTo');
    const inEl = document.getElementById('cvIn');
    const outEl = document.getElementById('cvOut');
    const swapBtn = document.getElementById('cvSwap');
    const CATS = {
      length: { name: '长度', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 } },
      weight: { name: '重量', units: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.0283495 } },
      temp: { name: '温度', units: { C: 'C', F: 'F', K: 'K' } },
      area: { name: '面积', units: { m2: 1, km2: 1e6, cm2: 1e-4, ha: 1e4, ft2: 0.092903, acre: 4046.86 } },
      volume: { name: '体积', units: { L: 1, mL: 0.001, m3: 1000, gal: 3.78541, pt: 0.473176 } },
      time: { name: '时间', units: { s: 1, min: 60, h: 3600, d: 86400, wk: 604800 } },
      speed: { name: '速度', units: { mps: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444 } },
      data: { name: '数据', units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } }
    };
    function fillUnits(cat) {
      const u = CATS[cat].units; fromSel.innerHTML = ''; toSel.innerHTML = '';
      Object.keys(u).forEach(k => {
        fromSel.appendChild(new Option(k, k)); toSel.appendChild(new Option(k, k));
      });
      if (toSel.options.length > 1) toSel.selectedIndex = 1;
    }
    function convert() {
      const cat = catSel.value, u = CATS[cat].units, v = parseFloat(inEl.value);
      if (isNaN(v)) { outEl.value = ''; return; }
      if (cat === 'temp') {
        const f = fromSel.value, t = toSel.value;
        let c = f === 'C' ? v : f === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
        outEl.value = (t === 'C' ? c : t === 'F' ? c * 9 / 5 + 32 : c + 273.15).toFixed(2);
        return;
      }
      outEl.value = (v * u[fromSel.value] / u[toSel.value]).toPrecision(10).replace(/\.?0+$/, '');
    }
    catSel.onchange = () => { fillUnits(catSel.value); convert(); };
    fromSel.onchange = convert; toSel.onchange = convert; inEl.oninput = convert;
    swapBtn.onclick = () => { const a = fromSel.value; fromSel.value = toSel.value; toSel.value = a; convert(); };
    Object.keys(CATS).forEach(k => catSel.appendChild(new Option(CATS[k].name, k)));
    fillUnits('length'); inEl.value = '1'; convert();
  }

  WM.open('home');
  WM.open('help');

})();
