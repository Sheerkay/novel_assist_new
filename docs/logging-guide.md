# 日志系统使用指南

本项目实现了前后端统一的日志管理系统，将所有调试信息集中管理，便于开发和问题排查。

## 后端日志系统

### 文件位置
- 日志模块: `backend/app/utils/logger.py`
- 日志文件: `backend/logs/`
  - `api.log` - API 请求和响应日志
  - `ai_service.log` - AI 服务调用日志
  - `novel_service.log` - 小说服务日志
  - `app.log` - 应用程序日志

### 使用方法

```python
from app.utils.logger import api_logger, ai_logger, log_request, log_response

# 记录 API 请求
log_request('/api/summarize-chapters', {'chapter_count': 2})

# 记录 API 响应
log_response('/api/summarize-chapters', 200, {'summary_length': 500})

# 使用 logger 直接记录
api_logger.info('处理章节概括请求')
api_logger.error('处理失败', exc_info=True)

# AI 服务日志
ai_logger.info('调用 DeepSeek API')
```

### 日志级别
- `DEBUG` - 详细调试信息
- `INFO` - 一般信息
- `WARNING` - 警告信息
- `ERROR` - 错误信息

### 日志特性
- 自动按日期时间格式化
- 同时输出到控制台和文件
- 文件自动分割（单文件最大 10MB，保留 5 个备份）
- UTF-8 编码支持中文
- 开发环境彩色控制台输出

## 前端日志系统

### 文件位置
- 日志模块: `frontend/js/logger.js`

### 使用方法

```javascript
// API 相关日志
Logger.api.request('/api/summarize-chapters', 'POST', data);
Logger.api.response('/api/summarize-chapters', 200, result);
Logger.api.error('/api/summarize-chapters', error);

// 章节相关日志
Logger.chapter.select(chapters);
Logger.chapter.summarize(chapters);
Logger.chapter.summaryResult(summary);

// 上下文相关日志
Logger.context.update('原文章节', 3);
Logger.context.send(contextParts);

// UI 操作日志
Logger.ui.action('点击概括按钮', { chapterCount: 2 });
Logger.ui.error('加载失败', error);

// 通用日志方法
Logger.info('分类', '消息内容', 数据对象);
Logger.warn('分类', '警告信息', 数据对象);
Logger.error('分类', '错误信息', 错误对象);
Logger.debug('分类', '调试信息', 数据对象);
```

### 浏览器控制台命令

```javascript
// 查看所有日志历史
Logger.getHistory();

// 查看特定类别的日志
Logger.getHistory({ category: 'API' });
Logger.getHistory({ level: 'ERROR' });

// 导出日志到文件
Logger.export();

// 清空日志
Logger.clearHistory();

// 设置日志级别（0=DEBUG, 1=INFO, 2=WARN, 3=ERROR）
Logger.currentLevel = 1;  // 只显示 INFO 及以上级别
```

### 日志特性
- 彩色分类标签
- 带毫秒的时间戳
- 日志历史记录（最多 100 条）
- 一键导出日志文件
- 灵活的日志级别控制
- 开发模式自动启用

## 日志查看

### 后端日志查看

**实时查看（终端）**
```powershell
cd backend
python run.py
```

**查看历史日志文件**
```powershell
# 查看最新的 API 日志
Get-Content backend/logs/api.log -Tail 50

# 查看 AI 服务日志
Get-Content backend/logs/ai_service.log -Tail 50

# 实时监控日志
Get-Content backend/logs/api.log -Wait
```

**文本编辑器**
- 打开 `backend/logs/` 目录中的日志文件
- 推荐使用 VS Code，支持搜索和高亮

### 前端日志查看

**浏览器开发者工具**
- 按 `F12` 打开开发者工具
- 切换到 `Console`
- 查看格式化的彩色日志

**导出日志**
```javascript
Logger.export();
```
会自动下载包含所有日志的文本文件。

## 日志分类说明

### 后端
- `api` - API 路由层的请求和响应
- `ai_service` - AI 服务调用
- `novel_service` - 小说业务逻辑
- `app` - 应用程序级日志

### 前端
- `API` - 前端 API 调用
- `章节` - 章节选择与处理
- `上下文` - 上下文管理
- `UI` - 用户界面操作

## 开发建议

### 何时记录日志
- 应记录：API 请求/响应、重要业务逻辑、AI 调用、关键用户操作、异常
- 避免记录：高频循环、敏感信息、超大数据对象

### 日志级别选择
```
DEBUG   - 详细的调试信息，仅在开发时使用
INFO    - 一般的业务流程信息
WARNING - 潜在问题，但不影响运行
ERROR   - 错误信息，需要关注和修复
```

### 性能考虑
- 生产环境建议设置日志级别为 `INFO` 或 `WARNING`
- 避免在循环中输出大量日志
- 定期清理旧日志文件

## 故障排查

### 后端日志文件未生成
1. 确认 `backend/logs/` 目录存在
2. 检查写入权限
3. 查看终端是否有错误信息

### 前端日志不显示
1. 确认已引入 `logger.js`
2. 检查浏览器控制台是否有加载错误
3. 确认 `Logger.currentLevel` 设置

### 日志文件过大
- 后端日志自动分割（10MB/文件，保留 5 份）
- 可手动删除旧文件
- 调整日志级别减少输出

## 扩展计划
- 前端 UI 日志查看面板
- 日志远程上传和分析
- 日志搜索和过滤界面
- 实时日志推送（WebSocket）
- 日志统计图表

## 总结
统一的日志系统带来：
- 代码更整洁（日志逻辑与业务逻辑分离）
- 管理与查看更便捷
- 格式和风格一致
- 灵活的级别控制
- 便于排查问题与分析性能
