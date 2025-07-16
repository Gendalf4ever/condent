const CONFIG = {
  basePath: '/',
  
  paths: {
    components: {
      header: 'header.html',
      footer: 'footer.html',
      helpButton: 'includes/help-button.html',
      attentionBanner: 'includes/attention-banner.html'
    },
    content: 'content/'
  },
  
  blog: {
    containerId: 'article-container',
    articles: [
      { 
        id: 'what_is_post_processing', 
        title: 'Постобработка полимерной печати',
        date: '25.08.2023' 
      },
      { 
        id: 'korea', 
        title: 'Корея как бренд',
        date: '26.01.2023'
      },
      { 
        id: '3D-printed-in-window', 
        title: '3D принтер в окно',
        date: '19.01.2023'
      },
      { 
        id: 'sell_me_3d_printer', 
        title: 'Продайте мне 3D принтер',
        date: '12.01.2023'
      },
      { 
        id: 'name_on_my_underwear', 
        title: 'Чье имя на бирке моих трусов?',
        date: '05.01.2023'
      }
    ]
  }
};


window.setPageHeader = function(title) {
  const header = document.getElementById('dynamic-page-header');
  if (!header) {
    document.body.insertAdjacentHTML('afterbegin', `
      <section class="page-header" id="dynamic-page-header">
        <div class="page-header__container">
          <h1 class="page-header__title">${title}</h1>
        </div>
      </section>
    `);
  } else {
    const titleElement = header.querySelector('.page-header__title');
    if (titleElement) titleElement.textContent = title;
  }
};

window.loadComponent = async function(componentPath, targetSelector = 'body', position = 'beforeend') {
  try {
    const fullPath = `${CONFIG.basePath}${componentPath}`;
    console.log(`Loading component from: ${fullPath}`); // Отладочная информация
    
    const response = await fetch(fullPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const target = document.querySelector(targetSelector);
    
    if (!target) {
      console.warn(`Target "${targetSelector}" not found for ${componentPath}`);
      return false;
    }
    
    target.insertAdjacentHTML(position, html);
    return true;
  } catch (error) {
    console.error(`Failed to load ${componentPath}:`, error);
    return false;
  }
};


window.loadArticle = async function(articleId) {
  try {
    const article = CONFIG.blog.articles.find(a => a.id === articleId);
    if (!article) throw new Error('Статья не найдена в конфигурации');
    
    const articlePath = `${CONFIG.basePath}${CONFIG.paths.content}${articleId}.html`;
    const response = await fetch(articlePath);
    
    if (!response.ok) {
      showBlogListing();
      throw new Error(`Файл статьи не найден: ${articleId}`);
    }
    
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
    
    throw new Error('Контейнер для статей не найден');
  } catch (error) {
    console.error('Ошибка загрузки статьи:', error);
    showBlogListing();
    return false;
  }
};

function showBlogListing() {
  const container = document.getElementById(CONFIG.blog.containerId);
  if (container) {
    container.innerHTML = `
      <div class="blog-listing">
        <h2>Статьи блога</h2>
        <ul class="blog-articles-list">
          ${CONFIG.blog.articles.map(article => `
            <li class="blog-article-item">
              <a href="${CONFIG.basePath}blog.html?article=${article.id}" class="article-link">
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
}

function setupArticleLinks() {
  document.querySelectorAll('.article-link').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const articleId = new URL(link.href).searchParams.get('article');
      
      history.pushState({ articleId }, '', `${CONFIG.basePath}blog.html?article=${articleId}`);
      await loadArticle(articleId);
    });
  });
}


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

async function initializePage() {
  try {
    console.log('Initializing page...'); // Отладочное сообщение
    
    // 1. Загрузка основных компонентов
    await loadComponent(CONFIG.paths.components.header, 'body', 'afterbegin');
    initMobileMenu();
    
    // 2. Загрузка баннеров
    await BannerSystem.loadAttentionBanner();
    
    // 3. Загрузка футера
    await loadComponent(CONFIG.paths.components.footer, 'body');
    
    // 4. Загрузка кнопки помощи
    await loadComponent(CONFIG.paths.components.helpButton, 'body');
    
    // 5. Обработка блога (только для страницы blog.html)
    if (window.location.pathname.includes('blog.html')) {
      const articleId = new URL(window.location.href).searchParams.get('article');
      
      if (articleId && CONFIG.blog.articles.some(a => a.id === articleId)) {
        await loadArticle(articleId);
      } else {
        showBlogListing();
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
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


window.addEventListener('popstate', () => {
  if (window.location.pathname.includes('blog.html')) {
    const articleId = new URL(window.location.href).searchParams.get('article');
    
    if (articleId && CONFIG.blog.articles.some(a => a.id === articleId)) {
      loadArticle(articleId);
    } else {
      showBlogListing();
    }
  }
});


if (document.readyState === 'complete') {
  setTimeout(initializePage, 0);
} else {
  document.addEventListener('DOMContentLoaded', initializePage);
}