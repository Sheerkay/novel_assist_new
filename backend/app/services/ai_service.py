# e:\Vs_Project\Novel_asisit\backend\app\services\ai_service.py
import json
import re
from functools import lru_cache
from typing import Any, Dict, List

from app.adapters.tools import load_default_toolset
from app.agents import AgentOrchestrator, ContextAgent, PlannerAgent
from app.agents.shared import PlannerRequest, PlannerResult
from app.prompts.prompt_manager import get_prompt, get_system_prompt
from app.services.llm_client import LLMClientError, call_chat_completion
from app.utils.logger import ai_logger, log_ai_call


@lru_cache(maxsize=1)
def _get_orchestrator() -> AgentOrchestrator:
    planner = PlannerAgent()
    context_agent = ContextAgent()
    tools = load_default_toolset()
    return AgentOrchestrator(planner, context_agent, tools)

def process_chapter_with_ai(chapter_content: str, user_prompt: str) -> str | None:
    """Use the orchestrator to process a chapter with a refinement instruction."""

    result = generate_content_with_intent(
        "chapter_process",
        user_prompt=user_prompt,
        metadata={
            "chapter_content": chapter_content,
            "instruction": user_prompt,
        },
    )
    processed = extract_generated_content(result)
    if processed:
        return processed

    if result.steps:
        last_output = result.steps[-1].output
        if isinstance(last_output, dict):
            processed = last_output.get("result") or last_output.get("content")
            if isinstance(processed, str) and processed.strip():
                return processed
    return None

def generate_chapter_summary(chapter_content, *, title: str | None = None) -> str | None:
    """Use the orchestrator to generate a chapter summary."""

    result = generate_content_with_intent(
        "chapter_summary",
        user_prompt=title or "",
        metadata={
            "chapter_content": chapter_content,
            "title": title or "",
        },
    )
    summary = extract_generated_content(result)
    if summary:
        return summary

    # 当使用内容生成工具时，摘要可能出现在最后一步的 output 中
    if result.steps:
        last_output = result.steps[-1].output
        if isinstance(last_output, dict):
            summary = last_output.get("summary") or last_output.get("chapters")
            if isinstance(summary, list) and summary:
                return summary[-1].get("content")
            if isinstance(summary, str) and summary.strip():
                return summary
            content = last_output.get("content")
            if isinstance(content, str) and content.strip():
                return content
    return None

def analyze_chapter_characters(chapter_content: str):
    result = generate_content_with_intent(
        "character_analysis",
        user_prompt="",
        metadata={
            "chapter_content": chapter_content,
        },
    )
    characters = result.artifacts.get("characters") if result else None
    if isinstance(characters, list) and characters:
        return characters

    for step in reversed(result.steps if result else []):
        data = step.output.get("characters")
        if isinstance(data, list) and data:
            return data

    return [
        {
            "name": "未知人物",
            "description": "人物分析失败，请重试",
            "actions": ["无法获取行动信息"],
        }
    ]

def analyze_prompt_for_chapters(prompt):
    # 注意：这个函数的prompt结构比较简单，用户输入直接作为内容，只有一个固定的系统提示。
    # 也可以考虑将 "你是一个..." 这部分也模板化，但目前保持原样以求简洁。
    system_prompt = get_system_prompt('predict_chapters_system')
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}]
    try:
        response = call_chat_completion(messages, temperature=0.3, max_tokens=100)
    except LLMClientError as exc:
        ai_logger.warning(f"⚠️ 章节数量预测失败: {exc}")
        return 10
    if response and 'choices' in response and len(response['choices']) > 0:
        try:
            content = response['choices'][0]['message']['content']
            chapter_count = re.search(r'(\d+)\s*个章节', content)
            if chapter_count: return int(chapter_count.group(1))
            else: return 10
        except (json.JSONDecodeError, ValueError) as e: print(f"解析章节数量错误: {e}")
    return 10

