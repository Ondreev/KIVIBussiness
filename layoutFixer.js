// layoutFixer.js — Автоматически переносит блоки в правильные колонки
// Подключи ПОСЛЕДНИМ: <script src="layoutFixer.js" defer></script>

(function() {
  'use strict';
  
  console.log('📦 Layout Fixer загружен');
  
  // Ждём загрузки данных
  document.addEventListener('sheets-ready', () => {
    console.log('🔧 Layout Fixer: sheets-ready получен');
    
    // Ждём 1.5 секунды чтобы ВСЕ блоки успели создаться
    setTimeout(fixLayout, 1500);
  });
  
  function fixLayout() {
    console.log('🔧 Layout Fixer: начинаю перенос блоков...');
    
    const leftCol = document.querySelector('.left-column');
    const rightCol = document.querySelector('.right-column');
    
    if (!leftCol || !rightCol) {
      console.error('❌ Layout Fixer: .left-column или .right-column не найдены!');
      return;
    }
    
    console.log('✅ Колонки найдены');
    
    // === ПРАВАЯ КОЛОНКА: эти блоки переносим вправо ===
    
    // 1. Карта месяца
    const heatmap = document.getElementById('heatmapMonth');
    if (heatmap && !rightCol.contains(heatmap)) {
      console.log('📦 Переношу #heatmapMonth в правую колонку');
      rightCol.appendChild(heatmap);
    } else if (!heatmap) {
      console.warn('⚠️ #heatmapMonth не найден');
    }
    
    // 2. Советник дня
    const advisor = document.getElementById('advisorBlock');
    if (advisor && !rightCol.contains(advisor)) {
      console.log('📦 Переношу #advisorBlock в правую колонку');
      rightCol.appendChild(advisor);
    } else if (!advisor) {
      console.warn('⚠️ #advisorBlock не найден');
    }
    
    // === ЛЕВАЯ КОЛОНКА: всё остальное ===
    // Переносим все дочерние элементы .container (кроме h1 и колонок) в левую колонку
    const container = document.querySelector('.container');
    if (!container) {
      console.error('❌ .container не найден');
      return;
    }
    
    let movedCount = 0;
    Array.from(container.children).forEach(child => {
      // Пропускаем:
      // - h1 (логотип)
      // - сами колонки
      // - блоки которые должны быть справа
      if (
        child.tagName === 'H1' ||
        child === leftCol ||
        child === rightCol ||
        child.classList.contains('logo-wrapper') ||
        child.id === 'heatmapMonth' ||
        child.id === 'advisorBlock'
      ) {
        return;
      }
      
      // Переносим в левую колонку
      if (!leftCol.contains(child)) {
        console.log(`📦 Переношу ${child.id || child.className || 'элемент'} в левую колонку`);
        leftCol.appendChild(child);
        movedCount++;
      }
    });
    
    console.log(`✅ Layout Fixer: готово! Перенесено блоков: ${movedCount}`);
    
    // Проверяем результат
    console.log('📊 Содержимое левой колонки:', leftCol.children.length, 'блоков');
    console.log('📊 Содержимое правой колонки:', rightCol.children.length, 'блоков');
  }
})();
