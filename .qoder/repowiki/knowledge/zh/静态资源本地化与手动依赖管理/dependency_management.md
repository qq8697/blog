该仓库为 Hexo 生成的静态站点（GitHub Pages），**不包含现代前端项目的依赖管理系统**（如 `package.json`, `yarn.lock`, `go.mod` 等）。

### 1. 依赖管理策略：手动 Vendoring (本地化)
- **方式**：所有第三方库（jQuery, Font Awesome, Highlight.js, LightGallery 等）均以**源码形式直接存储在 `libs/` 目录下**。
- **版本控制**：通过目录结构体现版本，例如 `libs/jquery/2.1.3/jquery.min.js`。更新依赖需手动下载新文件并替换旧文件。
- **无包管理器**：没有使用 npm, yarn, pnpm 或 CDN 链接（除统计脚本外），所有核心 UI 依赖均为本地静态文件。

### 2. 关键文件与路径
- **依赖存放根目录**：`libs/`
  - `libs/jquery/2.1.3/`: jQuery 核心库
  - `libs/font-awesome/`: 图标字体库
  - `libs/highlight/`: 代码高亮库 (highlight.js)
  - `libs/lightgallery/`: 图片画廊插件
  - `libs/justified-gallery/`: 图片排版插件
- **引用入口**：`index.html` 及各文章 HTML 文件中通过 `<link>` 和 `<script>` 标签硬编码引用上述本地路径。

### 3. 开发者约定
- **更新依赖**：需手动从官方渠道下载指定版本的 JS/CSS 文件，覆盖 `libs/` 下对应文件，并确保 HTML 中的引用路径正确。
- **新增依赖**：需将库文件放入 `libs/` 新建的子目录中，并在模板或 HTML 中手动添加引用。
- **构建过程**：由于是纯静态站点生成产物，不存在 `install` 或 `build` 阶段的依赖解析过程，依赖即最终发布的静态文件。