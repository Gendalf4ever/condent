// Конфигурация блога
const BLOG_CONFIG = {
  containerId: 'article-container',
  modalId: 'articleModal',
  defaultImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAwIiBoZWlnaHQ9IjUwMCI+PHJlY3Qgd2lkdGg9IjEwMDAiIGhlaWdodD0iNTAwIiBmaWxsPSIjZWVlZWVlIi8+PHRleHQgeD0iNTAwIiB5PSIyNTAiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5vIGltYWdlPC90ZXh0Pjwvc3ZnPg=='
};

let blogArticles = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Проверяем инициализацию Firebase
    if (!window.firebaseServices) {
      throw new Error('Firebase не инициализирован');
    }

    await loadBlogData();
    setupNavigation();
    handleInitialRoute();
    
    // Подписка на обновления в реальном времени
    setupRealTimeUpdates();
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    showError('Не удалось загрузить блог. Пожалуйста, попробуйте позже.');
  }
});

// ====================== ОСНОВНЫЕ ФУНКЦИИ ====================== //

// Загрузка данных блога из Firebase
async function loadBlogData() {
  try {
    const snapshot = await firebaseServices.db.collection('articles')
      .orderBy('createdAt', 'desc')
      .get();

    blogArticles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        название: data.title || 'Без названия',
        дата: data.date || data.createdAt?.toDate().toISOString(),
        контент: data.content || '',
        тезис: data.excerpt || '',
        url: data.imageUrl || '',
        заголовок: data.subtitle || ''
      };
    });

    processArticlesData();
    
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    throw error;
  }
}

// Обработка данных статей
function processArticlesData() {
  blogArticles.forEach(article => {
    article.dateObj = parseDate(article.дата);
    article.formattedDate = formatDate(article.дата);
    article.formattedContent = formatContent(article.контент);
    article.formattedThesis = formatContent(article.тезис || article.контент?.substring(0, 200) + '...');
  });
}

// Настройка навигации
function setupNavigation() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.article-card');
    if (card) {
      e.preventDefault();
      navigateToArticle(card.dataset.id);
    }
    
    if (e.target.classList.contains('close-modal') || e.target.classList.contains('back-button')) {
      closeModal();
    }
  });
  
  window.addEventListener('popstate', handleRouteChange);
}

// Обработчик изменения роута
function handleRouteChange() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  
  if (articleId) {
    showArticle(articleId, false);
  } else {
    showArticleList(false);
  }
}

// ====================== РОУТИНГ ====================== //

function handleInitialRoute() {
  handleRouteChange();
}

function navigateToArticle(articleId) {
  history.pushState({}, '', `?id=${articleId}`);
  showArticle(articleId, false);
}

function navigateToList() {
  history.pushState({}, '', window.location.pathname);
  showArticleList(false);
}

// ====================== ОТОБРАЖЕНИЕ СТАТЕЙ ====================== //

function showArticleList(shouldPushState = true) {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (!container) return;
  
  if (!blogArticles.length) {
    container.innerHTML = '<div class="no-articles">Нет доступных статей</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="blog-listing">
      <h1 class="blog-title">Блог CO[D]ENT</h1>
      <div class="articles-grid">
        ${blogArticles.map(article => `
          <article class="article-card" data-id="${article.id}">
            <div class="card-image-container">
              <img src="${article.url || BLOG_CONFIG.defaultImage}" 
                   alt="${escapeHtml(article.название)}" 
                   class="card-image"
                   loading="lazy">
            </div>
            <div class="card-content">
              <h2 class="card-title">${escapeHtml(article.название)}</h2>
              <time class="card-date">${article.formattedDate}</time>
              ${article.formattedThesis ? `<div class="card-excerpt">${article.formattedThesis}</div>` : ''}
              <a href="?id=${article.id}" class="read-more">Читать статью →</a>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
  
  document.title = 'Блог CO[D]ENT';
  setupImageErrorHandlers();
}

function showArticle(articleId, shouldPushState = true) {
  const article = blogArticles.find(a => a.id === articleId);
  if (!article) {
    showError('Статья не найдена');
    navigateToList();
    return;
  }
  
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <button class="close-modal">&times;</button>
        <article class="blog-article">
          <header class="article-header">
            <img src="${article.url || BLOG_CONFIG.defaultImage}" 
                 alt="${escapeHtml(article.название)}" 
                 class="article-image"
                 loading="lazy">
            <div class="article-meta">
              <h1>${escapeHtml(article.название)}</h1>
              <time class="article-date">${article.formattedDate}</time>
            </div>
          </header>
          
          <div class="article-body">
            ${article.заголовок ? `<h2 class="article-subtitle">${escapeHtml(article.заголовок)}</h2>` : ''}
            
            <div class="article-content">
              ${article.formattedThesis ? `<div class="article-thesis">${article.formattedThesis}</div>` : ''}
              ${article.formattedContent || '<p>Нет содержимого</p>'}
            </div>
            
            <div class="article-footer">
              <button class="back-button">← Назад к списку</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.title = `${article.название} | Блог CO[D]ENT`;
  setupImageErrorHandlers();
}

function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();
  navigateToList();
}

// ====================== РЕАЛЬНОЕ ВРЕМЯ ====================== //

function setupRealTimeUpdates() {
  firebaseServices.db.collection('articles')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      const updatedArticles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          название: data.title,
          дата: data.date || data.createdAt?.toDate().toISOString(),
          контент: data.content,
          тезис: data.excerpt,
          url: data.imageUrl,
          заголовок: data.subtitle
        };
      });
      
      blogArticles = updatedArticles;
      processArticlesData();
      handleRouteChange();
    }, error => {
      console.error('Ошибка real-time обновлений:', error);
    });
}

// ====================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================== //

function parseDate(dateString) {
  if (!dateString) return new Date();
  return new Date(dateString);
}

function formatDate(dateString) {
  const date = parseDate(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatContent(text) {
  if (!text) return '';
  
  // Простое форматирование текста
  return text
    .split('\n')
    .filter(p => p.trim())
    .map(p => {
      // Обработка ссылок [текст](url)
      p = p.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      // Обработка жирного текста **текст**
      p = p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return `<p>${escapeHtml(p)}</p>`;
    })
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setupImageErrorHandlers() {
  document.querySelectorAll('img').forEach(img => {
    img.onerror = () => {
      img.src = BLOG_CONFIG.defaultImage;
      img.onerror = null;
    };
  });
}

function showError(message) {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
        <button class="error-button" onclick="window.showArticleList()">Вернуться к списку</button>
      </div>
    `;
  }
}

// Глобальные функции для использования в HTML
window.navigateToList = navigateToList;
window.showArticleList = showArticleList;