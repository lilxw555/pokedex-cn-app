// 只暴露更新所需的最小接口给页面
const { contextBridge, ipcRenderer } = require('electron');
let progressCb = null;
ipcRenderer.on('upd:progress', (_e, p) => { if (progressCb) progressCb(p); });
contextBridge.exposeInMainWorld('pkdxNative', {
  version: () => ipcRenderer.sendSync('upd:version'),
  fetchText: url => ipcRenderer.invoke('upd:fetch', url),
  onProgress: cb => { progressCb = cb; },
  download: (url, sha256, size) => ipcRenderer.invoke('upd:download', url, sha256, size),
  apply: () => ipcRenderer.invoke('upd:apply')
});
