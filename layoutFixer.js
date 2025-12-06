// layoutFixer.js — Автоматически переносит блоки в правильные колонки
// Подключи ПОСЛЕДНИМ: <script src="layoutFixer.js" defer></script>

(function() {
  'use strict';
  
  // Ждём загрузки данных
  document.addEventListener('sheets-ready', () => {
    console.log('🔧 Layout Fixer: начинаю исправление...');
    
    // Ждём 1 секунду чтобы ВСЕ блоки успели создаться
    setTimeout(fixLayout, 1000);
  });
  
  function fixLayout() {
    const leftCol = document.querySelector('.left-column');
    const rightCol = document.querySelector('.right-column');
    
    if (!leftCol || !rightCol) {
      console.warn('⚠️ Layout Fixer: колонки не найдены');
      return;
    }
    
    // === ПРАВАЯ КОЛОНКА: только эти ID ===
    const rightBlockIds = ['heatmapMonth', 'advisorBlock'];
    
    // Переносим блоки в правую колонку
    rightBlockIds.forEach(id => {
      const block = document.getElementById(id);
      if (block) {
        // Проверяем что блок НЕ в правой колонке
        if (!rightCol.contains(block)) {
          console.log(`✅ Перенос ${id} в правую колонку`);
          rightCol.appendChild(block);
        }
      }
    });
    
    // === ЛЕВАЯ КОЛОНКА: всё остальное ===
    // Ищем все блоки которые НЕ в левой и НЕ в правой колонке
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Переносим ВСЕ дочерние элементы container (кроме h1 и колонок) в левую колонку
    Array.from(container.children).forEach(child => {
      // Пропускаем h1, левую и правую колонки
      if (child.tagName === 'H1' || child === leftCol || child === rightCol) {
        return;
      }
      
      // Пропускаем блоки которые должны быть справа
      if (rightBlockIds.includes(child.id)) {
        return;
      }
      
      // Переносим в левую колонку
      if (!leftCol.contains(child)) {
        console.log(`✅ Перенос ${child.id || child.className} в левую колонку`);
        leftCol.appendChild(child);
      }
    });
    
    console.log('✅ Layout Fixer: готово!');
  }
})();
