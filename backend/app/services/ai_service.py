# e:\Vs_Project\Novel_asisit\backend\app\services\ai_service.py
import requests
import json
import re
from flask import current_app
from ..prompts.prompt_manager import get_prompt, get_system_prompt
from ..utils.logger import ai_logger, log_ai_call
from .context_manager import ContextManager

def call_deepseek_api(messages, temperature=0.7, max_tokens=4000):
    api_key = current_app.config.get('DEEPSEEK_API_KEY')
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY 未在配置中设置")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        response = requests.post("https://api.deepseek.com/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"DeepSeek API调用错误: {e}")
        if e.response is not None:
            print(f"收到的错误响应 (状态码 {e.response.status_code}): {e.response.text}")
        else:
            print("无法连接到DeepSeek API服务器。请检查网络连接、防火墙或代理设置。")
        return None

def process_chapter_with_ai(chapter_content, user_prompt):
    prompt_template = get_prompt('process_chapter')
    if not prompt_template:
        return "错误：无法加载处理章节的提示词模板。"
    prompt = prompt_template.format(chapter_content=chapter_content[:3000], user_prompt=user_prompt)
    system_prompt = get_system_prompt('process_chapter_system')
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
    response = call_deepseek_api(messages, temperature=0.7, max_tokens=4000)
    if response and 'choices' in response and len(response['choices']) > 0: return response['choices'][0]['message']['content']
    return None

def generate_chapter_summary(chapter_content):
    prompt_template = get_prompt('summarize_chapter')
    if not prompt_template:
        return "错误：无法加载生成章节摘要的提示词模板。"
    prompt = prompt_template.format(chapter_content=chapter_content[:4000])
    system_prompt = get_system_prompt('summarize_chapter_system')
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
    
    # 使用统一日志系统
    log_ai_call(
        prompt_type='章节概括',
        prompt=f"System: {system_prompt}\n\nUser: {prompt}"
    )
    
    response = call_deepseek_api(messages, temperature=0.3, max_tokens=1500)
    
    if response and 'choices' in response and len(response['choices']) > 0:
        result = response['choices'][0]['message']['content']
        log_ai_call(
            prompt_type='章节概括',
            prompt='',
            response=result
        )
        return result
    
    log_ai_call(
        prompt_type='章节概括',
        prompt='',
        error='DeepSeek API调用失败'
    )
    return None

def analyze_chapter_characters(chapter_content):
    prompt_template = get_prompt('analyze_characters')
    if not prompt_template:
        return [{"name": "错误", "description": "无法加载分析人物的提示词模板。", "actions": []}]
    prompt = prompt_template.format(chapter_content=chapter_content[:4000])
    system_prompt = get_system_prompt('analyze_characters_system')
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
    response = call_deepseek_api(messages, temperature=0.3, max_tokens=2000)
    if response and 'choices' in response and len(response['choices']) > 0:
        try:
            content = response['choices'][0]['message']['content']
            # 更稳健地提取JSON
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\])', content)
            if json_match:
                json_str = json_match.group(1) or json_match.group(2)
                return json.loads(json_str)
        except json.JSONDecodeError as e: print(f"JSON解析错误: {e}")
    return [{"name": "未知人物", "description": "人物分析失败，请重试", "actions": ["无法获取行动信息"]}]

def analyze_prompt_for_chapters(prompt):
    # 注意：这个函数的prompt结构比较简单，用户输入直接作为内容，只有一个固定的系统提示。
    # 也可以考虑将 "你是一个..." 这部分也模板化，但目前保持原样以求简洁。
    system_prompt = get_system_prompt('predict_chapters_system')
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
    response = call_deepseek_api(messages, temperature=0.3, max_tokens=100)
    if response and 'choices' in response and len(response['choices']) > 0:
        try:
            content = response['choices'][0]['message']['content']
            chapter_count = re.search(r'(\d+)\s*个章节', content)
            if chapter_count: return int(chapter_count.group(1))
            else: return 10
        except (json.JSONDecodeError, ValueError) as e: print(f"解析章节数量错误: {e}")
    return 10

