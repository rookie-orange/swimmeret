# 项目与素材存储

画布通过异步仓库接口读写数据，组件不直接依赖文件路径、Tauri IPC 或网络请求。

## 结构

- `src/lib/project-storage/types.ts`：项目、素材与仓库契约。
- `tauri-repository.ts`：通过 IPC 调用 Rust，在应用数据目录保存文件。
- `browser-repository.ts`：浏览器开发环境使用 OPFS 本地文件。
- `repository.ts`：唯一的适配器选择入口，并迁移旧 localStorage 项目列表。
- `autosave.ts`：串行自动保存、版本检查、失败重试。
- `src/lib/local-asset-store.ts`：每个项目独立的 tldraw 素材适配器与 Blob URL 缓存。
- `src/lib/project-image-shape.ts`：确保图片导出使用原图，包括 PNG/JPEG 和拆层输入。
- `src-tauri/src/projects.rs`：文件读写、原子提交和项目操作。

桌面端目录由 `app.path().app_data_dir()` 决定，macOS 通常为：

```text
~/Library/Application Support/com.charleslee.swimmeret/projects/
  <project-id>/
    project.json
    assets/
      <asset-key>-original
      <asset-key>-preview
```

浏览器端使用当前站点的 OPFS 根目录下 `swimmeret-projects/`，目录布局相同。浏览器数据与桌面数据相互独立，不自动同步；更换开发端口也会使用不同的浏览器存储。

## 保存约定

`project.json` 包含 `schemaVersion`、`revision`、项目名称、回收站状态、更新时间，以及完整的 tldraw `document` 和 `session` 快照。快照携带元素、图层关系、素材记录、页面、相机位置与缩放。撤销栈不属于 tldraw 快照，重新打开后不会恢复上次会话的撤销记录。

原图按导入字节保存，不重编码。预览单独生成，最长边为 2048 像素；素材元数据保留原图尺寸和文件大小。快照里的 `src` 使用 `asset:<key>`，不写入 Blob URL、绝对路径或临时网络地址。显示时读取预览，导出时读取原图。

素材先落盘，再写入画布。保存快照前检查其引用的原图和预览都存在，避免提交指向不存在文件的作品。写入失败时尝试清理未被提交的素材；如果磁盘本身不可访问，清理也可能失败，但不会引用这些半写入文件。

桌面端使用临时文件、`sync_all` 和 rename 提交；浏览器端通过 OPFS writable stream 的 close 提交。保存使用 `expectedRevision`，不匹配时拒绝覆盖其他窗口的更新。单个桌面进程内的写入由互斥锁串行化；浏览器标签页使用 Web Locks。

自动保存以 600ms 窗口合并更改，连续编辑期间也会定期提交。页面离开等待保存；窗口关闭和正常应用退出先触发保存，失败时保留页面并显示重试入口。浏览器刷新/关闭无法等待异步写入，存在未保存更改时触发浏览器离开提示。强制结束进程、断电或清除浏览器站点数据不在这些保护的范围内。

删除画布元素不会立即删除原图，以保留当前会话的撤销能力。移入回收站只改状态；恢复后文件保持不变。永久删除项目时才删除整个项目目录。未引用素材的后台回收与历史版本管理暂未实现。

旧 localStorage 项目元数据会逐项迁移，全部成功才移除旧列表；已有文件不会被迁移覆盖。旧版本从未保存过的画布内容无法从项目名称恢复。损坏或不支持的项目文件会报错，不会用空画布覆盖。

## 未来的 HTTP 适配

实现 `WorkspaceRepository`，再在 `repository.ts` 切换实例即可。编辑器、导入、导出和自动保存无需感知传输方式。

| 接口 | HTTP 实现建议 |
| --- | --- |
| `projects.list/create/load` | 项目列表、创建与详情端点 |
| `projects.save` | 使用 `expectedRevision` 或映射到 `If-Match`；冲突返回 409/412 |
| `projects.setTrashed/delete` | 软删除/恢复与永久删除端点 |
| `assets.put/get` | 原图和预览分开传输，读写使用二进制 Blob |
| `assets.discard` | 清理失败上传且未被项目引用的素材 |

远端应继续遵守“素材先成功提交，快照后提交”的约定，保留稳定素材 key，签名 URL 仅作为适配器内部细节。认证、错误转换、超时与重试也放在 HTTP 适配器中。网络写入建议增加幂等操作 ID，处理请求成功但响应丢失的情形；版本冲突需要显式重新读取并由产品流程决定如何合并。

当前接口适合替换存储后端，不等同于离线同步或多人实时协作。后者还需要同步队列、冲突解决和服务端事务，不能仅靠把文件调用换成 `fetch` 完成。

## 验证

```sh
pnpm build
pnpm lint
pnpm format:check
pnpm test:storage
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

`test:storage` 使用支持 `--experimental-transform-types` 的 Node.js（本次使用 Node 24）。浏览器集成测试在 Vite 启动后访问 `/tests/project-storage.html`，会创建并清理自己的临时测试项目，验证原图哈希、预览尺寸、快照恢复、视角、版本冲突、失败素材清理、回收站与逐像素导出细节。

本次 macOS 26.3 独立调试包实测确认了原生项目文件创建和 390px 窗口布局。原生文件选择器测试在 `wry::wkwebview::WryWebViewUIDelegate::run_file_upload_panel` / `NSOpenPanel::openPanel` 中发生 SIGABRT，尚未进入素材存储调用；因此原生选择器导入及退出恢复的完整 UI 链路未验收。浏览器集成测试与 Rust 文件存储测试已通过。该平台问题需要进一步独立定位，不能用通过的存储测试替代原生 UI 验证。
