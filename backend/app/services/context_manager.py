"""
上下文管理模块
负责统一管理和格式化不同类型的上下文
"""

class ContextManager:
    """上下文管理器"""
    
    def __init__(self):
        self.additional_context = ""  # 附加上下文（章节、剧情库等）
        self.context_chapters = []     # 上下文章节列表
        self.conversation_history = [] # 对话历史（未来扩展）
    
    def set_additional_context(self, context_string, context_chapters=None):
        """
        设置附加上下文
        :param context_string: 上下文字符串（已格式化的章节内容、剧情等）
        :param context_chapters: 章节元数据列表
        """
        self.additional_context = context_string
        self.context_chapters = context_chapters or []
    
    def get_context_for_intent(self, intent):
        """
        根据意图类型返回相应的上下文
        :param intent: 意图类型 (chat, plot_design, novel_generation)
        :return: 格式化的上下文字典
        """
        if intent == 'chat':
            # 普通对话不需要附加上下文
            return {
                'has_context': False,
                'context': '',
                'context_chapter_list': ''
            }
        
        elif intent in ['plot_design', 'novel_generation']:
            # 剧情设计和小说生成需要完整的附加上下文
            return {
                'has_context': bool(self.additional_context),
                'context': self.additional_context,
                'context_chapter_list': self._format_chapter_list()
            }
        
        else:
            # 默认返回完整上下文
            return {
                'has_context': bool(self.additional_context),
                'context': self.additional_context,
                'context_chapter_list': self._format_chapter_list()
            }
    
    def _format_chapter_list(self):
        """格式化章节列表为字符串"""
        if not self.context_chapters:
            return "无"
        
        return "\n".join([
            f"- 章节 {c.get('number', 'N/A')}: {c.get('title', '无标题')}" 
            for c in self.context_chapters
        ])
    
    def build_messages(self, intent, user_prompt, system_prompt_name, template_name):
        """
        构建完整的消息列表（包含系统提示词和用户提示词）
        :param intent: 意图类型
        :param user_prompt: 用户输入
        :param system_prompt_name: 系统提示词名称
        :param template_name: 用户提示词模板名称（可选）
        :return: messages 列表
        """
        from ..prompts.prompt_manager import get_system_prompt, get_prompt
        
        # 获取系统提示词
        system_prompt = get_system_prompt(system_prompt_name)
        
        # 构建用户消息
        if template_name:
            # 使用模板（需要上下文）
            context_data = self.get_context_for_intent(intent)
            template = get_prompt(template_name)
            
            if not template:
                user_message = user_prompt
            else:
                user_message = template.format(
                    context=context_data['context'],
                    context_chapter_list=context_data['context_chapter_list'],
                    prompt=user_prompt
                )
        else:
            # 直接使用用户输入（如普通对话）
            user_message = user_prompt
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        return messages
    
    def clear(self):
        """清空所有上下文"""
        self.additional_context = ""
        self.context_chapters = []
        self.conversation_history = []


# 全局上下文管理器实例（可以考虑改为每个请求创建实例）
_global_context_manager = ContextManager()

def get_context_manager():
    """获取全局上下文管理器实例"""
    return _global_context_manager
