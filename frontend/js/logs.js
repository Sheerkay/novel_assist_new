/* ====================
   日志管理页面专用JavaScript
   ==================== */

document.addEventListener('DOMContentLoaded', () => {
    const logTypeSelect = document.getElementById('logTypeSelect');
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const downloadLogsBtn = document.getElementById('downloadLogsBtn');
    const logsText = document.getElementById('logsText');
    
    // 加载日志
    async function loadLogs() {
        const logType = logTypeSelect.value;
        logsText.textContent = '加载中...';
        
        try {
            Logger.api.request('/api/logs', 'GET', { logType });
            const data = await api.getLogs(logType);
            Logger.api.response('/api/logs', 200, { logType });
            logsText.textContent = data.content || '日志为空';
        } catch (error) {
            Logger.api.error('/api/logs', error);
            logsText.textContent = `错误: ${error.message}`;
            showToast('加载日志失败', 'error');
        }
    }
    
    // 清空日志
    async function clearLogs() {
        if (!confirm('确定要清空当前日志吗？此操作不可恢复。')) {
            return;
        }
        
        const logType = logTypeSelect.value;
        
        try {
            Logger.api.request('/api/logs', 'DELETE', { logType });
            await api.clearLogs(logType);
            Logger.api.response('/api/logs', 200, { logType, cleared: true });
            showToast('日志已清空', 'success');
            loadLogs();
        } catch (error) {
            Logger.api.error('/api/logs', error);
            showToast('清空日志失败: ' + error.message, 'error');
        }
    }
    
    // 下载日志
    function downloadLogs() {
        const logType = logTypeSelect.value;
        const content = logsText.textContent;
        
        if (!content || content === '日志为空' || content === '加载中...') {
            showToast('没有可下载的日志内容', 'error');
            return;
        }
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${logType}_log_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('日志已下载', 'success');
    }
    
    // 事件监听
    logTypeSelect.addEventListener('change', loadLogs);
    refreshLogsBtn.addEventListener('click', loadLogs);
    clearLogsBtn.addEventListener('click', clearLogs);
    downloadLogsBtn.addEventListener('click', downloadLogs);
    
    // 初始化加载
    loadLogs();
});
