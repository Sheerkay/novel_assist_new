from flask import Blueprint, jsonify, request
import os
from pathlib import Path

log_routes = Blueprint('log_routes', __name__)

# 获取日志目录
BACKEND_LOG_DIR = Path(__file__).parent.parent.parent / 'logs'
FRONTEND_LOG_FILE = Path(__file__).parent.parent.parent.parent / 'frontend' / 'logs' / 'app.log'

@log_routes.route('/api/logs/<log_type>', methods=['GET'])
def get_logs(log_type):
    """获取日志内容"""
    try:
        if log_type == 'frontend':
            # 前端日志
            if FRONTEND_LOG_FILE.exists():
                with open(FRONTEND_LOG_FILE, 'r', encoding='utf-8') as f:
                    content = f.read()
                return jsonify({'content': content, 'type': 'frontend'})
            else:
                return jsonify({'content': '前端日志文件不存在', 'type': 'frontend'})
        
        elif log_type == 'backend':
            # 后端日志 - 读取最新的日志文件
            log_files = list(BACKEND_LOG_DIR.glob('*.log'))
            if not log_files:
                return jsonify({'content': '后端日志文件不存在', 'type': 'backend'})
            
            # 按修改时间排序，获取最新的
            latest_log = max(log_files, key=lambda f: f.stat().st_mtime)
            
            with open(latest_log, 'r', encoding='utf-8') as f:
                # 读取最后10000行（约500KB）
                lines = f.readlines()
                content = ''.join(lines[-10000:])
            
            return jsonify({
                'content': content,
                'type': 'backend',
                'file': latest_log.name
            })
        
        else:
            return jsonify({'error': '未知的日志类型'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@log_routes.route('/api/logs/<log_type>', methods=['DELETE'])
def clear_logs(log_type):
    """清空日志"""
    try:
        if log_type == 'frontend':
            if FRONTEND_LOG_FILE.exists():
                with open(FRONTEND_LOG_FILE, 'w', encoding='utf-8') as f:
                    f.write('')
                return jsonify({'message': '前端日志已清空'})
            else:
                return jsonify({'message': '前端日志文件不存在'})
        
        elif log_type == 'backend':
            # 清空所有后端日志文件
            log_files = list(BACKEND_LOG_DIR.glob('*.log'))
            for log_file in log_files:
                with open(log_file, 'w', encoding='utf-8') as f:
                    f.write('')
            return jsonify({'message': f'已清空 {len(log_files)} 个后端日志文件'})
        
        else:
            return jsonify({'error': '未知的日志类型'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
