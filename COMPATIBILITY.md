# DSH 兼容说明 · 插件 0.1.7

## 安装范围

```text
>=0.2.1-rc.2 <0.2.2-0 || >=0.2.2-rc.1 <0.2.3-0
```

这是一项有上界的系列兼容策略：保留 0.2.1-rc.2 起与 0.2.2-rc.1 起两个 minor 的后续 rc/stable；不再精确锁住旧 rc.2。排除 0.2.2 alpha、0.2.3 的预发布/正式版及更高 minor。后续版本纳入范围不表示它们已经发布或逐版实机验收。

截至 2026-11-23，官方 npm `latest/next` 为 **0.2.2-rc.5**，`alpha` 为 **0.2.3-alpha.2**；没有 0.2.2 stable。DSH 自身用 `semver.satisfies(version, range, { includePrerelease: true })`，因此没有采用容易误纳未审 alpha 的 `>=0.2.1-rc.2 <0.3.0`。

插件保留 Node.js ≥22 的原声明；实际运行还必须满足 Harness 本身的更高要求，例如 0.2.2-rc.5 要求 Node ≥24.9.0。本轮回归环境为 Node 24.21.0，没有另称 Node 22 上已实测。

## 已核对和修正的内容

对官方 **0.2.1-rc.2、0.2.2-rc.1–rc.5** 已发布 npm 包的所用 public types/实现做静态核对：Host Connection RPC/路由、profile context、speech、LLM/default model、Session retain/binding/prompt/cancel 和 Slot 注册没有发现新的删项。这不是逐版真实 Loader 或设备验收；0.2.1-rc.3–rc.5 也没有被写成逐包全审。

本版另修正两个具体问题：

1. **既有 Workspace 接口失配。** 旧版无条件调用非官方 `isSessionVisible/isWorkspaceVisible`，官方旧 rc.2 也没有这两个方法。优先改用 `ctx.get('workspaces')`、`uiSession.adapter.current`；legacy 可见性扩展若存在仍执行。保留 caller-projected ids、归档/子会话/非当前空白排除、侧栏排序与订阅清理，隐藏工作区不会重新落入未分组。列表按既有规则重建，不保证等同当前屏幕上经过折叠、搜索和 overflow 后的每一行。
2. **0.2.2 新增 `sending` 状态。** 输入锁包括该状态，发送中不再尝试发送草稿或插入转写。没有将该遗漏夸大为已证实的数据丢失或重复提交；DSH 内部也有冻结保护。

0.1.6 的标准 `ok/value` 双端信令响应、Host 原型 RPC getter、owner/提交确认/审批边界保留。没有改模型、WASM、第三方 SDK、配对或权限实现。

## 可复跑检查

```sh
npm test
```

59 项分发、RPC/getter 和兼容夹具：27 项真实 semver 门槛检查、11 项 Adapter 契约形状回归、原有 21 项。semver 用例同时检查默认模式与 DSH 的 includePrerelease 模式；`rc.99`/stable 等未来用例只证明范围表达式。公共/legacy 列表、成员过滤、订阅卸载、retain/release、sending、普通回执和审批阻断均为隔离服务夹具。

测试不读取用户 profile 凭据，不运行真实模型、不启动相机/麦克风，不建立真实物理双机。最终 TGZ 解包后的重复检查与 GitHub/npm 同包哈希，见同版 Release 的验证材料。

## 仍需现场验收

真实 Host 加载/卸载、相机与 Worker/WASM、系统媒体权限、慢于 2500ms 的 prompt admission、草稿竞争与附件、实际题目 DOM、语音 provider/LLM polish、macOS/Windows 与物理双机，均未由上述静态核对和夹具证明通过。

部分 input shell、pending domains、sidebar store、题目 DOM 仍属内部实现耦合；双端路径还依赖另装的 DualTransfer 私有协议，而非官方 DSH 公共 API。新版 Host、Desktop 或 DualTransfer 改动后应重新验证，不能只靠 engines 放行。旧 Windows Desktop 0.12.1 的媒体权限补丁只针对对应桌面版本；插件本身不改宿主。

语音提供方和默认模型的数据流保持原告知：录音结束后，转写全文会自动交默认 LLM 整理，远程 provider 可能在 👍 前收到文本。详见 [README](<README.md>)。

## 公开依据

- [官方 DSH npm 元数据](https://registry.npmjs.org/%40deepseek-ai%2Fdsh)
- [0.2.2-rc.5 官方 Release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5)
- [官方兼容门槛实现](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.5/packages/boot/app-boot/src/plugin-compatibility.ts#L51-L80)
- [第三方许可与固定资源](<THIRD_PARTY_NOTICES.md>)
