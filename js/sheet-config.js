/**
 * Конфигурация для работы с Google Sheets
 * 
 * Для каждого раздела каталога указывается:
 * - title: заголовок для отображения на странице
 * - gid: идентификатор листа в Google Sheets
 */
window.sheetConfig = {
  // ID основной таблицы Google Sheets
  spreadsheetId: '1Hxmx_tznE64ifvKON4-waL6x7BYQ7plf1nWta5nsMlI',
  
  // Настройки для всех разделов каталога
  pages: {
    '3d-printers': {
      title: '3D принтеры',
      gid: '0'
    },
    '3d-scanners': {
      title: '3D сканеры',
      gid: '784720976'
    },
    'post-processing': {
      title: 'Пост-обработка',
      gid: '1591086335'
    },
    'photopolymers': {
      title: 'Фотополимеры',
      gid: '324737883'
    },
    '3d-consumables': {
      title: 'Прочее',
      gid: '678602630'
    },
    'milling': {
      title: 'Фрезеровка',
      gid: '901873210'
    },
    'frezy': {
      title: 'Фрезы',
      gid: '50415358'
    },
    'sinterising': {
      title: 'Синтеризация',
      gid: '26528899'
    },
    'zirkon': {
      title: 'Циркониевые диски',
      gid: '1680226557'
    },
    'compressors': {
      title: 'Компрессоры',
      gid: '1854864900'
    }
  },
  
  /**
   * Получает конфигурацию для текущей страницы
   * @returns {Object} Конфиг страницы или конфиг по умолчанию (3d-printers)
   */
  getCurrentConfig: function() {
    const pageId = this.getCurrentPageId();
    return this.pages[pageId] || this.pages['3d-printers'];
  },
  
  /**
   * Получает ID текущей страницы из URL
   * @returns {string} ID страницы (например '3d-printers')
   */
  getCurrentPageId: function() {
    return window.location.pathname
      .split('/')
      .pop()
      .replace('.html', '')
      .replace('catalog-', ''); // если у вас URLs вида catalog-3d-printers.html
  },
  
  /**
   * Генерирует URL для экспорта данных из Google Sheets
   * @param {string} [pageId] ID страницы (если не указан, используется текущая)
   * @returns {string} URL для загрузки CSV
   */
  getExportUrl: function(pageId) {
    const config = pageId ? this.pages[pageId] : this.getCurrentConfig();
    if (!config) {
      console.error('Конфигурация для страницы не найдена');
      return null;
    }
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=${config.gid}`;
  },
  
  /**
   * Устанавливает заголовок страницы
   */
  setPageTitle: function() {
    const config = this.getCurrentConfig();
    const header = document.getElementById('page-header');
    if (header) {
      header.textContent = config.title;
    }
  }
};

// Автоматически устанавливаем заголовок при загрузке конфига
document.addEventListener('DOMContentLoaded', function() {
  window.sheetConfig.setPageTitle();
});