const CONFIG = {
  // Автоматическое определение basePath для GitHub Pages и локального сервера
  basePath: (function() {
    if (window.location.hostname.includes('github.io')) {
      const repoName = window.location.pathname.split('/')[1];
      return repoName ? `/${repoName}/` : '/';
    }
    return '/';
  })(),
  
  paths: {
    components: {
      header: 'header.html',
      footer: 'footer.html',
      helpButton: 'includes/help-button.html',
      attentionBanner: 'includes/attention-banner.html',
      companyDetails: 'includes/company-details.html',
      relatedArticles: 'includes/related-articles.html',
      testMeButton: 'includes/test-me-button.html',
      mighty8kTable: 'includes/tables/phrozen-sonic-mighty8k.html',
      mini8kTable: 'includes/tables/phrozen-sonic-mini8k.html',
      postProcessingTable: 'includes/tables/post-processing-table.html',
      millingProducts: 'includes/tables/milling-products.html'
    },
    content: 'content/'
  },
  
  blog: {
    containerId: 'article-container',
    relatedCount: 3,
    articles: [
      { id: 'what_is_post_processing', title: 'Постобработка полимерной печати', date: '25.08.2023', tags: ['3D-печать', 'технологии'] },
      { id: 'korea', title: 'Корея как бренд', date: '26.01.2023', tags: ['брендинг', 'аналитика'] },
      { id: '3D-printed-in-window', title: '3D принтер в окно', date: '19.01.2023', tags: ['3D-печать', 'оборудование'] },
      { id: 'sell_me_3d_printer', title: 'Продайте мне 3D принтер', date: '12.01.2023', tags: ['оборудование', 'советы'] },
      { id: 'name_on_my_underwear', title: 'Чье имя на бирке моих трусов?', date: '05.01.2023', tags: ['аналитика', 'брендинг'] }
    ]
  }
};

// Улучшенная функция установки заголовка страницы
window.setPageHeader = function(title, subtitle = '') {
  let header = document.getElementById('dynamic-page-header');
  
  if (!header) {
    document.body.insertAdjacentHTML('afterbegin', `
      <section class="page-header" id="dynamic-page-header">
        <div class="page-header__container">
          <h1 class="page-header__title">${title}</h1>
          ${subtitle ? `<p class="page-header__subtitle">${subtitle}</p>` : ''}
        </div>
      </section>
    `);
    header = document.getElementById('dynamic-page-header');
  }
  
  const titleElement = header.querySelector('.page-header__title');
  if (titleElement) titleElement.textContent = title;
  
  const subtitleElement = header.querySelector('.page-header__subtitle');
  if (subtitleElement && subtitle) {
    subtitleElement.textContent = subtitle;
  }
};

// Улучшенная функция загрузки компонентов с кэшированием
const componentCache = new Map();

window.loadComponent = async function(componentPath, targetSelector = 'body', position = 'beforeend') {
  try {
    const fullPath = `${CONFIG.basePath}${componentPath}`.replace(/([^:]\/)\/+/g, '$1');
    
    // Проверка кэша
    if (componentCache.has(fullPath)) {
      const html = componentCache.get(fullPath);
      return insertHtml(html, targetSelector, position);
    }
    
    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    componentCache.set(fullPath, html); // Кэшируем результат
    
    return insertHtml(html, targetSelector, position);
    
  } catch (error) {
    console.error(`Failed to load ${componentPath}:`, error);
    return false;
  }
  
  function insertHtml(html, targetSelector, position) {
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.warn(`Target "${targetSelector}" not found`);
      return false;
    }
    
    target.insertAdjacentHTML(position, html);
    return true;
  }
};

// Модуль для кнопки тестирования
const TestMeButton = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    const loaded = await loadComponent(
      CONFIG.paths.components.testMeButton,
      'body',
      'beforeend'
    );
    
    if (loaded) this.initButton();
    return loaded;
  },

  shouldLoad() {
    return window.location.pathname.includes('printers-set.html');
  },

  initButton() {
    const button = document.querySelector('.test-button');
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Тестовая кнопка нажата');
        // Добавьте свою логику здесь
      });
    }
  }
};

