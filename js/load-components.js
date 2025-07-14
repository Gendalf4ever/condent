window.setPageHeader = function(title) {
  try {
    let header = document.getElementById('dynamic-page-header');
    
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
  } catch (error) {
    console.error('Error setting page header:', error);
  }
};

window.loadComponent = async function(componentPath, targetSelector = 'body', position = 'beforeend') {
  try {
    const response = await fetch(componentPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const target = document.querySelector(targetSelector);
    
    if (!target) {
      console.warn(`Target "${targetSelector}" not found for ${componentPath}`);
      return false;
    }
    
    target.insertAdjacentHTML(position, html);
    console.log(`✅ ${componentPath} loaded to ${targetSelector}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to load ${componentPath}:`, error);
    return false;
  }
};

const BannerSystem = {
  config: {
    attention: {
      path: 'includes/attention-banner.html',
      target: 'body',
      position: 'beforeend',
      storageKey: 'attentionBannerClosed'
    },
    custom: {
      path: 'includes/custom-banner.html',
      target: '.footer-container',
      position: 'beforebegin',
      pages: [
        '3d-printers.html',
        '3d-scaners.html',
        'photo-polymers.html',
        'post-obrabotka.html',
        '3d-consumables.html',
        'milling.html',
        'frezy.html',
        'sinterising.html',
        'zirkon.html',
        'compressors.html'
      ]
    }
  },

  async loadAttentionBanner() {
    try {
      const { path, target, position, storageKey } = this.config.attention;
      const loaded = await loadComponent(path, target, position);
      
      if (loaded) {
        const banner = document.querySelector('.attention-banner');
        if (banner) {
          if (localStorage.getItem(storageKey)) {
            banner.style.display = 'none';
          } else {
            banner.style.display = 'block';
            this.initCloseButton(banner, storageKey);
          }
        }
      }
    } catch (error) {
      console.error('Attention banner error:', error);
    }
  },

  async loadCustomBanner() {
    if (!this.shouldShowCustomBanner()) return;
    
    const { path, target, position } = this.config.custom;
    const targetElement = document.querySelector(target);
    
    if (!targetElement) {
      console.warn(`Custom banner target "${target}" not found`);
      return;
    }
    
    await loadComponent(path, target, position);
  },

  shouldShowCustomBanner() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    return this.config.custom.pages.includes(currentPage);
  },

  initCloseButton(banner, storageKey) {
    const closeBtn = banner.querySelector('.attention-banner__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        banner.style.display = 'none';
        localStorage.setItem(storageKey, 'true');
      });
    }
  }
};

// ==================== ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ====================
async function initializePage() {
  console.group('🚀 Initializing Page Components');
  
  try {
    // 1. Загрузка основных компонентов
    await loadComponent('header.html', 'body', 'afterbegin');
    initMobileMenu();
    
    // 2. Загрузка футера перед баннерами
    const footerLoaded = await loadComponent('footer.html', 'body');
    
    if (footerLoaded) {
      // 3. Загрузка баннеров
      await BannerSystem.loadAttentionBanner();
      await BannerSystem.loadCustomBanner();
    }
    
    // 4. Дополнительные компоненты
    await loadComponent('includes/help-button.html', 'body');
    
    console.log('🌈 All components loaded successfully');
  } catch (error) {
    console.error('💥 Initialization failed:', error);
  } finally {
    console.groupEnd();
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
function runWhenReady() {
  if (document.readyState === 'complete') {
    setTimeout(initializePage, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initializePage);
  }
}

runWhenReady();