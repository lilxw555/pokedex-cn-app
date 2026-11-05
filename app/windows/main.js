// 宝可梦中文图鉴 · 桌面版（Electron）：本地加载 site/index.html，外部链接用系统浏览器打开
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const updater = require('./updater-main');
Menu.setApplicationMenu(null);
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 380, minHeight: 600,
    title: '宝可梦中文图鉴', backgroundColor: '#f4f5f7', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, preload: path.join(__dirname, 'preload.js') }
  });
  win.removeMenu();
  // 页面里 target=_blank 的链接（PokeAPI 等）→ 默认浏览器
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  // 任何跳出本地页面的导航也交给默认浏览器
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.on('page-title-updated', e => e.preventDefault());   // 窗口标题固定为 宝可梦中文图鉴
  win.loadFile(path.join(__dirname, 'site', 'index.html'));
  return win;
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  updater.setup();
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
