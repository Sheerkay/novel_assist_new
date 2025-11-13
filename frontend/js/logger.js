// e:\Vs_Project\Novel_asisit_new\frontend\js\logger.js
/**
 * 前端统一日志管理工具
 * 提供格式化的日志输出和可选的UI日志面板
 */

const Logger = {
    // 日志级别
    LEVEL: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },

    // 当前日志级别（可在开发/生产环境切换）
    currentLevel: 0, // DEBUG级别，显示所有日志

    // 日志历史记录（最多保存100条）
    history: [],
    maxHistory: 100,

    // 是否启用控制台输出
    enableConsole: true,

    // 是否启用UI日志面板
    enableUI: false,

    /**
     * 格式化时间戳
     */
    timestamp() {
        const now = new Date();
        return now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0');
    },

    /**
     * 添加日志到历史记录
     */
    addToHistory(level, category, message, data) {
        const log = {
            time: this.timestamp(),
            level,
            category,
            message,
            data
        };
        this.history.push(log);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        return log;
    },

    /**
     * 通用日志输出方法
     */
    log(level, levelName, emoji, category, message, data) {
        if (level < this.currentLevel) return;

        const log = this.addToHistory(levelName, category, message, data);

        if (this.enableConsole) {
            const style = this.getStyle(level);
            const prefix = `${emoji} [${log.time}] [${category}]`;
            
            if (data !== undefined) {
                console.log(`%c${prefix} ${message}`, style, data);
            } else {
                console.log(`%c${prefix} ${message}`, style);
            }
        }

        if (this.enableUI) {
            this.appendToUI(log);
        }
    },

    /**
     * 获取日志样式
     */
    getStyle(level) {
        const styles = {
            0: 'color: #888; font-size: 11px;',           // DEBUG - 灰色
            1: 'color: #2196F3; font-weight: bold;',      // INFO - 蓝色
            2: 'color: #FF9800; font-weight: bold;',      // WARN - 橙色
            3: 'color: #F44336; font-weight: bold;'       // ERROR - 红色
        };
        return styles[level] || '';
    },

    // 便捷方法
    debug(category, message, data) {
        this.log(this.LEVEL.DEBUG, 'DEBUG', '🔍', category, message, data);
    },

    info(category, message, data) {
        this.log(this.LEVEL.INFO, 'INFO', '📘', category, message, data);
    },

    warn(category, message, data) {
        this.log(this.LEVEL.WARN, 'WARN', '⚠️', category, message, data);
    },

    error(category, message, data) {
        this.log(this.LEVEL.ERROR, 'ERROR', '❌', category, message, data);
    },

    // 特定功能的日志方法
    api: {
        request(endpoint, method, data) {
            Logger.info('API', `📤 请求 ${method} ${endpoint}`, data);
        },

        response(endpoint, status, data) {
            const emoji = status === 200 ? '✅' : '❌';
            Logger.info('API', `${emoji} 响应 ${endpoint} [${status}]`, data);
        },

        error(endpoint, error) {
            Logger.error('API', `请求失败 ${endpoint}`, error);
        }
    },

    chapter: {
        select(chapters) {
            Logger.info('章节', `已选择 ${chapters.length} 个章节`, chapters.map(c => c.title));
        },

        summarize(chapters) {
            Logger.info('章节', `开始概括 ${chapters.length} 个章节`, {
                titles: chapters.map(c => c.title),
                totalLength: chapters.reduce((sum, c) => sum + c.content.length, 0)
            });
        },

        summaryResult(summary) {
            Logger.info('章节', `概括完成，长度: ${summary.length} 字符`, summary.substring(0, 200) + '...');
        }
    },

    context: {
        update(type, count) {
            Logger.info('上下文', `更新 ${type}: ${count} 项`);
        },

        send(contextParts) {
            Logger.info('上下文', `发送上下文，共 ${contextParts.length} 个部分`, contextParts);
        }
    },

    ui: {
        action(action, details) {
            Logger.debug('UI', `用户操作: ${action}`, details);
        },

        error(action, error) {
            Logger.error('UI', `UI错误: ${action}`, error);
        }
    },

    /**
     * 获取日志历史
     */
    getHistory(filter) {
        if (!filter) return this.history;
        return this.history.filter(log => {
            if (filter.level && log.level !== filter.level) return false;
            if (filter.category && log.category !== filter.category) return false;
            return true;
        });
    },

    /**
     * 清空日志历史
     */
    clearHistory() {
        this.history = [];
        console.clear();
    },

    /**
     * 导出日志为文本
     */
    export() {
        const text = this.history.map(log => 
            `[${log.time}] [${log.level}] [${log.category}] ${log.message}${log.data ? '\n  ' + JSON.stringify(log.data) : ''}`
        ).join('\n');
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novel-assist-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * 在UI中显示日志（可选功能）
     */
    appendToUI(log) {
        // 暂时不实现UI面板，保留接口供将来扩展
    },

    /**
     * 创建日志查看器UI（可选）
     */
    createLogViewer() {
        // 可以在需要时实现一个浮动的日志查看面板
    }
};

// 在开发环境下自动启用调试日志
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    Logger.currentLevel = Logger.LEVEL.DEBUG;
    console.log('%c📋 日志系统已启用 (开发模式)', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
    console.log('%c可用命令:', 'color: #2196F3; font-weight: bold;');
    console.log('  Logger.getHistory()        - 查看所有日志');
    console.log('  Logger.export()            - 导出日志文件');
    console.log('  Logger.clearHistory()      - 清空日志');
    console.log('  Logger.currentLevel = n    - 设置日志级别 (0-3)');
}

// 导出到全局
window.Logger = Logger;
