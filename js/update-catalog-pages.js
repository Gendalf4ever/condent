/**
 * Скрипт для автоматического обновления страниц каталога для работы с Firebase
 */

// Маппинг страниц на категории Firebase
const PAGE_CATEGORY_MAPPING = {
    '3d-printers.html': 'printers',
    '3d-scaners.html': 'scanners',
    'milling.html': 'milling',
    'frezy.html': 'milling_tools',
    'photo-polymers.html': 'photopolymers',
    '3d-consumables.html': 'consumables',
    'post-obrabotka.html': 'post_processing',
    'post-processing.html': 'post_processing',
    'sinterising.html': 'sintering',
    'zirkon.html': 'zirconia',
    'compressors.html': 'compressors'
};

// Заголовки страниц
const PAGE_TITLES = {
    '3d-printers.html': { title: '3D Принтеры', subtitle: 'Современные 3D принтеры для стоматологии' },
    '3d-scaners.html': { title: '3D Сканеры', subtitle: 'Высокоточные 3D сканеры для стоматологии' },
    'milling.html': { title: 'Фрезерные станки', subtitle: 'Высокоточные фрезерные станки для стоматологии' },
    'frezy.html': { title: 'Фрезы', subtitle: 'Качественные фрезы для стоматологических работ' },
    'photo-polymers.html': { title: 'Фотополимеры', subtitle: 'Высококачественные фотополимеры для 3D печати' },
    '3d-consumables.html': { title: 'Расходные материалы', subtitle: 'Расходные материалы для 3D печати' },
    'post-obrabotka.html': { title: 'Пост-обработка', subtitle: 'Оборудование для пост-обработки изделий' },
    'post-processing.html': { title: 'Пост-обработка', subtitle: 'Оборудование для пост-обработки изделий' },
    'sinterising.html': { title: 'Синтеризация', subtitle: 'Печи для синтеризации керамики' },
    'zirkon.html': { title: 'Циркониевые диски', subtitle: 'Циркониевые диски для фрезеровки' },
    'compressors.html': { title: 'Компрессоры', subtitle: 'Компрессоры для стоматологических работ' }
};

/**
 * Обновляет страницу каталога для работы с Firebase
 */
function updateCatalogPage(pageName) {
    const category = PAGE_CATEGORY_MAPPING[pageName];
    const pageInfo = PAGE_TITLES[pageName];
    
    if (!category || !pageInfo) {
        console.warn(`Не найдена конфигурация для страницы ${pageName}`);
        return;
    }
    
    console.log(`Обновление страницы ${pageName} для категории ${category}`);
    
    // Здесь можно добавить логику для автоматического обновления HTML файлов
    // или генерации новых файлов на основе шаблонов
}

/**
 * Получает список всех страниц каталога
 */
function getAllCatalogPages() {
    return Object.keys(PAGE_CATEGORY_MAPPING);
}

/**
 * Обновляет все страницы каталога
 */
function updateAllCatalogPages() {
    const pages = getAllCatalogPages();
    pages.forEach(updateCatalogPage);
    console.log(`Обновлено ${pages.length} страниц каталога`);
}

// Экспортируем функции для использования
window.catalogUpdater = {
    updateCatalogPage,
    updateAllCatalogPages,
    getAllCatalogPages,
    PAGE_CATEGORY_MAPPING,
    PAGE_TITLES
};

// Автоматически обновляем все страницы при загрузке (если это нужно)
if (typeof window !== 'undefined' && window.location) {
    const currentPage = window.location.pathname.split('/').pop();
    if (PAGE_CATEGORY_MAPPING[currentPage]) {
        updateCatalogPage(currentPage);
    }
}
