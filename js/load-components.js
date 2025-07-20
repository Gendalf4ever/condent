const CONFIG = {
  basePath: '/',
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
      postProcessingTable: 'includes/tables/post-processing-table.html'
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

window.setPageHeader = function(title) {
  const header = document.getElementById('dynamic-page-header') || 
    document.body.insertAdjacentHTML('afterbegin', `
      <section class="page-header" id="dynamic-page-header">
        <div class="page-header__container">
          <h1 class="page-header__title">${title}</h1>
        </div>
      </section>
    `);
  
  const titleElement = header.querySelector('.page-header__title');
  if (titleElement) titleElement.textContent = title;
};

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
      });
    }
  }
};

const PrinterTables = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    try {
      await loadComponent(CONFIG.paths.components.mighty8kTable, '#mighty8k-table');
      await loadComponent(CONFIG.paths.components.mini8kTable, '#mini8k-table');
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

const BannerSystem = {
  async loadAttentionBanner() {
    if (localStorage.getItem('attentionBannerClosed')) return;
    
    const loaded = await loadComponent(
      CONFIG.paths.components.attentionBanner,
      'body'
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
    return CONFIG.blog.articles
      .filter(article => article.id !== currentArticleId)
      .sort(() => 0.5 - Math.random())
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
    });
  });
}

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

async function initializePage() {
  try {
    // 1. Основные компоненты
    await loadComponent(CONFIG.paths.components.header, 'body', 'afterbegin');
    initMobileMenu();
    
    // 2. Баннеры
    await BannerSystem.loadAttentionBanner();
    
    // 3. Футер и кнопка помощи
    await loadComponent(CONFIG.paths.components.footer, 'body');
    await loadComponent(CONFIG.paths.components.helpButton, 'body');
    
    // 4. Специальные компоненты
    await CompanyDetails.load();
    await TestMeButton.load();
    await PrinterTables.load();
    await PostProcessingTable.load();
    
    // 5. Обработка блога
    if (window.location.pathname.includes('blog.html')) {
      const articleId = new URL(window.location.href).searchParams.get('article');
      articleId ? await loadArticle(articleId) : showBlogListing();
    }
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

window.addEventListener('popstate', () => {
  if (window.location.pathname.includes('blog.html')) {
    const articleId = new URL(window.location.href).searchParams.get('article');
    articleId ? loadArticle(articleId) : showBlogListing();
  }
});

if (document.readyState === 'complete') {
  setTimeout(initializePage, 0);
} else {
  document.addEventListener('DOMContentLoaded', initializePage);
}