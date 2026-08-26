# 项目开发规则

本项目是 Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + Tauri。实现或修改界面时，遵循以下规则。

## 样式与主题

- 优先使用项目已有的语义主题变量，不要直接写颜色值或调色板颜色。常用变量包括：`bg-background`、`text-foreground`、`bg-card`、`text-card-foreground`、`bg-primary`、`text-primary-foreground`、`bg-secondary`、`text-muted-foreground`、`border-border`、`ring-ring`、`bg-destructive`。
- 如果确实需要项目当前主题中不存在的新颜色，必须先在 `src/index.css` 的主题变量中定义它，再在组件中通过 Tailwind 语义类使用。不要只在组件中写孤立的颜色值。
- 不要使用 `style` 属性、内联 CSS 或新建独立组件样式表来绕过 Tailwind 主题系统。

## Tailwind 类名

- 优先使用 Tailwind 预设类和项目主题中的 spacing、font-size、radius、shadow 等变量，例如 `text-lg`、`gap-6`、`max-w-xl`、`rounded-lg`。
- 只有在预设类和主题变量无法表达需求时，才使用任意值语法，例如 `text-[40px]`、`max-w-[200px]`；使用前先确认不存在等价的 Tailwind 类。
- 响应式布局必须优先使用 Tailwind 断点（如 `sm:`、`md:`、`lg:`、`xl:`）表达，例如 `max-w-xl md:max-w-2xl`，不要用 `clamp()`、手写媒体查询或任意宽度模拟断点。
- 等宽高尺寸优先使用 `size-*`，布局间距优先使用 `gap-*`，不要用重复的 `w-* h-*` 或 `space-x-*`/`space-y-*`。
- 复用已有 shadcn 组件及其 `variant`、`size` 等 API。尤其是按钮必须优先使用 `src/components/ui/button.tsx` 中的 `<Button />`，不要用原生 `<button>` 重新实现相同的视觉样式。

## 动态类名

- 所有条件类名、状态类名和类名拼接必须使用 `cn`，从 `@/lib/utils` 导入：

  ```tsx
  import { cn } from '@/lib/utils'

  <div className={cn('base-class', isActive && 'active-class')} />
  ```

- 不要使用模板字符串、字符串相加或手写三元表达式拼接 `className`。静态类名不需要为了形式而调用 `cn`。

## 修改范围

- 不要为了单个页面重写或清空 `src/index.css`；全局主题和 Tailwind 配置应保持稳定。
- 新增 UI 前先检查 `src/components/ui` 中是否已有可复用组件，优先组合现有组件而不是手写重复的基础控件。
- 完成改动后至少运行 `pnpm build`、`pnpm lint` 和 `pnpm format:check`。

## 文件与文件夹命名

- 新建或重命名的文件与文件夹名称必须全部使用小写字母；不得包含任何大写字母。
- 多个单词使用连字符（`-`）分隔，例如 `forward-back`；不要使用驼峰命名（`forwardBack`）或首字母大写命名（`ForwardBack`）。
- 路由文件、组件目录及其相关资源同样遵守此规则。项目工具要求保留的约定文件名（例如 `AGENTS.md`）不受此规则限制。
