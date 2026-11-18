# 第三方来源与声明

## 插件自身

提供的运行包将插件自身代码按 [MIT](<LICENSE>) 发布，本次分发保留该许可证。以下为原随包声明列出的接口和交互设计参考版本；本次没有重新审计这些外部项目之间的代码来源关系：

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)，实际运行版本 0.2.1-rc.2；[DSH Desktop](https://github.com/dataelement/dsh-desktop) 0.12.1。以本机 Cordis Inspect 和发行实现及真实回执为准。
- [dsh-shortcuts 078ce8c](https://github.com/Ricketts-Guo/dsh-shortcuts/tree/078ce8cb0c4ea9592931c8ec5393a25d31d40ef6)：当前会话、取消和导航线索。
- [dsh-airpod-control 0a518b4](https://github.com/fishcg/dsh-airpod-control/tree/0a518b4b0d7f370ba032ff7eab8fb2b20a68eadd)：题目请求与鼠标回答共存思路，没有引入 AirPods 助手。
- [dsh-speech-input 7e02c5d](https://github.com/liznee/dsh-speech-input/tree/7e02c5dda159040a3c30d4d99ea14374a483fb50)：草稿保留研究。产品没有使用其 WebSpeech；使用目标官方 speechController。
- [HandGestureSoftware 03f010c](https://github.com/Agni-glitch/HandGestureSoftware/tree/03f010ca01e70ac0e4eb7a25caf02dba4c46742e)：时序、滑动与防回程重复的思路，不带 Python / Qt 运行时。

## 随包 MediaPipe

- `@mediapipe/tasks-vision` **1.2.3**，Google，Apache-2.0。保留分发 JS / WASM 中的原版权头，没有修改这些第三方文件。
- [上游 Apache 2.0 许可证与附加声明](https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE) 的完整副本见随包的 [MEDIAPIPE_LICENSE.txt](<assets/MEDIAPIPE_LICENSE.txt>)。
- [官方 README](https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/README.md) 的副本见 [MEDIAPIPE_README.md](<assets/MEDIAPIPE_README.md>)。其 Privacy Notice 说明本地处理输入，也提到使用指标；其 Tasks API 声明会收集性能/使用指标，见 [官方隐私说明](https://goo.gle/mediapipe-privacy)；本插件没有配置远程遥测，这不构成 SDK 零遥测保证。提供的包声明曾做隔离冷启动测试，但没有附该原始报告；本次分发检查没有复验摄像头或外网流量，不据此宣称网络行为已完整验收。

## 固定模型资源

- [Google 官方 gesture_recognizer float16/1 产物](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task)
- 8,373,440 bytes；SHA256 `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`。
- 分发检查核对哈希，运行时从插件同源路径读取，不从 CDN 下载。本轮另从上述官方固定版本 URL 只读下载核对，字节长度和 SHA256 与随包文件一致。
- 模型权重是独立第三方产物，本项目 MIT 声明不覆盖权重。按上游维护者关于模型默认采用 Apache-2.0 的声明分发，并保留 [Apache-2.0 许可证](<assets/MEDIAPIPE_LICENSE.txt>)。依据：[MediaPipe COLLABORATOR schmidt-sebastian 于 2026-10-05 的说明](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830)：`Our source and the models (unless otherwise noted) are licensed under Apache2.`
- [官方手势识别文档的 Models 节](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer#models) 将该资源与 [Hand Gesture Classification 模型卡](https://storage.googleapis.com/mediapipe-assets/gesture_recognizer/model_card_hand_gesture_classification_with_faireness_2022.pdf) 关联。模型卡记录用途和限制，但未单列许可证；许可依据是前述上游通用声明，不是文档的 CC BY 页脚，也不是逐哈希的单独授权文件。若上游为该资源补充不同条款，后续分发应按该具体条款更新。

## 分发测试中的 Connection 契约夹具

[测试用 JSON 校验夹具](<tests/helpers/connection-contract.mjs>)按当前 `@deepseek-ai/dsh-client-connection@0.2.1-rc.2` 的 `lib/client.browser.js:1288-1316` 和 Host JSON 响应分支整理，保留逻辑、调整排版，测试 RpcId 品牌处理为 identity。上游包声明 MIT；原项目 [DeepSeek Harness MIT 许可证](https://github.com/deepseek-ai/deepseek-harness/blob/master/LICENSE) 的完整版权和许可随 [DSH-LICENSE.txt](<tests/helpers/DSH-LICENSE.txt>) 保留，Copyright (c) 2026 DeepSeek。该夹具仅用于模拟回归，不是实际 Host 连接，也未覆盖二进制响应。

## 宿主依赖与开发依赖

React 从目标宿主加载，安装包不携带另一份 React。esbuild / @electron/asar 只用于开发构建和隔离验收，不是运行依赖；不含安装执行脚本。官方 SenseVoice 由 DSH 自己准备和缓存，未复制进本插件包。
