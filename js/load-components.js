function setPageHeader(title) {
  // Проверяем, существует ли уже заголовок
  let header = document.getElementById('dynamic-page-header');
  
  if (!header) {
    // Если нет - создаем новый
    document.body.insertAdjacentHTML('afterbegin', `
      <section class="page-header" id="dynamic-page-header">
        <div class="page-header__container">
          <h1 class="page-header__title">${title}</h1>
        </div>
      </section>
    `);
  } else {
    // Если есть - просто обновляем текст
    header.querySelector('.page-header__title').textContent = title;
  }
}

// Функция для загрузки и вставки HTML-компонентов
async function loadComponent(componentPath, targetElement, position = 'beforeend') {
    try {
        // Загружаем HTML-файл компонента
        const response = await fetch(componentPath);
        if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
        
        // Получаем текст HTML
        const html = await response.text();
        
        // Вставляем HTML в указанное место
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

// Инициализация мобильного меню (вынесено в отдельную функцию)
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

//  Инициализация баннера внимания
function initAttentionBanner() {
    const closeBtn = document.querySelector('.attention-banner__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            const banner = this.closest('.attention-banner');
            if (banner) {
                banner.style.display = 'none';
                localStorage.setItem('attentionBannerClosed', 'true');
            }
        });
    }
    
    if (localStorage.getItem('attentionBannerClosed') === 'true') {
        const banner = document.querySelector('.attention-banner');
        if (banner) banner.style.display = 'none';
    }
}

// Основная функция загрузки компонентов
async function loadAllComponents() {
    try {
        // Загружаем хедер
        await loadComponent('header.html', 'body', 'afterbegin');
        initMobileMenu();
        
        // Убеждаемся, что page-header существует
        if (!document.querySelector('.page-header')) {
            setPageHeader(''); // Создаем заголовок с пустым текстом, если его нет
        }
        
        // Загружаем баннер внимания
       await loadComponent('includes/attention-banner.html', 'body', 'beforeend');
      initAttentionBanner();
        
        // Загружаем футер
        await loadComponent('footer.html', 'body');
        
        // Загружаем кнопку помощи
        await loadComponent('includes/help-button.html', 'body');
        
    } catch (error) {
        console.error('Ошибка при загрузке компонентов:', error);
    }
}

// Запускаем загрузку компонентов при полной загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    loadAllComponents();
});