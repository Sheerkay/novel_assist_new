# e:\Vs_Project\Novel_asisit\backend\app\prompts\prompt_manager.py
import os

# 缓存系统提示词
_system_prompts_cache = None

def _load_system_prompts():
    """加载并解析 system_prompts.txt 文件"""
    global _system_prompts_cache
    
    if _system_prompts_cache is not None:
        return _system_prompts_cache
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    system_prompts_path = os.path.join(current_dir, 'templates', 'system_prompts.txt')
    
    prompts = {}
    try:
        with open(system_prompts_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 解析格式: [prompt_name]\nprompt_content\n\n
        sections = content.split('[')
        for section in sections:
            if not section.strip():
                continue
            lines = section.strip().split('\n', 1)
            if len(lines) == 2:
                name = lines[0].strip().rstrip(']')
                prompt_text = lines[1].strip()
                prompts[name] = prompt_text
                
        _system_prompts_cache = prompts
        return prompts
    except FileNotFoundError:
        print(f"错误: 找不到系统提示词文件 '{system_prompts_path}'")
        return {}

def get_system_prompt(prompt_name):
    """
    获取系统提示词
    """
    prompts = _load_system_prompts()
    return prompts.get(prompt_name, f"错误：找不到系统提示词 '{prompt_name}'")

def get_prompt(template_name):
    """
    从 templates 文件夹加载一个提示词模板。
    """
    # 获取当前文件所在的目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(current_dir, 'templates', f'{template_name}.txt')
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"错误: 找不到提示词模板 '{template_name}' at path '{template_path}'")
        return None

