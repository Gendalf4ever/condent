// Конфигурация блога
const BLOG_CONFIG = {
    containerId: 'article-container',
    defaultImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij7QndC+0LLRi9C5INGN0LvQtdC60YLRgNC+0L3QvdC+0LU8L3RleHQ+PC9zdmc+'
};

// Основная функция инициализации
document.addEventListener('DOMContentLoaded', () => {
    // Даем время на загрузку Firebase
    setTimeout(initializeBlog, 100);
});

async function initializeBlog() {
    try {
        // Проверяем инициализацию Firebase
        if (!window.firebaseServices) {
            console.warn('Firebase services not found, retrying...');
            await waitForFirebase();
        }

        const { db } = window.firebaseServices;
        if (!db) {
            throw new Error('Firestore not available');
        }

        console.log('Blog initialization started');
        await loadAndDisplayArticles();
        setupRealTimeUpdates();
        setupNavigation();
        
        // Инициализируем стили Quill
        initQuillStyles();
        
    } catch (error) {
        console.error('Blog initialization error:', error);
        showError('Не удалось загрузить блог. Пожалуйста, обновите страницу.');
    }
}

// Ожидание инициализации Firebase
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (window.firebaseServices) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // Таймаут на случай если Firebase не загрузится
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 3000);
    });
}

// Загрузка и отображение статей
async function loadAndDisplayArticles() {
    const container = document.getElementById(BLOG_CONFIG.containerId);
    if (!container) return;

    try {
        showLoading();

        const { db } = window.firebaseServices;
        const snapshot = await db.collection('articles')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            showNoArticles();
            return;
        }

        const articles = processArticles(snapshot);
        renderArticles(articles);
        
    } catch (error) {
        console.error('Error loading articles:', error);
        showError('Ошибка при загрузке статей');
    }
}

// Обработка данных статей
function processArticles(snapshot) {
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title || 'Без названия',
            content: data.content || '',
            imageUrl: data.imageUrl || null,
            date: data.createdAt?.toDate() || new Date(),
            formattedDate: formatDate(data.createdAt?.toDate() || new Date()),
            excerpt: getExcerpt(data.content || '', 120)
        };
    });
}

// Отображение статей в виде сетки
function renderArticles(articles) {
    const container = document.getElementById(BLOG_CONFIG.containerId);
    
    container.innerHTML = `
        <div class="blog-header">
            <h1>Блог CO[D]ENT</h1>
            <p>Последние статьи и новости</p>
        </div>
        <div class="articles-grid">
            ${articles.map(article => `
                <article class="article-card" data-id="${article.id}">
                    <div class="card-image-container">
                        <img src="${article.imageUrl || BLOG_CONFIG.defaultImage}" 
                             alt="${article.title}"
                             class="card-image"
                             onerror="this.src='${BLOG_CONFIG.defaultImage}'">
                    </div>
                    <div class="card-content">
                        <h2 class="card-title">${escapeHtml(article.title)}</h2>
                        <time class="card-date">${article.formattedDate}</time>
                        <div class="card-excerpt">${article.excerpt}</div>
                        <a href="?id=${article.id}" class="read-more">Читать статью →</a>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

// Настройка навигации
function setupNavigation() {
    // Обработка URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId) {
        showSingleArticle(articleId);
    }

    // Обработка кликов по карточкам
    document.addEventListener('click', (e) => {
        const articleCard = e.target.closest('.article-card');
        if (articleCard) {
            const articleId = articleCard.dataset.id;
            showSingleArticle(articleId);
        }
    });

    // Обработка кнопки "Назад"
    window.addEventListener('popstate', handleBrowserBack);
}

// Показ отдельной статьи
async function showSingleArticle(articleId) {
    try {
        showLoading();
        
        const { db } = window.firebaseServices;
        const doc = await db.collection('articles').doc(articleId).get();
        
        if (!doc.exists) {
            throw new Error('Статья не найдена');
        }

        const article = doc.data();
        renderSingleArticle(articleId, article);
        
        // Обновляем URL
        window.history.pushState({ articleId }, '', `?id=${articleId}`);
        
        // Применяем стили Quill после рендеринга
        setTimeout(() => {
            applyQuillStyles();
            processNestedStyles();
        }, 100);
        
    } catch (error) {
        console.error('Error loading article:', error);
        showError('Не удалось загрузить статью');
        showArticleList();
    }
}

