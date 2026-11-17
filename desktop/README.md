# Desktop 0.12.1 媒体权限前提

目标发行版的主进程 `canGrantWindowPermission` 仅允许通知和剪贴板；原生摄像头、麦克风的实际请求均得到 `NotAllowedError: Permission denied`。这是宿主层前提，插件的浏览器代码没有 Electron 权限桥，也不会改动用户的 ASAR。

## 最小宿主改动

- [media-permissions.mjs](<media-permissions.mjs>)：保持原通知/剪贴板行为；只对本 DSH 主窗口、同源、本地 Harness 的 audio/video 请求弹出确认；取消是默认项；本进程按设备类型记住允许结果。
- [desktop-0.12.1-media.patch](<desktop-0.12.1-media.patch>)：针对实际发行构建产物的精确 diff，替换 `secureWindow` 中原来的两个权限处理器。原函数的导航、新窗口、webview 约束保持原样。

给 Desktop 维护者的接入方式：在 Desktop 源工程完成构建后，将 helper 放到 `out/main/media-permissions.mjs`，在工程根检查并应用 diff，再按 Desktop 原打包流程生成测试安装包。也可把同一调用直接合入 `secureWindow` 的 TypeScript 源码再构建。不要在两个权限处理器之后重新注册原处理器；同一 Electron session 最后注册的处理器生效。

```powershell
# 在独立 Desktop 源工程/测试构建中，而非正在运行的安装目录
Copy-Item <插件源码目录>/desktop/media-permissions.mjs out/main/media-permissions.mjs
git apply --check <插件源码目录>/desktop/desktop-0.12.1-media.patch
git apply <插件源码目录>/desktop/desktop-0.12.1-media.patch
```

当前开发机的生产 ASAR 保持原样。已在独立 Electron 43 测试 ASAR 中运行同一 helper：允许摄像头与麦克风、重复摄像头复用授权、取消两种请求、轨道结束都已通过。测试以 fake dialog 返回允许/取消，没有展示真实权限弹窗；真实弹窗文案和系统权限仍须真人确认。

装好包含该改动的 Desktop 后，在插件面板先开启摄像头，再点“预先确认麦克风权限”，两次权限处理完成后再回主屏工作，避免第一次口述时弹窗夺走注意力。插件按需打开设备；关闭、禁用、卸载时释放，不常驻录音。
