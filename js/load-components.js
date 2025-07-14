function setPageHeader(title) {
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
    header.querySelector('.page-header__title').textContent = title;
  }
}

function shouldShowCustomBanner() {
    const currentPage = window.location.pathname.split('/').pop() || '';
    
    // Никогда не показывать на главной странице
    if (currentPage === '' || currentPage === 'index.html') {
        return false;
    }

    const pagesWithBanner = [
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
    ];
    
    return pagesWithBanner.includes(currentPage);
}

async function loadCustomBanner() {
    if (shouldShowCustomBanner()) {
        console.log('Loading custom banner for:', window.location.pathname);
        await loadComponent('includes/banner.html', 'footer', 'beforebegin');
    }
}

async function loadComponent(componentPath, targetElement, position = 'beforeend') {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
        
        const html = await response.text();
        const target = document.querySelector(targetElement);
        
        if (target) {
            target.insertAdjacentHTML(position, html);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Ошибка при загрузке ${componentPath}:`, error);
        return false;
    }
}

function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav') && !e.target.closest('.mobile-menu-btn')) {
                navMenu.classList.remove('active');
            }
        });
    }
}

window.loadPageBanner = async function() {
    if (shouldShowCustomBanner()) {
        await loadComponent('includes/banner.html', 'footer', 'beforebegin');
    }
};

async function loadAllComponents() {
    try {
        // Загружаем основные компоненты
        await loadComponent('header.html', 'body', 'afterbegin');
        initMobileMenu();
        
        // Устанавливаем заголовок страницы если нужно
        if (!document.querySelector('.page-header')) {
            setPageHeader('');
        }
        
        // Загружаем футер
        await loadComponent('footer.html', 'body');
        
        // Загружаем кнопку помощи
        await loadComponent('includes/help-button.html', 'body');
        
        // Загружаем кастомный баннер (только на указанных страницах)
        await loadCustomBanner();
        
    } catch (error) {
        console.error('Ошибка при загрузке компонентов:', error);
    }
}

// Автоматическая загрузка при готовности DOM
document.addEventListener('DOMContentLoaded', () => {
    loadAllComponents();
});