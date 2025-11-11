我来帮你分析整个项目并完善README.md文档。首先让我探索一下项目结构。

[11 tools called]

现在我了解了整个项目的结构。让我为您编写一份完整的README.md文档：

# AI写网文助手

基于DeepSeek API开发的网文写作辅助工具，能够分析上传的小说，提供续写、修改剧情、生成摘要等功能。

## 项目概述

这是一个全栈Web应用，包含Flask后端和HTML/CSS/JS前端，专门为网络小说创作者设计的AI辅助写作工具。

## 功能特点

### 核心功能
- **小说上传与分析** - 支持TXT格式小说文件上传，自动识别和分割章节
- **章节内容提取与展示** - 智能识别中文、英文、数字等多种章节标题格式
- **AI续写功能** - 基于DeepSeek API进行小说内容生成和续写
- **剧情线修改** - 对现有章节内容进行修改和优化
- **章节摘要生成** - 自动生成章节剧情概括
- **人物分析** - 分析章节中出现的人物及其行为
- **写作建议提供** - 提供创作指导和对话式交互

### 高级功能
- **上下文选择系统** - 可选择特定章节作为创作上下文
- **剧情库管理** - 保存和管理剧情梗概
- **多模型支持** - 支持DeepSeek和Gemini模型
- **实时对话界面** - 现代化的聊天式交互界面

## 技术架构

### 后端技术栈
- **Flask 2.3.3** - Python Web框架
- **Flask-CORS 4.0.0** - 跨域请求处理
- **python-dotenv 1.0.0** - 环境变量管理
- **requests 2.31.0** - HTTP请求库

### 前端技术栈
- **HTML5/CSS3** - 现代化响应式界面
- **JavaScript (ES6+)** - 交互逻辑
- **Marked.js** - Markdown渲染

### AI服务
- **DeepSeek API** - 通过OpenRouter接入
- **多提示词模板** - 针对不同任务优化的提示词系统

## 项目结构

```
Novel_asisit_new/
├── backend/                 # Flask后端
│   ├── app/                # 应用核心
│   │   ├── api/            # API路由
│   │   │   ├── novel_routes.py      # 小说相关API
│   │   │   └── generation_routes.py # 生成相关API
│   │   ├── prompts/        # 提示词管理
│   │   │   ├── prompt_manager.py    # 提示词加载器
│   │   │   └── templates/           # 提示词模板
│   │   └── services/       # 业务服务
│   │       ├── ai_service.py        # AI服务
│   │       └── novel_service.py     # 小说处理服务
│   ├── uploads/            # 文件上传目录
│   │   ├── novels/         # 原始小说文件
│   │   ├── analysis/       # 分析结果
│   │   └── generated/      # 生成内容
│   ├── config.py           # 应用配置
│   ├── requirements.txt    # Python依赖
│   └── run.py             # 应用启动入口
├── frontend/               # 前端界面
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   ├── api.js         # API调用封装
│   │   └── main.js        # 主逻辑
│   ├── assets/            # 静态资源
│   └── index.html         # 主页面
└── README.md              # 项目说明
```

## 安装与运行

### 环境要求
- Python 3.8+
- Node.js (可选，用于前端开发)
- 有效的DeepSeek API密钥

### 后端安装

1. 安装Python依赖：
```bash
cd backend
pip install -r requirements.txt
```

2. 配置环境变量（可选）：
创建 `.env` 文件并设置：
```env
SECRET_KEY=your-secret-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

3. 启动后端服务器：
```bash
python run.py
```
服务器将在 `http://localhost:5000` 启动

### 前端使用
前端是静态文件，可以直接在浏览器中打开 `frontend/index.html`，或者通过后端服务访问。

## API接口

### 小说管理
- `POST /api/upload` - 上传小说文件
- `POST /api/save-chapter` - 保存章节内容

### AI生成功能
- `POST /api/chapter-summary` - 生成章节摘要
- `POST /api/chapter-characters` - 分析章节人物
- `POST /api/process-chapter` - 处理章节内容
- `POST /api/summarize-chapters` - 概括多个章节
- `POST /api/generate-with-analysis` - 基于分析的生成

## 提示词系统

项目包含多个精心设计的提示词模板：

### 分析类提示词
- `analyze_characters.txt` - 人物分析
- `summarize_chapter.txt` - 章节概括
- `process_chapter.txt` - 章节处理

### 生成类提示词
- `generate_novel_content.txt` - 小说内容生成
- `system_prompts.txt` - 系统级提示词

## 使用说明

1. **上传小说**：点击"加载小说"按钮上传TXT格式的小说文件
2. **选择上下文**：在左侧面板选择要作为创作上下文的章节
3. **输入提示**：在底部输入框输入创作指令
4. **查看结果**：AI生成的内容会显示在对话历史中
5. **管理内容**：使用右侧浮动按钮管理剧情库和定稿

## 配置说明

### API密钥配置
API密钥可以在 `backend/config.py` 中直接配置，建议通过环境变量设置以提高安全性。

### 文件上传配置
- 支持文件类型：TXT
- 最大文件大小：16MB
- 上传目录自动清理：应用启动时会清空上传目录

## 开发说明

### 添加新功能
1. 在后端 `app/api/` 中添加新的路由
2. 在 `app/services/` 中实现业务逻辑
3. 在 `app/prompts/templates/` 中添加相应的提示词模板
4. 在前端 `js/main.js` 中添加对应的界面逻辑

### 自定义提示词
提示词模板使用简单的格式化字符串，可以通过修改模板文件来调整AI的行为。

## 注意事项

- 确保有稳定的网络连接，AI生成需要调用外部API
- 大文件处理可能需要较长时间，请耐心等待
- 建议定期备份生成的内容

## 版本信息

当前版本：V17.0 (上下文选择重构版)

## 许可证

本项目基于MIT许可证开源。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 支持

如有问题或建议，请通过GitHub Issues提交。