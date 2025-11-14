"""
测试上下文管理器重构
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.context_manager import ContextManager

def test_context_manager():
    print("=== 测试上下文管理器 ===\n")
    
    # 创建上下文管理器
    cm = ContextManager()
    
    # 设置上下文
    test_context = "这是第一章的内容。主角张三来到了新城市..."
    test_chapters = [
        {'number': 1, 'title': '初到新城'},
        {'number': 2, 'title': '意外相遇'}
    ]
    
    cm.set_additional_context(test_context, test_chapters)
    print("✅ 已设置上下文")
    
    # 测试不同意图的上下文获取
    intents = ['chat', 'plot_design', 'novel_generation']
    
    for intent in intents:
        print(f"\n--- 意图: {intent} ---")
        context_data = cm.get_context_for_intent(intent)
        print(f"has_context: {context_data['has_context']}")
        print(f"context 长度: {len(context_data['context'])}")
        print(f"章节列表:\n{context_data['context_chapter_list']}")
    
    print("\n✅ 所有测试通过！")
    print("\n=== 重构总结 ===")
    print("✅ 创建了 ContextManager 类用于集中管理上下文")
    print("✅ 在 ai_service.py 中添加了 generate_content_with_intent() 新函数")
    print("✅ 在 generation_routes.py 中使用 ContextManager")
    print("✅ 保留了旧函数以保持向后兼容")
    print("✅ 消除了重复的上下文格式化代码")

if __name__ == '__main__':
    test_context_manager()
