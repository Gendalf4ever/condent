const BLOG_CONFIG = {
  containerId: 'article-container',
  modalId: 'articleModal',
  defaultImage: 'data:image/svg+xml;base64,...' // ваш base64
};

let blogArticles = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadBlogData();
    setupNavigation();
    handleInitialRoute();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Не удалось загрузить блог');
  }
});

async function loadBlogData() {
  try {
    const config = window.sheetConfig.getBlogConfig();
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${window.sheetConfig.spreadsheetId}/export?format=csv&gid=${config.gid}`;
    
    const response = await fetch(sheetUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const csvData = await response.text();
    blogArticles = parseCSV(csvData);
    
    blogArticles.forEach(article => {
      article.dateObj = parseDate(article.дата);
      article.formattedContent = formatContent(article.контент);
      article.formattedThesis = formatContent(article.тезис);
    });
    
    blogArticles.sort((a, b) => b.dateObj - a.dateObj);
    
  } catch (error) {
    console.error('Failed to load blog data:', error);
    throw error;
  }
}
// Новый улучшенный парсер CSV
function parseCSV(csvText) {
  // Удаляем BOM символ если есть
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.substring(1);
  }

  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Получаем заголовки (первая строка)
  const headers = lines[0].split(',').map(h => 
    h.trim().replace(/"/g, '').toLowerCase()
  );
  console.log('Headers:', headers); // Для отладки

  const articles = [];

  // Обрабатываем строки данных
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const article = {};
    
    for (let j = 0; j < headers.length; j++) {
      article[headers[j]] = (values[j] || '').trim().replace(/^"|"$/g, '');
    }

    // Добавляем только статьи с ID и названием
    if (article.id && article.название) {
      articles.push(article);
    }
  }

  return articles;
}

// Парсер строки CSV с учетом кавычек
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

// Остальные функции остаются без изменений
function handleInitialRoute() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  
  if (articleId) {
    showArticle(articleId, false);
  } else {
    showArticleList(false);
  }
}

function setupNavigation() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.article-card');
    if (card) {
      e.preventDefault();
      navigateToArticle(card.dataset.id);
    }
    
    if (e.target.classList.contains('close-modal')) {
      closeModal();
    }
  });
  
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

function navigateToArticle(articleId) {
  history.pushState({}, '', `blog.html?id=${articleId}`);
  showArticle(articleId, false);
}

function navigateToList() {
  history.pushState({}, '', 'blog.html');
  showArticleList(false);
}

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
                   class="card-image">
            </div>
            <div class="card-content">
              <h2 class="card-title">${escapeHtml(article.название)}</h2>
              <time class="card-date">${formatDate(article.дата)}</time>
              ${article.formattedThesis ? `<div class="card-excerpt">${article.formattedThesis}</div>` : ''}
              <a href="blog.html?id=${article.id}" class="read-more">Читать статью →</a>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
  
  document.title = 'Блог CO[D]ENT';
  
  document.querySelectorAll('.card-image').forEach(img => {
    img.onerror = () => img.src = BLOG_CONFIG.defaultImage;
  });
}

function showArticle(articleId, shouldPushState = true) {
  const article = blogArticles.find(a => a.id === articleId);
  if (!article) return showError('Статья не найдена');
  
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <button class="close-modal">&times;</button>
        <article class="blog-article">
          <header class="article-header">
            <img src="${article.url || BLOG_CONFIG.defaultImage}" 
                 alt="${escapeHtml(article.название)}" 
                 class="article-image">
            <div class="article-meta">
              <h1>${escapeHtml(article.название)}</h1>
              <time class="article-date">${formatDate(article.дата)}</time>
            </div>
          </header>
          
          <div class="article-body">
            ${article.заголовок ? `<h2 class="article-subtitle">${escapeHtml(article.заголовок)}</h2>` : ''}
            
            <div class="article-content">
              ${article.formattedThesis ? `<div class="article-thesis">${article.formattedThesis}</div>` : ''}
              ${article.formattedContent || '<p>Нет содержимого</p>'}
            </div>
            
            <div class="article-footer">
              <button class="back-button" onclick="navigateToList()">← Назад к списку</button>
            </div>
          </div>
        </article>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.title = `${article.название} | Блог CO[D]ENT`;
  
  const img = document.querySelector('.article-image');
  if (img) img.onerror = () => img.src = BLOG_CONFIG.defaultImage;
}

function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();
  navigateToList();
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
  return text.split('\n')
    .filter(p => p.trim())
    .map(p => `<p>${escapeHtml(p)}</p>`)
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
        <button class="error-button" onclick="showArticleList()">Вернуться к списку</button>
      </div>
    `;
  }
}