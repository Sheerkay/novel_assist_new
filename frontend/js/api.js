// e:\Vs_Project\Novel_asisit_new\frontend\js\api.js

const API_BASE_URL = 'http://127.0.0.1:5000/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    if (config.method !== 'GET' && options.body) {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '未知错误' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API请求失败: ${error.message}`);
        throw error;
    }
}

const api = {
    uploadNovel: (formData) => {
        return fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        }).then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error) });
            }
            return response.json();
        });
    },

    getChapters: (fileId) => {
        return request(`/chapters/${fileId}`);
    },

    getChapterSummary: (fileId, chapterIndex) => {
        return request('/chapter-summary', {
            method: 'POST',
            body: { file_id: fileId, chapter_index: chapterIndex },
        });
    },

    generate: (prompt, context, context_chapters, context_labels) => {
        return request('/generate', {
            method: 'POST',
            body: {
                prompt,
                context,
                context_chapters,
                context_labels,
            },
        });
    },
    
    processChapter: (fileId, chapterIndex, prompt) => {
        return request('/process-chapter', {
            method: 'POST',
            body: { file_id: fileId, chapter_index: chapterIndex, prompt: prompt },
        });
    },

    summarizeChapters: (chapters) => {
        return request('/summarize-chapters', {
            method: 'POST',
            body: { chapters: chapters },
        });
    },
};
