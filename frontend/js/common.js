/* ====================
   通用JavaScript函数 - 所有页面共用
   ==================== */

// 侧边栏折叠功能
function initSidebarToggle() {
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const pageBody = document.getElementById('pageBody');
    
    if (sidebarToggleBtn && pageBody) {
        // 根据本地记录恢复初始状态（默认折叠）
        const savedState = localStorage.getItem('sidebar-collapsed');
        const shouldCollapse = savedState === null ? true : savedState === 'true';
        pageBody.classList.toggle('sidebar-collapsed', shouldCollapse);
        pageBody.classList.add('sidebar-ready');
        
        sidebarToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const isCollapsed = pageBody.classList.toggle('sidebar-collapsed');
            // 保存状态到 localStorage
            localStorage.setItem('sidebar-collapsed', isCollapsed);
        });
    } else {
        console.error('侧边栏功能初始化失败：缺少必需的DOM元素');
    }
}

// 高亮当前页面的侧边栏菜单项
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    
    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 通用工具函数：显示Toast提示
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function renderChapterSummaryDetails(container, summaries) {
    if (!container) {
        return;
    }

    const existing = container.querySelector('.chapter-summary-details');
    if (existing) {
        existing.remove();
    }

    if (!Array.isArray(summaries) || summaries.length === 0) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'chapter-summary-details';

    const heading = document.createElement('h4');
    heading.textContent = '章节概括详情';
    wrapper.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'chapter-summary-list';

    summaries.forEach((item, index) => {
        const li = document.createElement('div');
        li.className = 'chapter-summary-item';

        const titleRow = document.createElement('div');
        titleRow.className = 'summary-title-row';

        const title = document.createElement('span');
        title.className = 'summary-title';
        const displayTitle = (item && typeof item.title === 'string' && item.title.trim()) ? item.title.trim() : `章节 ${index + 1}`;
        title.textContent = displayTitle;
        titleRow.appendChild(title);

        // const status = document.createElement('span');
        // status.className = `summary-status ${item && item.success ? 'is-success' : 'is-failed'}`;
        // status.textContent = item && item.success ? '成功' : '失败';
        // titleRow.appendChild(status);

        const lengthTag = document.createElement('span');
        lengthTag.className = 'summary-length';
        const lengthValue = item && typeof item.length === 'number' ? item.length : 0;
        lengthTag.textContent = `${lengthValue} 字`; 
        titleRow.appendChild(lengthTag);

        li.appendChild(titleRow);

        const content = document.createElement('div');
        content.className = 'summary-text';
        const summaryText = item && typeof item.summary === 'string' && item.summary.trim() ? item.summary.trim() : '未生成剧情概括。';
        content.textContent = summaryText;
        li.appendChild(content);

        list.appendChild(li);
    });

    wrapper.appendChild(list);
    container.appendChild(wrapper);
}

window.renderChapterSummaryDetails = renderChapterSummaryDetails;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initSidebarToggle();
    highlightCurrentPage();
});
