# 分发检查记录

## 0.1.8 · 2026-11-23

环境：macOS、Node.js 24.21.0。源码树 **68/68**，原 59 项继续保留，新增 9 项：

- 呈现态切换、保留栏目、最小化后始终存在恢复入口；重载不持久化设备/授权。
- 隐藏同时移除状态、校验码、草稿、提示、列表，清宿主高亮并停止相应滚动；不改变识别、语音、动作、接收或内部列表场景。
- 控制/说明、最小化/恢复后同一模拟 MediaStream 重新挂载；测试不调用真实媒体接口。
- 原生按钮、tab 键盘导航、插件内部 Escape、恢复焦点；可选 locale 的中英字典/订阅完整卸载，不写语言偏好。
- 逐手势说明覆盖、双机与本机差异、语音外发告知、主题 token、偏移与视口上限；业务前缀除显示版本外与公开 0.1.7 的固定 SHA256 相同。

这些是隔离 DOM/React hooks/服务形状夹具，不代表真实浏览器几何、Windows 自动化栏、系统权限、摄像头/录音或物理双机验收。打包后须重新运行全部 68 项、5 个语法检查、资产哈希和源文件比对；公开 GitHub/npm 同包核验见本版 Release 的独立报告。

## 0.1.7 · 2026-11-23

环境：macOS、Node.js 24.21.0。实际发行树运行 **59/59** 项：原有 7 项分发、14 项 RPC/getter、新增 27 项版本门槛检查及 11 项 Adapter 契约形状回归。

- semver 7.7.3 原库在默认模式和 DSH 实际采用的 `includePrerelease:true` 下核对 26 个版本；另保留旧精确锁版拒绝 0.2.2、无上界写法误纳 0.2.3 alpha 的负对照。未来 rc/stable 用例验证的是范围策略，不是相应未来 Host。
- 公共 workspaces/adapter.current 不依赖私有字段；legacy 可见性限制保留且隐藏工作区不会落入未分组；caller-projected ids、防归档/子会话/非当前空白、置顶、手动及树顺序继续检查。
- 订阅释放、retain/release、`sending` 输入锁、普通草稿可观测回执和原审批阻断使用隔离服务夹具，不开启设备、不点击审批、不读真实 profile。
- 官方 0.2.1-rc.2 与 0.2.2-rc.1–rc.5 已发包的所用接口静态核对；未逐版在真实 Host 装载。完整范围与公开来源见 [COMPATIBILITY.md](<COMPATIBILITY.md>)。

发布时还需对最终 TGZ 解包重跑上述检查、语法和固定资产哈希，并对 GitHub/npm 下载逐字节比对；结果随该 Release 验证报告记录。以下旧版结果保持为历史，不作为新版实机证明。

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
