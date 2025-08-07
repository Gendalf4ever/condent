// Конфигурация
const BLOG_CONFIG = {
  sheetId: '1Hxmx_tznE64ifvKON4-waL6x7BYQ7plf1nWta5nsMlI',
  sheetName: 'blog',
  containerId: 'article-container',
  defaultImage: '/img/blog/default.jpg' // Добавьте дефолтное изображение
};

let blogArticles = [];

// Инициализация блога
document.addEventListener('DOMContentLoaded', async () => {
  await loadBlogData();
  
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  
  if (articleId) {
    await loadArticle(articleId);
  } else {
    showBlogListing();
  }
});

// Загрузка данных из Google Sheets
async function loadBlogData() {
  try {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${BLOG_CONFIG.sheetId}/gviz/tq?tqx=out:csv&sheet=${BLOG_CONFIG.sheetName}`;
    const response = await fetch(sheetUrl);
    
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const csvData = await response.text();
    blogArticles = parseBlogCSV(csvData);
    
    // Добавляем formattedDate для каждой статьи
    blogArticles.forEach(article => {
      article.formattedDate = parseDate(article.дата);
    });
    
    // Сортируем по дате (новые сначала)
    blogArticles.sort((a, b) => (b.formattedDate || 0) - (a.formattedDate || 0));
    
  } catch (error) {
    console.error('Ошибка загрузки данных блога:', error);
    showError('Не удалось загрузить статьи. Пожалуйста, попробуйте позже.');
  }
}

// Парсинг CSV
function parseBlogCSV(csvText) {
  // Удаляем BOM символ если есть
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.substring(1);
  }
  
  const lines = csvText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length < 2) return [];
  
  // Определяем разделитель
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter)
    .map(h => h.trim().toLowerCase().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line, delimiter);
    const article = {};
    
    headers.forEach((header, index) => {
      let value = (values[index] || '').trim();
      
      // Удаляем кавычки если есть
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      article[header] = value;
    });
    
    return article;
  });
}

// Парсинг одной строки CSV
function parseCSVLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

// Парсинг даты
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Формат DD.MM.YYYY
  const match = dateString.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) {
    const day = match[1];
    const month = match[2];
    const year = match[3];
    return new Date(`${year}-${month}-${day}`);
  }
  
  return null;
}

// Форматирование даты для отображения
function formatDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return '';
  
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Загрузка конкретной статьи
async function loadArticle(articleId) {
  try {
    const article = blogArticles.find(a => a.id === articleId);
    if (!article) {
      showError('Статья не найдена');
      return showBlogListing();
    }
    
    const container = document.getElementById(BLOG_CONFIG.containerId);
    if (!container) return;
    
    container.innerHTML = `
      <article class="blog-article">
        <header class="article-header">
          <h1>${article.название}</h1>
          <div class="article-meta">
            <time class="article-date">${formatDate(article.дата)}</time>
          </div>
          ${article.url ? `<img src="${article.url}" alt="${article.название}" class="article-image">` : ''}
        </header>
        <div class="article-content">
          ${article.контент.replace(/\n/g, '<br>')}
        </div>
        <a href="blog.html" class="back-to-blog">← Все статьи</a>
      </article>
    `;
    
    document.title = `${article.название} | Блог CO[D]ENT`;
    
  } catch (error) {
    console.error('Ошибка загрузки статьи:', error);
    showError('Не удалось загрузить статью');
    showBlogListing();
  }
}

// Показ списка статей
function showBlogListing() {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (!container) return;
  
  if (!blogArticles || blogArticles.length === 0) {
    container.innerHTML = '<div class="no-articles">Нет доступных статей</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="blog-listing">
      <h1>Блог CO[D]ENT</h1>
      <div class="articles-grid">
        ${blogArticles.map(article => `
          <article class="article-card" data-id="${article.id}">
            ${article.url ? `
              <div class="article-card-image">
                <img src="${article.url}" alt="${article.название}">
              </div>
            ` : ''}
            <div class="article-card-content">
              <h2>${article.название}</h2>
              <time class="article-date">${formatDate(article.дата)}</time>
              <a href="blog.html?id=${article.id}" class="read-more">Читать</a>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
  
  // Обработчики кликов
  document.querySelectorAll('.article-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Проверяем, не кликнули ли на ссылку внутри карточки
      if (e.target.tagName === 'A') return;
      
      const articleId = card.getAttribute('data-id');
      history.pushState({}, '', `blog.html?id=${articleId}`);
      loadArticle(articleId);
    });
  });
}

// Показ ошибки
function showError(message) {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (container) {
    container.innerHTML = `
      <div class="blog-error">
        <p>${message}</p>
        <button onclick="location.reload()">Обновить</button>
      </div>
    `;
  }
}

// Обработка навигации по истории
window.addEventListener('popstate', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  
  if (articleId) {
    loadArticle(articleId);
  } else {
    showBlogListing();
  }
});