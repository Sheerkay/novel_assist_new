# 前端页面架构说明

> 更新日期：2025-11-15

## 重构背景

为了解耦原本臃肿的单页应用，前端被拆分为多个职责单一的页面，并抽离公共样式与脚本，实现代码分层与易维护性。

## 当前结构

```
frontend/
├── index.html              # 编辑续写模式（主页）
├── create.html             # 创作小说模式
├── history.html            # 历史对话模式
├── logs.html               # 日志管理模式
├── index_old.html          # 旧版本备份（暂存）
├── css/
│   ├── common.css          # 通用样式（头部、侧边栏、按钮、模态框）
│   ├── edit.css            # 编辑续写专用
│   ├── create.css          # 创作模式专用
│   ├── history.css         # 历史模式专用
│   ├── logs.css            # 日志模式专用
│   └── style.css           # 旧版本样式（待清理）
└── js/
    ├── common.js           # 全局共享脚本（侧边栏、模态框、toast）
    ├── edit.js             # 编辑续写核心逻辑
    ├── history.js          # 历史对话页面逻辑
    ├── logs.js             # 日志页面逻辑
    ├── logger.js           # 日志记录工具
    ├── api.js              # API 调用封装
    └── main.js             # 旧版本脚本（待清理）
```

## 页面职责

### index.html — 编辑续写模式
- 剧情设计 / 正文生成双模式切换
- 对话历史与 AI 回复展示
- 提示词输入与上下文勾选
- 小说上传、章节选择、剧情库与定稿管理
- 依赖：`common.css`, `edit.css`, `common.js`, `logger.js`, `edit.js`, `marked.js`

### create.html — 创作模式
- 从零创作新小说的入口（功能迭代中）
- 依赖：`common.css`, `create.css`, `common.js`

### history.html — 历史模式
- 浏览与管理历史对话记录
- 支持清空、本地存储
data 预览
- 依赖：`common.css`, `history.css`, `common.js`, `history.js`, `marked.js`

### logs.html — 日志模式
- 查看前端/后端日志
- 刷新、清空、下载
- 依赖：`common.css`, `logs.css`, `common.js`, `logs.js`

## 公共模块

- **common.css / common.js**：封装导航、侧边栏、模态框、按钮、Toast 等通用组件
- **logger.js**：前端统一日志工具
- **api.js**：封装后端 API 调用
- **localStorage**：跨页面共享 `novel_assist_*` 数据（小说、剧情库、标签、对话历史）

## 待办事项

- [ ] 整理旧文件（`index_old.html`, `style.css`, `main.js`）
- [ ] 完成 `create.html` 的创作流程交互
- [ ] 复用公共组件以减少重复样式
- [ ] 对页面切换体验做进一步优化

## 变更收益

- 结构清晰：每页专注单一职责
- 易维护：修改功能时影响面可控
- 性能优化：按需加载 CSS/JS
- 扩展友好：新增模块直接扩展页面
