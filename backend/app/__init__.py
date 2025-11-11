# e:\Vs_Project\Novel_asisit\backend\app\__init__.py
from flask import Flask, send_from_directory
from flask_cors import CORS
import os
import shutil

def clear_upload_folders(upload_folder):
    """在应用启动时清空上传目录下的指定子文件夹内容。"""
    print("--- 清理临时上传文件夹 ---")
    folders_to_clear = ['novels', 'analysis', 'generated']
    for folder in folders_to_clear:
        folder_path = os.path.join(upload_folder, folder)
        if os.path.exists(folder_path):
            try:
                # 删除整个文件夹树
                shutil.rmtree(folder_path)
                print(f"成功删除文件夹: {folder_path}")
            except OSError as e:
                print(f"删除文件夹 {folder_path} 时出错: {e}")
    print("--- 清理完成 ---")


def create_app():
    # 相对于 app 文件夹的路径
    app = Flask(__name__, static_folder='../../frontend', static_url_path='/')
    
    # 加载配置
    app.config.from_object('config.Config')

    # 在配置加载后，执行清理操作
    clear_upload_folders(app.config['UPLOAD_FOLDER'])
    
    # 初始化 CORS
    CORS(app)

    # 确保上传文件夹存在
    for folder in ['novels', 'analysis', 'generated']:
        os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], folder), exist_ok=True)

    with app.app_context():
        # 注册蓝图
        from .api import novel_routes, generation_routes
        app.register_blueprint(novel_routes.bp)
        app.register_blueprint(generation_routes.bp)

        # 服务前端的路由
        @app.route('/')
        def serve_index():
            return send_from_directory(app.static_folder, 'index.html')

        @app.route('/<path:path>')
        def serve_static(path):
            # 确保路径不是 API 调用
            if path.startswith('api/'):
                return "Not Found", 404
            return send_from_directory(app.static_folder, path)

    return app
