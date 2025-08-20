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
                    <div class="article-content">
                        ${formatContent(article.content || 'Содержание отсутствует')}
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

function formatContent(text) {
    if (!text) return '<p>Содержание отсутствует</p>';
    
    return text
        .split('\n')
        .filter(paragraph => paragraph.trim())
        .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
        .join('');
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