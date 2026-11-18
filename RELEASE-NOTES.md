# 0.1.6 · Dual 连接 RPC 修复

修复双端控制协商时的 `connection: invalid server-response result`。旧 Host 已提交本机信令消息，却返回裸 `{submitted:true}`；DSH Connection 要求 `{ok:true,value}`，而旧 Client 也从错误层级读取 `submitted`。

## 本次修改

- Host 返回 `{ok:true,value:{submitted:true}}`，Client 检查 `ok` 和 `value.submitted`，并保留结构化错误消息；offer、answer 共用的信令路径一起修正。
- 同步纳入本地修复版本的 Host RPC getter 兼容读取，沿原型找到 getter 后以 connection 为接收者调用。
- 在 0.1.5 公开发行树上精准迁移，不用本地开发包覆盖公开材料。保留初始化修正、语音提供方及默认模型数据流告知、许可、图标、本地化和 npm/GitHub 元数据；模型、WASM、SDK、设备权限及配对/绑定实现不变。
- 增加可复跑的协议回归和 RPC getter 夹具，并将客户端隐私提示纳入分发回归。测试的模拟消息服务只用临时目录里的全零凭据，不读取用户 profile。

## 升级与验证边界

两端都安装 `dsh-gesture-control@0.1.6` 并完全退出重开 DSH，确认面板版本后重新发起连接。保留已有 DualTransfer 配对和会话绑定，八位码核对与接收端点允许仍由用户完成。接收端无需摄像头。

目标仍是 Harness 0.2.1-rc.2 / Windows Desktop 0.12.1；桌面媒体权限补丁前提不变。本版由本地 `0.1.6-local.2` 修复整理为公开 `0.1.6`，不将本地安装回执当作本次公开包已在真实 Host 或两台物理机验收。摄像头、麦克风、真人手势与完整双机流程仍待验证。

详细检查范围见 [DISTRIBUTION-CHECKS.md](<DISTRIBUTION-CHECKS.md>)。各版 GitHub Release 单独附 TGZ、SHA256SUMS 和验证报告；0.1.5 的冻结文件不被替换。

---

# 0.1.5 · 首次公开分发

第三方非官方 DSH 插件；这是根据提供的预构建运行包整理的分发仓库，并非原始开发源码仓库。

## 本次修改

- 修复客户端加载错误：`poseNames.togglePeer = ...` 原本在 `poseNames` 对象初始化前执行。将该成员并入对象初始值，避免模块工厂抛出 `TypeError`。不改变手势映射或会话控制流程。
- 修正文案：语音按 DSH 当前所选语音提供方转写，选择本地 SenseVoice 才是音频本地处理；转写文本还会自动交给默认 LLM 整理，可能在拇指提交前发送至远程服务。
- 补 GitHub/npm 元数据、原创 SVG 图标和中英文本地化。
- 用随仓库交付、无需依赖的分发级 Node.js 回归检查替代原包中指向缺失文件的开发命令。没有声称拿到了原始构建器或原项目测试。
- 根据上游维护者关于模型默认 Apache-2.0 的说明补全第三方声明，并保留证据等级与具体模型卡链接。

## 兼容与验证范围

目标为 Windows DSH Desktop 0.12.1 / Harness 0.2.1-rc.2。原版 Desktop 拦截 `media` 权限；需要桌面维护者独立合入 `desktop/` 补丁，插件不会改宿主。该前提未满足时摄像头功能不可使用。

本次检查仅包括包结构、语法、VM 模块工厂、模拟 overlay 注册/卸载、模型哈希。尚未在真实 Host 验证摄像头/麦克风、Windows 权限、真人手势与中文口述、macOS、两台物理机或完整模型执行链路。不把模拟检查叫作产品全流程验收。

## 来源与可核对性

提供的原始 `dsh-gesture-control-0.1.5.tgz` SHA256：

```text
27b71e0e6dfc46ed190614eaa4abfdea4aacb40f00aa671dff2a7d5224e324d0
```

原包未覆盖。首次公开版本号仍为 0.1.5；公开 TGZ 包含以上修复，和提供的原包并非同一字节产物。最终公开 TGZ 的 SHA256、npm integrity 和分发测试报告随同一 GitHub Release 发布，用于区分原件与分发件。具体第三方来源见 [THIRD_PARTY_NOTICES.md](<THIRD_PARTY_NOTICES.md>)。
