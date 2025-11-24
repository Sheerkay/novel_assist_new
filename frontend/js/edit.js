document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // 1. 全局状态管理
    // =================================================================
    let currentNovel = null; 
    let plotContextSummaries = []; 
    let chaptersForPreview = [];
    let summariesForPreview = []; 
    let myDrafts = [];
    let currentChapterPlotForPreview = []; // 新增：用于存放当前章节的剧情预览
    const DEFAULT_PLOT_BOOK_KEY = 'global-default';
    const DEFAULT_PLOT_BOOK_TITLE = '未分类剧情';
    let selectedPlotBookId = DEFAULT_PLOT_BOOK_KEY;
    let selectedDraftBookId = DEFAULT_PLOT_BOOK_KEY;
    let draftSelectionState = new Set(); // 存储被勾选的定稿ID
    let activeDraftId = null; // 当前预览的定稿ID

    // =================================================================
    // 1.1 历史对话会话管理
    // =================================================================
    let currentSessionId = null;
    const STORAGE_KEY_SESSIONS = 'novel_assist_sessions';

    function initHistorySystem() {
        renderHistoryList();
        // 绑定新对话按钮事件
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewSession);
        }
        
        // 自动加载最近的一个会话，如果没有则新建
        const sessions = getSessions();
        if (sessions.length > 0) {
            loadSession(sessions[0].id);
        } else {
            createNewSession();
        }
    }

    function getSessions() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || '[]');
        } catch (e) {
            console.error('读取历史会话失败', e);
            return [];
        }
    }

    function saveSessions(sessions) {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
        renderHistoryList();
    }

    function createNewSession() {
        currentSessionId = null;
        // 清空对话界面（保留第一个欢迎气泡)
        const historyContainer = document.getElementById('conversationHistory');
        if (historyContainer) {
            // 保留初始欢迎语
            historyContainer.innerHTML = `
                <div class="ai-message-wrapper">
                    <div class="bubble ai-bubble">
                        <p>你好！请点击右侧"加载小说"按钮加载您的小说，然后点击下方"附加上下文详情"来选择所需的上下文，就可以开始创作了！</p>
                    </div>
                </div>
            `;
        }
        // 移除侧边栏的高亮状态
        document.querySelectorAll('.history-list-item').forEach(el => el.classList.remove('active'));
        
        // 添加快捷指令按钮
        appendQuickCommandButton();
    }

    function loadSession(sessionId) {
        const sessions = getSessions();
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        currentSessionId = sessionId;
        const historyContainer = document.getElementById('conversationHistory');
        if (historyContainer) {
            historyContainer.innerHTML = ''; // 清空当前
            
            // 重新渲染消息
            session.messages.forEach(msg => {
                if (msg.role === 'user') {
                    const userWrapper = document.createElement('div');
                    userWrapper.className = 'user-message-wrapper';
                    const userBubble = document.createElement('div');
                    userBubble.className = 'bubble user-bubble';
                    
                    // 处理内容显示（转义HTML并处理换行）
                    // 检查内容是否已经是HTML（简单的判断）
                    let displayContent = msg.content;
                    if (!msg.content.includes('<div class="bubble-content">')) {
                         const escapedContent = msg.content
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n/g, '<br>');
                        displayContent = `<div class="bubble-content">${escapedContent}</div>`;
                    }
                    
                    userBubble.innerHTML = displayContent;
                    userWrapper.appendChild(userBubble);
                    
                    // 添加复制按钮
                    const userActions = document.createElement('div');
                    userActions.className = 'user-bubble-actions';
                    userActions.innerHTML = `<button class="copy-btn-subtle" onclick="copyUserMessage(this)" title="复制">📋</button>`;
                    userWrapper.appendChild(userActions);

                    historyContainer.appendChild(userWrapper);
                } else if (msg.role === 'assistant') {
                    const aiWrapper = document.createElement('div');
                    aiWrapper.className = 'ai-message-wrapper';
                    const aiBubble = document.createElement('div');
                    aiBubble.className = 'bubble ai-bubble';
                    // 恢复透明气泡样式
                    if (msg.isTransparent) {
                        aiBubble.classList.add('transparent-bubble');
                    }
                    
                    // Determine content to display
                    let displayContent = marked.parse(msg.content);
                    // 如果存在结构化数据且可以渲染，则隐藏文本内容，避免重复显示
                    if (msg.structuredData && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && typeof renderChapterSummaryDetails === 'function') {
                        displayContent = ''; 
                    }

                    aiBubble.innerHTML = `<div class="ai-content">${displayContent}</div><div class="ai-actions"></div>`;
                    
                    // 恢复结构化数据
                    if (msg.structuredData) {
                        aiBubble._chapterSummaries = msg.structuredData;
                        if (typeof renderChapterSummaryDetails === 'function') {
                            renderChapterSummaryDetails(aiBubble, msg.structuredData);
                        }
                    }
                    
                    // 恢复按钮
                    const aiActions = document.createElement('div');
                    aiActions.className = 'ai-bubble-actions';
                    aiActions.innerHTML = `
                        <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋</button>
                    `;
                    aiWrapper.appendChild(aiBubble);
                    aiWrapper.appendChild(aiActions);
                    
                    // 恢复"存为剧情"按钮
                    if (msg.structuredData && msg.isTransparent) {
                         const detailsCard = aiBubble.querySelector('.chapter-summary-details');
                         if (detailsCard) {
                            const btnContainer = document.createElement('div');
                            btnContainer.style.marginTop = '12px';
                            btnContainer.style.textAlign = 'left';
                            btnContainer.innerHTML = `<button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>`;
                            detailsCard.appendChild(btnContainer);
                         }
                    } else {
                        const internalActions = aiBubble.querySelector('.ai-actions');
                        if (internalActions) {
                            internalActions.innerHTML = `<button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>`;
                        }
                    }
                    
                    // 恢复原始文本用于存为剧情
                    aiBubble._rawContent = msg.rawContent || msg.content;
                    aiBubble._relatedChapters = msg.relatedChapters || [];

                    historyContainer.appendChild(aiWrapper);
                }
            });
            
            historyContainer.scrollTop = historyContainer.scrollHeight;
            const mainContent = document.querySelector('main.main-content');
            if (mainContent) mainContent.scrollTop = mainContent.scrollHeight;
        }
        
        renderHistoryList();
        
        // 添加快捷指令按钮
        appendQuickCommandButton();
    }

    function saveMessageToHistory(role, content, extraData = {}) {
        const sessions = getSessions();
        let session = null;

        if (currentSessionId) {
            session = sessions.find(s => s.id === currentSessionId);
        }

        const timestamp = new Date().toISOString();
        const message = {
            role,
            content,
            timestamp,
            ...extraData
        };

        if (!session) {
            // 创建新会话
            currentSessionId = Date.now().toString();
            // 标题取第一条消息的前20个字
            let title = content.replace(/<[^>]+>/g, '').substring(0, 20) || '新对话';
            if (role === 'assistant') title = 'AI回复';
            
            session = {
                id: currentSessionId,
                title: title,
                timestamp: timestamp,
                messages: [message]
            };
            sessions.unshift(session); // 加到开头
        } else {
            // 更新现有会话
            session.messages.push(message);
            session.timestamp = timestamp;
            // 移到开头
            const index = sessions.findIndex(s => s.id === currentSessionId);
            if (index > -1) {
                sessions.splice(index, 1);
                sessions.unshift(session);
            }
        }

        saveSessions(sessions);
    }

    function renderHistoryList() {
        const listContainer = document.getElementById('sidebarHistoryList');
        if (!listContainer) return;

        const sessions = getSessions();
        listContainer.innerHTML = '';

        if (sessions.length === 0) {
            listContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:0.85rem;">暂无历史记录</div>';
            return;
        }

        // Group sessions by date
        const groups = {
            '今天': [],
            '昨天': [],
            '前7天': [],
            '更早': []
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterday = today - 86400000;
        const last7Days = today - 86400000 * 7;

        sessions.forEach(session => {
            const date = new Date(session.timestamp).getTime();
            if (date >= today) {
                groups['今天'].push(session);
            } else if (date >= yesterday) {
                groups['昨天'].push(session);
            } else if (date >= last7Days) {
                groups['前7天'].push(session);
            } else {
                groups['更早'].push(session);
            }
        });

        // Render groups
        Object.keys(groups).forEach(key => {
            const groupSessions = groups[key];
            if (groupSessions.length > 0) {
                const header = document.createElement('div');
                header.className = 'history-group-header';
                header.textContent = key;
                listContainer.appendChild(header);

                groupSessions.forEach(session => {
                    const item = document.createElement('div');
                    item.className = `history-list-item ${session.id === currentSessionId ? 'active' : ''}`;
                    
                    // Title span
                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'history-title-text';
                    titleSpan.textContent = session.title || '无标题对话';
                    titleSpan.title = session.title;
                    
                    // Delete button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'history-delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.title = '删除对话';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                    };

                    item.appendChild(titleSpan);
                    item.appendChild(deleteBtn);
                    
                    item.onclick = () => loadSession(session.id);
                    listContainer.appendChild(item);
                });
            }
        });
    }

    function deleteSession(sessionId) {
        if (!confirm('确定要删除这条对话记录吗？')) return;
        
        const sessions = getSessions();
        const newSessions = sessions.filter(s => s.id !== sessionId);
        saveSessions(newSessions);
        
        if (currentSessionId === sessionId) {
            createNewSession();
        }
    }

    // 智能勾选上下文区域的函数
    // mode: 'summary' - 概括章节（只勾选原文章节）
    //       'plot-design' - 剧情设计（只勾选当前原文章节剧情）
    //       'general' - 常规对话（勾选剧情梗概，保留其他）
    function smartSelectContext(mode) {
        let message = '';
        
        if (mode === 'summary') {
            // 概括章节：只需要原文章节
            allElements.masterCheckboxChapters.checked = chaptersForPreview.length > 0;
            allElements.masterCheckboxSummaries.checked = false;
            allElements.masterCheckboxCurrentChapterPlot.checked = false;
            message = '智能选择：已自动勾选 "原文章节" 作为上下文';
        } else if (mode === 'plot-design') {
            // 剧情设计：只需要当前原文章节剧情
            allElements.masterCheckboxChapters.checked = false;
            allElements.masterCheckboxSummaries.checked = false;
            allElements.masterCheckboxCurrentChapterPlot.checked = currentChapterPlotForPreview.length > 0;
            message = '智能选择：已自动勾选 "当前原文章节剧情" 作为上下文';
        } else if (mode === 'general') {
            // 常规对话：主要使用剧情梗概，其他保持不变
            if (summariesForPreview.length > 0) {
                allElements.masterCheckboxSummaries.checked = true;
            }
            message = '智能选择：已自动勾选 "剧情梗概" 作为上下文';
            // 保持原文章节和当前剧情的勾选状态不变
        }
        
        // 更新底部的上下文摘要显示
        updateSelectedContextSummary();
        
        // 显示系统提示气泡
        if (message && allElements.conversationHistory) {
            const systemWrapper = document.createElement('div');
            systemWrapper.className = 'system-message-wrapper';
            
            const systemBubble = document.createElement('div');
            systemBubble.className = 'bubble ai-bubble system-bubble';
            systemBubble.style.backgroundColor = '#e8f5e9';
            systemBubble.style.borderLeft = '4px solid #4caf50';
            systemBubble.innerHTML = `<p style="margin:0;"><strong>[系统]</strong> ${message}</p>`;
            
            systemWrapper.appendChild(systemBubble);
            allElements.conversationHistory.appendChild(systemWrapper);
            if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
        }
    }

    // 检测用户输入是否为剧情设计类需求
    function isPlotDesignIntent(text) {
        const plotKeywords = [
            '剧情', '情节', '故事线', '主线', '支线',
            '设计', '改写', '优化', '调整', '修改',
            '冲突', '转折', '高潮', '伏笔', '铺垫',
            '人物关系', '角色发展', '矛盾', '悬念'
        ];
        
        const lowerText = text.toLowerCase();
        return plotKeywords.some(keyword => lowerText.includes(keyword));
    }

    // =================================================================
    // 2. DOM元素引用
    // =================================================================
    const allElements = {
        pageBody: document.getElementById('pageBody'),
        mainContent: document.querySelector('main.main-content'),
        sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
        sidebarMenuItems: document.querySelectorAll('.sidebar-menu-item'),
        mainTabs: document.querySelectorAll('.view-switch-btn'), // 更新选择器
        tabContents: document.querySelectorAll('.tab-content'),
        conversationHistory: document.getElementById('conversationHistory'),
        promptInput: document.getElementById('promptInput'),
        sendPromptBtn: document.getElementById('sendPromptBtn'),
        masterCheckboxChapters: document.getElementById('master-checkbox-chapters'),
        masterCheckboxSummaries: document.getElementById('master-checkbox-summaries'),
        chaptersPreviewList: document.getElementById('chapters-preview-list'),
        summariesPreviewList: document.getElementById('summaries-preview-list'),
        chaptersPreviewCount: document.getElementById('chapters-preview-count'),
        summariesPreviewCount: document.getElementById('summaries-preview-count'),
        fabChangeFontBtn: document.getElementById('fabChangeFontBtn'), // 新增字体切换按钮
        fabSelectContextBtn: document.getElementById('fabSelectContextBtn'), 
        fabViewDraftsBtn: document.getElementById('fabViewDraftsBtn'), 
        fabPlotContextBtn: document.getElementById('fabPlotContextBtn'),
        plotContextCount: document.getElementById('plotContextCount'), 
        draftsCountSpan: document.getElementById('draftsCount'),
        selectSourceModal: document.getElementById('selectSourceModal'),
        viewDraftsModal: document.getElementById('viewDraftsModal'),
        plotContextModal: document.getElementById('plotContextModal'),
        uploadView: document.getElementById('uploadView'),
        chapterSelectionView: document.getElementById('chapterSelectionView'),
        chapterListForSelection: document.getElementById('chapterListForSelection'),
        selectAllChaptersButton: document.getElementById('selectAllChaptersButton'),
        confirmChapterSelectionBtn: document.getElementById('confirmChapterSelectionBtn'),
        loadedFileName: document.getElementById('loadedFileName'),
        uploadArea: document.getElementById('uploadArea'),
        fileInput: document.getElementById('fileInput'),
        fileNameDisplay: document.getElementById('fileNameDisplay'),
        uploadAndParseBtn: document.getElementById('uploadAndParseBtn'),
        changeNovelBtn: document.getElementById('changeNovelBtn'),

        plotListContainer: document.getElementById('plotListContainer'),
        plotPreviewArea: document.getElementById('plotPreviewArea'),
        plotBookList: document.getElementById('plotBookList'),
        clearPlotSelectionsBtn: document.getElementById('clearPlotSelectionsBtn'),
        selectAllPlotsButton: document.getElementById('selectAllPlotsButton'),
        addSelectedPlotsBtn: document.getElementById('addSelectedPlotsBtn'),
        addSelectedPlotsToCurrentChapterPlotBtn: document.getElementById('addSelectedPlotsToCurrentChapterPlotBtn'), // 新增按钮引用
        draftsListContainer: document.getElementById('draftsListContainer'),
        draftsPreviewArea: document.getElementById('draftsPreviewArea'),
        draftsBookList: document.getElementById('draftsBookList'),
        selectAllDraftsButton: document.getElementById('selectAllDraftsButton'),
        clearDraftSelectionsBtn: document.getElementById('clearDraftSelectionsBtn'),
        mergeDraftsBtn: document.getElementById('mergeDraftsBtn'),
        closeDraftsModalBtn: document.getElementById('closeDraftsModalBtn'),
        selectedContextToggle: document.getElementById('selected-context-toggle'),
        chaptersLabel: document.getElementById('chapters-label'),
        summariesLabel: document.getElementById('summaries-label'),
        currentChapterPlotLabel: document.getElementById('current-chapter-plot-label'),
        masterCheckboxCurrentChapterPlot: document.getElementById('master-checkbox-current-chapter-plot'),
        currentChapterPlotPreviewList: document.getElementById('current-chapter-plot-preview-list'),
        currentChapterPlotPreviewCount: document.getElementById('current-chapter-plot-preview-count'),
        additionalContextModal: document.getElementById('additionalContextModal'),
        closeContextModalBtn: document.getElementById('closeContextModalBtn'),
        clearChaptersBtn: document.getElementById('clear-chapters-btn'),
        clearSummariesBtn: document.getElementById('clear-summaries-btn'),
        clearCurrentPlotBtn: document.getElementById('clear-current-plot-btn'),

        // 占位按钮已移除，保留注释以防未来重新启用
    };

    // =================================================================
    // 3. 初始化与事件绑定
    // =================================================================
    
    function saveContextLabels() {
        const labels = {
            chapters: allElements.chaptersLabel.textContent,
            summaries: allElements.summariesLabel.textContent,
            currentChapterPlot: allElements.currentChapterPlotLabel.textContent
        };
        localStorage.setItem('novel_assist_context_labels', JSON.stringify(labels));
    }

    function loadContextLabels() {
        const savedLabels = localStorage.getItem('novel_assist_context_labels');
        if (savedLabels) {
            const labels = JSON.parse(savedLabels);
            allElements.chaptersLabel.textContent = labels.chapters || '原文章节';
            allElements.summariesLabel.textContent = labels.summaries || '剧情梗概';
            allElements.currentChapterPlotLabel.textContent = labels.currentChapterPlot || '当前原文章节剧情';
        } else {
            // 如果没有保存过，则使用默认值
            allElements.chaptersLabel.textContent = '原文章节';
            allElements.summariesLabel.textContent = '剧情梗概';
            allElements.currentChapterPlotLabel.textContent = '当前原文章节剧情';
        }
    }
    
    function saveNovelToLocalStorage() {
        if (currentNovel) {
            const dataToSave = {
                novel: currentNovel,
                selectedChapters: chaptersForPreview,
                timestamp: new Date().toISOString()
            };
            try {
                localStorage.setItem('novel_assist_current_novel', JSON.stringify(dataToSave));
                console.log('小说数据已保存到 localStorage');
            } catch (e) {
                console.error('保存到 localStorage 失败:', e);
            }
        }
    }
    
    function loadNovelFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('novel_assist_current_novel');
            if (savedData) {
                const parsed = JSON.parse(savedData);
                currentNovel = parsed.novel;
                selectedPlotBookId = getPlotBookKeyFromNovel(currentNovel);
                selectedDraftBookId = selectedPlotBookId;
                chaptersForPreview = parsed.selectedChapters || [];
                console.log('从 localStorage 恢复小说数据:', currentNovel.filename);
                return true;
            }
        } catch (e) {
            console.error('从 localStorage 加载失败:', e);
        }
        return false;
    }
    
    function clearNovelFromLocalStorage() {
        localStorage.removeItem('novel_assist_current_novel');
        console.log('已清除 localStorage 中的小说数据');
    }

    // 剧情库 localStorage 管理
    function savePlotContextToLocalStorage() {
        try {
            if (plotContextSummaries.length === 0) {
                localStorage.removeItem('novel_assist_plot_context');
            } else {
                localStorage.setItem('novel_assist_plot_context', JSON.stringify(plotContextSummaries));
            }
            console.log('剧情库数据已保存到 localStorage');
        } catch (e) {
            console.error('保存剧情库到 localStorage 失败:', e);
        }
    }

    function loadPlotContextFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('novel_assist_plot_context');
            if (savedData) {
                plotContextSummaries = JSON.parse(savedData).map(normalizePlotEntry);
                ensureSelectedPlotBookExists();
                console.log('从 localStorage 恢复剧情库数据:', plotContextSummaries.length, '项');
                allElements.plotContextCount.textContent = plotContextSummaries.length;
                return true;
            }
        } catch (e) {
            console.error('从 localStorage 加载剧情库失败:', e);
        }
        return false;
    }

    function normalizePlotEntry(entry) {
        return {
            ...entry,
            bookId: entry.bookId || DEFAULT_PLOT_BOOK_KEY,
            bookTitle: entry.bookTitle || DEFAULT_PLOT_BOOK_TITLE,
        };
    }

    function getPlotBookKeyFromNovel(novel) {
        if (!novel) return DEFAULT_PLOT_BOOK_KEY;
        if (novel.file_id) return `file_${novel.file_id}`;
        if (novel.filename) return `name_${novel.filename}`;
        return DEFAULT_PLOT_BOOK_KEY;
    }

    function getPlotBookTitleFromNovel(novel) {
        if (!novel) return DEFAULT_PLOT_BOOK_TITLE;
        return novel.filename || novel.title || DEFAULT_PLOT_BOOK_TITLE;
    }

    function getPlotsByBook(bookId) {
        const key = bookId || DEFAULT_PLOT_BOOK_KEY;
        return plotContextSummaries.filter(item => (item.bookId || DEFAULT_PLOT_BOOK_KEY) === key);
    }

    function getPlotBooks() {
        const bookMap = new Map();
        plotContextSummaries.forEach(entry => {
            const key = entry.bookId || DEFAULT_PLOT_BOOK_KEY;
            if (!bookMap.has(key)) {
                bookMap.set(key, {
                    id: key,
                    title: entry.bookTitle || DEFAULT_PLOT_BOOK_TITLE,
                    count: 0
                });
            }
            bookMap.get(key).count += 1;
        });
        return Array.from(bookMap.values()).sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    }

    function ensureSelectedPlotBookExists() {
        const books = getPlotBooks();
        if (books.length === 0) {
            selectedPlotBookId = DEFAULT_PLOT_BOOK_KEY;
            return;
        }
        const novelKey = currentNovel ? getPlotBookKeyFromNovel(currentNovel) : null;
        if (novelKey && books.some(book => book.id === novelKey)) {
            selectedPlotBookId = novelKey;
            return;
        }
        if (!books.some(book => book.id === selectedPlotBookId)) {
            selectedPlotBookId = books[0].id;
        }
    }

    function getBookTitleById(bookId) {
        const key = bookId || DEFAULT_PLOT_BOOK_KEY;
        const hit = plotContextSummaries.find(item => (item.bookId || DEFAULT_PLOT_BOOK_KEY) === key);
        if (hit) return hit.bookTitle || DEFAULT_PLOT_BOOK_TITLE;
        if (currentNovel && getPlotBookKeyFromNovel(currentNovel) === key) {
            return getPlotBookTitleFromNovel(currentNovel);
        }
        return DEFAULT_PLOT_BOOK_TITLE;
    }

    function getActivePlotBookInfo() {
        if (currentNovel) {
            return {
                id: getPlotBookKeyFromNovel(currentNovel),
                title: getPlotBookTitleFromNovel(currentNovel)
            };
        }
        if (selectedPlotBookId && selectedPlotBookId !== DEFAULT_PLOT_BOOK_KEY) {
            return {
                id: selectedPlotBookId,
                title: getBookTitleById(selectedPlotBookId)
            };
        }
        return {
            id: DEFAULT_PLOT_BOOK_KEY,
            title: DEFAULT_PLOT_BOOK_TITLE
        };
    }

    // =================================================================
    // 4. 核心函数 - 上下文与UI管理
    // =================================================================

    function renderContextPreviewArea() {
        const chapterList = allElements.chaptersPreviewList;
        chapterList.innerHTML = '';
        if (chaptersForPreview.length > 0) {
            chaptersForPreview.forEach(chapter => {
                const li = document.createElement('li');
                li.textContent = chapter.title;
                li.title = chapter.title;
                chapterList.appendChild(li);
            });
        } else {
            chapterList.innerHTML = '<li class="placeholder">请通过右侧“加载小说”按钮选择章节。</li>';
        }
        allElements.chaptersPreviewCount.textContent = `${chaptersForPreview.length} 项`;
        allElements.masterCheckboxChapters.disabled = chaptersForPreview.length === 0;

        const summaryList = allElements.summariesPreviewList;
        summaryList.innerHTML = '';
        if (summariesForPreview.length > 0) {
            summariesForPreview.forEach(summary => {
                const li = document.createElement('li');
                li.textContent = summary.title;
                li.title = summary.title;
                summaryList.appendChild(li);
            });
        } else {
            summaryList.innerHTML = '<li class="placeholder">请通过“剧情库”选择或“存为剧情”添加梗概。</li>';
        }
        allElements.summariesPreviewCount.textContent = `${summariesForPreview.length} 项`;
        allElements.masterCheckboxSummaries.disabled = summariesForPreview.length === 0;

        const currentPlotList = allElements.currentChapterPlotPreviewList;
        currentPlotList.innerHTML = '';
        if (currentChapterPlotForPreview.length > 0) {
            currentChapterPlotForPreview.forEach(plot => {
                const li = document.createElement('li');
                li.textContent = plot.title;
                li.title = plot.title;
                currentPlotList.appendChild(li);
            });
        } else {
            currentPlotList.innerHTML = '<li class="placeholder">此区域用于存放从章节生成的临时剧情。</li>';
        }
        allElements.currentChapterPlotPreviewCount.textContent = `${currentChapterPlotForPreview.length} 项`;
        allElements.masterCheckboxCurrentChapterPlot.disabled = currentChapterPlotForPreview.length === 0;

        updateSelectedContextSummary();
    }

    // 通用预览列表渲染函数
    // listEl: UL 元素
    // items: 数组，每项包含 {id, title, content}
    // countEl: 显示数量的元素
    // prefix: 用于产生每项 id/class 的前缀
    // placeholderText: 空列表时显示的提示
    function updatePreviewList(listEl, items, countEl, prefix, placeholderText) {
        if (!listEl) return;
        listEl.innerHTML = '';
        if (items && items.length > 0) {
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item.title || item.name || '未命名剧情';
                li.title = item.title || item.name || '未命名剧情';
                listEl.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'placeholder';
            li.textContent = placeholderText || '暂无内容';
            listEl.appendChild(li);
        }
        if (countEl) countEl.textContent = `${items ? items.length : 0} 项`;
    }
    
    function updateSelectedContextSummary() {
        let totalCount = 0;
        let chaptersCount = 0;
        let summariesCount = 0;
        let currentPlotCount = 0;

        if (allElements.masterCheckboxChapters.checked && chaptersForPreview.length > 0) {
            chaptersCount = chaptersForPreview.length;
            totalCount += chaptersCount;
        }

        if (allElements.masterCheckboxSummaries.checked && summariesForPreview.length > 0) {
            summariesCount = summariesForPreview.length;
            totalCount += summariesCount;
        }
        
        if (allElements.masterCheckboxCurrentChapterPlot.checked && currentChapterPlotForPreview.length > 0) {
            currentPlotCount = currentChapterPlotForPreview.length;
            totalCount += currentPlotCount;
        }

        allElements.selectedContextToggle.textContent = `附加上下文详情 (原文${chaptersCount}项，剧情${summariesCount}项，当前${currentPlotCount}项)`;
    }

    function parseAiSummaryContent(text) {
        const chapters = [];
        if (!text || !text.trim()) return chapters;

        const metaSectionKeywords = ['微调说明', '微调提示', '调整说明', '优化说明'];
        const lines = text.split('\n');

        const isPotentialChapterTitle = (line) => {
            const trimmed = line.trim();
            if (!trimmed) return false;
            if (/^#{1,6}\s+.+/.test(trimmed)) return true;
            if (/^第[一二三四五六七八九十零百千万\d]+[章节卷集篇回].*/.test(trimmed)) return true;
            if (/^【.+】$/.test(trimmed)) {
                const inner = trimmed.slice(1, -1).trim();
                if (!inner) return false;
                return /[章节卷集篇回]/.test(inner);
            }
            return false;
        };

        const titles = [];
        lines.forEach((line, index) => {
            if (isPotentialChapterTitle(line)) {
                titles.push({ title: line.trim(), index });
            }
        });

        if (titles.length === 0) {
            const content = text.trim();
            if (content) {
                chapters.push({ title: 'AI生成的剧情梗概', content });
            }
            return chapters;
        }

        for (let i = 0; i < titles.length; i++) {
            const start = titles[i].index;
            const end = (i + 1 < titles.length) ? titles[i + 1].index : lines.length;
            const rawSection = lines.slice(start, end).join('\n').trim();
            const content = lines.slice(start + 1, end).join('\n').trim();

            let title = titles[i].title
                .replace(/^#{1,6}\s*/, '')
                .replace(/^【/, '')
                .replace(/】$/, '')
                .replace(/-\s*剧情概括\s*$/, '')
                .trim();

            const isMetaSection = metaSectionKeywords.some(keyword => title.includes(keyword));

            if (isMetaSection && chapters.length > 0) {
                const lastChapter = chapters[chapters.length - 1];
                lastChapter.content += (lastChapter.content ? '\n\n' : '') + rawSection;
                continue;
            }

            if (title && content) {
                chapters.push({ title, content });
            }
        }

        return chapters;
    }



    function switchMainTab(tabName) {
        allElements.tabContents.forEach(content => {
            content.classList.toggle('hidden', content.id !== `${tabName}-view`);
        });
        allElements.mainTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
    }

    // =================================================================
    // 4. 核心函数 - AI交互与数据处理
    // =================================================================

    async function handleGenerateSummary() {
        // 智能勾选：概括章节只需要原文章节
        smartSelectContext('summary');
        
        // 1. 检查并获取选中的原文章节
        if (!allElements.masterCheckboxChapters.checked || chaptersForPreview.length === 0) {
            return alert('请先在"附加上下文"区域勾选"原文章节"并确保已选择章节。');
        }

        // 修复bug：确保与界面显示的计数逻辑一致
        // 只有在勾选状态下才使用 chaptersForPreview 中的章节
        const selectedChapters = allElements.masterCheckboxChapters.checked ? chaptersForPreview : [];
        
        if (selectedChapters.length === 0) {
            return alert('当前没有可用的章节进行概括。请确保"原文章节"已勾选且包含内容。');
        }
        // 2. 在对话历史中显示用户操作和AI思考状态
        const userBubble = document.createElement('div');
        userBubble.className = 'bubble user-bubble';
        const actionText = `[动作] 为 ${selectedChapters.length} 个选中章节生成剧情概括`;
        userBubble.innerHTML = `<div class="bubble-content">${actionText}</div>`;
        allElements.conversationHistory.appendChild(userBubble);
        if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;

        // 保存用户动作到历史
        saveMessageToHistory('user', actionText);

        // 创建AI消息包装器
        const aiMessageWrapper = document.createElement('div');
        aiMessageWrapper.className = 'ai-message-wrapper';
        
        const aiBubble = document.createElement('div');
        aiBubble.className = 'bubble ai-bubble';
        aiBubble.innerHTML = `<div class="ai-content">正在为您生成剧情概括...</div><div class="ai-actions"></div>`;
        
        aiMessageWrapper.appendChild(aiBubble);
        
        // 创建AI气泡的按钮容器
        const aiActions = document.createElement('div');
        aiActions.className = 'ai-bubble-actions';
        aiMessageWrapper.appendChild(aiActions);
        
        allElements.conversationHistory.appendChild(aiMessageWrapper);

        // 3. 准备并发送API请求
        const payload = {
            chapters: selectedChapters,
            fileId: currentNovel ? currentNovel.file_id : null
        };

        // 使用统一日志系统
        Logger.chapter.summarize(selectedChapters);
        Logger.api.request('/api/summarize-chapters', 'POST', payload);

        try {
            const result = await api.summarizeChapters(payload);
            Logger.api.response('/api/summarize-chapters', 200, { chapterCount: result.chapter_count });

            const aiContentDiv = aiBubble.querySelector('.ai-content');
            // 计算完整的文本摘要（用于保存和日志）
            const fullSummaryText = (() => {
                if (result.summary && result.summary.trim()) {
                    return result.summary;
                }
                if (Array.isArray(result.summaries) && result.summaries.length > 0) {
                    return result.summaries
                        .map(item => `## ${item.title || '章节概括'}\n${item.summary || ''}`)
                        .join('\n\n');
                }
                return '';
            })();

            // 计算显示的Markdown（用于界面展示）
            const displayMarkdown = (() => {
                // 优先检查是否有结构化摘要列表，如果有且能渲染详情，则优先使用详情视图
                if (Array.isArray(result.summaries) && result.summaries.length > 0) {
                    if (typeof renderChapterSummaryDetails === 'function') {
                        return ''; // 将由 renderChapterSummaryDetails 负责渲染，此处返回空字符串以隐藏Markdown视图
                    }
                }
                // 否则显示完整文本
                return fullSummaryText || '没有生成剧情概括。';
            })();

            Logger.chapter.summaryResult(fullSummaryText);

            // 4. 显示结果
            aiContentDiv.innerHTML = marked.parse(displayMarkdown);
            aiBubble._rawContent = fullSummaryText; // 保存原始文本，用于"存为剧情"
            aiBubble._relatedChapters = selectedChapters; // 关联章节
            aiBubble._chapterSummaries = Array.isArray(result.summaries) ? result.summaries : [];
            
            let isTransparent = false;
            if (typeof renderChapterSummaryDetails === 'function') {
                // 如果有结构化摘要，使用透明气泡模式，去掉外层灰色背景
                if (aiBubble._chapterSummaries.length > 0) {
                    aiBubble.classList.add('transparent-bubble');
                    isTransparent = true;
                }
                renderChapterSummaryDetails(aiBubble, aiBubble._chapterSummaries);
            }

            // 保存AI回复到历史
            saveMessageToHistory('assistant', fullSummaryText, {
                isTransparent: isTransparent,
                structuredData: aiBubble._chapterSummaries,
                rawContent: fullSummaryText,
                relatedChapters: selectedChapters
            });

            const actionsDiv = aiMessageWrapper.querySelector('.ai-bubble-actions');
            actionsDiv.innerHTML = `
                <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋</button>
            `;
            
            // 调整"存为剧情"按钮位置：如果是结构化展示，放入卡片内部；否则放在气泡底部
            const detailsCard = aiBubble.querySelector('.chapter-summary-details');
            if (detailsCard && aiBubble.classList.contains('transparent-bubble')) {
                const btnContainer = document.createElement('div');
                btnContainer.style.marginTop = '12px';
                btnContainer.style.textAlign = 'left';
                btnContainer.innerHTML = `<button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>`;
                detailsCard.appendChild(btnContainer);
                
                // 隐藏原有的内部操作区
                const internalActionsDiv = aiBubble.querySelector('.ai-actions');
                if (internalActionsDiv) internalActionsDiv.style.display = 'none';
            } else {
                const internalActionsDiv = aiBubble.querySelector('.ai-actions');
                internalActionsDiv.innerHTML = `
                    <button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>
                `;
            }
            
            if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
            appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮

        } catch (error) {
            console.error('Error generating summary:', error);
            Logger.api.error('/api/summarize-chapters', error);
            aiBubble.querySelector('.ai-content').textContent = '生成剧情概括时出错，请检查后台服务。';
            if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
            appendQuickCommandButton(); // 即使出错也要添加快捷指令按钮
        }
    }


    // 获取最近的对话历史
    function getRecentHistory(limit = 6) {
        const sessions = getSessions();
        let session = null;
        if (currentSessionId) {
            session = sessions.find(s => s.id === currentSessionId);
        }
        
        if (!session || !session.messages || session.messages.length === 0) {
            return [];
        }
        
        // 获取最后 limit 条消息，但要排除当前的（因为还没保存进去，或者刚保存进去）
        // 这里我们直接取最后 limit 条即可，因为 handleSendPrompt 中是在发送请求前调用此函数，
        // 而 saveMessageToHistory 是在发送请求前调用的，所以最新的这条也会被包含进去。
        // 但是，我们通常希望 history 是"之前的"对话，不包含"当前的" prompt。
        // 所以我们需要过滤掉刚刚添加的那条 user message。
        
        // 实际上，handleSendPrompt 逻辑是：
        // 1. saveMessageToHistory('user', userPrompt)
        // 2. 发送 API 请求
        
        // 所以 session.messages 里已经包含了当前这条 userPrompt。
        // 我们传给后端的 history 应该是"除了当前这条之外的最近 N 条"。
        
        const allMessages = session.messages;
        // 排除最后一条（即当前用户刚刚发送的那条）
        const historyMessages = allMessages.slice(0, -1);
        
        // 取最近的 limit 条
        return historyMessages.slice(-limit).map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    async function handleSendPrompt() {
        const userPrompt = allElements.promptInput.value.trim();
        if (!userPrompt) return alert('请输入你的要求！');

        // 锁定按钮防止重复提交
        allElements.sendPromptBtn.disabled = true;
        
        // 智能勾选：根据用户输入判断需要哪些上下文
        if (isPlotDesignIntent(userPrompt)) {
                // 如果是剧情设计类需求，只勾选当前原文章节剧情
                smartSelectContext('plot-design');
            } else {
                // 常规对话，确保剧情梗概被勾选（如果有的话）
                smartSelectContext('general');
            }
            
            let contextParts = [];
            
            // 添加选中的上下文
            if (allElements.masterCheckboxChapters.checked && chaptersForPreview.length > 0) {
            chaptersForPreview.forEach(chapter => {
                contextParts.push(`【上下文章节：${chapter.title}】\n${chapter.content}`);
            });
        }
        if (allElements.masterCheckboxSummaries.checked && summariesForPreview.length > 0) {
            summariesForPreview.forEach(summary => {
                contextParts.push(`【剧情梗概：${summary.title}】\n${summary.content}`);
            });
        }

        if (allElements.masterCheckboxCurrentChapterPlot.checked && currentChapterPlotForPreview.length > 0) {
            const label = allElements.currentChapterPlotLabel.textContent;
            contextParts.push(`### ${label}\n${currentChapterPlotForPreview.map(item => item.content).join('\n\n')}`);
        }

        const contextString = contextParts.join('\n\n---\n\n');
        
        // 创建用户消息容器
        const userMessageWrapper = document.createElement('div');
        userMessageWrapper.className = 'user-message-wrapper';
        
        // 创建用户气泡
        const userBubble = document.createElement('div');
        userBubble.className = 'bubble user-bubble';
        // 将换行符转换为 <br> 标签，并转义 HTML 特殊字符
        const escapedPrompt = userPrompt
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        userBubble.innerHTML = `<div class="bubble-content">${escapedPrompt}</div>`;
        
        // 创建按钮容器
        const userActions = document.createElement('div');
        userActions.className = 'user-bubble-actions';
        userActions.innerHTML = `<button class="copy-btn-subtle" onclick="copyUserMessage(this)" title="复制">📋</button>`;
        
        // 将气泡和按钮添加到容器
        userMessageWrapper.appendChild(userBubble);
        userMessageWrapper.appendChild(userActions);
        
        allElements.conversationHistory.appendChild(userMessageWrapper);
        
        // 保存用户消息到历史记录
        saveMessageToHistory('user', userPrompt);

        allElements.promptInput.value = '';
        allElements.promptInput.style.height = 'auto';
        if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;

        // 创建AI消息包装器
        const aiMessageWrapper = document.createElement('div');
        aiMessageWrapper.className = 'ai-message-wrapper';
        
        const aiBubble = document.createElement('div');
        aiBubble.className = 'bubble ai-bubble';
        aiBubble.innerHTML = `<div class="ai-content">思考中...</div><div class="ai-actions"></div>`;
        
        aiMessageWrapper.appendChild(aiBubble);
        
        // 创建AI气泡的按钮容器
        const aiActions = document.createElement('div');
        aiActions.className = 'ai-bubble-actions';
        aiMessageWrapper.appendChild(aiActions);
        
        allElements.conversationHistory.appendChild(aiMessageWrapper);

        const selectedContextChapters = allElements.masterCheckboxChapters.checked ? chaptersForPreview : [];
        const contextLabels = {
            chapters: allElements.chaptersLabel.textContent.trim(),
            summaries: allElements.summariesLabel.textContent.trim(),
            currentChapterPlot: allElements.currentChapterPlotLabel.textContent.trim(),
        };

        Logger.context.send({
            promptLength: userPrompt.length,
            contextChapters: selectedContextChapters.length,
            contextSummaries: summariesForPreview.length,
            contextSnapshotLength: contextString.length,
        });

        const apiRequestPayload = {
            prompt: userPrompt,
            contextString,
            contextChapters: selectedContextChapters,
            contextLabels,
            fileId: currentNovel ? currentNovel.file_id : null,
            history: getRecentHistory(6) // 添加历史记录，最近6条
        };

        Logger.api.request('/api/generate-with-analysis', 'POST', {
            fileId: apiRequestPayload.fileId,
            chapterCount: apiRequestPayload.contextChapters.length,
            contextLength: contextString.length,
        });

        try {
            const result = await api.generateWithAnalysis(apiRequestPayload);

            Logger.api.response('/api/generate-with-analysis', 200, {
                isChat: !!result.is_chat,
                isNew: !!result.is_new,
                chapters: Array.isArray(result.chapters) ? result.chapters.length : 0,
            });

            const aiContentDiv = aiBubble.querySelector('.ai-content');
            
            // 判断是否为普通对话
            if (result.is_chat) {
                // 普通对话：只显示内容和复制按钮
                aiContentDiv.innerHTML = marked.parse(result.content);
                aiBubble._rawContent = result.content;
                
                // 保存AI回复到历史记录
                saveMessageToHistory('assistant', result.content);

                // 复制按钮放在气泡外的左下方
                const actionsDiv = aiMessageWrapper.querySelector('.ai-bubble-actions');
                actionsDiv.innerHTML = `
                    <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋</button>
                `;
                
                // 清空内部actions区域
                aiBubble.querySelector('.ai-actions').innerHTML = '';
                
                if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
                appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮
                return; // 提前返回，不执行小说创作相关逻辑
            }
            
            // 小说创作流程（原有逻辑）
            aiContentDiv.innerHTML = marked.parse(result.content);
            aiBubble._rawContent = result.content;
            aiBubble._relatedChapters = chaptersForPreview; 

            // 保存AI回复到历史记录（包含额外信息）
            saveMessageToHistory('assistant', result.content, {
                relatedChapters: chaptersForPreview,
                structuredData: result.chapters // 如果有结构化章节数据
            });

            if (result.is_new && !currentNovel) {
                currentNovel = { file_id: result.file_id, filename: result.filename, chapters: result.chapters };
                selectedPlotBookId = getPlotBookKeyFromNovel(currentNovel);
                chaptersForPreview = [...currentNovel.chapters];
                renderContextPreviewArea();
            } else if (currentNovel && result.chapters && result.chapters.length > currentNovel.chapters.length) {
                currentNovel.chapters = result.chapters;
            }
            
            // 复制按钮放在气泡外的左下方
            const actionsDiv = aiMessageWrapper.querySelector('.ai-bubble-actions');
            actionsDiv.innerHTML = `
                <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋</button>
            `;
            
            // 其他操作按钮保留在气泡内
            const internalActionsDiv = aiBubble.querySelector('.ai-actions');
            internalActionsDiv.innerHTML = `
                <button class="btn btn-sm btn-success" onclick="saveAsDraft(this)">存为定稿</button>
                <button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>
            `;
            
            if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
            appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮

        } catch (error) {
            console.error('Error sending prompt:', error);
            Logger.api.error('/api/generate-with-analysis', error);
            aiBubble.querySelector('.ai-content').textContent = `请求出错: ${error.message}`;
            if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
            appendQuickCommandButton(); // 即使出错也要添加快捷指令按钮
        } finally {
            // 无论成功失败，都恢复按钮状态
            allElements.sendPromptBtn.disabled = false;
            // 聚焦回输入框
            allElements.promptInput.focus();
        }
    }
    
    window.addToPlotContext = function(button) {
        const aiBubble = button.closest('.ai-bubble');
        const rawContent = aiBubble._rawContent;
        if (!rawContent) return alert("错误：找不到原始AI回复内容。");

        const parsedSummaries = parseAiSummaryContent(rawContent);
        const bookInfo = getActivePlotBookInfo();
        
        if (parsedSummaries.length > 0) {
            parsedSummaries.forEach(summary => {
                plotContextSummaries.push({
                    id: Date.now() + Math.random(),
                    title: summary.title,
                    content: summary.content,
                    relatedChapters: aiBubble._relatedChapters || [],
                    bookId: bookInfo.id,
                    bookTitle: bookInfo.title,
                });
            });
            selectedPlotBookId = bookInfo.id;
            savePlotContextToLocalStorage(); // 保存到 localStorage
            alert(`已成功解析并保存 ${parsedSummaries.length} 个新剧情到剧情库！`);
            if (allElements.plotContextModal.classList.contains('active')) {
                renderPlotContextModal();
            }
        } else {
            alert("未能从AI回复中解析出有效的剧情梗概。");
        }
        allElements.plotContextCount.textContent = plotContextSummaries.length;
    }
    
    window.saveAsDraft = function(button) {
        const aiBubble = button.closest('.ai-bubble');
        const rawContent = aiBubble._rawContent;
        if (!rawContent) return alert("错误：找不到原始AI回复内容。");
        
        // 使用与"存为剧情"相同的解析逻辑
        const parsedSummaries = parseAiSummaryContent(rawContent);
        
        if (parsedSummaries.length > 0) {
            const bookInfo = getActivePlotBookInfo();
            parsedSummaries.forEach(summary => {
                const draftId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const draftEntry = {
                    id: draftId,
                    title: summary.title,
                    content: summary.content,
                    createdAt: new Date().toLocaleString(),
                    bookId: bookInfo.id,
                    bookTitle: bookInfo.title,
                };
                myDrafts.push(draftEntry);
                activeDraftId = draftId;
            });
            selectedDraftBookId = bookInfo.id;
            updateDraftCountBadge();
            if (allElements.viewDraftsModal.classList.contains('active')) {
                renderDraftsModal();
            }
            alert(`已成功保存 ${parsedSummaries.length} 个章节定稿！`);
        } else {
            alert("未能从AI回复中解析出有效的章节内容。");
        }
    }
    
    function updateCurrentChapterPlotPreview() {
        updatePreviewList(
            allElements.currentChapterPlotPreviewList,
            currentChapterPlotForPreview,
            allElements.currentChapterPlotPreviewCount,
            'current-chapter-plot',
            '此区域用于存放从章节生成的临时剧情。'
        );
        allElements.masterCheckboxCurrentChapterPlot.disabled = currentChapterPlotForPreview.length === 0;
        updateSelectedContextSummary();
    }

    function updateAllPreviews() {
        renderContextPreviewArea(); // 更新章节和梗概
        updateCurrentChapterPlotPreview(); // 更新当前原文剧情
    }

    // =================================================================
    // 5. 其他辅助函数和事件绑定
    // =================================================================
    
    function openModal(modal) { modal.classList.add('active'); }
    function closeModal(modal) { modal.classList.remove('active'); }
    
    function appendQuickCommandButton() {
        const historyContainer = document.getElementById('conversationHistory');
        if (!historyContainer) return;

        // 移除任何已存在的快捷指令按钮，防止重复
        const existingButton = historyContainer.querySelector('.quick-command-wrapper');
        if (existingButton) {
            existingButton.remove();
        }

        // 创建包裹容器
        const wrapper = document.createElement('div');
        wrapper.className = 'quick-command-wrapper';

        // 创建按钮
        const button = document.createElement('button');
        button.id = 'quick-generate-summary-btn';
        button.className = 'btn';
        button.textContent = '概括选中章节';
        // 应用自定义样式
        button.style.cssText = 'background: linear-gradient(135deg, #4a6baf, #6d8bd7); color: white;';
        
        // 添加事件监听
        button.addEventListener('click', handleGenerateSummary);

        // 放入容器并添加到对话历史
        wrapper.appendChild(button);
        historyContainer.appendChild(wrapper);
        if (allElements.mainContent) allElements.mainContent.scrollTop = allElements.mainContent.scrollHeight;
    }

    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal'))));
    window.addEventListener('click', (e) => { 
        if (e.target.classList.contains('modal')) closeModal(e.target);
    });

    // --- 界面切换逻辑 ---
    // 注意：侧边栏切换功能由 common.js 中的 initSidebarToggle() 处理

    allElements.mainTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchMainTab(tab.dataset.tab);
        });
    });

    // --- 核心交互逻辑 ---
    // 移除旧的监听器（防止重复）并添加新的
    if (allElements.sendPromptBtn) {
        const newSendBtn = allElements.sendPromptBtn.cloneNode(true);
        allElements.sendPromptBtn.parentNode.replaceChild(newSendBtn, allElements.sendPromptBtn);
        allElements.sendPromptBtn = newSendBtn; // 更新引用
        allElements.sendPromptBtn.addEventListener('click', handleSendPrompt);
    }

    if (allElements.promptInput) {
        allElements.promptInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' && e.ctrlKey) { 
                e.preventDefault(); // 防止换行
                handleSendPrompt(); 
            } 
        });
    }
    
    // 自动调节输入框高度
    function autoResizeTextarea() {
        allElements.promptInput.style.height = 'auto';
        allElements.promptInput.style.height = allElements.promptInput.scrollHeight + 'px';
    }
    allElements.promptInput.addEventListener('input', autoResizeTextarea);
    allElements.promptInput.addEventListener('paste', () => setTimeout(autoResizeTextarea, 0));
    
    // 当输入框失去焦点时，恢复到初始高度
    allElements.promptInput.addEventListener('blur', () => {
        allElements.promptInput.style.height = '90px';
    });
    
    // 当输入框获得焦点时，如果有内容则自动调整高度
    allElements.promptInput.addEventListener('focus', () => {
        if (allElements.promptInput.value.trim()) {
            autoResizeTextarea();
        }
    });

    // 移除旧的静态事件监听
    // const quickGenerateSummaryBtn = document.getElementById('quick-generate-summary-btn');
    // if (quickGenerateSummaryBtn) {
    //     quickGenerateSummaryBtn.addEventListener('click', handleGenerateSummary);
    // }

    allElements.selectedContextToggle.addEventListener('click', () => {
        openModal(allElements.additionalContextModal);
    });
    allElements.masterCheckboxChapters.addEventListener('change', updateSelectedContextSummary);
    allElements.masterCheckboxSummaries.addEventListener('change', updateSelectedContextSummary);
    allElements.masterCheckboxCurrentChapterPlot.addEventListener('change', updateSelectedContextSummary);

    // 清空按钮事件监听
    allElements.clearChaptersBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止触发details的展开/收起
        if (chaptersForPreview.length === 0) {
            alert('当前没有已选择的原文章节');
            return;
        }
        if (confirm(`确定要清空所有已选择的原文章节吗？（共 ${chaptersForPreview.length} 项）`)) {
            chaptersForPreview = [];
            renderContextPreviewArea();
            updateSelectedContextSummary();
            saveNovelToLocalStorage(); // 保存到localStorage
            alert('已清空所有原文章节');
        }
    });

    allElements.clearSummariesBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止触发details的展开/收起
        if (summariesForPreview.length === 0) {
            alert('当前没有已选择的剧情梗概');
            return;
        }
        if (confirm(`确定要清空所有已选择的剧情梗概吗？（共 ${summariesForPreview.length} 项）`)) {
            summariesForPreview = [];
            renderContextPreviewArea();
            updateSelectedContextSummary();
            alert('已清空所有剧情梗概');
        }
    });

    allElements.clearCurrentPlotBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止触发details的展开/收起
        if (currentChapterPlotForPreview.length === 0) {
            alert('当前没有已选择的当前原文章节剧情');
            return;
        }
        if (confirm(`确定要清空所有已选择的当前原文章节剧情吗？（共 ${currentChapterPlotForPreview.length} 项）`)) {
            currentChapterPlotForPreview = [];
            renderContextPreviewArea();
            updateSelectedContextSummary();
            alert('已清空所有当前原文章节剧情');
        }
    });

    if (allElements.fabViewDraftsBtn) {
        allElements.fabViewDraftsBtn.addEventListener('click', () => { renderDraftsModal(); openModal(allElements.viewDraftsModal); });
    }
    if (allElements.fabPlotContextBtn) {
        allElements.fabPlotContextBtn.addEventListener('click', () => { renderPlotContextModal(); openModal(allElements.plotContextModal); });
    }
    
    // 【新增】全选/取消全选章节
    if (allElements.selectAllChaptersButton) {
        allElements.selectAllChaptersButton.addEventListener('click', () => {
            const checkboxes = allElements.chapterListForSelection.querySelectorAll('.chapter-select-checkbox');
            const isAllSelected = Array.from(checkboxes).every(checkbox => checkbox.checked);
            checkboxes.forEach(checkbox => {
                checkbox.checked = !isAllSelected;
            });
            allElements.selectAllChaptersButton.textContent = !isAllSelected ? '取消全选' : '全选';
        });
    }

    // 【新增】字体设置逻辑 (重构)
    const fontClasses = ['', 'font-serif', 'font-mono', 'font-cursive'];
    const sizeClasses = ['text-sm', 'text-md', 'text-lg', 'text-xl'];
    const sizeNames = ['小', '标准', '大', '特大'];
    
    let currentFontIndex = 0;
    let currentSizeIndex = 1; // 默认为标准 (text-md)

    // 初始化加载保存的设置
    const savedFontIndex = localStorage.getItem('novel_assist_font_preference');
    if (savedFontIndex !== null) {
        currentFontIndex = parseInt(savedFontIndex, 10);
        if (fontClasses[currentFontIndex]) {
            document.body.classList.add(fontClasses[currentFontIndex]);
        }
    }
    
    const savedSizeIndex = localStorage.getItem('novel_assist_font_size_preference');
    if (savedSizeIndex !== null) {
        currentSizeIndex = parseInt(savedSizeIndex, 10);
    }
    // 应用初始字体大小
    if (sizeClasses[currentSizeIndex]) {
        document.body.classList.add(sizeClasses[currentSizeIndex]);
    }

    // DOM 元素引用
    const fontSettingsMenu = document.getElementById('fontSettingsMenu');
    const fontOptionBtns = document.querySelectorAll('.font-option-btn');
    const decreaseFontSizeBtn = document.getElementById('decreaseFontSizeBtn');
    const increaseFontSizeBtn = document.getElementById('increaseFontSizeBtn');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');

    // 更新UI状态
    function updateFontSettingsUI() {
        // 更新字体按钮激活状态
        fontOptionBtns.forEach(btn => {
            if (parseInt(btn.dataset.font) === currentFontIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 更新字体大小显示
        if (fontSizeDisplay) {
            fontSizeDisplay.textContent = sizeNames[currentSizeIndex];
        }
        
        // 更新大小按钮禁用状态
        if (decreaseFontSizeBtn) decreaseFontSizeBtn.disabled = currentSizeIndex <= 0;
        if (increaseFontSizeBtn) increaseFontSizeBtn.disabled = currentSizeIndex >= sizeClasses.length - 1;
    }

    // 切换菜单显示
    if (allElements.fabChangeFontBtn) {
        allElements.fabChangeFontBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fontSettingsMenu.classList.toggle('active');
            updateFontSettingsUI();
        });
    }

    // 点击外部关闭菜单
    window.addEventListener('click', (e) => {
        if (fontSettingsMenu && fontSettingsMenu.classList.contains('active')) {
            if (!fontSettingsMenu.contains(e.target) && !allElements.fabChangeFontBtn.contains(e.target)) {
                fontSettingsMenu.classList.remove('active');
            }
        }
    });
    
    // 阻止菜单内部点击冒泡
    if (fontSettingsMenu) {
        fontSettingsMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    // 字体选择事件
    fontOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newIndex = parseInt(btn.dataset.font);
            if (newIndex === currentFontIndex) return;

            // 移除旧字体
            if (fontClasses[currentFontIndex]) {
                document.body.classList.remove(fontClasses[currentFontIndex]);
            }
            
            currentFontIndex = newIndex;
            
            // 添加新字体
            if (fontClasses[currentFontIndex]) {
                document.body.classList.add(fontClasses[currentFontIndex]);
            }
            
            localStorage.setItem('novel_assist_font_preference', currentFontIndex);
            updateFontSettingsUI();
        });
    });

    // 字体大小调整事件
    if (decreaseFontSizeBtn) {
        decreaseFontSizeBtn.addEventListener('click', () => {
            if (currentSizeIndex > 0) {
                document.body.classList.remove(sizeClasses[currentSizeIndex]);
                currentSizeIndex--;
                document.body.classList.add(sizeClasses[currentSizeIndex]);
                localStorage.setItem('novel_assist_font_size_preference', currentSizeIndex);
                updateFontSettingsUI();
            }
        });
    }

    if (increaseFontSizeBtn) {
        increaseFontSizeBtn.addEventListener('click', () => {
            if (currentSizeIndex < sizeClasses.length - 1) {
                document.body.classList.remove(sizeClasses[currentSizeIndex]);
                currentSizeIndex++;
                document.body.classList.add(sizeClasses[currentSizeIndex]);
                localStorage.setItem('novel_assist_font_size_preference', currentSizeIndex);
                updateFontSettingsUI();
            }
        });
    }

    // 【修改】点击“加载小说”按钮的逻辑
    if (allElements.fabSelectContextBtn) {
        allElements.fabSelectContextBtn.addEventListener('click', () => {
            if(currentNovel) {
                // 如果已有小说，直接显示章节选择界面
                showChapterSelectionView();
            } else {
                // 否则，显示上传界面
                showUploadView();
            }
            openModal(allElements.selectSourceModal);
        });
    }

    // --- 加载小说模态框内部逻辑 ---
    allElements.uploadArea.addEventListener('click', () => allElements.fileInput.click());
    allElements.fileInput.addEventListener('change', () => { if (allElements.fileInput.files.length > 0) { allElements.fileNameDisplay.textContent = `已选择: ${allElements.fileInput.files[0].name}`; allElements.uploadAndParseBtn.disabled = false; } });
    allElements.changeNovelBtn.addEventListener('click', () => {
        // 清除当前小说数据和 localStorage
        currentNovel = null;
        chaptersForPreview = [];
        summariesForPreview = [];
        clearNovelFromLocalStorage();
        
        // 显示上传界面
        showUploadView();
    });


    function showUploadView() {
        allElements.uploadView.style.display = 'block';
        allElements.chapterSelectionView.style.display = 'none';
        allElements.changeNovelBtn.style.display = 'none';
        allElements.confirmChapterSelectionBtn.style.display = 'none';
        allElements.fileInput.value = ''; // 清空已选文件
        allElements.fileNameDisplay.textContent = '';
        allElements.uploadAndParseBtn.disabled = true;
    }

    // 【新增】显示章节选择界面的函数
    function showChapterSelectionView() {
        allElements.uploadView.style.display = 'none';
        allElements.chapterSelectionView.style.display = 'block';
        allElements.changeNovelBtn.style.display = 'block';
        allElements.confirmChapterSelectionBtn.style.display = 'block';
        allElements.loadedFileName.textContent = currentNovel.filename;
        
        const container = allElements.chapterListForSelection;
        container.innerHTML = '';
        allElements.selectAllChaptersButton.textContent = '全选'; // 重置按钮文字

        const currentSelectedTitles = chaptersForPreview.map(c => c.title);

        currentNovel.chapters.forEach((chapter, index) => {
            const isChecked = currentSelectedTitles.includes(chapter.title);
            const listItem = document.createElement('div');
            listItem.style.padding = '5px';
            listItem.innerHTML = `
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="chapter-select-checkbox" value="${index}" ${isChecked ? 'checked' : ''} style="margin-right: 10px; transform: scale(1.2);">
                    <span>${chapter.title}</span>
                </label>
            `;
            container.appendChild(listItem);
        });
        
        // 检查是否所有项都被选中
        const allCheckboxes = container.querySelectorAll('.chapter-select-checkbox');
        const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
        allElements.selectAllChaptersButton.textContent = allChecked ? '取消全选' : '全选';
    }

    // 【修改】上传并解析按钮的逻辑
    allElements.uploadAndParseBtn.addEventListener('click', async () => {
        const file = allElements.fileInput.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        allElements.uploadAndParseBtn.textContent = '解析中...';
        allElements.uploadAndParseBtn.disabled = true;

        Logger.api.request('/api/upload', 'POST', { filename: file.name, size: file.size });

        try {
            const result = await api.uploadNovel(formData);

            Logger.api.response('/api/upload', 200, { chapters: result.chapters?.length || 0 });

            // 保存小说数据，但先不加载到上下文
            currentNovel = { file_id: result.file_id, filename: result.filename, chapters: result.chapters };
            selectedPlotBookId = getPlotBookKeyFromNovel(currentNovel);
            // 重置与当前小说相关的上下文选择
            summariesForPreview = [];
            currentChapterPlotForPreview = [];
            chaptersForPreview = []; // 清空，等待用户选择
            
            // 保存到 localStorage（虽然此时 chaptersForPreview 为空，但保存小说元数据）
            saveNovelToLocalStorage();
            
            // 显示章节选择界面
            showChapterSelectionView();
        } catch (error) {
            Logger.api.error('/api/upload', error);
            alert(`上传失败: ${error.message}`);
            showUploadView(); // 失败后返回上传界面
        } finally {
            allElements.uploadAndParseBtn.textContent = '上传并解析';
            // 按钮的 disabled 状态由 fileInput 的 change 事件控制
        }
    });

    // 【新增】确认章节选择按钮的逻辑
    allElements.confirmChapterSelectionBtn.addEventListener('click', () => {
        const selectedCheckboxes = allElements.chapterListForSelection.querySelectorAll('.chapter-select-checkbox:checked');
        const selectedIndices = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
        
        // 根据选中的索引更新上下文预览数组
        chaptersForPreview = selectedIndices.map(index => currentNovel.chapters[index]);
        
        // 保存到 localStorage
        saveNovelToLocalStorage();
        
        // 重新渲染主界面的上下文预览区域
        renderContextPreviewArea();
        
        // 关闭模态框
        closeModal(allElements.selectSourceModal);
    });

    function renderPlotContextModal() {
        ensureSelectedPlotBookExists();
        renderPlotBookList();
        renderPlotList();
        allElements.plotPreviewArea.innerHTML = '<h3>请从左侧选择剧情以预览</h3><p style="color: #666;">...</p>';
    }

    function renderPlotBookList() {
        const bookListEl = allElements.plotBookList;
        if (!bookListEl) return;
        const books = getPlotBooks();
        bookListEl.innerHTML = '';

        if (books.length === 0) {
            bookListEl.innerHTML = '<li class="placeholder">暂无剧情，请先保存。</li>';
            allElements.selectAllPlotsButton.disabled = true;
            return;
        }

        allElements.selectAllPlotsButton.disabled = false;
        books.forEach(book => {
            const li = document.createElement('li');
            if (book.id === selectedPlotBookId) {
                li.classList.add('active');
            }
            const titleSpan = document.createElement('span');
            titleSpan.className = 'book-title';
            titleSpan.textContent = book.title;
            const countSpan = document.createElement('span');
            countSpan.className = 'book-count';
            countSpan.textContent = `${book.count} 条`;
            li.appendChild(titleSpan);
            li.appendChild(countSpan);
            li.addEventListener('click', () => {
                selectedPlotBookId = book.id;
                renderPlotContextModal();
            });
            bookListEl.appendChild(li);
        });

    }

    function renderPlotList() {
        const container = allElements.plotListContainer;
        container.innerHTML = '';
        allElements.selectAllPlotsButton.textContent = '全选';
        const plots = getPlotsByBook(selectedPlotBookId);
        if (allElements.clearPlotSelectionsBtn) {
            allElements.clearPlotSelectionsBtn.disabled = plots.length === 0;
        }

        if (plots.length === 0) {
            container.innerHTML = '<li style="color: #999; text-align: center; padding: 20px;">该书暂未保存剧情</li>';
            allElements.selectAllPlotsButton.disabled = true;
            return;
        }

        allElements.selectAllPlotsButton.disabled = false;

        plots.forEach(summary => {
            const li = document.createElement('li');
            const isSelected = summariesForPreview.some(s => s.id === summary.id) || currentChapterPlotForPreview.some(s => s.id === summary.id);
            li.innerHTML = `
                <input type="checkbox" class="plot-select-checkbox" value="${summary.id}" ${isSelected ? 'checked' : ''} style="margin-right: 10px;">
                <span class="plot-title">${summary.title}</span>
            `;
            li.querySelector('.plot-title').addEventListener('click', () => {
                container.querySelectorAll('li').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
                renderPlotPreview(summary);
            });
            container.appendChild(li);
        });
    }
    function renderPlotPreview(summary) {
        allElements.plotPreviewArea.innerHTML = `<h3>${summary.title}</h3><div style="white-space: pre-wrap">${summary.content}</div>`;
    }

    if (allElements.selectAllPlotsButton) {
        allElements.selectAllPlotsButton.addEventListener('click', () => {
            if (allElements.selectAllPlotsButton.disabled) return;
            const checkboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox');
            const isAllSelected = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(checkbox => {
                checkbox.checked = !isAllSelected;
            });
            allElements.selectAllPlotsButton.textContent = !isAllSelected ? '取消全选' : '全选';
        });
    }

    if (allElements.clearPlotSelectionsBtn) {
        allElements.clearPlotSelectionsBtn.addEventListener('click', () => {
            const checkedBoxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('请先勾选需要清空的剧情');
                return;
            }

            if (!confirm(`确定要删除选中的 ${checkedBoxes.length} 条剧情吗？此操作不可撤销。`)) {
                return;
            }

            const selectedIds = new Set(Array.from(checkedBoxes).map(cb => String(cb.value)));
            const beforeTotal = plotContextSummaries.length;
            plotContextSummaries = plotContextSummaries.filter(summary => !selectedIds.has(String(summary.id)));
            if (plotContextSummaries.length !== beforeTotal) {
                savePlotContextToLocalStorage();
                allElements.plotContextCount.textContent = plotContextSummaries.length;
            }

            const beforeSummaries = summariesForPreview.length;
            summariesForPreview = summariesForPreview.filter(item => !selectedIds.has(String(item.id)));
            const beforeCurrentPlots = currentChapterPlotForPreview.length;
            currentChapterPlotForPreview = currentChapterPlotForPreview.filter(item => !selectedIds.has(String(item.id)));
            if (beforeSummaries !== summariesForPreview.length || beforeCurrentPlots !== currentChapterPlotForPreview.length) {
                renderContextPreviewArea();
                updateCurrentChapterPlotPreview();
            } else {
                updateSelectedContextSummary();
            }

            checkedBoxes.forEach(cb => { cb.checked = false; });
            allElements.selectAllPlotsButton.textContent = '全选';

            ensureSelectedPlotBookExists();
            renderPlotBookList();
            renderPlotList();
            allElements.plotPreviewArea.innerHTML = '<h3>请从左侧选择剧情以预览</h3><p style="color: #666;">...</p>';
            alert('已清空所选剧情');
        });
    }

    if (allElements.selectAllDraftsButton) {
        allElements.selectAllDraftsButton.addEventListener('click', () => {
            if (allElements.selectAllDraftsButton.disabled) return;
            const drafts = getDraftsByBook(selectedDraftBookId);
            if (drafts.length === 0) return;
            const shouldSelectAll = drafts.some(draft => !draftSelectionState.has(String(draft.id)));
            drafts.forEach(draft => {
                const draftId = String(draft.id);
                if (shouldSelectAll) {
                    draftSelectionState.add(draftId);
                } else {
                    draftSelectionState.delete(draftId);
                }
            });
            renderDraftList();
        });
    }

    if (allElements.clearDraftSelectionsBtn) {
        allElements.clearDraftSelectionsBtn.addEventListener('click', () => {
            if (allElements.clearDraftSelectionsBtn.disabled) return;
            const checkedBoxes = allElements.draftsListContainer
                ? allElements.draftsListContainer.querySelectorAll('.draft-select-checkbox:checked')
                : [];
            if (!checkedBoxes || checkedBoxes.length === 0) {
                alert('请先勾选需要清空的定稿');
                return;
            }

            if (!confirm(`确定要删除选中的 ${checkedBoxes.length} 条定稿吗？此操作不可撤销。`)) {
                return;
            }

            const selectedIds = new Set(Array.from(checkedBoxes).map(cb => cb.value));
            if (selectedIds.size === 0) {
                return;
            }

            myDrafts = myDrafts.filter(draft => !selectedIds.has(String(draft.id)));
            selectedIds.forEach(id => draftSelectionState.delete(id));
            pruneDraftSelectionState();
            updateDraftCountBadge();
            renderDraftsModal();
        });
    }

    allElements.addSelectedPlotsBtn.addEventListener('click', () => {
        const selectedCheckboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        if (selectedIds.length === 0) {
            alert('请至少选中一个剧情再添加到梗概');
            return;
        }
        
        summariesForPreview = plotContextSummaries.filter(summary => selectedIds.includes(String(summary.id)));
        
        renderContextPreviewArea();
        closeModal(allElements.plotContextModal);
    });

    // 新增：为"添加到当前原文剧情"按钮添加事件监听
    if (allElements.addSelectedPlotsToCurrentChapterPlotBtn) {
        allElements.addSelectedPlotsToCurrentChapterPlotBtn.addEventListener('click', () => {
            const selectedCheckboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox:checked');
            if (selectedCheckboxes.length === 0) {
                alert('请至少选中一个剧情');
                return;
            }

            const selectedIds = Array.from(selectedCheckboxes).map(cb => String(cb.value));
            currentChapterPlotForPreview = plotContextSummaries.filter(summary => selectedIds.includes(String(summary.id)));

            updateCurrentChapterPlotPreview();
            
            // 自动勾选"当前原文章节剧情"复选框
            if (currentChapterPlotForPreview.length > 0) {
                allElements.masterCheckboxCurrentChapterPlot.checked = true;
                allElements.masterCheckboxCurrentChapterPlot.disabled = false;
                // 触发change事件以更新上下文摘要
                updateSelectedContextSummary();
            }
            
            closeModal(allElements.plotContextModal);
        });
    }

    function updateDraftCountBadge() {
        allElements.draftsCountSpan.textContent = myDrafts.length;
    }

    function pruneDraftSelectionState() {
        const validIds = new Set(myDrafts.map(draft => String(draft.id)));
        draftSelectionState.forEach(id => {
            if (!validIds.has(id)) {
                draftSelectionState.delete(id);
            }
        });
        if (activeDraftId && !validIds.has(activeDraftId)) {
            activeDraftId = null;
        }
    }

    function getDraftsByBook(bookId) {
        const key = bookId || DEFAULT_PLOT_BOOK_KEY;
        return myDrafts.filter(draft => (draft.bookId || DEFAULT_PLOT_BOOK_KEY) === key);
    }

    function getDraftBooks() {
        const bookMap = new Map();
        myDrafts.forEach(draft => {
            const key = draft.bookId || DEFAULT_PLOT_BOOK_KEY;
            if (!bookMap.has(key)) {
                bookMap.set(key, {
                    id: key,
                    title: draft.bookTitle || DEFAULT_PLOT_BOOK_TITLE,
                    count: 0
                });
            }
            bookMap.get(key).count += 1;
        });
        return Array.from(bookMap.values()).sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    }

    function ensureSelectedDraftBookExists() {
        const books = getDraftBooks();
        if (books.length === 0) {
            selectedDraftBookId = DEFAULT_PLOT_BOOK_KEY;
            return;
        }
        if (!books.some(book => book.id === selectedDraftBookId)) {
            const novelKey = currentNovel ? getPlotBookKeyFromNovel(currentNovel) : null;
            if (novelKey && books.some(book => book.id === novelKey)) {
                selectedDraftBookId = novelKey;
            } else {
                selectedDraftBookId = books[0].id;
            }
        }
    }

    function renderDraftsModal() {
        pruneDraftSelectionState();
        ensureSelectedDraftBookExists();
        renderDraftBookList();

        const draftsInBook = getDraftsByBook(selectedDraftBookId);

        if (draftsInBook.length === 0) {
            renderDraftList(draftsInBook);
            activeDraftId = null;
            resetDraftPreviewArea();
            return;
        }

        if (!activeDraftId || !draftsInBook.some(draft => String(draft.id) === activeDraftId)) {
            activeDraftId = String(draftsInBook[0].id);
        }

        renderDraftList(draftsInBook);

        const activeDraft = draftsInBook.find(draft => String(draft.id) === activeDraftId) || draftsInBook[0];
        renderDraftPreview(activeDraft);
    }

    function renderDraftBookList() {
        const bookListEl = allElements.draftsBookList;
        if (!bookListEl) return;
        const books = getDraftBooks();
        bookListEl.innerHTML = '';

        if (books.length === 0) {
            bookListEl.innerHTML = '<li class="placeholder">暂无定稿，请先保存。</li>';
            if (allElements.selectAllDraftsButton) {
                allElements.selectAllDraftsButton.disabled = true;
                allElements.selectAllDraftsButton.textContent = '全选';
            }
            if (allElements.clearDraftSelectionsBtn) {
                allElements.clearDraftSelectionsBtn.disabled = true;
            }
            return;
        }

        if (allElements.selectAllDraftsButton) {
            allElements.selectAllDraftsButton.disabled = false;
        }
        if (allElements.clearDraftSelectionsBtn) {
            allElements.clearDraftSelectionsBtn.disabled = false;
        }

        books.forEach(book => {
            const li = document.createElement('li');
            if (book.id === selectedDraftBookId) {
                li.classList.add('active');
            }
            const titleSpan = document.createElement('span');
            titleSpan.className = 'book-title';
            titleSpan.textContent = book.title;
            const countSpan = document.createElement('span');
            countSpan.className = 'book-count';
            countSpan.textContent = `${book.count} 条`;
            li.appendChild(titleSpan);
            li.appendChild(countSpan);
            li.addEventListener('click', () => {
                selectedDraftBookId = book.id;
                renderDraftsModal();
            });
            bookListEl.appendChild(li);
        });
    }

    function renderDraftList(draftsOverride) {
        const container = allElements.draftsListContainer;
        if (!container) return [];
        container.innerHTML = '';
        const drafts = Array.isArray(draftsOverride) ? draftsOverride : getDraftsByBook(selectedDraftBookId);

        if (drafts.length === 0) {
            container.innerHTML = '<li style="color: #999; text-align: center; padding: 20px;">该书暂未保存定稿</li>';
            if (allElements.selectAllDraftsButton) {
                allElements.selectAllDraftsButton.disabled = true;
                allElements.selectAllDraftsButton.textContent = '全选';
            }
            if (allElements.clearDraftSelectionsBtn) {
                allElements.clearDraftSelectionsBtn.disabled = true;
            }
            return;
        }

        if (allElements.selectAllDraftsButton) {
            allElements.selectAllDraftsButton.disabled = false;
        }
        if (allElements.clearDraftSelectionsBtn) {
            allElements.clearDraftSelectionsBtn.disabled = false;
        }

        drafts.forEach(draft => {
            const draftId = String(draft.id);
            const li = document.createElement('li');
            if (draftId === activeDraftId) {
                li.classList.add('active');
            }
            li.innerHTML = `
                <input type="checkbox" class="draft-select-checkbox" value="${draftId}" ${draftSelectionState.has(draftId) ? 'checked' : ''} style="margin-right: 10px;">
                <span class="draft-title">${draft.title}</span>
            `;
            const checkbox = li.querySelector('.draft-select-checkbox');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    draftSelectionState.add(draftId);
                } else {
                    draftSelectionState.delete(draftId);
                }
                updateDraftSelectAllButtonState(drafts);
            });

            li.addEventListener('click', (event) => {
                if (event.target && event.target.classList.contains('draft-select-checkbox')) {
                    return;
                }
                const siblings = container.querySelectorAll('li');
                siblings.forEach(item => item.classList.remove('active'));
                li.classList.add('active');
                renderDraftPreview(draft);
            });

            container.appendChild(li);
        });

        updateDraftSelectAllButtonState(drafts);
        return drafts;
    }

    function updateDraftSelectAllButtonState(drafts) {
        if (!allElements.selectAllDraftsButton) return;
        if (drafts.length === 0) {
            allElements.selectAllDraftsButton.textContent = '全选';
            return;
        }
        const allSelected = drafts.every(draft => draftSelectionState.has(String(draft.id)));
        allElements.selectAllDraftsButton.textContent = allSelected ? '取消全选' : '全选';
    }

    function resetDraftPreviewArea() {
        allElements.draftsPreviewArea.innerHTML = '<h3>请从左侧选择章节以预览</h3><p style="color: #666;">...</p>';
    }

    function renderDraftPreview(draft) {
        if (!draft) {
            resetDraftPreviewArea();
            return;
        }
        activeDraftId = String(draft.id);
        allElements.draftsPreviewArea.innerHTML = `
            <h3>${draft.title}</h3>
            <div style="color: #888; font-size: 0.85em; margin-bottom: 10px;">
                ${draft.bookTitle || DEFAULT_PLOT_BOOK_TITLE} · 保存于 ${draft.createdAt || '未知时间'}
            </div>
            <div style="white-space: pre-wrap;">${draft.content}</div>
        `;
    }
    allElements.closeDraftsModalBtn.addEventListener('click', () => closeModal(allElements.viewDraftsModal));

    window.copyToClipboard = function(button) { 
        // 现在按钮在 ai-message-wrapper 内，需要找到同级的 ai-bubble
        const wrapper = button.closest('.ai-message-wrapper');
        const bubble = wrapper.querySelector('.ai-bubble');
        
        let content = '';
        // 优先使用保存的原始文本（如果有）
        if (bubble && bubble._rawContent) {
            content = bubble._rawContent;
        } else {
            // 否则尝试获取显示文本
            const contentDiv = wrapper.querySelector('.ai-content');
            content = contentDiv ? contentDiv.innerText : '';
        }

        if (!content) {
            return alert('没有可复制的内容');
        }

        navigator.clipboard.writeText(content).then(() => { 
            alert('内容已复制到剪贴板！'); 
        }, () => { 
            alert('复制失败！'); 
        }); 
    }
    
    window.copyUserMessage = function(button) { 
        const wrapper = button.closest('.user-message-wrapper');
        const content = wrapper.querySelector('.bubble-content').innerText; 
        navigator.clipboard.writeText(content).then(() => { 
            alert('内容已复制到剪贴板！'); 
        }, () => { 
            alert('复制失败！'); 
        }); 
    }
    
    // =================================================================
    // =================================================================
    // 6. 初始化
    // =================================================================
    
    // 尝试从 localStorage 恢复剧情库
    loadPlotContextFromLocalStorage();
    
    // 尝试从 localStorage 恢复上次加载的小说
    const hasRestoredNovel = loadNovelFromLocalStorage();
    if (hasRestoredNovel) {
        console.log('已恢复上次加载的小说:', currentNovel.filename);
        selectedPlotBookId = getPlotBookKeyFromNovel(currentNovel);
        ensureSelectedPlotBookExists();
        // 显示恢复提示
        const restoreBubble = document.createElement('div');
        restoreBubble.className = 'bubble ai-bubble';
        restoreBubble.style.backgroundColor = '#e8f5e9';
        restoreBubble.style.borderLeft = '4px solid #4caf50';
        restoreBubble.innerHTML = `<p>✅ 已自动恢复上次加载的小说：<strong>${currentNovel.filename}</strong>（${chaptersForPreview.length} 个章节已选中）</p>`;
        allElements.conversationHistory.insertBefore(restoreBubble, allElements.conversationHistory.firstChild);
    }
    
    updateDraftCountBadge();
    renderContextPreviewArea();
    switchMainTab('plot-design'); // 默认显示剧情设计标签页
    appendQuickCommandButton(); // 初始加载时添加按钮

    // 加载持久化的标签
    loadContextLabels();

    // 为可编辑标签添加事件监听
    if (allElements.chaptersLabel) allElements.chaptersLabel.addEventListener('blur', saveContextLabels);
    if (allElements.summariesLabel) allElements.summariesLabel.addEventListener('blur', saveContextLabels);
    if (allElements.currentChapterPlotLabel) allElements.currentChapterPlotLabel.addEventListener('blur', saveContextLabels);

    // 初始化历史系统
    initHistorySystem();
});
