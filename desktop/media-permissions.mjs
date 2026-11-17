// Minimal host-side prerequisite for Desktop 0.12.1. No plugin-side Electron bridge.
// Call once per BrowserWindow from secureWindow; only the caller's DSH main frame qualifies.
export function installGestureMediaPermissions(window, { dialog, isHarnessUrl }) {
  const grants = new WeakMap();
  const ordinary = (permission, url, main) =>
    ['clipboard-sanitized-write', 'notifications'].includes(permission) && main === true && !!url && isHarnessUrl(url);
  const media = (contents, permission, url, main) => {
    if (!contents || contents.isDestroyed() || permission !== 'media' || main !== true || !url || !isHarnessUrl(url)) return false;
    try { return new URL(url).origin === new URL(contents.getURL()).origin; } catch { return false; }
  };
  window.webContents.session.setPermissionCheckHandler((contents, permission, origin, details) => {
    const url = details.requestingUrl ?? origin;
    return ordinary(permission, url, details.isMainFrame) || media(contents, permission, url, details.isMainFrame);
  });
  window.webContents.session.setPermissionRequestHandler((contents, permission, callback, details) => {
    if (ordinary(permission, details.requestingUrl, details.isMainFrame)) return callback(true);
    if (!media(contents, permission, details.requestingUrl, details.isMainFrame)) return callback(false);
    const types = details.mediaTypes;
    if (!Array.isArray(types) || !types.length || types.some(type => !['audio', 'video'].includes(type))) return callback(false);
    const granted = grants.get(contents) ?? new Set();
    if (types.every(type => granted.has(type))) return callback(true);
    const devices = types.map(type => type === 'audio' ? '麦克风' : '摄像头').join('和');
    dialog.showMessageBox(window, {
      type: 'question', title: 'DSH 媒体权限', message: `允许当前 DSH 页面使用${devices}？`,
      detail: '用于你刚开启的手势或口述功能。关闭功能时插件会释放设备；本次桌面进程记住此选择。',
      buttons: ['允许', '取消'], defaultId: 1, cancelId: 1, noLink: true,
    }).then(({ response }) => {
      if (contents.isDestroyed()) return callback(false);
      const accepted = response === 0 && media(contents, permission, details.requestingUrl, details.isMainFrame);
      if (accepted) { types.forEach(type => granted.add(type)); grants.set(contents, granted); }
      callback(accepted);
    }, () => callback(false));
  });
}