def generate_content_with_intent(
    intent: str,
    user_prompt: str,
    *,
    context_text: str = "",
    context_chapters: List[Dict[str, Any]] | None = None,
    metadata: Dict[str, Any] | None = None,
) -> PlannerResult:
    """根据意图生成内容（使用代理编排）"""

    orchestrator = _get_orchestrator()
    metadata_payload: Dict[str, Any] = {
        "context_chapters": context_chapters or [],
    }
    if metadata:
        metadata_payload.update(metadata)
    request = PlannerRequest(
        intent=intent,
        prompt=user_prompt,
        context=context_text or "",
        metadata=metadata_payload,
    )
    return orchestrator.run(request)


def extract_generated_content(result: PlannerResult) -> str:
    """从编排结果中提取最终文本内容。"""

    if not result:
        return ""

    generated = result.artifacts.get("generated_content")
    if isinstance(generated, str) and generated.strip():
        return generated

    for step in reversed(result.steps):
        content = step.output.get("content")
        if isinstance(content, str) and content.strip():
            return content

    return ""


def extract_generated_chapters(result: PlannerResult) -> List[Dict[str, Any]]:
    """从编排结果中提取章节结构。"""

    if not result:
        return []

    chapters = result.artifacts.get("chapters")
    if isinstance(chapters, list):
        return chapters

    for step in reversed(result.steps):
        candidate = step.output.get("chapters")
        if isinstance(candidate, list):
            return candidate

    return []


def _legacy_generate_with_intent(
    intent: str,
    prompt: str,
    context: str,
    context_chapters: List[Dict[str, Any]],
) -> str:
    result = generate_content_with_intent(
        intent,
        prompt,
        context_text=context,
        context_chapters=context_chapters,
    )
    output = extract_generated_content(result)
    return output or "AI响应为空或格式不正确。"


# 保留旧的函数以保持向后兼容
def generate_novel_content(prompt, context, context_chapters):
    return _legacy_generate_with_intent("novel_generation", prompt, context, context_chapters)


def generate_plot_design(prompt, context, context_chapters):
    return _legacy_generate_with_intent("plot_design", prompt, context, context_chapters)


def generate_full_novel(prompt, context, context_chapters):
    return _legacy_generate_with_intent("novel_generation", prompt, context, context_chapters)

def classify_user_intent(user_input):
    """判断用户输入的具体意图类型"""
    system_prompt = get_system_prompt('classify_intent_system')
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    
    ai_logger.info(f'🔍 开始分类用户意图，输入长度: {len(user_input)} 字符')
    ai_logger.info(f'📝 输入前100字: {user_input[:100]}...')
    
    try:
        response = call_chat_completion(messages, temperature=0.1, max_tokens=20)
    except LLMClientError as exc:
        ai_logger.warning(f"⚠️ 意图分类接口调用失败: {exc}")
        response = None

    if response and response.get('choices'):
        intent = response['choices'][0]['message']['content'].strip().lower()
        ai_logger.info(f'🎯 意图分类原始结果: "{intent}"')
        
        # 返回具体的意图类型
        if 'chat' in intent:
            ai_logger.info('💬 判定为: 普通对话')
            return 'chat'
        elif 'plot_design' in intent or 'design' in intent:
            ai_logger.info('📝 判定为: 剧情设计')
            return 'plot_design'
        elif 'novel_generation' in intent or 'generation' in intent:
            ai_logger.info('✍️ 判定为: 小说生成')
            return 'novel_generation'
    
    # 默认认为是小说生成
    ai_logger.warning('⚠️ 无法明确判定意图，默认为: 小说生成')
    return 'novel_generation'

def general_chat(user_input):
    """处理普通对话"""
    system_prompt = get_system_prompt('general_chat_system')
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]
    
    try:
        response = call_chat_completion(messages, temperature=0.7, max_tokens=2000)
    except LLMClientError as exc:
        ai_logger.error(f"❌ 普通对话调用失败: {exc}")
        response = None

    if response and response.get('choices'):
        return response['choices'][0]['message']['content']
    
    return "抱歉，我现在无法回复。请稍后再试。"
