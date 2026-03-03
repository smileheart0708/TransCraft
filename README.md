# TransCraft

一个使用 Vue 和 TypeScript 的 Electron 应用程序

## 推荐的 IDE 设置

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 项目设置

### 安装依赖

```bash
$ pnpm install
```

### 开发

```bash
$ pnpm dev
```

### 构建

```bash
# Windows 系统
$ pnpm build:win

# macOS 系统
$ pnpm build:mac

# Linux 系统
$ pnpm build:linux
```

## 自动发布（GitHub Actions）

项目已配置基于 `package.json` 的版本驱动发布流程：

1. 修改 `package.json` 中的 `version`（必须符合 SemVer，例如 `0.0.2-alpha`、`1.0.0`）。
2. 将改动 push 到 `main` 分支（且包含 `package.json` 变更）。
3. GitHub Actions 会自动检测版本是否变化：
   - 变化：构建并发布
   - 未变化：跳过构建与发布

自动构建目标：

- Windows: `x64` `.exe`（NSIS）
- macOS: `x64` 和 `arm64` `.dmg`
- Linux: `x64` `.AppImage` 和 `.deb`

自动发布规则：

- Tag 固定为 `v<version>`（例如 `v0.0.2-alpha`、`v1.0.0`）
- 预发布版本（含 `-alpha/-beta/...`）会标记为 prerelease
- 正式版本（`x.y.z`）会标记为正式发布
- 若同版本再次触发，会覆盖同名 Release 资产
