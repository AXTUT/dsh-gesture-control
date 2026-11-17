# 分发检查记录

检查日期：2026-11-16。环境：Node.js 24.21.0，macOS；目标运行版仍为 Windows Desktop 0.12.1 / Harness 0.2.1-rc.2，并不表示 macOS 功能验收。

提供的原包在隔离 VM 运行客户端模块工厂时，稳定复现 `TypeError: Cannot set properties of undefined (setting 'togglePeer')`。公开运行包已经把该字段放到 `poseNames` 对象初始值中。没有修改手势识别模型或第三方 SDK。

分发回归 `node --test tests/*.test.mjs`：**7/7 通过**。

1. 客户端模块工厂初始化及预期注入声明。
2. 模拟服务上的 overlay 注册、样式和事件卸载；没有启动设备或发起网络请求。
3. 宿主入口导入及所需路由服务声明。
4. 固定模型长度及 SHA256 与声明值匹配。
5. bundle、本地化、图标、exports 及无安装脚本检查。
6. 运行文件、第三方声明和桌面补丁材料完整性。
7. README 中的桌面权限、远程模型数据流和分发类型说明。

语法检查覆盖 `lib/client.js`、`lib/index.js`、`assets/vision-worker.js` 和 `desktop/media-permissions.mjs`。发布 TGZ 解包后还应原样重复分发测试、核对资产清单和 GitHub/npm 摘要。

首次测试有两处测试夹具错误：模拟 connection 未提供 `state`，以及误把宿主入口假定为导出数组型 `inject`。已按实际接口修正夹具后重跑；没有为迎合测试而改动相应业务代码。

**未覆盖：**真实 Host 挂载、摄像头/麦克风权限、真人手形与中文口述、Windows 系统弹窗、macOS 支持、跨屏无焦点、两台物理机和完整模型执行链路。模拟 overlay 和语法检查不构成这些场景已通过的证据。
