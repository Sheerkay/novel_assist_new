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

    // =================================================================
    // 2. DOM元素引用
    // =================================================================
    const allElements = {
        pageBody: document.getElementById('pageBody'),
        sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
        sidebarMenuItems: document.querySelectorAll('.sidebar-menu-item'),
        mainTabs: document.querySelectorAll('.main-tabs .tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        contextSelectionArea: document.getElementById('context-selection-area'),
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
        cancelSourceSelectBtn: document.getElementById('cancelSourceSelectBtn'),
        plotListContainer: document.getElementById('plotListContainer'),
    plotPreviewArea: document.getElementById('plotPreviewArea'),
        selectAllPlotsButton: document.getElementById('selectAllPlotsButton'),
        addSelectedPlotsBtn: document.getElementById('addSelectedPlotsBtn'),
        addSelectedPlotsToCurrentChapterPlotBtn: document.getElementById('addSelectedPlotsToCurrentChapterPlotBtn'), // 新增按钮引用
        draftsListContainer: document.getElementById('draftsListContainer'),
        draftsPreviewArea: document.getElementById('draftsPreviewArea'),
        closeDraftsModalBtn: document.getElementById('closeDraftsModalBtn'),
        selectedContextToggle: document.getElementById('selected-context-toggle'),
        selectedContextDetails: document.getElementById('selected-context-details'),
        chaptersLabel: document.getElementById('chapters-label'),
        summariesLabel: document.getElementById('summaries-label'),
        currentChapterPlotLabel: document.getElementById('current-chapter-plot-label'),
        masterCheckboxCurrentChapterPlot: document.getElementById('master-checkbox-current-chapter-plot'),
        currentChapterPlotPreviewList: document.getElementById('current-chapter-plot-preview-list'),
        currentChapterPlotPreviewCount: document.getElementById('current-chapter-plot-preview-count'),
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
        const detailsContainer = allElements.selectedContextDetails;
        detailsContainer.innerHTML = '';
        let totalCount = 0;
        let detailsHtml = '';

        if (allElements.masterCheckboxChapters.checked && chaptersForPreview.length > 0) {
            totalCount += chaptersForPreview.length;
            detailsHtml += '<h5 style="margin-top: 5px; margin-bottom: 5px;">📚 原文章节:</h5><ul style="list-style-position: inside; padding-left: 5px; margin:0;">';
            chaptersForPreview.forEach(chapter => {
                detailsHtml += `<li style="margin-bottom: 3px;">${chapter.title}</li>`;
            });
            detailsHtml += '</ul>';
        }

        if (allElements.masterCheckboxSummaries.checked && summariesForPreview.length > 0) {
            totalCount += summariesForPreview.length;
            detailsHtml += '<h5 style="margin-top: 10px; margin-bottom: 5px;">💡 剧情梗概:</h5><ul style="list-style-position: inside; padding-left: 5px; margin:0;">';
            summariesForPreview.forEach(summary => {
                detailsHtml += `<li style="margin-bottom: 3px;">${summary.title}</li>`;
            });
            detailsHtml += '</ul>';
        }
        
        if (allElements.masterCheckboxCurrentChapterPlot.checked && currentChapterPlotForPreview.length > 0) {
            totalCount += currentChapterPlotForPreview.length;
            const label = allElements.currentChapterPlotLabel.textContent || '当前原文章节剧情';
            detailsHtml += `<h5 style="margin-top: 10px; margin-bottom: 5px;">📝 ${label}:</h5><ul style="list-style-position: inside; padding-left: 5px; margin:0;">`;
            currentChapterPlotForPreview.forEach(item => {
                detailsHtml += `<li style="margin-bottom: 3px;">${item.title || '未命名剧情'}</li>`;
            });
            detailsHtml += '</ul>';
        }

        allElements.selectedContextToggle.textContent = `附加上下文详情 (${totalCount} 项)`;
        
        if (totalCount > 0) {
            detailsContainer.innerHTML = detailsHtml;
        } else {
            detailsContainer.innerHTML = '<p style="color: #888; margin: 0;">当前没有附加任何上下文。</p>';
        }
    }

    function parseAiSummaryContent(text) {
        const chapters = [];
        if (!text || !text.trim()) return chapters;

        // Regex to identify potential chapter titles. Covers:
        // 1. Markdown headers (e.g., ## My Title)
        // 2. Bracketed titles (e.g., 【My Title】)
        // 3. Chinese chapter format (e.g., 第一章 My Title)
        const titleRegex = /^(?:##+\s+.+|【.+】|第[一二三四五六七八九十零百千万\d]+[章节卷集篇].*)$/;
        
        const lines = text.split('\n');
        
        // Find all title lines and their indices
        const titles = [];
        lines.forEach((line, index) => {
            if (titleRegex.test(line.trim())) {
                titles.push({ title: line.trim(), index: index });
            }
        });

        if (titles.length === 0) {
            if (text.trim()) {
                chapters.push({ title: "AI生成的剧情梗概", content: text.trim() });
            }
            return chapters;
        }

        // Create chapters from titles
        for (let i = 0; i < titles.length; i++) {
            const start = titles[i].index;
            const end = (i + 1 < titles.length) ? titles[i + 1].index : lines.length;
            
            const title = titles[i].title.replace(/##+\s*|【|】/g, '').replace(/-\s*剧情概括\s*$/, '').trim();
            const content = lines.slice(start + 1, end).join('\n').trim();

            if (title && content) {
                chapters.push({ title, content });
            }
        }

        return chapters;
    }

    function switchAppMode(mode) {
        if (mode === 'edit') {
            allElements.contextSelectionArea.classList.remove('hidden');
            allElements.fabSelectContextBtn.classList.remove('hidden');
            allElements.fabPlotContextBtn.classList.remove('hidden');
        } else if (mode === 'create') {
            allElements.contextSelectionArea.classList.add('hidden');
            allElements.fabSelectContextBtn.classList.add('hidden');
            allElements.fabPlotContextBtn.classList.add('hidden');
        }
        allElements.sidebarMenuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.mode === mode);
        });
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
        // 1. 检查并获取选中的原文章节
        if (!allElements.masterCheckboxChapters.checked || chaptersForPreview.length === 0) {
            return alert('请先在“附加上下文”区域勾选“原文章节”并确保已选择章节。');
        }

        const selectedChapters = chaptersForPreview;
        const chapterContents = selectedChapters.map(chapter => {
            return `【章节：${chapter.title}】\n${chapter.content}`;
        }).join('\n\n---\n\n');

        // 2. 在对话历史中显示用户操作和AI思考状态
        const userBubble = document.createElement('div');
        userBubble.className = 'bubble user-bubble';
        userBubble.innerHTML = `<p>[动作] 为 ${selectedChapters.length} 个选中章节生成剧情概括</p>`;
        allElements.conversationHistory.appendChild(userBubble);
        allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;

        const aiBubble = document.createElement('div');
        aiBubble.className = 'bubble ai-bubble';
        aiBubble.innerHTML = `<div class="ai-content">正在为您生成剧情概括...</div><div class="ai-actions"></div>`;
        allElements.conversationHistory.appendChild(aiBubble);

        // 3. 准备并发送API请求
        const requestBody = {
            chapters: selectedChapters,
            file_id: currentNovel ? currentNovel.file_id : null
        };

        try {
            // 注意：我们使用的是一个新的API端点 /api/summarize-chapters
            const response = await fetch('/api/summarize-chapters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const aiContentDiv = aiBubble.querySelector('.ai-content');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '服务器发生未知错误');
            }

            const result = await response.json();
            
            // 4. 显示结果
            aiContentDiv.innerHTML = marked.parse(result.summary);
            aiBubble._rawContent = result.summary; // 保存原始文本，用于"存为剧情"
            aiBubble._relatedChapters = selectedChapters; // 关联章节

            const actionsDiv = aiBubble.querySelector('.ai-actions');
            actionsDiv.innerHTML = `<button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>`;
            
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮

        } catch (error) {
            console.error('Error generating summary:', error);
            aiBubble.querySelector('.ai-content').textContent = '生成剧情概括时出错，请检查后台服务。';
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // 即使出错也要添加快捷指令按钮
        }
    }


    async function handleSendPrompt() {
        const userPrompt = allElements.promptInput.value.trim();
        if (!userPrompt) return alert('请输入你的要求！');
        
        let contextParts = [];
        
        // 仅当上下文区域可见时（即编辑模式）才添加上下文
        if (!allElements.contextSelectionArea.classList.contains('hidden')) {
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

            const selectedCurrentChapterPlots = getSelectedContextItems(
                'current-chapter-plot',
                currentChapterPlotForPreview,
                allElements.masterCheckboxCurrentChapterPlot
            );

            if (selectedCurrentChapterPlots.length > 0) {
                const label = allElements.currentChapterPlotLabel.textContent;
                contextParts.push(`### ${label}\n${selectedCurrentChapterPlots.map(item => item.content).join('\n\n')}`);
            }
        }

        const contextString = contextParts.join('\n\n---\n\n');
        
        const userBubble = document.createElement('div');
        userBubble.className = 'bubble user-bubble';
        userBubble.innerHTML = `<p>${userPrompt}</p>`;
        allElements.conversationHistory.appendChild(userBubble);
        allElements.promptInput.value = '';
        allElements.promptInput.style.height = 'auto';
        allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;

        const aiBubble = document.createElement('div');
        aiBubble.className = 'bubble ai-bubble';
        aiBubble.innerHTML = `<div class="ai-content">思考中...</div><div class="ai-actions"></div>`;
        allElements.conversationHistory.appendChild(aiBubble);

        const requestBody = { 
            prompt: userPrompt, 
            context_string: contextString, 
            file_id: currentNovel ? currentNovel.file_id : null
        };

        try {
            const response = await fetch('/api/generate-with-analysis', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(requestBody)
            });
           
            const aiContentDiv = aiBubble.querySelector('.ai-content');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '服务器发生未知错误');
            }
            
            const result = await response.json();
            
            // 判断是否为普通对话
            if (result.is_chat) {
                // 普通对话：只显示内容，不添加操作按钮，不影响小说编辑状态
                aiContentDiv.innerHTML = marked.parse(result.content);
                aiBubble._rawContent = result.content;
                
                // 普通对话不添加操作按钮
                const actionsDiv = aiBubble.querySelector('.ai-actions');
                actionsDiv.remove(); // 移除操作按钮区域
                
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
                chaptersForPreview = [...currentNovel.chapters];
                renderContextPreviewArea();
            } else if (currentNovel && result.chapters && result.chapters.length > currentNovel.chapters.length) {
                currentNovel.chapters = result.chapters;
            }
            
            const actionsDiv = aiBubble.querySelector('.ai-actions');
            actionsDiv.innerHTML = `
                <button class="btn btn-sm" onclick="copyToClipboard(this)">复制</button>
                <button class="btn btn-sm btn-success" onclick="saveAsDraft(this)">存为定稿</button>
                <button class="btn btn-sm btn-plot" onclick="addToPlotContext(this)">存为剧情</button>
            `;
            
            allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
            appendQuickCommandButton(); // AI响应完成后添加快捷指令按钮

        } catch (error) {
            console.error('Error sending prompt:', error);
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
        
        if (parsedSummaries.length > 0) {
            parsedSummaries.forEach(summary => {
                plotContextSummaries.push({
                    id: Date.now() + Math.random(),
                    title: summary.title,
                    content: summary.content,
                    relatedChapters: aiBubble._relatedChapters || [],
                });
            });
            alert(`已成功解析并保存 ${parsedSummaries.length} 个新剧情到剧情库！`);
        } else {
            alert("未能从AI回复中解析出有效的剧情梗概。");
        }
        allElements.plotContextCount.textContent = plotContextSummaries.length;
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
    
    function openModal(modal) { modal.classList.add('show'); }
    function closeModal(modal) { modal.classList.remove('show'); }
    
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
        button.className = 'btn btn-secondary';
        button.textContent = '概括选中章节';
        
        // 添加事件监听
        button.addEventListener('click', handleGenerateSummary);

        // 放入容器并添加到对话历史
        wrapper.appendChild(button);
        allElements.conversationHistory.appendChild(wrapper);
        allElements.conversationHistory.scrollTop = allElements.conversationHistory.scrollHeight;
    }

    document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal'))));
    window.addEventListener('click', (e) => { 
        if (e.target.classList.contains('modal')) closeModal(e.target);
    });

    // --- 界面切换逻辑 ---
    allElements.sidebarToggleBtn.addEventListener('click', () => {
        allElements.pageBody.classList.toggle('sidebar-collapsed');
    });

    allElements.sidebarMenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchAppMode(item.dataset.mode);
        });
    });

    allElements.mainTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchMainTab(tab.dataset.tab);
        });
    });

    // --- 核心交互逻辑 ---
    allElements.sendPromptBtn.addEventListener('click', handleSendPrompt);
    allElements.promptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey) { handleSendPrompt(); } });

    // 移除旧的静态事件监听
    // const quickGenerateSummaryBtn = document.getElementById('quick-generate-summary-btn');
    // if (quickGenerateSummaryBtn) {
    //     quickGenerateSummaryBtn.addEventListener('click', handleGenerateSummary);
    // }

    allElements.selectedContextToggle.addEventListener('click', () => {
        allElements.selectedContextDetails.classList.toggle('hidden');
    });
    allElements.masterCheckboxChapters.addEventListener('change', updateSelectedContextSummary);
    allElements.masterCheckboxSummaries.addEventListener('change', updateSelectedContextSummary);
    allElements.masterCheckboxCurrentChapterPlot.addEventListener('change', updateSelectedContextSummary);

    allElements.fabViewDraftsBtn.addEventListener('click', () => { renderDraftsList(); openModal(allElements.viewDraftsModal); });
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
    allElements.cancelSourceSelectBtn.addEventListener('click', () => closeModal(allElements.selectSourceModal));

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
        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error((await response.json()).error || '解析失败');
            const result = await response.json();
            
            // 保存小说数据，但先不加载到上下文
            currentNovel = { file_id: result.file_id, filename: result.filename, chapters: result.chapters };
            // 重置上下文
            plotContextSummaries = [];
            summariesForPreview = [];
            chaptersForPreview = []; // 清空，等待用户选择
            
            // 保存到 localStorage（虽然此时 chaptersForPreview 为空，但保存小说元数据）
            saveNovelToLocalStorage();
            
            // 显示章节选择界面
            showChapterSelectionView();
        } catch (error) {
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
        const container = allElements.plotListContainer;
        container.innerHTML = plotContextSummaries.length > 0 ? '' : '<li style="color: #999; text-align: center; padding: 20px;">暂无已保存的剧情</li>';
        allElements.plotPreviewArea.innerHTML = '<h3>请从左侧选择剧情以预览</h3><p style="color: #666;">...</p>';
        allElements.selectAllPlotsButton.textContent = '全选'; // 重置

        plotContextSummaries.forEach(summary => {
            const li = document.createElement('li');
            const isSelected = summariesForPreview.some(s => s.id === summary.id);
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
        const chapterInfo = summary.relatedChapters && summary.relatedChapters.length > 0 
            ? `基于原文: ${summary.relatedChapters.map(c => c.title).join(', ')}` 
            : '未关联任何章节';
        allElements.plotPreviewArea.innerHTML = `<h3>${summary.title}</h3><p style="font-size: 0.85rem; color: #666; margin-top: -10px; margin-bottom: 15px;">${chapterInfo}</p><div style="white-space: pre-wrap;">${summary.content}</div>`;
    }
    allElements.selectAllPlotsButton.addEventListener('click', () => {
        const checkboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox');
        const isAllSelected = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(checkbox => {
            checkbox.checked = !isAllSelected;
        });
        allElements.selectAllPlotsButton.textContent = !isAllSelected ? '取消全选' : '全选';
    });

    allElements.addSelectedPlotsBtn.addEventListener('click', () => {
        const selectedCheckboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        summariesForPreview = plotContextSummaries.filter(summary => selectedIds.includes(String(summary.id)));
        
        renderContextPreviewArea();
        closeModal(allElements.plotContextModal);
    });

    // 新增：为“添加到当前原文剧情”按钮添加事件监听
    allElements.addSelectedPlotsToCurrentChapterPlotBtn.addEventListener('click', () => {
        const selectedCheckboxes = allElements.plotListContainer.querySelectorAll('.plot-select-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            alert('请至少选中一个剧情');
            return;
        }

        const selectedIds = Array.from(selectedCheckboxes).map(cb => String(cb.value));
        currentChapterPlotForPreview = plotContextSummaries.filter(summary => selectedIds.includes(String(summary.id)));

        updateCurrentChapterPlotPreview();
        closeModal(allElements.plotContextModal);
    });

    function renderDraftsList() {
        const container = allElements.draftsListContainer;
        container.innerHTML = myDrafts.length > 0 ? '' : '<li style="color: #999; text-align: center; padding: 20px;">暂无定稿</li>';
        myDrafts.forEach((draft, index) => {
            const li = document.createElement('li');
            li.textContent = draft.title;
            li.dataset.index = index;
            li.addEventListener('click', () => {
                container.querySelectorAll('li').forEach(item => item.classList.remove('active'));
                li.classList.add('active');
                renderDraftPreview(draft);
            });
            container.appendChild(li);
        });
    }

    function renderDraftPreview(draft) {
        allElements.draftsPreviewArea.innerHTML = `<h3>${draft.title}</h3><div style="white-space: pre-wrap;">${draft.content}</div>`;
    }
    allElements.closeDraftsModalBtn.addEventListener('click', () => closeModal(allElements.viewDraftsModal));

    window.copyToClipboard = function(button) { const content = button.closest('.ai-bubble').querySelector('.ai-content').innerText; navigator.clipboard.writeText(content).then(() => { alert('内容已复制到剪贴板！'); }, () => { alert('复制失败！'); }); }
    
    // =================================================================
    // 6. 初始化
    // =================================================================
    
    // 尝试从 localStorage 恢复上次加载的小说
    const hasRestoredNovel = loadNovelFromLocalStorage();
    if (hasRestoredNovel) {
        console.log('已恢复上次加载的小说:', currentNovel.filename);
        // 显示恢复提示
        const restoreBubble = document.createElement('div');
        restoreBubble.className = 'bubble ai-bubble';
        restoreBubble.style.backgroundColor = '#e8f5e9';
        restoreBubble.style.borderLeft = '4px solid #4caf50';
        restoreBubble.innerHTML = `<p>✅ 已自动恢复上次加载的小说：<strong>${currentNovel.filename}</strong>（${chaptersForPreview.length} 个章节已选中）</p>`;
        allElements.conversationHistory.insertBefore(restoreBubble, allElements.conversationHistory.firstChild);
    }
    
    renderContextPreviewArea();
    switchAppMode('edit'); // 默认进入编辑续写模式
    switchMainTab('plot-design'); // 默认显示剧情设计标签页
    appendQuickCommandButton(); // 初始加载时添加按钮

    // 加载持久化的标签
    loadContextLabels();

    // 为可编辑标签添加事件监听
    allElements.chaptersLabel.addEventListener('blur', saveContextLabels);
    allElements.summariesLabel.addEventListener('blur', saveContextLabels);
    allElements.currentChapterPlotLabel.addEventListener('blur', saveContextLabels);
});
