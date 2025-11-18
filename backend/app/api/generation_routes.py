# e:\Vs_Project\Novel_asisit\backend\app\api\generation_routes.py
from flask import Blueprint, request, jsonify, current_app
import os
import uuid
import json
import time
import re
from app.core.chapters import split_chapters
from app.core.context import ContextManager
from app.services import ai_service
from app.utils.logger import api_logger, log_request, log_response, log_chapter_summary

bp = Blueprint('generation', __name__, url_prefix='/api')

@bp.route('/chapter-summary', methods=['POST'])
def get_chapter_summary():
    data = request.json
    file_id, chapter_index = data.get('file_id'), data.get('chapter_index')
    
    chapters_file = os.path.join(current_app.config['UPLOAD_FOLDER'], 'analysis', f"{file_id}_chapters.json")
    try:
        with open(chapters_file, 'r', encoding='utf-8') as f: chapters_info = json.load(f)
    except: return jsonify({'error': '找不到章节信息'}), 404
    
    if chapter_index >= len(chapters_info['chapters']): return jsonify({'error': '章节索引超出范围'}), 400
    
    chapter_content = chapters_info['chapters'][chapter_index].get('content', '')
    summary = ai_service.generate_chapter_summary(chapter_content)
    
    if summary: return jsonify({'summary': summary}), 200
    else: return jsonify({'error': '生成剧情概括失败'}), 500

@bp.route('/chapter-characters', methods=['POST'])
def get_chapter_characters():
    data = request.json
    file_id, chapter_index = data.get('file_id'), data.get('chapter_index')
    
    chapters_file = os.path.join(current_app.config['UPLOAD_FOLDER'], 'analysis', f"{file_id}_chapters.json")
    try:
        with open(chapters_file, 'r', encoding='utf-8') as f: chapters_info = json.load(f)
    except: return jsonify({'error': '找不到章节信息'}), 404
    
    if chapter_index >= len(chapters_info['chapters']): return jsonify({'error': '章节索引超出范围'}), 400
    
    chapter_content = chapters_info['chapters'][chapter_index].get('content', '')
    characters = ai_service.analyze_chapter_characters(chapter_content)
    
    if characters: return jsonify({'characters': characters}), 200
    else: return jsonify({'error': '分析人物失败'}), 500

@bp.route('/process-chapter', methods=['POST'])
def process_chapter():
    data = request.json
    file_id, chapter_index, prompt = data.get('file_id'), data.get('chapter_index'), data.get('prompt')
    if not prompt: return jsonify({'error': '需要输入提示词'}), 400
    
    chapters_file = os.path.join(current_app.config['UPLOAD_FOLDER'], 'analysis', f"{file_id}_chapters.json")
    try:
        with open(chapters_file, 'r', encoding='utf-8') as f: chapters_info = json.load(f)
    except: return jsonify({'error': '找不到章节信息'}), 404
    
    if chapter_index >= len(chapters_info['chapters']): return jsonify({'error': '章节索引超出范围'}), 400
    
    chapter_content = chapters_info['chapters'][chapter_index].get('content', '')
    result = ai_service.process_chapter_with_ai(chapter_content, prompt)
    
    if result: return jsonify({'result': result}), 200
    else: return jsonify({'error': '处理失败'}), 500

