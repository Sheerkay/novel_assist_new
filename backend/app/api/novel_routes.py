# e:\Vs_Project\Novel_asisit\backend\app\api\novel_routes.py
from flask import Blueprint, request, jsonify, current_app
import os
import uuid
import json
from werkzeug.utils import secure_filename
from app.services.novel_service import allowed_file, split_chapters

bp = Blueprint('novel', __name__, url_prefix='/api')

@bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件部分'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    allowed_extensions = current_app.config['ALLOWED_EXTENSIONS']
    if file and allowed_file(file.filename, allowed_extensions):
        original_filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        _, file_extension = os.path.splitext(original_filename)
        storage_filename = f"{file_id}{file_extension}"
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        filepath = os.path.join(upload_folder, 'novels', storage_filename)
        
        try:
            file.save(filepath)
            with open(filepath, 'r', encoding='utf-8') as f:
                text_content = f.read()
        except Exception as e:
            return jsonify({'error': f'无法读写文件: {e}'}), 500

        chapters = split_chapters(text_content)
        chapters_info = {
            "file_id": file_id,
            "filename": original_filename,
            "chapters": chapters
        }
        
        analysis_folder = os.path.join(upload_folder, 'analysis')
        chapters_file = os.path.join(analysis_folder, f"{file_id}_chapters.json")
        with open(chapters_file, 'w', encoding='utf-8') as f:
            json.dump(chapters_info, f, ensure_ascii=False, indent=2)
            
        return jsonify({'file_id': file_id, 'filename': original_filename, 'chapters': chapters}), 200
    
    return jsonify({'error': '文件类型不被允许'}), 400

@bp.route('/save-chapter', methods=['POST'])
def save_chapter():
    data = request.json
    file_id = data.get('file_id')
    chapter_index = data.get('chapter_index')
    content = data.get('content')

    if file_id is None or chapter_index is None or content is None:
        return jsonify({'error': '缺少必要参数'}), 400

    upload_folder = current_app.config['UPLOAD_FOLDER']
    chapters_file = os.path.join(upload_folder, 'analysis', f"{file_id}_chapters.json")
    
    try:
        with open(chapters_file, 'r', encoding='utf-8') as f:
            chapters_info = json.load(f)
    except FileNotFoundError:
        return jsonify({'error': '找不到章节信息'}), 404

    if not isinstance(chapter_index, int) or chapter_index >= len(chapters_info['chapters']):
        return jsonify({'error': '章节索引超出范围'}), 400
        
    chapters_info['chapters'][chapter_index]['content'] = content
    
    with open(chapters_file, 'w', encoding='utf-8') as f:
        json.dump(chapters_info, f, ensure_ascii=False, indent=2)
        
    return jsonify({'message': '保存成功'}), 200
