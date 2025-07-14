/**
 * CO[D]ENT - Components Loader v3.1
 * - Упрощённая система баннеров
 * - Логотип компании в начале баннера
 * - Чёткое разделение элементов
 */

// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ====================
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
    const response = await fetch(componentPath);
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

// ==================== СИСТЕМА БАННЕРОВ ====================
const BannerSystem = {
  config: {
    attention: {
      path: 'includes/attention-banner.html',
      target: 'body',
      position: 'beforeend',
      storageKey: 'attentionBannerClosed'
    },
    custom: {
      path: 'includes/company-banner.html', // Переименовано для ясности
      target: 'main', // Лучше вставлять в main
      position: 'beforeend',
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
    if (localStorage.getItem(this.config.attention.storageKey)) return;

    const { path, target, position } = this.config.attention;
    const loaded = await loadComponent(path, target, position);
    
    if (loaded) {
      const banner = document.querySelector('.attention-banner');
      if (banner) {
        banner.style.display = 'block';
        this.initCloseButton(banner, this.config.attention.storageKey);
      }
    }
  },

  async loadCompanyBanner() {
    if (!this.shouldShowCompanyBanner()) return;
    
    const { path, target, position } = this.config.custom;
    await loadComponent(path, target, position);
  },

  shouldShowCompanyBanner() {
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
  try {
    // 1. Основные компоненты
    await loadComponent('header.html', 'body', 'afterbegin');
    initMobileMenu();
    
    // 2. Баннеры
    await BannerSystem.loadAttentionBanner();
    await BannerSystem.loadCompanyBanner(); // Переименовано для ясности
    
    // 3. Футер и дополнительные элементы
    await loadComponent('footer.html', 'body');
    await loadComponent('includes/help-button.html', 'body');
    
  } catch (error) {
    console.error('Initialization error:', error);
  }
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

// ==================== ЗАПУСК СИСТЕМЫ ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  setTimeout(initializePage, 0);
}