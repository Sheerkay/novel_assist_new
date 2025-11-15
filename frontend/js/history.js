/* ====================
   历史对话页面专用JavaScript
   ==================== */

document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('historyList');
    const historyDetail = document.getElementById('historyDetail');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    // 加载历史对话列表
    function loadHistoryList() {
        const history = JSON.parse(localStorage.getItem('novel_assist_conversation_history') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">暂无历史对话</p>';
            return;
        }
        
        historyList.innerHTML = '';
        history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-title">${item.title || '对话 ' + (index + 1)}</div>
                <div class="history-item-date">${formatTimestamp(item.timestamp)}</div>
            `;
            div.addEventListener('click', () => showHistoryDetail(item, div));
            historyList.appendChild(div);
        });
    }
    
    // 显示历史对话详情
    function showHistoryDetail(item, element) {
        // 移除所有active类
        document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
        
        // 渲染对话内容
        historyDetail.innerHTML = '';
        item.conversation.forEach(message => {
            const bubble = document.createElement('div');
            bubble.className = `bubble ${message.role === 'user' ? 'user-bubble' : 'ai-bubble'}`;
            
            if (message.role === 'assistant') {
                // AI消息使用marked渲染
                bubble.innerHTML = marked.parse(message.content);
            } else {
                bubble.textContent = message.content;
            }
            
            historyDetail.appendChild(bubble);
        });
    }
    
    // 清空历史记录
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有历史对话吗？此操作不可恢复。')) {
            localStorage.removeItem('novel_assist_conversation_history');
            loadHistoryList();
            historyDetail.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">请从左侧选择对话记录查看详情</p>';
            showToast('历史记录已清空', 'success');
        }
    });
    
    // 初始化
    loadHistoryList();
});
