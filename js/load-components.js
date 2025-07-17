/**
 * CO[D]ENT - Components Loader v3.4
 * - Универсальная система загрузки компонентов
 * - Автоматическая загрузка реквизитов на странице контактов
 * - Поддержка блога и баннеров
 */

const CONFIG = {
  basePath: '/',
  paths: {
    components: {
      header: 'header.html',
      footer: 'footer.html',
      helpButton: 'includes/help-button.html',
      attentionBanner: 'includes/attention-banner.html',
      companyDetails: 'includes/company-details.html'
    },
    content: 'content/'
  },
  blog: {
    containerId: 'article-container',
    articles: [
      { id: 'what_is_post_processing', title: 'Постобработка полимерной печати', date: '25.08.2023' },
      { id: 'korea', title: 'Корея как бренд', date: '26.01.2023' },
      { id: '3D-printed-in-window', title: '3D принтер в окно', date: '19.01.2023' },
      { id: 'sell_me_3d_printer', title: 'Продайте мне 3D принтер', date: '12.01.2023' },
      { id: 'name_on_my_underwear', title: 'Чье имя на бирке моих трусов?', date: '05.01.2023' }
    ]
  }
};

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Установка заголовка страницы
window.setPageHeader = function(title) {
  let header = document.getElementById('dynamic-page-header');
  if (!header) {
    document.body.insertAdjacentHTML('afterbegin', `
      <section class="page-header" id="dynamic-page-header">
        <div class="page-header__container">
          <h1 class="page-header__title">${title}</h1>
        </div>
      </section>
    `);
    header = document.getElementById('dynamic-page-header');
  }
  const titleElement = header.querySelector('.page-header__title');
  if (titleElement) titleElement.textContent = title;
};

// Загрузка компонента
window.loadComponent = async function(componentPath, targetSelector = 'body', position = 'beforeend') {
  try {
    const response = await fetch(`${CONFIG.basePath}${componentPath}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.warn(`Target "${targetSelector}" not found`);
      return false;
    }
    
    target.insertAdjacentHTML(position, html);
    return true;
  } catch (error) {
    console.error(`Failed to load ${componentPath}:`, error);
    return false;
  }
};

// ==================== СИСТЕМА РЕКВИЗИТОВ ====================

const CompanyDetails = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    const loaded = await loadComponent(
      CONFIG.paths.components.companyDetails,
      '.footer-contacts-container',
      'beforeend'
    );
    
    if (loaded) this.initToggle();
    return loaded;
  },

  shouldLoad() {
    return window.location.pathname.includes('contacts.html');
  },

  initToggle() {
    const details = document.querySelector('.company-details');
    if (!details) return;

    const toggleBtn = details.querySelector('.company-details__toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      details.classList.toggle('expanded');
      const icon = toggleBtn.querySelector('i');
      icon.classList.toggle('fa-plus');
      icon.classList.toggle('fa-minus');
    });
  }
};

// ==================== СИСТЕМА БАННЕРОВ ====================

const BannerSystem = {
  async loadAttentionBanner() {
    if (localStorage.getItem('attentionBannerClosed')) return;
    
    const loaded = await loadComponent(
      CONFIG.paths.components.attentionBanner,
      'body',
      'beforeend'
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

// ==================== СИСТЕМА БЛОГА ====================

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
        </article>
      `;
      document.title = `${article.title} | Блог CO[D]ENT`;
      return true;
    }
    throw new Error('Article container not found');
  } catch (error) {
    console.error('Article load error:', error);
    showBlogListing();
    return false;
  }
};

function showBlogListing() {
  const container = document.getElementById(CONFIG.blog.containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="blog-listing">
      <h2>Статьи блога</h2>
      <ul class="blog-articles-list">
        ${CONFIG.blog.articles.map(article => `
          <li class="blog-article-item">
            <a href="blog.html?article=${article.id}" class="article-link">
              <h3 class="article-title">${article.title}</h3>
              <time class="article-date">${article.date}</time>
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  document.title = 'Блог CO[D]ENT';
  setupArticleLinks();
}

function setupArticleLinks() {
  document.querySelectorAll('.article-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const articleId = new URL(link.href).searchParams.get('article');
      history.pushState({ articleId }, '', `blog.html?article=${articleId}`);
      await loadArticle(articleId);
    });
  });
}

// ==================== МОБИЛЬНОЕ МЕНЮ ====================

function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.nav');
  
  if (menuBtn && navMenu) {
    menuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      document.body.classList.toggle('no-scroll');
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav') && !e.target.closest('.mobile-menu-btn')) {
        navMenu.classList.remove('active');
        document.body.classList.remove('no-scroll');
      }
    });
  }
}

// ==================== ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ====================

async function initializePage() {
  try {
    // 1. Основные компоненты
    await loadComponent(CONFIG.paths.components.header, 'body', 'afterbegin');
    initMobileMenu();
    
    // 2. Баннеры
    await BannerSystem.loadAttentionBanner();
    
    // 3. Футер и доп. элементы
    await loadComponent(CONFIG.paths.components.footer, 'body');
    await loadComponent(CONFIG.paths.components.helpButton, 'body');
    
    // 4. Реквизиты (только для контактов)
    await CompanyDetails.load();
    
    // 5. Блог (если требуется)
    if (window.location.pathname.includes('blog.html')) {
      const articleId = new URL(window.location.href).searchParams.get('article');
      articleId ? await loadArticle(articleId) : showBlogListing();
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

window.addEventListener('popstate', () => {
  if (window.location.pathname.includes('blog.html')) {
    const articleId = new URL(window.location.href).searchParams.get('article');
    articleId ? loadArticle(articleId) : showBlogListing();
  }
});

// ==================== ЗАПУСК СИСТЕМЫ ====================

if (document.readyState === 'complete') {
  setTimeout(initializePage, 0);
} else {
  document.addEventListener('DOMContentLoaded', initializePage);
}