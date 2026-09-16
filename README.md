# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 打包

使用 `pnpm package:current` 可以按照当前操作系统生成安装包。也可以通过目标平台脚本单独打包：

```bash
# Windows x64 / ARM64
pnpm package:windows
pnpm package:windows:arm64

# macOS 通用包 / Intel / Apple Silicon
pnpm package:macos
pnpm package:macos:intel
pnpm package:macos:arm64

# Linux x64 / ARM64
pnpm package:linux
pnpm package:linux:arm64
```

目标平台脚本使用 Tauri 的 Rust target triple。跨平台构建前请先安装对应的 Rust target；macOS 通用包需要同时安装 `aarch64-apple-darwin` 和 `x86_64-apple-darwin`。Windows 和 Linux 的安装包通常应在对应的宿主系统上构建，并准备好该平台的打包工具与签名环境。