@bp.route('/summarize-chapters', methods=['POST'])
def summarize_chapters_route():
    data = request.json
    chapters = data.get('chapters')
    
    # 使用统一日志系统
    log_request('/api/summarize-chapters', {
        'chapter_count': len(chapters) if chapters else 0,
        'chapters': [{'title': c.get('title'), 'length': len(c.get('content', ''))} for c in chapters] if chapters else []
    })
    
    if not chapters:
        api_logger.error('❌ 错误: 没有提供需要概括的章节')
        return jsonify({'error': '没有提供需要概括的章节'}), 400
    
    for i, chapter in enumerate(chapters):
        api_logger.info(f'📖 章节 {i+1}: {chapter.get("title", "未命名")} ({len(chapter.get("content", ""))} 字符)')

    full_summary = ""
    for i, chapter in enumerate(chapters):
        chapter_content = chapter.get('content', '')
        chapter_title = chapter.get('title', f'章节 {i+1}')
        
        api_logger.info(f'🤖 正在为第 {i+1} 章生成概括...')
        
        # 调用AI服务生成单章概括
        single_summary = ai_service.generate_chapter_summary(chapter_content)
        
        if single_summary:
            log_chapter_summary(i+1, chapter_title, len(chapter_content), True, single_summary)
            # 为每个概括添加标题，使其在UI中更清晰
            full_summary += f"## {chapter_title} - 剧情概括\n{single_summary}\n\n"
        else:
            log_chapter_summary(i+1, chapter_title, len(chapter_content), False)
            # 如果某一章节失败，可以记录或跳过
            full_summary += f"## {chapter_title} - 剧情概括\n[本章概括生成失败]\n\n"
            
    if not full_summary.strip():
        api_logger.error('❌ 所有章节的剧情概括都生成失败')
        return jsonify({'error': '所有章节的剧情概括都生成失败'}), 500

    api_logger.info(f'✅ 全部章节概括完成，总长度: {len(full_summary)} 字符')
    log_response('/api/summarize-chapters', 200, {'summary_length': len(full_summary)})
    return jsonify({'summary': full_summary.strip()})


@bp.route('/generate-with-analysis', methods=['POST'])
def generate_with_analysis():
    data = request.json
    prompt = data.get('prompt')
    context_string = data.get('context_string', '') 
    
    # 记录请求信息
    log_request('/api/generate-with-analysis', {
        'prompt_length': len(prompt) if prompt else 0,
        'context_length': len(context_string),
        'has_file_id': bool(data.get('file_id'))
    })
    
    api_logger.info(f'📝 收到生成请求')
    api_logger.info(f'📄 提示词长度: {len(prompt) if prompt else 0} 字符')
    api_logger.info(f'📦 上下文长度: {len(context_string)} 字符')
    api_logger.info(f'💬 提示词前100字: {prompt[:100] if prompt else "无"}...')
    
    if not prompt: 
        api_logger.error('❌ 错误: 没有提供提示词')
        return jsonify({'error': '需要输入提示词'}), 400

    # 先判断用户意图
    api_logger.info('🤔 正在分析用户意图...')
    intent = ai_service.classify_user_intent(prompt)
    api_logger.info(f'✅ 意图识别结果: {intent}')
    
    # 如果是普通对话，直接返回对话内容
    if intent == 'chat':
        api_logger.info('💬 识别为普通对话，调用闲聊功能')
        chat_response = ai_service.general_chat(prompt)
        api_logger.info(f'✅ 对话生成完成，长度: {len(chat_response)} 字符')
        log_response('/api/generate-with-analysis', 200, {'is_chat': True, 'response_length': len(chat_response)})
        return jsonify({
            'content': chat_response,
            'is_chat': True  # 标记这是普通对话
        }), 200

    # 创建上下文管理器并设置上下文
    api_logger.info(f'📚 创建上下文管理器 (意图: {intent})')
    context_manager = ContextManager()
    context_manager.set_additional_context(context_string, [])
    api_logger.info(f'📝 上下文设置完成')
    
    # 根据不同的创作意图使用上下文管理器生成内容
    api_logger.info(f'🤖 开始生成内容 (意图: {intent})')
    content = ai_service.generate_content_with_intent(intent, prompt, context_manager)
    api_logger.info(f'✅ 内容生成完成，长度: {len(content) if content else 0} 字符')
    
    if not content: return jsonify({'error': '内容生成失败'}), 500
    
    summarized_chapter_numbers = []
    meta_match = re.search(r'<META_CHAPTERS>(.*?)</META_CHAPTERS>', content, re.DOTALL)
    if meta_match:
        numbers_str = meta_match.group(1)
        content = content[:meta_match.start()].strip()
        try:
            summarized_chapter_numbers = [int(n.strip()) for n in numbers_str.split(',') if n.strip()]
        except ValueError: print(f"警告：无法解析元数据中的章节编号: {numbers_str}")

    chapter_count = ai_service.analyze_prompt_for_chapters(prompt)
    newly_split_chapters = split_chapters(content)
    
    result = { 'content': content, 'chapter_count': chapter_count, 'prompt': prompt, 'chapters': newly_split_chapters, 'summarized_chapter_numbers': summarized_chapter_numbers }
    
    file_id = data.get('file_id')
    upload_folder = current_app.config['UPLOAD_FOLDER']
    
    # 检查是否应该追加到已有文件
    should_append = False
    if file_id:
        chapters_file = os.path.join(upload_folder, 'analysis', f"{file_id}_chapters.json")
        if os.path.exists(chapters_file):
            try:
                with open(chapters_file, 'r', encoding='utf-8') as f: 
                    chapters_info = json.load(f)
                # 只有当文件是生成文件时才追加
                if chapters_info.get('is_generated', False):
                    should_append = True
            except:
                pass
    
    if should_append:
        # 追加到已有的生成文件
        try:
            novel_filename = chapters_info['filename']
            original_path_novel = os.path.join(upload_folder, 'novels', f"{file_id}{os.path.splitext(novel_filename)[1]}")
            original_path_generated = os.path.join(upload_folder, 'generated', f"{file_id}_{novel_filename}")

            original_path = original_path_novel if os.path.exists(original_path_novel) else original_path_generated

            with open(original_path, 'a', encoding='utf-8') as f: f.write(f"\n\n{content}")
            with open(original_path, 'r', encoding='utf-8') as f: full_content = f.read()
            
            final_chapters = split_chapters(full_content)
            chapters_info['chapters'] = final_chapters
            
            with open(chapters_file, 'w', encoding='utf-8') as f: json.dump(chapters_info, f, ensure_ascii=False, indent=2)
            
            result.update({ 'is_new': False, 'file_id': file_id, 'chapters': final_chapters })
        except FileNotFoundError:
             return jsonify({'error': f"找不到文件ID为 {file_id} 的分析文件或原始文件。"}), 404
    else:
        # 创建新的生成文件（无论是否传入了file_id）
        file_id = str(uuid.uuid4())
        filename = f"创作_{int(time.time())}.txt"
        filepath = os.path.join(upload_folder, 'generated', f"{file_id}_{filename}")
        with open(filepath, 'w', encoding='utf-8') as f: f.write(content)
        
        chapters_info = { "file_id": file_id, "filename": filename, "chapters": newly_split_chapters, "is_generated": True, "generation_prompt": prompt, "target_chapters": chapter_count }
        chapters_file = os.path.join(upload_folder, 'analysis', f"{file_id}_chapters.json")
        with open(chapters_file, 'w', encoding='utf-8') as f: json.dump(chapters_info, f, ensure_ascii=False, indent=2)
        
        result.update({ 'file_id': file_id, 'filename': filename, 'is_new': True })
    
    return jsonify(result), 200