// Отображение отдельной статьи
function renderSingleArticle(articleId, article) {
    const container = document.getElementById(BLOG_CONFIG.containerId);
    
    container.innerHTML = `
        <div class="single-article">
            <button class="back-button" onclick="showArticleList()">← Назад к списку</button>
            
            <article class="blog-article">
                <header class="article-header">
                    ${article.imageUrl ? `
                        <img src="${article.imageUrl}" 
                             alt="${article.title}"
                             class="article-image"
                             onerror="this.src='${BLOG_CONFIG.defaultImage}'">
                    ` : ''}
                    
                    <div class="article-meta">
                        <h1>${escapeHtml(article.title || 'Без названия')}</h1>
                        <time class="article-date">${formatDate(article.createdAt?.toDate() || new Date())}</time>
                    </div>
                </header>
                
                <div class="article-body">
                    <div class="article-content ql-editor">
                        ${article.content || 'Содержание отсутствует'}
                    </div>
                </div>
                
                <div class="article-footer">
                    <button class="back-button" onclick="showArticleList()">← Назад к списку</button>
                </div>
            </article>
        </div>
    `;
}

// Возврат к списку статей
window.showArticleList = function() {
    loadAndDisplayArticles();
    window.history.pushState({}, '', 'blog.html');
};

// Настройка обновлений в реальном времени
function setupRealTimeUpdates() {
    try {
        const { db } = window.firebaseServices;
        
        db.collection('articles')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                console.log('Real-time update received');
                const articles = processArticles(snapshot);
                renderArticles(articles);
            }, error => {
                console.error('Real-time update error:', error);
            });
            
    } catch (error) {
        console.warn('Real-time updates not available:', error);
    }
}

// Обработка кнопки "Назад" в браузере
function handleBrowserBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId) {
        showSingleArticle(articleId);
    } else {
        showArticleList();
    }
}

// ================= СТИЛИ QUILL РЕДАКТОРА =================
// Функция для применения стилей Quill
function applyQuillStyles() {
    console.log('Applying Quill styles...');
    
    // Применяем стили ко всем элементам с классами Quill
    const styles = {
        // Шрифты
        'ql-font-monospace': {
            'font-family': "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace",
            'background': '#f8f9fa',
            'padding': '0.1em 0.3em',
            'border-radius': '3px',
            'font-size': '0.95em'
        },
        'ql-font-serif': {
            'font-family': "'Georgia', 'Times New Roman', serif"
        },
        
        // Размеры текста
        'ql-size-small': {
            'font-size': '0.85em'
        },
        'ql-size-large': {
            'font-size': '1.4em'
        },
        'ql-size-huge': {
            'font-size': '2em',
            'line-height': '1.3'
        },
        
        // Выравнивание
        'ql-align-center': {
            'text-align': 'center'
        },
        'ql-align-right': {
            'text-align': 'right'
        },
        'ql-align-justify': {
            'text-align': 'justify'
        }
    };

    // Применяем все стили
    Object.entries(styles).forEach(([className, style]) => {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            Object.entries(style).forEach(([property, value]) => {
                element.style.setProperty(property, value, 'important');
            });
        });
    });

    // Обрабатываем inline стили (цвета)
    document.querySelectorAll('[style*="color"]').forEach(el => {
        if (el.style.color) {
            el.style.padding = '0.1em 0.2em';
            el.style.borderRadius = '3px';
            el.style.background = 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%)';
        }
    });

    console.log('Quill styles applied');
}

