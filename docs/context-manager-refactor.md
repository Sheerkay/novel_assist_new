# 上下文管理系统重构说明

## 重构目标

消除提示词模板和服务函数中重复的上下文处理代码，建立统一的上下文管理系统。

## 重构内容

### 新增模块 `context_manager.py`

`ContextManager` 负责统一管理所有类型的上下文：

```python
class ContextManager:
    def set_additional_context(context_string, context_chapters)
    def get_context_for_intent(intent)
    def build_messages(intent, user_prompt, system_prompt_name, template_name)
    def _format_chapter_list()
    def clear()
```

核心能力：
- 集中管理附加上下文（章节内容、剧情库等）
- 根据不同意图返回合适的上下文
- 自动格式化章节列表
- 构建完整的消息列表（系统提示词 + 用户提示词）

### 更新 `ai_service.py`

新增统一入口：

```python
def generate_content_with_intent(intent, user_prompt, context_manager)
```

职责：
- 根据意图选择模板与系统提示词
- 自动处理上下文格式
- 调用 DeepSeek API 生成内容

为保持向后兼容，旧接口仍保留：
- `generate_novel_content()`
- `generate_plot_design()`
- `generate_full_novel()`
- `_generate_content_with_template()`

### 更新 `generation_routes.py`

`/api/generate-with-analysis` 路由改为：

```python
context_manager = ContextManager()
context_manager.set_additional_context(context_string, [])
content = ai_service.generate_content_with_intent(intent, prompt, context_manager)
```

改进点：
- 路由逻辑更精简
- 上下文管理集中化

## 架构收益

| 之前的问题 | 重构后的收益 |
|-------------|--------------|
| 上下文格式化代码分散 | 统一入口 `ContextManager` |
| 多处处理 `context` 参数 | 自动封装上下文逻辑 |
| 模板重复处理上下文 | 模板专注格式呈现 |
| 维护扩展困难 | 模块职责清晰，易扩展 |

## 意图与上下文映射

| 意图 | 使用附加上下文 | 温度 | 模板 |
|------|----------------|------|-------|
| `chat` | 否 | 0.7 | 无 |
| `plot_design` | 是 | 0.5 | `plot_design.txt` |
| `novel_generation` | 是 | 0.7 | `novel_generation.txt` |

## 未来扩展

- 对话历史管理（`conversation_history` 字段已预留）
- 更多上下文类型：人物设定、世界观、风格指南
- 上下文优先级策略

## 测试

运行 `python backend/test_context_manager.py`，覆盖：
- 上下文设置与获取
- 不同意图的上下文返回
- 章节列表格式化

## 版本信息
- 首次整理：2025-11-16
- 适用分支：`master`

## 总结

- 统一上下文管理入口，代码更整洁
- 上下文与模板职责分离，降低耦合
- 新功能易扩展，同时保持旧接口可用
