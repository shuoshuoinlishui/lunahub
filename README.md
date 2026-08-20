# 🪟 Lunahub — 网页版 Windows XP

纯 HTML / CSS / JS 实现的 Windows XP 桌面模拟，含完整论坛系统。

## 功能

- 🖥️ **XP 桌面**：拖动窗口、八向缩放、任务栏、开始菜单、桌面右键菜单（含子菜单）
- 🎨 **7 个真实 XP 主题**：亮蓝色 / Plus!自然 / 太空 / 达芬奇 / 水族馆 / Freestyle / Windows经典
- 🖼️ **41 张壁纸** + 10 种强调色 + 4 档字体大小
- 💬 **论坛系统**：注册/登录、发帖、嵌套回复、点赞
- 🛡️ **管理后台**：置顶/隐藏话题、用户管理、发布公告
- 🌐 **IE6 风格浏览器**：内置服务端代理，可正常浏览网页
- 📝 **记事本、外观面板、控制面板、关于** 等应用

## 运行

```bash
node server.js
```

默认端口 3000，可用环境变量 `PORT` 修改。访问 http://localhost:3000

管理员账号：`admin` / `admin123`（首次启动自动创建）

## 部署到公网（其他电脑可访问）

本项目含 Node 后端（论坛 API + 浏览器代理），**不能用 GitHub Pages 静态托管**，需要能运行 Node 的平台：

### Render（推荐，免费）

1. 把本项目推送到 GitHub 仓库（`data/` 已在 .gitignore 排除）
2. 打开 https://render.com → 注册/登录 → New → Web Service
3. 连接 GitHub 账号，选中本仓库
4. 配置：
   - **Build Command**：留空（零依赖，无需安装）
   - **Start Command**：`node server.js`
   - **Environment**：默认即可（Render 自动注入 `PORT`）
5. 点 Create Web Service，等 1-2 分钟构建完成
6. 得到形如 `https://xxx.onrender.com` 的网址，任何电脑/手机浏览器都能访问

> ⚠️ 免费版注意：15 分钟无人访问会休眠（首次打开慢约 30 秒）；重新部署后 `data/` 里的注册用户和帖子会重置（磁盘不持久）。

### 备选平台

- **Railway**（railway.app）：每月 $5 免费额度，不休眠，可挂载持久磁盘
- **Fly.io**：免费额度足够小型论坛，`fly launch` 一条命令部署
- **Zeabur**：国内访问速度快，有免费额度

### 局域网访问（同一 Wi-Fi，无需部署）

本机运行 `node server.js` 后，其他设备访问 `http://<你的内网IP>:3000`（内网 IP 用 `ipconfig` 查看 IPv4 地址）。

## 技术栈

- 前端：原生 HTML/CSS/JS（零框架）
- 后端：Node.js（零依赖，仅用 http/crypto/fs）
- 数据：JSON 文件持久化（data/users.json + data/forum.json）
