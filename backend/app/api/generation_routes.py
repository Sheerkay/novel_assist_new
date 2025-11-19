# e:\Vs_Project\Novel_asisit\backend\app\api\generation_routes.py
from flask import Blueprint, request, jsonify
import re
from app.core.chapters import split_chapters
from app.services import ai_service, chapter_service, text_label_service
from app.utils.logger import api_logger, log_request, log_response, log_chapter_summary

bp = Blueprint('generation', __name__, url_prefix='/api')

@bp.route('/chapter-summary', methods=['POST'])
def get_chapter_summary():
    data = request.json
    file_id, chapter_index = data.get('file_id'), data.get('chapter_index')

    if file_id is None or chapter_index is None:
        return jsonify({'error': '缺少必要参数'}), 400

    try:
        chapter, _ = chapter_service.get_chapter(file_id, chapter_index)
    except chapter_service.ChapterMetadataNotFoundError:
        return jsonify({'error': '找不到章节信息'}), 404
    except chapter_service.ChapterIndexError:
        return jsonify({'error': '章节索引超出范围'}), 400

    chapter_content = chapter.get('content', '')
    chapter_title = chapter.get('title', '')
    summary = ai_service.generate_chapter_summary(chapter_content, title=chapter_title)
    
    if summary: return jsonify({'summary': summary}), 200
    else: return jsonify({'error': '生成剧情概括失败'}), 500

@bp.route('/chapter-characters', methods=['POST'])
def get_chapter_characters():
    data = request.json
    file_id, chapter_index = data.get('file_id'), data.get('chapter_index')

    if file_id is None or chapter_index is None:
        return jsonify({'error': '缺少必要参数'}), 400

    try:
        chapter_content = chapter_service.get_chapter_content(file_id, chapter_index)
    except chapter_service.ChapterMetadataNotFoundError:
        return jsonify({'error': '找不到章节信息'}), 404
    except chapter_service.ChapterIndexError:
        return jsonify({'error': '章节索引超出范围'}), 400

    characters = ai_service.analyze_chapter_characters(chapter_content)
    
    if characters: return jsonify({'characters': characters}), 200
    else: return jsonify({'error': '分析人物失败'}), 500

@bp.route('/process-chapter', methods=['POST'])
def process_chapter():
    data = request.json
    file_id, chapter_index, prompt = data.get('file_id'), data.get('chapter_index'), data.get('prompt')
    if not prompt:
        return jsonify({'error': '需要输入提示词'}), 400

    if file_id is None or chapter_index is None:
        return jsonify({'error': '缺少必要参数'}), 400

    try:
        chapter_content = chapter_service.get_chapter_content(file_id, chapter_index)
    except chapter_service.ChapterMetadataNotFoundError:
        return jsonify({'error': '找不到章节信息'}), 404
    except chapter_service.ChapterIndexError:
        return jsonify({'error': '章节索引超出范围'}), 400

    result = ai_service.process_chapter_with_ai(chapter_content, prompt)

    if result:
        return jsonify({'result': result}), 200
    else:
        return jsonify({'error': '处理失败'}), 500