// Модуль для таблиц принтеров
const PrinterTables = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    try {
      await Promise.all([
        loadComponent(CONFIG.paths.components.mighty8kTable, '#mighty8k-table'),
        loadComponent(CONFIG.paths.components.mini8kTable, '#mini8k-table')
      ]);
      return true;
    } catch (error) {
      console.error('Ошибка загрузки таблиц:', error);
      return false;
    }
  },

  shouldLoad() {
    return window.location.pathname.includes('printers-set.html');
  }
};

// Модуль для контактной информации компании
const CompanyDetails = {
  async load() {
    if (!this.shouldLoad()) return false;
    return await loadComponent(
      CONFIG.paths.components.companyDetails,
      '.footer-contacts-container'
    );
  },

  shouldLoad() {
    return window.location.pathname.includes('contacts.html');
  }
};

// Модуль для таблицы постобработки
const PostProcessingTable = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    try {
      await loadComponent(
        CONFIG.paths.components.postProcessingTable,
        '.post-processing-content table.post-processing-table',
        'afterend'
      );
      return true;
    } catch (error) {
      console.error('Ошибка загрузки таблицы постобработки:', error);
      return false;
    }
  },

  shouldLoad() {
    return window.location.pathname.includes('post-processing.html');
  }
};

// Модуль для фрезерных станков
const MillingProducts = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    try {
      const loaded = await loadComponent(
        CONFIG.paths.components.millingProducts,
        '#milling-products',
        'beforeend'
      );
      
      if (loaded) {
        this.initProductCards();
      }
      return loaded;
    } catch (error) {
      console.error('Ошибка загрузки фрезерных станков:', error);
      return false;
    }
  },

  shouldLoad() {
    return window.location.pathname.includes('milling.html');
  },

  initProductCards() {
    // Инициализация взаимодействия с карточками товаров
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        console.log('Карточка товара нажата', card.dataset.productId);
      });
    });
  }
};

// Модуль для баннерной системы
const BannerSystem = {
  async loadAttentionBanner() {
    if (localStorage.getItem('attentionBannerClosed')) return;
    
    const loaded = await loadComponent(
      CONFIG.paths.components.attentionBanner,
      'body',
      'afterbegin'
    );

    if (loaded) {
      const banner = document.querySelector('.attention-banner');
      if (banner) {
        banner.style.display = 'block';
        this.initCloseButton(banner);
      }
    }
  },

  initCloseButton(banner) {
    const closeBtn = banner.querySelector('.attention-banner__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.style.transform = 'translateY(100%)';
        setTimeout(() => banner.remove(), 300);
        localStorage.setItem('attentionBannerClosed', 'true');
      });
    }
  }
};

// Функции для работы с блогом
window.loadArticle = async function(articleId) {
  try {
    const article = CONFIG.blog.articles.find(a => a.id === articleId);
    if (!article) throw new Error('Article not found');
    
    const response = await fetch(`${CONFIG.basePath}${CONFIG.paths.content}${articleId}.html`);
    if (!response.ok) throw new Error(`File not found: ${articleId}`);
    
    const content = await response.text();
    const container = document.getElementById(CONFIG.blog.containerId);
    
    if (container) {
      container.innerHTML = `
        <article class="blog-article">
          <header class="article-header">
            <h2>${article.title}</h2>
            <time class="article-date">${article.date}</time>
          </header>
          <div class="article-content">${content}</div>
          <div class="related-articles-container"></div>
        </article>
      `;
      document.title = `${article.title} | Блог CO[D]ENT`;
      await RelatedArticles.load(articleId);
      return true;
    }
    throw new Error('Article container not found');
  } catch (error) {
    console.error('Article load error:', error);
    showBlogListing();
    return false;
  }
};