@bp.route('/text-labels', methods=['GET', 'POST'])
def manage_text_labels():
    if request.method == 'GET':
        # 获取当前文本标签配置
        try:
            from ..config.text_labels import get_all_text_labels
            labels = get_all_text_labels()
            return jsonify(labels)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        # 更新文本标签配置
        data = request.json
        new_labels = data.get('labels', {})
        
        # 更新配置
        from ..config.text_labels import update_text_labels
        update_text_labels(new_labels)
        return jsonify({'message': '文本标签更新成功', 'labels': new_labels})

@bp.route('/generate', methods=['POST'])
def generate_content():
    data = request.json
    prompt = data.get('prompt')
    context = data.get('context', '')
    context_chapters = data.get('context_chapters', [])
    context_labels = data.get('context_labels', {}) # 接收前端传来的标签

    # 使用前端传来的标签构建上下文
    chapters_label = context_labels.get('chapters', '原文章节')
    summaries_label = context_labels.get('summaries', '剧情梗概')

    # 这里可以根据您的逻辑，将这些标签用于构建更精确的上下文描述
    # 例如: f"参考 {chapters_label} 和 {summaries_label}..."
    
    generated_text = ai_service.generate_novel_content(prompt, context, context_chapters)
    
    if generated_text:
        return jsonify({'generated_text': generated_text})
    else:
        return jsonify({'error': '生成内容失败'}), 500
