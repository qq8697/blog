该静态博客采用基于 **Hexo** 框架生成的经典 **Light 主题**（或高度相似的变体）作为前端视觉基础。整体设计风格简洁、扁平，以内容阅读为核心，辅以浅灰色背景和蓝色高亮色调。

### 1. 核心技术栈与样式体系
*   **CSS 方法论**：采用传统的层级式 CSS 编写方式，未使用 Sass/Less 预处理器或现代原子化 CSS（如 Tailwind）。样式文件集中在 `css/style.css`，通过类名嵌套和 ID 选择器管理组件样式。
*   **字体系统**：
    *   **正文/界面**：优先使用 `"open sans"`，回退至 `"Helvetica Neue"`, `"Microsoft Yahei"`, `Helvetica`, `Arial`, `sans-serif`。
    *   **代码块**：使用 `Consolas`, `monospace`。
    *   **图标**：深度集成 **Font Awesome** (`libs/font-awesome`)，用于导航、社交链接及文章元数据图标。
*   **代码高亮**：使用 **Highlight.js** 的 `github` 主题风格 (`libs/highlight/github.css`)，背景为浅灰 `#f8f8f8`，关键字为深色，字符串为红色系，保持与技术文档一致的视觉体验。

### 2. 设计令牌 (Design Tokens)
*   **主色调 (Primary)**：`#38b7ea` (天蓝色)，用于链接、按钮、高亮文本及时间轴节点。
*   **背景色 (Background)**：
    *   页面背景：`#f5f8f9` (极浅灰蓝)。
    *   卡片/容器背景：`#fff` (纯白)，配合轻微阴影 `0 1px 2px rgba(0,0,0,0.05)` 营造层次感。
*   **文本颜色 (Text)**：
    *   主要文本：`#565a5f` (深灰)。
    *   次要/元数据：`#999` 或 `#aaa`。
    *   边框/分割线：`#eceff2`。

### 3. 布局与响应式策略
*   **网格系统**：采用固定最大宽度 `1320px` 的居中布局 (`.outer`)。
*   **断点设计**：
    *   **Desktop (>1200px)**：三栏布局（左侧个人资料 `#profile`，中间内容 `#main`，右侧侧边栏 `#sidebar`）。
    *   **Tablet (800px - 1199px)**：双栏布局（隐藏个人资料，内容区与侧边栏并排）。
    *   **Mobile (<800px)**：单栏流式布局，隐藏顶部子导航，启用移动端专用导航栏 `#main-nav-mobile`。
*   **组件规范**：
    *   **文章卡片**：白色背景，圆角不明显，底部有轻微阴影。
    *   **引用块 (Blockquote)**：左侧带有 `4px` 宽的 `#eee` 边框，背景为 `#fcfcfc`，并配有 Font Awesome 引号图标。
    *   **时间轴 (Timeline)**：归档页面使用左侧边框线加圆点节点的垂直时间轴设计。

### 4. 开发者维护指南
*   **样式修改**：所有自定义样式应直接在 `css/style.css` 中覆盖或追加。由于缺乏预处理器，修改时需注意选择器优先级。
*   **资源引用**：第三方库（jQuery, Font Awesome, Highlight.js, LightGallery）均本地化存放在 `libs/` 目录下，避免直接引用外部 CDN 以确保稳定性。
*   **图片处理**：头像及 Logo 存放于 `css/images/`，文章配图存放于 `images/`。缩略图缺失时使用默认占位图 `thumb-default-small.png`。
*   **交互脚本**：主要交互逻辑（如搜索、移动端菜单、返回顶部）由 `js/main.js` 和 `js/insight.js` 控制，依赖 jQuery 2.1.3。