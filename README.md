# 🪟 Lunahub — 网页版 Windows XP

纯 HTML / CSS / JS 实现的 Windows XP 桌面模拟，含完整论坛系统。

## 功能

- 🖥️ **XP 桌面**：拖动窗口、八向缩放、任务栏、开始菜单、桌面右键菜单（含子菜单）
- 🎨 **7 个真实 XP 主题**：亮蓝色 / Plus!自然 / 太空 / 达芬奇 / 水族馆 / Freestyle / Windows经典
- 🖼️ **41 张壁纸** + 10 种强调色 + 4 档字体大小
- 💬 **论坛系统**：注册/登录、发帖、嵌套回复、点赞
- 🛡️ **管理后台**：置顶/隐藏话题、用户管理、发布公告
- 📝 **记事本、外观面板、控制面板、关于** 等应用

## 运行

```bash
node server.js
```


管理员账号：`admin` / `admin123`（首次启动自动创建）

## 技术栈

- 前端：原生 HTML/CSS/JS（零框架）
- 后端：Node.js（零依赖，仅用 http/crypto/fs）
- 数据：JSON 文件持久化（data/users.json + data/forum.json）

ai制作