// Функция для обработки вложенных стилей
function processNestedStyles() {
    console.log('Processing nested styles...');
    
    // Обрабатываем вложенные теги
    const nestedSelectors = [
        'em s u', 'em u s', 's em u', 's u em', 'u em s', 'u s em',
        'strong em', 'em strong', 'strong u', 'u strong'
    ];

    nestedSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (selector.includes('em') && selector.includes('strong')) {
                el.style.fontWeight = 'bold';
                el.style.fontStyle = 'italic';
            }
            if (selector.includes('u') && selector.includes('s')) {
                el.style.textDecoration = 'underline line-through';
            }
        });
    });

    // Обрабатываем списки
    document.querySelectorAll('ol, ul').forEach(list => {
        list.style.paddingLeft = '1.8em';
        list.style.margin = '1.2em 0';
    });

    document.querySelectorAll('li').forEach(li => {
        li.style.marginBottom = '0.5em';
        li.style.lineHeight = '1.6';
    });

    console.log('Nested styles processed');
}

// Основная функция инициализации стилей Quill
function initQuillStyles() {
    console.log('Initializing Quill styles...');
    
    // Применяем стили сразу
    applyQuillStyles();
    processNestedStyles();
    
    // Наблюдаем за изменениями DOM
    const observer = new MutationObserver((mutations) => {
        let shouldApply = false;
        
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.querySelector?.('[class*="ql-"]') || 
                            node.querySelector?.('[style*="color"]') ||
                            node.className?.includes('ql-')) {
                            shouldApply = true;
                        }
                    }
                });
            }
        });
        
        if (shouldApply) {
            setTimeout(() => {
                applyQuillStyles();
                processNestedStyles();
            }, 100);
        }
    });

    // Начинаем наблюдение
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });

    console.log('Quill styles initialized');
}

// Принудительное применение стилей
function forceQuillStyles() {
    console.log('Forcing Quill styles...');
    
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .ql-font-monospace {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace !important;
            background: #f8f9fa !important;
            padding: 0.1em 0.3em !important;
            border-radius: 3px !important;
            font-size: 0.95em !important;
        }
        .ql-size-small { font-size: 0.85em !important; }
        .ql-size-large { font-size: 1.4em !important; }
        .ql-size-huge { font-size: 2em !important; line-height: 1.3 !important; }
        .ql-align-center { text-align: center !important; }
        .ql-align-right { text-align: right !important; }
        .ql-align-justify { text-align: justify !important; }
        
        span[style*="color"] {
            padding: 0.1em 0.2em !important;
            border-radius: 3px !important;
            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%) !important;
        }
        
        em s u, em u s, s em u, s u em, u em s, u s em {
            font-weight: bold !important;
            font-style: italic !important;
            text-decoration: underline line-through !important;
            color: #2c3e50 !important;
        }
        
        .ql-editor ol, .ql-editor ul {
            padding-left: 1.8em !important;
            margin: 1.2em 0 !important;
        }
        
        .ql-editor li {
            margin-bottom: 0.5em !important;
            line-height: 1.6 !important;
        }
    `;
    
    document.head.appendChild(styleElement);
    console.log('Forced styles applied');
}

// Вспомогательные функции
function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getExcerpt(text, length = 100) {
    if (!text) return '';
    const cleanText = text.replace(/<[^>]*>/g, '');
    return cleanText.length > length 
        ? cleanText.substring(0, length) + '...' 
        : cleanText;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функции отображения состояния
function showLoading() {
    const container = document.getElementById(BLOG_CONFIG.containerId);
    if (container) {
        container.innerHTML = '<div class="loading">Загрузка...</div>';
    }
}

function showNoArticles() {
    const container = document.getElementById(BLOG_CONFIG.containerId);
    if (container) {
        container.innerHTML = '<div class="no-articles">Статьи не найдены</div>';
    }
}

function showError(message) {
    const container = document.getElementById(BLOG_CONFIG.containerId);
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <button class="error-button" onclick="window.location.reload()">Обновить страницу</button>
            </div>
        `;
    }
}

// Глобальные функции для HTML
window.navigateToArticle = showSingleArticle;
window.navigateToList = showArticleList;
window.applyQuillStyles = applyQuillStyles;
window.forceQuillStyles = forceQuillStyles;

// Принудительно применяем стили при загрузке
setTimeout(forceQuillStyles, 500);
setTimeout(applyQuillStyles, 1000);