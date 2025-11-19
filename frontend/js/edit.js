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
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
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
        sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
        sidebarMenuItems: document.querySelectorAll('.sidebar-menu-item'),
        mainTabs: document.querySelectorAll('.main-tabs .tab-btn'),
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
    };

    // =================================================================
    // 3. 文本标签与 localStorage 持久化管理
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
        userBubble.innerHTML = `<p>[动作] 为 ${selectedChapters.length} 个选中章节生成剧情概括</p>`;
        allElements.conversationHistory.appendChild(userBubble);
        allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;

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
            const summaryMarkdown = (() => {
                if (result.summary && result.summary.trim()) {
                    return result.summary;
                }
                if (Array.isArray(result.summaries) && result.summaries.length > 0) {
                    return result.summaries
                        .map(item => `## ${item.title || '章节概括'}\n${item.summary || ''}`)
                        .join('\n\n');
                }
                return '没有生成剧情概括。';
            })();

            Logger.chapter.summaryResult(summaryMarkdown);

            // 4. 显示结果
            aiContentDiv.innerHTML = marked.parse(summaryMarkdown);
            aiBubble._rawContent = summaryMarkdown; // 保存原始文本，用于"存为剧情"
            aiBubble._relatedChapters = selectedChapters; // 关联章节
            aiBubble._chapterSummaries = Array.isArray(result.summaries) ? result.summaries : [];
            if (typeof renderChapterSummaryDetails === 'function') {
                renderChapterSummaryDetails(aiBubble, aiBubble._chapterSummaries);
            }

            const actionsDiv = aiMessageWrapper.querySelector('.ai-bubble-actions');
            actionsDiv.innerHTML = `
                <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋 复制</button>
            `;
            
            const internalActionsDiv = aiBubble.querySelector('.ai-actions');
            internalActionsDiv.innerHTML = `
                <button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>
            `;
            
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮

        } catch (error) {
            console.error('Error generating summary:', error);
            Logger.api.error('/api/summarize-chapters', error);
            aiBubble.querySelector('.ai-content').textContent = '生成剧情概括时出错，请检查后台服务。';
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // 即使出错也要添加快捷指令按钮
        }
    }


    async function handleSendPrompt() {
        const userPrompt = allElements.promptInput.value.trim();
        if (!userPrompt) return alert('请输入你的要求！');
        
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
        userActions.innerHTML = `<button class="copy-btn-subtle" onclick="copyUserMessage(this)" title="复制">📋 复制</button>`;
        
        // 将气泡和按钮添加到容器
        userMessageWrapper.appendChild(userBubble);
        userMessageWrapper.appendChild(userActions);
        
        allElements.conversationHistory.appendChild(userMessageWrapper);
        allElements.promptInput.value = '';
        allElements.promptInput.style.height = 'auto';
        allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;

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
                
                // 复制按钮放在气泡外的左下方
                const actionsDiv = aiMessageWrapper.querySelector('.ai-bubble-actions');
                actionsDiv.innerHTML = `
                    <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋 复制</button>
                `;
                
                // 清空内部actions区域
                aiBubble.querySelector('.ai-actions').innerHTML = '';
                
                allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
                appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮
                return; // 提前返回，不执行小说创作相关逻辑
            }
            
            // 小说创作流程（原有逻辑）
            aiContentDiv.innerHTML = marked.parse(result.content);
            aiBubble._rawContent = result.content;
            aiBubble._relatedChapters = chaptersForPreview; 

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
                <button class="copy-btn-subtle copy-btn-large" onclick="copyToClipboard(this)" title="复制内容">📋 复制</button>
            `;
            
            // 其他操作按钮保留在气泡内
            const internalActionsDiv = aiBubble.querySelector('.ai-actions');
            internalActionsDiv.innerHTML = `
                <button class="btn btn-sm btn-success" onclick="saveAsDraft(this)">存为定稿</button>
                <button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>
            `;
            
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮

        } catch (error) {
            console.error('Error sending prompt:', error);
            Logger.api.error('/api/generate-with-analysis', error);
            aiBubble.querySelector('.ai-content').textContent = `请求出错: ${error.message}`;
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // 即使出错也要添加快捷指令按钮
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
        // 移除任何已存在的快捷指令按钮，防止重复
        const existingButton = document.querySelector('.quick-command-wrapper');
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
        allElements.conversationHistory.appendChild(wrapper);
        allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
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
    allElements.sendPromptBtn.addEventListener('click', handleSendPrompt);
    allElements.promptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey) { handleSendPrompt(); } });
    
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

    allElements.fabViewDraftsBtn.addEventListener('click', () => { renderDraftsModal(); openModal(allElements.viewDraftsModal); });
    allElements.fabPlotContextBtn.addEventListener('click', () => { renderPlotContextModal(); openModal(allElements.plotContextModal); });
    
    // 【新增】全选/取消全选章节
    allElements.selectAllChaptersButton.addEventListener('click', () => {
        const checkboxes = allElements.chapterListForSelection.querySelectorAll('.chapter-select-checkbox');
        const isAllSelected = Array.from(checkboxes).every(checkbox => checkbox.checked);
        checkboxes.forEach(checkbox => {
            checkbox.checked = !isAllSelected;
        });
        allElements.selectAllChaptersButton.textContent = !isAllSelected ? '取消全选' : '全选';
    });

    // 【修改】点击“加载小说”按钮的逻辑
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
        allElements.plotPreviewArea.innerHTML = `<h3>${summary.title}</h3><div style="white-space: pre-wrap; margin-top: 10px;">${summary.content}</div>`;
    }
    allElements.selectAllPlotsButton.addEventListener('click', () => {
        if (allElements.selectAllPlotsButton.disabled) return;
        const checkboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox');
        const isAllSelected = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(checkbox => {
            checkbox.checked = !isAllSelected;
        });
        allElements.selectAllPlotsButton.textContent = !isAllSelected ? '取消全选' : '全选';
    });

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
        const content = wrapper.querySelector('.ai-content').innerText; 
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
    allElements.chaptersLabel.addEventListener('blur', saveContextLabels);
    allElements.summariesLabel.addEventListener('blur', saveContextLabels);
    allElements.currentChapterPlotLabel.addEventListener('blur', saveContextLabels);
});
