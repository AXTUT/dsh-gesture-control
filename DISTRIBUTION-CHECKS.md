# 分发检查记录

## 0.1.6 · 2026-11-17

环境：Node.js 24.21.0、macOS。目标运行版仍为 Windows Desktop 0.12.1 / Harness 0.2.1-rc.2，这不表示 macOS 功能验收。

公开发行树的 `node --test tests/*.test.mjs`：**21/21 通过**。其中原有分发检查 7 项，协议及 getter 回归 14 项：

1. 客户端模块工厂初始化、预期注入声明、模拟 overlay 注册及样式/事件卸载；不开设备，不联网。
2. 宿主入口、固定模型长度和 SHA256、bundle/locale/icon/exports、无安装脚本、发行材料完整性。
3. README 桌面前提和数据流说明；同时检查实际客户端仍告知当前语音提供方及拇指提交前默认模型收到文本。
4. 旧裸 `{submitted:true}` 负对照，稳定复现 `connection: invalid server-response result`。
5. 实际插件 Host handler 与 Client DualLink 的 offer/answer，经从目标 Connection 运行版读取的 JSON 解析器片段组合检查。
6. 保持 owner 身份和 SDP 检查、committed/messageId/retired 提交确认；拒绝缺少提交确认的响应，保留结构化失败消息。
7. 合成服务代理上的原型 RPC getter：验证调用时的 connection 接收者与 handler 注册。不是实际 Cordis Host 挂载。
8. manifest 与客户端显示版本一致，原图标、本地化与无安装脚本约束继续成立。

协议夹具只在独立临时目录写入合成地址和全零 token，结束后清理；不读取用户 profile，不向真实本地服务或对端发消息。Connection 夹具仅覆盖 JSON 分支，未覆盖 multipart/二进制。

4 个语法检查文件为 `lib/client.js`、`lib/index.js`、`assets/vision-worker.js` 和 `desktop/media-permissions.mjs`。发布 TGZ 解包后重复全部 21 项测试、语法与资产哈希检查；GitHub/npm 与冻结包逐字节核对结果见同版 Release 的验证报告。

## 0.1.5 历史基线

2026-11-16 的首次公开版分发回归 7/7。提供原包的隔离 VM 模块工厂曾复现 `TypeError: Cannot set properties of undefined (setting 'togglePeer')`；公开版已将成员纳入对象初始值。本次保留该修正，模型与第三方 SDK 不变。

首次测试还修正过两处夹具错误：模拟 connection 未提供 `state`、误以为 Host 导出数组型 `inject`；没有为迎合测试改动相应业务代码。

## 验证边界

未覆盖真实 Host 挂载、摄像头/麦克风权限、真人手形与中文口述、Windows 系统弹窗、macOS 支持、跨屏无焦点、两台物理机及完整模型执行链路。语法、模拟 overlay、RPC 解析器和 getter 夹具都不构成这些场景已经通过的证据。
