// 便携版自更新：下载新 exe → 校验 SHA-256 → 退出后用批处理替换原 exe 并重新启动
const { app, ipcMain, shell } = require('electron');
const https = require('https'), http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { spawn } = require('child_process');
const ALLOWED = /^https:\/\/pokedex-cn\.netlify\.app\//;   // 只从官方站点下载
const allowed = u => ALLOWED.test(u) || (process.env.PKDX_UPDATE_TEST === '1' && /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(u));
function get(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'PokedexCN-App/' + app.getVersion(), 'Cache-Control': 'no-cache' }, timeout: 15000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume(); const next = new URL(res.headers.location, url).href;
        if (!allowed(next) && !/^https:\/\/[\w.-]+\.netlify\.app\//.test(next)) return reject(new Error('重定向到未知地址'));
        return resolve(get(next, redirects - 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      resolve(res);
    });
    req.on('timeout', () => req.destroy(new Error('网络超时'))); req.on('error', reject);
  });
}
let pending = null;   // {file, target}
function setup(getWin) {
  ipcMain.on('upd:version', e => { e.returnValue = app.getVersion(); });
  ipcMain.handle('upd:fetch', async (_e, url) => {
    if (!allowed(url.split('?')[0])) throw new Error('不允许的地址');
    const res = await get(url); let s = ''; res.setEncoding('utf8');
    for await (const c of res) { s += c; if (s.length > 65536) throw new Error('清单过大'); }
    return s;
  });
  ipcMain.handle('upd:download', async (e, url, sha256, size) => {
    if (!allowed(url)) throw new Error('不允许的下载地址');
    const real = process.env.PORTABLE_EXECUTABLE_FILE;           // 便携版真实 exe 路径（运行时在临时目录解压）
    let dir = real ? path.dirname(real) : app.getPath('downloads');
    try { fs.accessSync(dir, fs.constants.W_OK); } catch (_) { dir = app.getPath('downloads'); }
    const file = path.join(dir, '宝可梦中文图鉴.new.exe.part');
    const res = await get(url); const total = +res.headers['content-length'] || size || 0;
    const hash = crypto.createHash('sha256'); const out = fs.createWriteStream(file); let got = 0, last = 0;
    await new Promise((resolve, reject) => {
      res.on('data', c => { hash.update(c); got += c.length; const now = Date.now();
        if (total && now - last > 150) { last = now; e.sender.send('upd:progress', Math.min(1, got / total)); } });
      res.on('error', reject); out.on('error', reject); out.on('finish', resolve); res.pipe(out);
    });
    const digest = hash.digest('hex');
    if (digest !== String(sha256).toLowerCase()) { try { fs.unlinkSync(file); } catch (_) {} throw new Error('文件校验失败（SHA-256 不一致），已删除'); }
    const done = file.replace(/\.part$/, ''); fs.renameSync(file, done);
    e.sender.send('upd:progress', 1);
    pending = { file: done, target: real && path.dirname(real) === dir ? real : null };
    return done;
  });
  ipcMain.handle('upd:apply', async () => {
    if (!pending) throw new Error('还没有下载更新');
    if (process.platform !== 'win32' || !pending.target) {          // 非便携版（如解压版）：打开新文件所在位置
      shell.showItemInFolder(pending.file); return { mode: 'opened', path: pending.file };
    }
    const bat = path.join(os.tmpdir(), 'pkdx-update-' + Date.now() + '.cmd');
    fs.writeFileSync(bat, [
      '@echo off', 'chcp 65001 >nul', 'set N=0',
      ':retry', 'set /a N+=1', 'timeout /t 1 /nobreak >nul',
      // 便携版启动器退出前原 exe 一直被占用，所以循环重试（最多 60 秒）
      `move /y "${pending.file}" "${pending.target}" >nul 2>&1 || (if %N% LSS 60 goto retry)`,
      `if exist "${pending.file}" (start "" "${pending.file}") else (start "" "${pending.target}")`,
      '(goto) 2>nul & del "%~f0"'
    ].join('\r\n'), 'utf8');
    spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => app.quit(), 300);
    return { mode: 'restart' };
  });
}
module.exports = { setup, get, _allowed: allowed };
