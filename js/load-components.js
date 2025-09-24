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
      supportForm: 'includes/support-form.html', 
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
    
    const success = insertHtml(html, targetSelector, position);
    
    // Инициализируем компонент после загрузки
    if (success) {
      initComponentAfterLoad(componentPath, targetSelector);
    }
    
    return success;
    
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

// Функция для инициализации компонентов после загрузки
function initComponentAfterLoad(componentPath, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  
  // Инициализация реквизитов компании
  if (componentPath.includes('company-details')) {
    initCompanyDetails(target);
  }
  
  // Инициализация тестовой кнопки
  if (componentPath.includes('test-me-button')) {
    initTestMeButton(target);
  }
  
  // Инициализация таблиц
  if (componentPath.includes('tables/')) {
    initTables(target);
  }
  
  // Инициализация попап-формы
  if (componentPath.includes('support-form')) {
    initPopupForm();
  }
  
  // Инициализация хедера
  if (componentPath.includes('header')) {
    initMobileMenu();
  }
}

// Функция инициализации попап-формы
function initPopupForm() {
  console.log('Initializing popup form...');
  
  const popup = document.getElementById('contact-popup');
  const openPopupBtn = document.getElementById('open-contact-popup');
  const closePopupBtn = document.querySelector('.popup-close-btn');

  if (!popup) {
    console.warn('Popup element not found');
    return;
  }
  
  if (!openPopupBtn) {
    console.warn('Open popup button not found');
    return;
  }

  console.log('Popup elements found:', { popup, openPopupBtn, closePopupBtn });

  // Функция открытия попапа
  function openPopup() {
    console.log('Opening popup...');
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Функция закрытия попапа
  function closePopup() {
    console.log('Closing popup...');
    popup.classList.remove('active');
    document.body.style.overflow = '';
    closeCountryDropdown();
  }

  // Функции для работы с выбором кода страны
  function initCountryCodeSelector() {
    const countryCodeBtn = document.getElementById('country-code-btn');
    const countryDropdown = document.getElementById('country-dropdown');
    const phoneInput = document.getElementById('popup-phone');
    
    if (!countryCodeBtn || !countryDropdown) {
      console.warn('Country code selector elements not found');
      return;
    }
    
    console.log('Initializing country code selector...');
    
    // Открытие/закрытие выпадающего списка
    countryCodeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = countryDropdown.classList.contains('show');
      
      if (isOpen) {
        closeCountryDropdown();
      } else {
        // Закрываем другие открытые dropdown'ы если есть
        document.querySelectorAll('.country-dropdown.show').forEach(dropdown => {
          if (dropdown !== countryDropdown) {
            dropdown.classList.remove('show');
          }
        });
        
        countryDropdown.classList.add('show');
        countryCodeBtn.classList.add('active');
        
        // Прокручиваем к выбранной стране
        const selectedCode = countryCodeBtn.querySelector('.country-code').textContent.replace('+', '');
        const selectedOption = Array.from(countryDropdown.querySelectorAll('.country-option')).find(option => 
          option.getAttribute('data-code') === selectedCode
        );
        if (selectedOption) {
          selectedOption.scrollIntoView({ block: 'nearest' });
        }
      }
    });
    
    // Выбор страны
    countryDropdown.querySelectorAll('.country-option').forEach(option => {
      option.addEventListener('click', function() {
        const code = this.getAttribute('data-code');
        const flag = this.getAttribute('data-flag');
        
        console.log('Country selected:', code, flag);
        
        // Обновляем кнопку
        countryCodeBtn.querySelector('.country-flag').textContent = flag;
        countryCodeBtn.querySelector('.country-code').textContent = '+' + code;
        
        // Закрываем dropdown
        closeCountryDropdown();
        
        // Фокусируемся на поле ввода телефона
        phoneInput.focus();
      });
    });
    
    // Закрытие dropdown при клике вне его
    document.addEventListener('click', function(e) {
      if (!countryCodeBtn.contains(e.target) && !countryDropdown.contains(e.target)) {
        closeCountryDropdown();
      }
    });
    
    // Маска для телефона
    phoneInput.addEventListener('input', function(e) {
      formatPhoneNumber(this);
    });
    
    // Автофокус на поле ввода при открытии попапа
    phoneInput.addEventListener('focus', function() {
      if (this.value === '') {
        this.value = '(';
        this.setSelectionRange(1, 1);
      }
    });
  }
  
  function closeCountryDropdown() {
    const countryDropdown = document.getElementById('country-dropdown');
    const countryCodeBtn = document.getElementById('country-code-btn');
    
    if (countryDropdown) {
      countryDropdown.classList.remove('show');
    }
    if (countryCodeBtn) {
      countryCodeBtn.classList.remove('active');
    }
  }
  
  function formatPhoneNumber(input) {
    // Удаляем все нецифровые символы, кроме скобок и дефисов для позиционирования
    let numbers = input.value.replace(/\D/g, '');
    
    // Сохраняем позицию курсора
    const cursorPosition = input.selectionStart;
    
    // Форматируем номер по шаблону (000) 000-00-00
    if (numbers.length > 0) {
      numbers = numbers.substring(0, 10); // Ограничиваем до 10 цифр
      let formatted = '';
      
      if (numbers.length > 0) {
        formatted = '(' + numbers.substring(0, 3);
      }
      if (numbers.length > 3) {
        formatted += ') ' + numbers.substring(3, 6);
      }
      if (numbers.length > 6) {
        formatted += '-' + numbers.substring(6, 8);
      }
      if (numbers.length > 8) {
        formatted += '-' + numbers.substring(8, 10);
      }
      
      input.value = formatted;
      
      // Восстанавливаем позицию курсора с учетом добавленных символов
      let newCursorPosition = cursorPosition;
      if (cursorPosition === 1 && numbers.length === 0) {
        newCursorPosition = 1; // Остаемся после открывающей скобки
      } else if (cursorPosition <= 4 && numbers.length >= 3) {
        newCursorPosition = 5; // Перескакиваем закрывающую скобку и пробел
      } else if (cursorPosition === 9 && numbers.length >= 6) {
        newCursorPosition = 10; // Перескакиваем дефис
      } else if (cursorPosition === 12 && numbers.length >= 8) {
        newCursorPosition = 13; // Перескакиваем второй дефис
      }
      
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    } else {
      input.value = '(';
      input.setSelectionRange(1, 1);
    }
  }

  // Валидация номера телефона
  function validatePhone(phone) {
    // Удаляем все нецифровые символы и проверяем длину
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10; // Минимум 10 цифр (без кода страны)
  }

  // Открытие попапа по клику на кнопку
  openPopupBtn.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Popup button clicked');
    openPopup();
    
    // Фокусируемся на первом поле после открытия
    setTimeout(() => {
      const nameInput = document.getElementById('popup-name');
      if (nameInput) nameInput.focus();
    }, 300);
  });

  // Закрытие попапа по клику на крестик
  if (closePopupBtn) {
    closePopupBtn.addEventListener('click', closePopup);
  }

  // Закрытие попапа по клику на затемненную область вокруг формы
  popup.addEventListener('click', function(event) {
    if (event.target === popup) {
      closePopup();
    }
  });

  // Закрытие попапа по клавише Esc
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      if (popup.classList.contains('active')) {
        closePopup();
      } else {
        closeCountryDropdown();
      }
    }
  });

  // Обработка отправки формы
  const contactForm = document.getElementById('contact-form-popup');
  if (contactForm) {
    // Инициализируем выбор кода страны
    initCountryCodeSelector();
    
    contactForm.addEventListener('submit', function(event) {
      event.preventDefault();
      console.log('Form submitted');

      // Проверяем согласие с политикой конфиденциальности
      const privacyCheckbox = document.getElementById('privacy-policy');
      if (!privacyCheckbox.checked) {
        alert('Пожалуйста, согласитесь с политикой конфиденциальности');
        privacyCheckbox.focus();
        return;
      }

      // Получаем полный номер телефона
      const countryCode = document.querySelector('.country-code-btn .country-code').textContent;
      const phoneInput = document.getElementById('popup-phone');
      const phoneNumbers = phoneInput.value.replace(/\D/g, '');
      const fullPhone = countryCode + phoneNumbers;
      
      // Валидация телефона
      if (!validatePhone(phoneNumbers)) {
        alert('Пожалуйста, введите корректный номер телефона (минимум 10 цифр)');
        phoneInput.focus();
        return;
      }

      // Валидация имени
      const nameInput = document.getElementById('popup-name');
      if (!nameInput.value.trim()) {
        alert('Пожалуйста, введите ваше имя');
        nameInput.focus();
        return;
      }

      // Здесь будет код для отправки данных на сервер
      console.log('Form data:', {
        name: nameInput.value.trim(),
        phone: fullPhone,
        email: document.getElementById('popup-email').value,
        message: document.getElementById('popup-message').value
      });
      
      alert('Форма отправлена! Мы свяжемся с вами в ближайшее время.');
      closePopup();
      contactForm.reset();
      
      // Сбрасываем выбор страны к России
      const countryCodeBtn = document.getElementById('country-code-btn');
      if (countryCodeBtn) {
        countryCodeBtn.querySelector('.country-flag').textContent = '🇷🇺';
        countryCodeBtn.querySelector('.country-code').textContent = '+7';
      }
    });
  }
  
  console.log('Popup form initialization complete');
}

