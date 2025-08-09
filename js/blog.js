// Конфигурация блога
const BLOG_CONFIG = {
  sheetId: '1Hxmx_tznE64ifvKON4-waL6x7BYQ7plf1nWta5nsMlI',
  sheetName: 'blog',
  containerId: 'article-container',
  defaultImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiPk5vIGltYWdlPC90ZXh0Pjwvc3ZnPg=='
};

let blogArticles = [];

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  initializeBlog();
});

async function initializeBlog() {
  try {
    await loadBlogData();
    setupEventDelegation();
    handleInitialRoute();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize blog');
  }
}

// Загрузка данных
async function loadBlogData() {
  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${BLOG_CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${BLOG_CONFIG.sheetName}`;
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const csvData = await response.text();
    blogArticles = parseCSV(csvData);
    
    blogArticles.forEach(article => {
      article.dateObj = parseDate(article.дата);
    });
    
    blogArticles.sort((a, b) => b.dateObj - a.dateObj);
    
  } catch (error) {
    console.error('Failed to load blog data:', error);
    throw error;
  }
}

// Обработка начального маршрута
function handleInitialRoute() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  
  if (articleId) {
    showArticle(articleId, false);
  } else {
    showArticleList(false);
  }
}

// Настройка делегирования событий
function setupEventDelegation() {
  document.addEventListener('click', (e) => {
    // Обработка кликов по карточкам статей
    const card = e.target.closest('.article-card');
    if (card && !e.target.closest('a')) {
      e.preventDefault();
      const articleId = card.dataset.id;
      navigateToArticle(articleId);
      return;
    }
    
    // Обработка кнопки "Назад"
    if (e.target.matches('.back-button, .back-to-blog')) {
      e.preventDefault();
      navigateToList();
      return;
    }
    
    // Обработка ссылок "Читать"
    const readLink = e.target.closest('a[href^="blog.html?id="]');
    if (readLink) {
      e.preventDefault();
      const articleId = new URL(readLink.href).searchParams.get('id');
      navigateToArticle(articleId);
    }
  });
  
  // Обработка навигации по истории
  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId) {
      showArticle(articleId, false);
    } else {
      showArticleList(false);
    }
  });
}

// Навигация к статье
function navigateToArticle(articleId) {
  history.pushState({}, '', `blog.html?id=${articleId}`);
  showArticle(articleId, false);
}

// Навигация к списку
function navigateToList() {
  history.pushState({}, '', 'blog.html');
  showArticleList(false);
}

// Показать статью
function showArticle(articleId, shouldPushState = true) {
  const article = blogArticles.find(a => a.id === articleId);
  if (!article) {
    showError('Article not found');
    return showArticleList();
  }
  
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (!container) return;
  
  container.innerHTML = `
    <article class="blog-article">
      <header class="article-header">
        <img src="${article.url || BLOG_CONFIG.defaultImage}" 
             alt="${escapeHtml(article.название)}" 
             class="article-image">
        <h1>${escapeHtml(article.название)}</h1>
        <time class="article-date">${formatDate(article.дата)}</time>
      </header>
      
      ${article.заголовок ? `<h2 class="article-subtitle">${escapeHtml(article.заголовок)}</h2>` : ''}
      
      ${article.тезис ? `<div class="article-thesis"><strong>${escapeHtml(article.тезис)}</strong></div>` : ''}
      
      <div class="article-content">
        ${formatContent(article.контент)}
      </div>
      
      <a href="blog.html" class="back-button">← Back to list</a>
    </article>
  `;
  
  document.title = `${article.название} | Blog`;
  
  if (shouldPushState) {
    history.pushState({}, '', `blog.html?id=${articleId}`);
  }
  
  window.scrollTo(0, 0);
  
  // Настройка обработчика ошибок изображения
  const img = container.querySelector('.article-image');
  if (img) {
    img.onerror = () => {
      img.src = BLOG_CONFIG.defaultImage;
      img.onerror = null; // Убираем обработчик, чтобы избежать рекурсии
    };
  }
}

// Показать список статей
function showArticleList(shouldPushState = true) {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (!container) return;
  
  if (!blogArticles.length) {
    container.innerHTML = '<div class="no-articles">No articles available</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="blog-listing">
      <h1>Blog</h1>
      <div class="articles-grid">
        ${blogArticles.map(article => `
          <article class="article-card" data-id="${article.id}">
            <img src="${article.url || BLOG_CONFIG.defaultImage}" 
                 alt="${escapeHtml(article.название)}" 
                 class="card-image">
            <div class="card-content">
              <h2>${escapeHtml(article.название)}</h2>
              <time class="article-date">${formatDate(article.дата)}</time>
              ${article.тезис ? `<p class="card-thesis"><strong>${escapeHtml(article.тезис)}</strong></p>` : ''}
              <a href="blog.html?id=${article.id}" class="read-more">Read →</a>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
  
  document.title = 'Blog';
  
  if (shouldPushState && window.location.search) {
    history.pushState({}, '', 'blog.html');
  }
  
  // Настройка обработчиков ошибок изображений
  document.querySelectorAll('.card-image').forEach(img => {
    img.onerror = () => {
      img.src = BLOG_CONFIG.defaultImage;
      img.onerror = null; // Убираем обработчик
    };
  });
}

// Вспомогательные функции
function parseCSV(csvText) {
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.substring(1);
  
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = parseLine(line, delimiter);
    const article = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).trim();
      }
      article[header] = value;
    });
    
    return article;
  }).filter(article => article.id && article.название);
}

function detectDelimiter(line) {
  const delimiters = ['\t', ',', ';'];
  return delimiters.find(d => line.includes(d)) || ',';
}

function parseLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else current += char;
  }
  
  result.push(current);
  return result;
}

function parseDate(dateString) {
  if (!dateString) return new Date(0);
  const [day, month, year] = dateString.split('.');
  return new Date(`${year}-${month}-${day}`);
}

function formatDate(dateString) {
  const date = parseDate(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatContent(text) {
  if (!text) return '';
  return escapeHtml(text)
    .split('\n')
    .map(p => p.trim() ? `<p>${p}</p>` : '')
    .join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
        <button onclick="showArticleList()">Back to list</button>
      </div>
    `;
  }
}