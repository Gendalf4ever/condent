// Конфигурация
const BLOG_CONFIG = {
  sheetId: '1Hxmx_tznE64ifvKON4-waL6x7BYQ7plf1nWta5nsMlI',
  sheetName: 'blog',
  containerId: 'article-container'
};

let blogArticles = [];

// Инициализация блога
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadBlogData();
    
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (articleId) {
      await loadArticle(articleId);
    } else {
      showBlogListing();
    }
  } catch (error) {
    console.error('Ошибка инициализации блога:', error);
    showError('Произошла ошибка при загрузке блога');
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
    
    // Фильтруем пустые статьи и сортируем по дате
    blogArticles = blogArticles
      .filter(article => article.id && article.название)
      .sort((a, b) => {
        const dateA = a.formattedDate || new Date(0);
        const dateB = b.formattedDate || new Date(0);
        return dateB - dateA; // Новые сначала
      });
    
    console.log('Загруженные статьи:', blogArticles);
  } catch (error) {
    console.error('Ошибка загрузки данных блога:', error);
    throw error;
  }
}

// Улучшенный парсер CSV
function parseBlogCSV(csvText) {
  // Удаляем BOM символ если есть
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.substring(1);
  }
  
  const lines = csvText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length < 1) return [];
  
  // Определяем разделитель (tab или запятая)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter)
    .map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line, delimiter);
    const article = {};
    
    headers.forEach((header, index) => {
      let value = (values[index] || '').trim();
      
      // Очистка значений
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      article[header] = value;
      
      // Специальная обработка для даты
      if (header === 'дата' && value) {
        article.formattedDate = parseDate(value);
      }
    });
    
    return article;
  });
}

// Парсинг одной строки CSV с учетом кавычек
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

// Универсальный парсер дат
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Пробуем разные форматы даты
  const formats = [
    { regex: /(\d{2})\.(\d{2})\.(\d{4})/, parts: [3, 2, 1] }, // DD.MM.YYYY
    { regex: /(\d{4})-(\d{2})-(\d{2})/, parts: [1, 2, 3] },   // YYYY-MM-DD
    { regex: /(\d{2})\/(\d{2})\/(\d{4})/, parts: [3, 1, 2] }  // MM/DD/YYYY
  ];
  
  for (const format of formats) {
    const match = dateString.match(format.regex);
    if (match) {
      const year = match[format.parts[0]];
      const month = match[format.parts[1]];
      const day = match[format.parts[2]];
      const date = new Date(`${year}-${month}-${day}`);
      
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  console.warn(`Не удалось распознать дату: ${dateString}`);
  return null;
}

// Форматирование даты для отображения
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = parseDate(dateString) || new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return dateString; // Возвращаем как есть, если не удалось распарсить
  }
  
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
      throw new Error(`Статья с ID ${articleId} не найдена`);
    }
    
    const container = document.getElementById(BLOG_CONFIG.containerId);
    if (!container) {
      throw new Error('Контейнер для статей не найден');
    }
    
    container.innerHTML = `
      <article class="blog-article">
        <header class="article-header">
          <h1>${escapeHtml(article.название)}</h1>
          ${article.дата ? `<time class="article-date">${formatDate(article.дата)}</time>` : ''}
        </header>
        <div class="article-content">
          ${formatContent(article.контент)}
        </div>
        <a href="blog.html" class="back-to-blog">← Вернуться к списку статей</a>
      </article>
    `;
    
    document.querySelector('.back-to-blog')?.addEventListener('click', (e) => {
      e.preventDefault();
      history.pushState({}, '', 'blog.html');
      showBlogListing();
    });
    
    document.title = `${escapeHtml(article.название)} | Блог CO[D]ENT`;
    window.scrollTo(0, 0);
    
  } catch (error) {
    console.error('Ошибка загрузки статьи:', error);
    showError(`Не удалось загрузить статью: ${error.message}`);
    showBlogListing();
  }
}

// Показ списка статей
function showBlogListing() {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (!container) return;
  
  try {
    if (!blogArticles || blogArticles.length === 0) {
      container.innerHTML = '<div class="no-articles">Нет доступных статей</div>';
      return;
    }
    
    container.innerHTML = `
      <div class="blog-listing">
        <h1>Блог CO[D]ENT</h1>
        <div class="articles-grid">
          ${blogArticles.map(article => `
            <article class="article-card">
              <h2>
                <a href="blog.html?id=${escapeHtml(article.id)}" class="article-link">
                  ${escapeHtml(article.название)}
                </a>
              </h2>
              ${article.дата ? `<time class="article-date">${formatDate(article.дата)}</time>` : ''}
              <div class="article-excerpt">
                ${truncateText(escapeHtml(article.контент || ''), 150)}
              </div>
              <a href="blog.html?id=${escapeHtml(article.id)}" class="read-more">Читать далее</a>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    
    document.querySelectorAll('.article-link, .read-more').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const articleId = new URL(link.href).searchParams.get('id');
        history.pushState({}, '', `blog.html?id=${articleId}`);
        await loadArticle(articleId);
      });
    });
    
  } catch (error) {
    console.error('Ошибка отображения списка статей:', error);
    showError('Не удалось загрузить список статей');
  }
}

// Вспомогательные функции
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateText(text, length) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function formatContent(content) {
  if (!content) return '';
  return escapeHtml(content)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.*?)\*/g, '<em>$1</em>'); // *italic*
}

// Показ ошибки
function showError(message) {
  const container = document.getElementById(BLOG_CONFIG.containerId);
  if (container) {
    container.innerHTML = `
      <div class="blog-error">
        <p>${escapeHtml(message)}</p>
        <button onclick="location.reload()">Обновить страницу</button>
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