# AI 写网文助手

> 基于 Flask + DeepSeek 的网络小说创作辅助工具。

应用提供上下文管理、剧情设计、章节续写等功能，帮助创作者快速构建高质量内容。

## 主要能力
- 小说上传、章节解析与浏览
- 剧情设计 / 正文续写 / 章节加工
- 多模板提示词与系统提示词组合
- 剧情库与定稿管理、本地历史记录
- 前后端统一日志体系（详见 `docs/logging-guide.md`）

## 技术栈
- **后端**：Flask、Flask-CORS、python-dotenv、requests
- **前端**：HTML5、CSS3、JavaScript (ES6+)、Marked.js
- **AI 服务**：DeepSeek Chat API（通过自定义提示词系统调用）

## 目录结构

```
Novel_asisit_new/
├── backend/                  # Flask 服务
│   ├── app/
│   │   ├── api/              # API 路由
│   │   ├── prompts/          # 提示词管理
│   │   └── services/         # 业务逻辑层
│   ├── uploads/              # 上传与生成文件
│   ├── config.py
│   ├── requirements.txt
│   └── run.py
├── frontend/                 # 多页面前端
│   ├── css/
│   ├── js/
│   └── *.html
├── docs/                     # 项目文档
└── README.md
```

## 快速开始

1. **安装依赖**
	```powershell
	cd backend
	pip install -r requirements.txt
	```

2. **配置密钥**（可选）
	在 `backend/.env`（或系统环境变量）中设置：
	```env
	SECRET_KEY=your-secret-key
	DEEPSEEK_API_KEY=your-deepseek-api-key
	```

3. **启动后端**
	```powershell
	python run.py
	```
	服务默认监听 `http://127.0.0.1:5000`。

4. **使用前端**
	- 直接打开 `frontend/index.html`
	- 或通过本地静态服务器托管 `frontend/`

## API 概览
- `POST /api/upload`：上传 TXT 小说文件
- `POST /api/chapter-summary`：章节摘要
- `POST /api/chapter-characters`：人物分析
- `POST /api/process-chapter`：章节加工
- `POST /api/generate-with-analysis`：按意图生成内容

## 提示词体系
- 系统提示词：`backend/app/prompts/templates/system_prompts.txt`
- 用户提示词模板：`backend/app/prompts/templates/*.txt`
- 上下文构建：`backend/app/services/context_manager.py`

## 文档索引
- `docs/logging-guide.md`：前后端日志系统
- `docs/context-manager-refactor.md`：上下文管理重构记录
- `docs/frontend-architecture.md`：前端页面架构说明

## 贡献与支持
- 欢迎提 Issue / Pull Request
- 许可证：MIT

如有新功能想法或问题，请在 Issue 中讨论。