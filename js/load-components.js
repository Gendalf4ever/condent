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
        document.querySelector(targetElement).insertAdjacentHTML(position, html);
    } catch (error) {
        console.error(`Ошибка при загрузке ${componentPath}:`, error);
    }
}

// Загружаем хедер в начало body
loadComponent('header.html', 'body', 'afterbegin').then(() => {
    // Инициализация меню после загрузки хедера
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav');
    
    if (mobileMenuBtn && navMenu) {
        // Обработчик клика по кнопке мобильного меню
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Закрытие меню при клике вне его области
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav') && !e.target.closest('.mobile-menu-btn')) {
                navMenu.classList.remove('active');
            }
        });
    }
});

// Загружаем футер перед закрывающим тегом body
loadComponent('footer.html', 'body');

// Загружаем кнопку "Нужна помощь" перед закрывающим тегом body
loadComponent('includes/help-button.html', 'body');