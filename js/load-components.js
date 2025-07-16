const CONFIG = {
  paths: {
    components: {
      header: 'header.html',
      footer: 'footer.html',
      helpButton: 'includes/help-button.html',
      attentionBanner: 'includes/attention-banner.html'
    },
    content: 'content/' // Папка со статьями
  },
  blogContainerId: 'article-container' // ID контейнера для статей
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
  
  const titleElement = header.querySelector?.('.page-header__title');
  if (titleElement) titleElement.textContent = title;
};

window.loadComponent = async function(componentPath, targetSelector = 'body', position = 'beforeend') {
  try {
    const response = await fetch(componentPath);
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

window.loadArticle = async function(articleName) {
  try {
    const articlePath = `${CONFIG.paths.content}${articleName}.html`;
    const response = await fetch(articlePath);
    
    if (!response.ok) {
      showBlogListing();
      throw new Error(`Article not found: ${articleName}`);
    }
    
    const content = await response.text();
    const container = document.getElementById(CONFIG.blogContainerId);
    
    if (container) {
      container.innerHTML = content;
      document.title = `${articleName} | Блог CO[D]ENT`;
      return true;
    }
    
    throw new Error('Article container not found');
  } catch (error) {
    console.error('Article load error:', error);
    return false;
  }
};

function showBlogListing() {
  const container = document.getElementById(CONFIG.blogContainerId);
  if (container) {
    container.innerHTML = `
      <div class="blog-listing">
        <h2>Статьи блога</h2>
        <ul>
          <li><a href="korea.html">Постобработка полимерной печати, что это и  с чем едят</a></li>
                    <li><a href="korea.html">Корея как бренд</a></li>
                    <li><a href="korea.html"> 3D принтер в окно</a></li>
                    <li><a href="korea.html">Продайте мне 3D принтер</a></li>
                    <li><a href="korea.html">Чье имя на бирке моих трусов?</a></li>
        </ul>
      </div>
    `;
  }
}

const BannerSystem = {
  async loadAttentionBanner() {
    if (localStorage.getItem('attentionBannerClosed')) return;
    
    const loaded = await loadComponent(
      CONFIG.paths.attentionBanner, 
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
        banner.style.display = 'none';
        localStorage.setItem('attentionBannerClosed', 'true');
      });
    }
  }
};

async function initializePage() {
  try {
    // 1. Загрузка основных компонентов
    await loadComponent(CONFIG.paths.header, 'body', 'afterbegin');
    initMobileMenu();
    
    // 2. Загрузка баннеров
    await BannerSystem.loadAttentionBanner();
    
    // 3. Загрузка футера
    await loadComponent(CONFIG.paths.footer, 'body');
    
    // 4. Загрузка кнопки помощи
    await loadComponent(CONFIG.paths.helpButton, 'body');
    
    // 5. Загрузка статьи (если это страница статьи)
    const articleName = getArticleNameFromUrl();
    if (articleName) {
      await loadArticle(articleName);
    } else if (window.location.pathname.includes('blog.html')) {
      showBlogListing();
    }
    
  } catch (error) {
    console.error('Initialization failed:', error);
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

function getArticleNameFromUrl() {
  const path = window.location.pathname.split('/').pop();
  return path.endsWith('.html') && !['index.html', 'blog.html'].includes(path) 
    ? path.replace('.html', '') 
    : null;
}

if (document.readyState === 'complete') {
  setTimeout(initializePage, 0);
} else {
  document.addEventListener('DOMContentLoaded', initializePage);
}