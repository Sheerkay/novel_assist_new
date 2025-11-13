# e:\Vs_Project\Novel_asisit_new\backend\app\utils\logger.py
import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

# 创建logs目录
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# 日志格式
LOG_FORMAT = '%(asctime)s [%(levelname)s] [%(name)s] %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# 创建格式化器
formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

def setup_logger(name, log_file=None, level=logging.INFO):
    """
    创建并配置日志记录器
    
    Args:
        name: 日志记录器名称（通常使用模块名）
        log_file: 日志文件名（可选，默认使用name）
        level: 日志级别
    
    Returns:
        配置好的logger对象
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 避免重复添加handler
    if logger.handlers:
        return logger
    
    # 控制台输出handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 文件输出handler（可选）
    if log_file or name:
        file_name = log_file or f"{name}.log"
        file_path = os.path.join(LOG_DIR, file_name)
        
        # 使用RotatingFileHandler，自动切割日志文件（单文件最大10MB，保留5个备份）
        file_handler = RotatingFileHandler(
            file_path, 
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

# 预定义的日志记录器
api_logger = setup_logger('api', 'api.log')
ai_logger = setup_logger('ai_service', 'ai_service.log')
novel_logger = setup_logger('novel_service', 'novel_service.log')
app_logger = setup_logger('app', 'app.log')

# 便捷函数
def log_request(endpoint, data):
    """记录API请求"""
    api_logger.info(f"{'='*60}")
    api_logger.info(f"📥 请求端点: {endpoint}")
    api_logger.info(f"📦 请求数据: {data}")
    api_logger.info(f"{'='*60}")

def log_response(endpoint, status, data):
    """记录API响应"""
    symbol = '✅' if status == 200 else '❌'
    api_logger.info(f"{symbol} 响应端点: {endpoint} | 状态: {status}")
    api_logger.info(f"📦 响应数据: {data}")
    api_logger.info(f"{'='*60}\n")

def log_ai_call(prompt_type, prompt, response=None, error=None):
    """记录AI调用"""
    ai_logger.info(f"{'-'*60}")
    ai_logger.info(f"🤖 AI调用类型: {prompt_type}")
    ai_logger.info(f"📝 提示词长度: {len(prompt)} 字符")
    ai_logger.info(f"📝 提示词内容:\n{prompt[:500]}...")
    
    if response:
        ai_logger.info(f"✅ AI返回成功")
        ai_logger.info(f"📄 返回内容长度: {len(response)} 字符")
        ai_logger.info(f"📄 返回内容:\n{response[:500]}...")
    elif error:
        ai_logger.error(f"❌ AI调用失败: {error}")
    
    ai_logger.info(f"{'-'*60}\n")

def log_chapter_summary(chapter_num, chapter_title, content_length, success=True, summary=None):
    """记录章节概括"""
    symbol = '✅' if success else '❌'
    ai_logger.info(f"{symbol} 章节概括 #{chapter_num}: {chapter_title}")
    ai_logger.info(f"   内容长度: {content_length} 字符")
    if summary:
        ai_logger.info(f"   概括长度: {len(summary)} 字符")
        ai_logger.info(f"   概括预览: {summary[:200]}...")