// Инициализация реквизитов компании
function initCompanyDetails(container) {
  const toggleBtn = container.querySelector('.company-details__toggle');
  const content = container.querySelector('.company-details__content');
  
  if (toggleBtn && content) {
    // Сначала скрываем контент
    content.style.display = 'none';
    
    toggleBtn.addEventListener('click', () => {
      const isExpanded = content.style.display === 'block';
      content.style.display = isExpanded ? 'none' : 'block';
      
      // Анимация появления
      if (!isExpanded) {
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          content.style.transition = 'all 0.3s ease';
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        }, 10);
      }
      
      // Меняем иконку
      toggleBtn.innerHTML = isExpanded ? 
        '<i class="fas fa-plus"></i>' : 
        '<i class="fas fa-minus"></i>';
      
      // Меняем aria-label
      toggleBtn.setAttribute('aria-label', 
        isExpanded ? 'Показать реквизиты' : 'Скрыть реквизиты');
    });
  }
}

// Инициализация тестовой кнопки
function initTestMeButton(container) {
  const button = container.querySelector('.test-button');
  if (button) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Тестовая кнопка нажата');
      // Добавьте свою логику здесь
    });
  }
}

// Инициализация таблиц
function initTables(container) {
  // Добавьте логику инициализации таблиц если нужно
  console.log('Table loaded:', container);
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

// Модуль для кнопки тестирования
const TestMeButton = {
  async load() {
    if (!this.shouldLoad()) return false;
    
    const loaded = await loadComponent(
      CONFIG.paths.components.testMeButton,
      'body',
      'beforeend'
    );
    
    return loaded;
  },

  shouldLoad() {
    return window.location.pathname.includes('printers-set.html');
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
    
    // Загружаем в контейнер на странице контактов
    const loaded = await loadComponent(
      CONFIG.paths.components.companyDetails,
      '#company-details-container'
    );
    
    return loaded;
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

// Инициализация страницы
async function initializePage() {
  try {
    console.log('Starting page initialization...');
    
    // 1. Основные компоненты
    await Promise.all([
      loadComponent(CONFIG.paths.components.header, 'body', 'afterbegin'),
      loadComponent(CONFIG.paths.components.footer, 'body', 'beforeend'),
      loadComponent(CONFIG.paths.components.helpButton, 'body', 'beforeend'),
      loadComponent(CONFIG.paths.components.supportForm, 'body', 'beforeend')
    ]);
    
    console.log('Basic components loaded');
    
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
    
    // Добавляем класс для индикации загрузки
    document.documentElement.classList.add('page-loaded');
    
    console.log('Page initialization complete');
    
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

// Экспортируем функции для глобального использования
window.initCompanyDetails = initCompanyDetails;
window.initTestMeButton = initTestMeButton;
window.initPopupForm = initPopupForm;