该仓库为基于 Hexo 生成的静态博客（GitHub Pages 托管），当前分支 `gh-pages` 仅包含构建后的静态产物，**不存在运行时配置系统**。

### 1. 配置现状分析
*   **无动态配置加载**：作为纯静态站点，没有后端服务或前端框架（如 React/Vue）常见的配置文件（如 `.env`, `config.yaml`, `settings.json`）来管理运行时行为。
*   **硬编码配置**：所有“配置”信息均在构建阶段被固化到 HTML/CSS/JS 文件中。例如：
    *   **站点元数据**：标题、描述、作者等信息直接写入 `index.html` 的 `<meta>` 标签和 `content.json` 中。
    *   **第三方服务 ID**：Google Analytics (`UA-127105097-1`) 和百度统计 (`fa59de63d3320a45f6aa672138d2e55c`) 的 ID 直接硬编码在 `index.html` 的 `<script>` 块中。
    *   **搜索配置**：站内搜索的路径和内容源在 `index.html` 中通过全局变量 `INSIGHT_CONFIG` 定义。

### 2. 关键文件
*   `index.html`: 包含站点全局配置、第三方统计代码、搜索配置及导航结构。
*   `content.json`: 由 Hexo 插件 `hexo-generator-json-content` 生成，存储了站点元数据（标题、副标题、根路径）及所有文章/页面的索引信息，用于前端搜索功能。
*   `css/style.css` & `js/main.js`: 包含样式和交互逻辑，无外部配置依赖。

### 3. 开发约定与建议
由于当前仓库仅为**发布产物**，若需修改配置（如更换统计 ID、修改站点标题）：
1.  **不要直接修改此仓库的文件**：这些文件是自动生成的，手动修改会在下次部署时被覆盖。
2.  **寻找源码仓库**：根据文章内容（"将静态博客迁移到 Hexo"），存在一个独立的 Hexo 源码仓库（通常包含 `_config.yml`, `package.json`, `themes/` 等）。
3.  **在源码中配置**：所有配置应在 Hexo 源码仓库的 `_config.yml` 或主题配置文件中完成，然后重新执行 `hexo generate` 和 `hexo deploy` 来更新此 `gh-pages` 分支。