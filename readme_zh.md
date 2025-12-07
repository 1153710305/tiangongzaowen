
# 天工造文 (SkyCraft Novel AI) - 企业级前后端分离版 (v2.7)

> **架构理念**: 响应速度优先 (SQLite WAL + Hono + Streaming) | 稳定性优先 (Server Logger) | 模块化 (Modular Router) | 资产化沉淀 (Idea Cards & Novels)

本项目是一个专业的 AI 爆款网文生成系统。

**v2.7 更新：小说项目工作台 (Novel Workspace)**
*   实现从“脑洞卡片”一键初始化“小说项目”。
*   提供专属的 IDE 界面，支持章节和思维导图的增删改查。
*   数据库性能优化：正文内容采用懒加载机制。

---

## 🛠 数据库架构 (Schema Design v2.7)

为了保证百万字长篇小说的编辑性能，我们采用了高度规范化的关系型设计：

### 1. `novels` (项目表)
*   **用途**: 存储小说项目的元数据。
*   **字段**: `id` (PK), `user_id`, `title`, `origin_card_id` (关联脑洞), `status` ('draft').

### 2. `chapters` (章节表 - 读写分离优化)
*   **用途**: 存储正文内容。
*   **性能设计**: 列表查询时 **绝不返回** `content` 字段。只有进入编辑器时才按需加载 `content`。
*   **字段**: `id` (PK), `novel_id` (FK), `title`, `content` (TEXT, Lazy Load), `order_index`.

### 3. `mind_maps` (思维导图表)
*   **用途**: 存储世界观、人物关系图。
*   **字段**: `id` (PK), `novel_id` (FK), `title`, `nodes` (JSON String).

---

## 📖 使用说明书

### 1. 创意生成 (Generator)
*   在主界面通过参数配置或爆款分析生成脑洞。
*   收藏心仪的脑洞为“脑洞卡片”。

### 2. 小说初始化 (Initialization)
*   点击“脑洞卡片库”中的卡片，打开详情页。
*   点击 **“🚀 初始化小说项目”**。
*   系统将自动创建项目文件夹，并跳转至工作台。

### 3. 写作工作台 (Workspace)
*   **左侧资源树**: 切换“正文文件夹”和“思维导图”。
*   **中间编辑器**: 选中文件进行编辑。
*   **保存**: 实时保存内容到 SQLite 数据库。

---

*Powered by Google Gemini & Hono & SQLite*