const RelatedArticles = {
  async load(currentArticleId) {
    const related = this.getRelatedArticles(currentArticleId);
    if (related.length === 0) return;

    const container = document.querySelector('.related-articles-container');
    if (!container) return;

    await loadComponent(CONFIG.paths.components.relatedArticles, container);
    this.renderArticles(related);
  },

  getRelatedArticles(currentArticleId) {
    // Находим текущую статью для определения тегов
    const currentArticle = CONFIG.blog.articles.find(a => a.id === currentArticleId);
    const currentTags = currentArticle?.tags || [];
    
    return CONFIG.blog.articles
      .filter(article => article.id !== currentArticleId)
      .sort((a, b) => {
        // Сначала статьи с общими тегами
        const aCommonTags = a.tags.filter(tag => currentTags.includes(tag)).length;
        const bCommonTags = b.tags.filter(tag => currentTags.includes(tag)).length;
        return bCommonTags - aCommonTags || Math.random() - 0.5;
      })
      .slice(0, CONFIG.blog.relatedCount);
  },

  renderArticles(articles) {
    const container = document.querySelector('.related-articles');
    if (!container) return;

    container.innerHTML = `
      <h3 class="related-title">Смотрите также</h3>
      <div class="related-articles-grid">
        ${articles.map(article => `
          <article class="related-article">
            <h4><a href="blog.html?article=${article.id}" class="related-link">${article.title}</a></h4>
            <time class="related-date">${article.date}</time>
            <div class="article-tags">
              ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    `;
    this.initLinks();
  },

  initLinks() {
    document.querySelectorAll('.related-link').forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const articleId = new URL(link.href).searchParams.get('article');
        history.pushState({ articleId }, '', `blog.html?article=${articleId}`);
        await loadArticle(articleId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }
};

function showBlogListing() {
  const container = document.getElementById(CONFIG.blog.containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="blog-listing">
      <h2>Все статьи</h2>
      <div class="articles-grid">
        ${CONFIG.blog.articles.map(article => `
          <article class="article-card">
            <h3><a href="blog.html?article=${article.id}" class="article-link">${article.title}</a></h3>
            <time class="article-date">${article.date}</time>
            <div class="article-tags">
              ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
  setupArticleLinks();
}

function setupArticleLinks() {
  document.querySelectorAll('.article-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const articleId = new URL(link.href).searchParams.get('article');
      history.pushState({ articleId }, '', `blog.html?article=${articleId}`);
      await loadArticle(articleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// Мобильное меню
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.nav');
  
  if (menuBtn && navMenu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
      document.body.classList.toggle('no-scroll');
      menuBtn.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav') && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        document.body.classList.remove('no-scroll');
        menuBtn?.classList.remove('active');
      }
    });
  }
}

// Инициализация страницы
async function initializePage() {
  try {
    // 1. Основные компоненты
    await Promise.all([
      loadComponent(CONFIG.paths.components.header, 'body', 'afterbegin'),
      loadComponent(CONFIG.paths.components.footer, 'body', 'beforeend'),
      loadComponent(CONFIG.paths.components.helpButton, 'body', 'beforeend')
    ]);
    
    initMobileMenu();
    
    // 2. Баннеры
    await BannerSystem.loadAttentionBanner();
    
    // 3. Специальные компоненты
    await Promise.all([
      CompanyDetails.load(),
      TestMeButton.load(),
      PrinterTables.load(),
      PostProcessingTable.load(),
      MillingProducts.load()
    ]);
    
    // 4. Обработка блога
    if (window.location.pathname.includes('blog.html')) {
      const articleId = new URL(window.location.href).searchParams.get('article');
      articleId ? await loadArticle(articleId) : showBlogListing();
    }
    
    // Добавляем класс для индикации загрузки
    document.documentElement.classList.add('page-loaded');
    
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// Обработка навигации
window.addEventListener('popstate', () => {
  if (window.location.pathname.includes('blog.html')) {
    const articleId = new URL(window.location.href).searchParams.get('article');
    articleId ? loadArticle(articleId) : showBlogListing();
  }
});

// Запуск инициализации
if (document.readyState === 'complete') {
  setTimeout(initializePage, 0);
} else {
  document.addEventListener('DOMContentLoaded', initializePage);
}