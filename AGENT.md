# TransCraft AGENT Guide

## 0. 文档定位与优先级

本文件用于约束所有 AI 代理（包含 Codex、Copilot 及其他代码代理）在 TransCraft 仓库中的分析、改动、验证与交付行为。

- 规则强度定义：
  - `MUST`：强制要求，违反即视为不合格。
  - `SHOULD`：强烈建议，若不遵守必须在输出中说明原因与风险。
  - `MAY`：可选项，可按任务价值与成本决定是否采用。
- 优先级：
  - 本文件高于历史 Copilot 指令文档。
  - 若与历史文档冲突，`AGENT.md` 为唯一裁决标准。

## 1. 项目事实基线（禁止臆测）

AI 在执行任务前，MUST 先以仓库真实文件为准，并遵循以下已确认事实：

- 技术栈：Electron + electron-vite + Vue 3 + TypeScript。
- 代码风格（来自 `.editorconfig` 与 `.prettierrc.yaml`）：
  - 2 空格缩进
  - `singleQuote: true`
  - `semi: false`
  - `printWidth: 100`
- 质量脚本（来自 `package.json`）：
  - `pnpm lint`
  - `pnpm format`
  - `pnpm typecheck`
  - `pnpm build`
- Git Hooks（来自 `.husky`）：
  - `pre-commit`：`pnpm lint && pnpm format`
  - `commit-msg`：`commitlint`
- 发布模式（来自 `.github/workflows/release-on-version.yml`）：
  - 由 `package.json.version` 变化驱动 GitHub Actions 发布
  - 标签规则 `v<version>`
  - 支持 prerelease channel（如 alpha/beta）

## 2. 架构与目录规则（工程）

- `MUST`：遵守三进程边界
  - `src/main/*`：系统能力、窗口生命周期、原生集成
  - `src/preload/*`：受控桥接、最小暴露 API
  - `src/renderer/*`：UI 与交互逻辑
- `MUST`：新增能力先定义最小 IPC 接口，禁止 renderer 直接获取 Node/Electron 敏感能力。
- `SHOULD`：采用按功能分层目录（在现有结构上渐进演进）：
  - `src/renderer/src/features/*`：业务模块
  - `src/renderer/src/shared/*`：复用 UI、hooks、工具
  - `src/shared/*`：跨进程常量与协议类型（新增时再创建）
- `MUST`：禁止迁入 VS Code 专属约束到本项目（例如 `vs/nls`、微软版权头、VS Code build task 依赖）。

## 3. Electron 安全基线

