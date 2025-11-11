import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a-very-secret-key'
    UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'txt'}
    
    
    # OpenRouter 配置 - 直接在代码中硬编码（写死）
    SITE_URL = 'http://localhost:5000'  # 直接写死值
    SITE_NAME = 'Novel Analysis Tool'   # 直接写死值
    
    # 新增：将 API Key 存储在这里
    # 警告：为了安全，未来最好通过环境变量加载此密钥
    DEEPSEEK_API_KEY = "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"

    # 确保上传目录存在
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_FOLDER, 'novels'), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_FOLDER, 'analysis'), exist_ok=True)