@bp.route('/summarize-chapters', methods=['POST'])
def summarize_chapters():
    data = request.json or {}
    raw_chapters = data.get('chapters') or []
    file_id = data.get('file_id')

    log_request('/api/summarize-chapters', {
        'chapter_count': len(raw_chapters) if isinstance(raw_chapters, list) else 0,
        'has_file_id': bool(file_id),
    })

    chapters = []
    for index, chapter in enumerate(raw_chapters, start=1):
        if not isinstance(chapter, dict):
            continue
        content = chapter.get('content')
        if not isinstance(content, str) or not content.strip():
            continue
        title = chapter.get('title')
        if not isinstance(title, str) or not title.strip():
            title = f"章节 {index}"
        chapters.append({'title': title.strip(), 'content': content, 'index': index})

    if not chapters and file_id:
        try:
            chapter_info = chapter_service.load_chapters_info(file_id)
        except chapter_service.ChapterMetadataNotFoundError:
            chapter_info = None
        if chapter_info:
            for index, chapter in enumerate(chapter_info.get('chapters', []), start=1):
                content = chapter.get('content', '')
                if not isinstance(content, str) or not content.strip():
                    continue
                title = chapter.get('title')
                if not isinstance(title, str) or not title.strip():
                    title = f"章节 {index}"
                chapters.append({'title': title.strip(), 'content': content, 'index': index})

    if not chapters:
        log_response('/api/summarize-chapters', 400, {'chapter_count': 0})
        return jsonify({'error': '没有可用的章节进行概括'}), 400

    api_logger.info(f'🧾 准备概括章节数: {len(chapters)}')

    try:
        plan_result = ai_service.generate_content_with_intent(
            'bulk_chapter_summary',
            '',
            metadata={'chapters': chapters},
        )
    except Exception as exc:  # pragma: no cover - runtime safeguard
        api_logger.exception('❌ 批量章节概括调用失败')
        log_response('/api/summarize-chapters', 500, {'chapter_count': len(chapters)})
        return jsonify({'error': f'生成剧情概括失败: {exc}'}), 500

    summaries = plan_result.artifacts.get('summaries') if plan_result else None
    if not isinstance(summaries, list):
        summaries = []
        if plan_result:
            for step in plan_result.steps:
                step_summaries = step.output.get('summaries') if isinstance(step.output, dict) else None
                if isinstance(step_summaries, list):
                    summaries = step_summaries
                    break

    combined = ai_service.extract_generated_content(plan_result)

    for index, (chapter, summary_payload) in enumerate(zip(chapters, summaries), start=1):
        summary_text = summary_payload.get('summary') if isinstance(summary_payload, dict) else None
        success = bool(summary_payload.get('success')) if isinstance(summary_payload, dict) else bool(summary_text)
        log_chapter_summary(
            chapter.get('index', index),
            chapter.get('title', f'章节 {index}'),
            len(chapter.get('content', '')),
            success=success,
            summary=summary_text,
        )

    if len(summaries) < len(chapters):
        for chapter in chapters[len(summaries):]:
            log_chapter_summary(
                chapter.get('index', 0),
                chapter.get('title', '未知章节'),
                len(chapter.get('content', '')),
                success=False,
                summary=None,
            )
    elif len(summaries) > len(chapters):
        summaries = summaries[: len(chapters)]

    response_payload = {
        'summary': combined or '',
        'summaries': summaries,
        'chapter_count': len(chapters),
    }
    if file_id:
        response_payload['file_id'] = file_id

    log_response('/api/summarize-chapters', 200, {'chapter_count': len(chapters)})
    return jsonify(response_payload), 200


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

    context_chapters = data.get('context_chapters') or []
    if not isinstance(context_chapters, list):
        context_chapters = []

    context_labels = data.get('context_labels') or {}
    metadata = {'context_labels': context_labels} if context_labels else None

    api_logger.info(f'📚 上下文片段数量: {len(context_chapters)}')
    api_logger.info(f'🤖 开始生成内容 (意图: {intent})')

    plan_result = ai_service.generate_content_with_intent(
        intent,
        prompt,
        context_text=context_string,
        context_chapters=context_chapters,
        metadata=metadata,
    )
    content = ai_service.extract_generated_content(plan_result)
    api_logger.info(f'✅ 内容生成完成，长度: {len(content) if content else 0} 字符')

    if not content: 
        return jsonify({'error': '内容生成失败'}), 500
    
    summarized_chapter_numbers = []
    meta_match = re.search(r'<META_CHAPTERS>(.*?)</META_CHAPTERS>', content, re.DOTALL)
    if meta_match:
        numbers_str = meta_match.group(1)
        content = content[:meta_match.start()].strip()
        try:
            summarized_chapter_numbers = [int(n.strip()) for n in numbers_str.split(',') if n.strip()]
        except ValueError: print(f"警告：无法解析元数据中的章节编号: {numbers_str}")

    chapter_count = ai_service.analyze_prompt_for_chapters(prompt)
    generated_chapters = ai_service.extract_generated_chapters(plan_result)
    newly_split_chapters = generated_chapters or split_chapters(content)
    
    result = { 'content': content, 'chapter_count': chapter_count, 'prompt': prompt, 'chapters': newly_split_chapters, 'summarized_chapter_numbers': summarized_chapter_numbers }

    snapshot = plan_result.artifacts.get('snapshot')
    if isinstance(snapshot, dict):
        result['context_snapshot'] = snapshot
    
    file_id = data.get('file_id')

    should_append = False
    existing_info = None
    if file_id:
        try:
            existing_info = chapter_service.load_chapters_info(file_id)
            should_append = existing_info.get('is_generated', False)
            existing_info = None
        except chapter_service.ChapterMetadataNotFoundError:
            api_logger.warning(f'⚠️ 找不到文件ID为 {file_id} 的章节信息，创建新作品')
            should_append = False

    if should_append:
        try:
            updated_info = chapter_service.append_generated_content(file_id, content)
        except chapter_service.ChapterMetadataNotFoundError:
            return jsonify({'error': f"找不到文件ID为 {file_id} 的分析文件或原始文件。"}), 404
        result.update({'is_new': False, 'file_id': file_id, 'chapters': updated_info.get('chapters', [])})
    else:
        created_info = chapter_service.create_generated_record(
            content,
            prompt=prompt,
            chapters=newly_split_chapters,
            target_chapters=chapter_count,
        )
        file_id = created_info['file_id']
        result.update({'file_id': file_id, 'filename': created_info.get('filename'), 'is_new': True, 'chapters': created_info.get('chapters', [])})
    
    return jsonify(result), 200

@bp.route('/text-labels', methods=['GET', 'POST'])
def manage_text_labels():
    if request.method == 'GET':
        labels = text_label_service.get_all()
        return jsonify(labels)

    data = request.json or {}
    new_labels = data.get('labels', {})
    updated = text_label_service.update(new_labels if isinstance(new_labels, dict) else {})
    return jsonify({'message': '文本标签更新成功', 'labels': updated})

@bp.route('/generate', methods=['POST'])
def generate_content():
    data = request.json
    prompt = data.get('prompt')
    context = data.get('context', '')
    context_chapters = data.get('context_chapters', [])
    context_labels = data.get('context_labels', {})
    intent = data.get('intent', 'novel_generation')

    if not prompt:
        return jsonify({'error': '需要输入提示词'}), 400

    if not isinstance(context_chapters, list):
        context_chapters = []

    plan_result = ai_service.generate_content_with_intent(
        intent,
        prompt,
        context_text=context,
        context_chapters=context_chapters,
        metadata={
            'context_labels': context_labels,
        } if context_labels else None,
    )

    generated_text = ai_service.extract_generated_content(plan_result)
    if not generated_text:
        return jsonify({'error': '生成内容失败'}), 500

    response_payload = {'generated_text': generated_text}
    chapters = ai_service.extract_generated_chapters(plan_result)
    if chapters:
        response_payload['chapters'] = chapters
    snapshot = plan_result.artifacts.get('snapshot') if plan_result else None
    if isinstance(snapshot, dict):
        response_payload['context_snapshot'] = snapshot

    return jsonify(response_payload)