- `MUST`：保持安全默认值
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`（仅在有书面例外说明时可偏离）
- `MUST`：通过 `contextBridge` 暴露最小 API；禁止把 `ipcRenderer` 或等价高权限对象整体暴露到 `window`。
- `MUST`：IPC 必须做 sender/频道/输入校验，不信任 renderer 传入数据。
- `MUST`：外链打开使用白名单策略；禁止无约束 `shell.openExternal`。
- `MUST`：禁止关闭 `webSecurity`；禁止对不可信远程内容开放高权限执行路径。
- `SHOULD`：发布前按 Electron Security Checklist 做一次复核。

说明：若仓库存在历史安全例外，AI 在相关任务中 MUST 显式标注“现状、风险、修复建议”，且不得扩大例外范围。

## 4. 编码与变更行为（AI 执行规范）

- `MUST`：先读后改。改动应最小必要、可回滚、与任务直接相关。
- `MUST`：与现有 ESLint/TypeScript 严格模式兼容，禁止用 `any` 逃逸类型安全（确有必要时说明边界与原因）。
- `SHOULD`：优先复用项目现有模式（如窗口状态桥接、preload 类型声明、Vue 组合式 API）。
- `MUST`：未经明确要求，不修改高风险配置（发布通道、签名、自动更新目标、安装器策略）。
- `MUST`：不得编造 API、文件路径、配置键或命令行为；不确定时先核实。

## 5. 提交与发布规则

- `MUST`：提交信息遵循 Conventional Commits，并符合当前 commitlint 配置。
- `MUST`：发布前至少通过 `lint + typecheck + build`。
- `MUST`：版本号遵循 SemVer，发布标签遵循 `v<version>`。
- `SHOULD`：预发布版本明确 channel（如 `alpha`、`beta`），并在发布说明中标明用途。

## 6. AI 输出格式约束

AI 每次交付结果 `MUST` 包含以下四项：

1. 改动摘要：做了什么、为什么。
2. 影响范围：涉及的文件、模块、运行面。
3. 验证结果：执行了哪些检查、通过/失败情况。
4. 未完成项/风险：未执行内容、剩余风险与建议。

附加要求：

- `MUST`：当关键信息缺失且无法从仓库推断时，先提问再实施。
- `SHOULD`：高风险操作（安全、依赖升级、发布）给出回滚策略。

## 7. 重要接口与类型契约（文档层）

### 7.1 跨进程能力显式建模

新增 IPC 能力时，`MUST` 同步定义：

- preload 暴露函数签名
- renderer 侧可见类型声明（如 `.d.ts`）
- 频道命名、输入输出类型与错误语义

### 7.2 安全默认值不可破坏

涉及 `BrowserWindow` 或 preload 变更时，`MUST` 显式检查并在结果中说明：

- `contextIsolation`
- `nodeIntegration`
- `sandbox`

### 7.3 发布语义契约

- 版本号是发布触发源。
- `MUST`：任何自动化改动不得绕过 SemVer 与 `v<version>` 标签规则。

## 8. 测试与验收场景（AI 自检模板）

### 8.1 文档一致性检查

- `MUST`：`AGENT.md` 中脚本、路径、流程与仓库实际一致。
- `MUST`：不包含与本仓库无关的 VS Code 专属规则。

### 8.2 安全规则可执行性检查

- 场景 A（新增 IPC）：
  - 必须出现 preload 暴露、sender 校验、类型声明同步。
- 场景 B（尝试开启 nodeIntegration）：
  - 必须拒绝并给出可行安全替代方案。

### 8.3 工程流程检查

- 场景 A（新增 UI 功能）：
  - 必须遵守目录边界与现有 lint/typecheck 约束。
- 场景 B（发布新版本）：
  - 必须遵循 SemVer + 版本驱动发布流程。

### 8.4 迁移完成检查

- 根目录存在 `AGENT.md`。
- 根目录不再保留 `copilot-instructions.md`。

## 9. 假设与默认值

1. “election 项目”按 Electron 桌面应用项目处理。
2. `AGENT.md` 为后续 AI 协作唯一主约束文档。
3. 文档主语言为中文，关键术语保留英文原词。
4. 不将中国镜像源策略写成强制条款。
5. 若后续进入多人协作扩展阶段，再补充 `CODEOWNERS`、分支保护、PR 模板等治理规则。

## 10. 官方来源（最后核验日期：2026-03-02）

1. Electron Security Tutorial: https://www.electronjs.org/docs/latest/tutorial/security
2. Electron Context Isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
3. Electron IPC Tutorial: https://www.electronjs.org/docs/latest/tutorial/ipc
4. BrowserWindow API: https://www.electronjs.org/docs/latest/api/browser-window
5. Electron Process Model: https://www.electronjs.org/docs/latest/tutorial/process-model
6. Electron Release Schedule: https://www.electronjs.org/docs/latest/tutorial/electron-timelines
7. Electron Blog (Node 22 migration): https://www.electronjs.org/blog/ecosystem-node-22
8. electron-vite Guide: https://electron-vite.org/guide/
9. electron-builder Configuration: https://www.electron.build/configuration.html
10. electron-builder Auto Update: https://www.electron.build/auto-update
11. electron-builder Publish: https://www.electron.build/publish.html