def generate_content_with_intent(intent, user_prompt, context_manager):
    """
    根据意图生成内容（使用上下文管理器）
    :param intent: 意图类型
    :param user_prompt: 用户提示词
    :param context_manager: 上下文管理器实例
    :return: 生成的内容
    """
    # 根据意图选择对应的模板和系统提示词
    intent_config = {
        'plot_design': {
            'template': 'plot_design',
            'system': 'plot_design_system',
            'temperature': 0.5
        },
        'novel_generation': {
            'template': 'novel_generation',
            'system': 'novel_generation_system',
            'temperature': 0.7
        },
        'default': {
            'template': 'general_content',
            'system': 'generate_novel_system',
            'temperature': 0.7
        }
    }
    
    config = intent_config.get(intent, intent_config['default'])
    
    # 使用上下文管理器构建消息
    messages = context_manager.build_messages(
        intent=intent,
        user_prompt=user_prompt,
        system_prompt_name=config['system'],
        template_name=config['template']
    )
    
    response = call_deepseek_api(messages, temperature=config['temperature'], max_tokens=4000)
    
    if response and 'choices' in response and len(response['choices']) > 0:
        return response['choices'][0]['message']['content']
    
    return "AI响应为空或格式不正确。"

# 保留旧的函数以保持向后兼容
def generate_novel_content(prompt, context, context_chapters):
    """使用AI生成内容（通用入口，适用于未明确分类的请求）"""
    return _generate_content_with_template('general_content', 'generate_novel_system', 
                                          prompt, context, context_chapters, temperature=0.7)

def generate_plot_design(prompt, context, context_chapters):
    """生成剧情设计方案"""
    return _generate_content_with_template('plot_design', 'plot_design_system', 
                                          prompt, context, context_chapters, temperature=0.5)

def generate_full_novel(prompt, context, context_chapters):
    """生成完整小说章节"""
    return _generate_content_with_template('novel_generation', 'novel_generation_system', 
                                          prompt, context, context_chapters, temperature=0.7)

def _generate_content_with_template(template_name, system_name, prompt, context, context_chapters, temperature=0.7):
    """内部函数：使用指定模板生成内容"""
    
    context_chapter_list = "\n".join([f"- 章节 {c.get('number', 'N/A')}: {c.get('title', '无标题')}" for c in context_chapters])
    
    prompt_template = get_prompt(template_name)
    if not prompt_template:
        return f"错误：无法加载{template_name}提示词模板。"
        
    final_prompt = prompt_template.format(
        context=context,
        context_chapter_list=context_chapter_list,
        prompt=prompt
    )
    
    system_prompt = get_system_prompt(system_name)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": final_prompt}
    ]
    
    response = call_deepseek_api(messages, temperature=temperature, max_tokens=4000)
    
    if response and 'choices' in response and len(response['choices']) > 0:
        return response['choices'][0]['message']['content']
    
    return "AI响应为空或格式不正确。"

def classify_user_intent(user_input):
    """判断用户输入的具体意图类型"""
    system_prompt = get_system_prompt('classify_intent_system')
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    
    response = call_deepseek_api(messages, temperature=0.1, max_tokens=20)
    
    if response and 'choices' in response and len(response['choices']) > 0:
        intent = response['choices'][0]['message']['content'].strip().lower()
        
        # 返回具体的意图类型
        if 'chat' in intent:
            return 'chat'
        elif 'plot_design' in intent or 'design' in intent:
            return 'plot_design'
        elif 'novel_generation' in intent or 'generation' in intent:
            return 'novel_generation'
    
    # 默认认为是小说生成
    return 'novel_generation'

def general_chat(user_input):
    """处理普通对话"""
    system_prompt = get_system_prompt('general_chat_system')
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    
    response = call_deepseek_api(messages, temperature=0.7, max_tokens=2000)
    
    if response and 'choices' in response and len(response['choices']) > 0:
        return response['choices'][0]['message']['content']
    
    return "抱歉，我现在无法回复。请稍后再试。"
