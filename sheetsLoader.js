// sheetsLoader.js
// Загружаем нужные листы ОДИН РАЗ и раздаём всем модулям

(async () => {
  try {
    console.log("📊 Начинаем загрузку данных из Google Sheets...");
    
    // Проверяем наличие конфигурации
    if (!window.SHEETS) {
      throw new Error("Конфигурация SHEETS не найдена. Убедитесь, что config.js загружен.");
    }

    // Сюда положим наборы
    window.DATASETS = {};

    // Функция для загрузки и парсинга одного листа
    const loadSheet = async (name, url) => {
      try {
        console.log(`📥 Загружаем лист "${name}"...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        const parsed = Papa.parse(text, { header: true });
        
        if (parsed.errors && parsed.errors.length > 0) {
          console.warn(`⚠️ Предупреждения при парсинге "${name}":`, parsed.errors);
        }
        
        const data = parsed.data.filter(row => {
          // Убираем пустые строки
          return Object.values(row).some(value => value && value.trim());
        });

        console.log(`✅ Лист "${name}" загружен: ${data.length} строк`);
        return data;
      } catch (error) {
        console.error(`❌ Ошибка загрузки листа "${name}":`, error);
        throw error;
      }
    };

    // Список листов с их названиями для логирования
    const sheetTasks = [
      { name: 'data', url: SHEETS.data, desc: 'Данные' },
      { name: 'plans', url: SHEETS.plans, desc: 'Планы' },
      { name: 'records', url: SHEETS.records, desc: 'Рекорды' },
      { name: 'settings', url: SHEETS.settings, desc: 'Настройки' },
      { name: 'ebitda', url: SHEETS.ebitda, desc: 'EBITDA' },
      { name: 'leaders', url: SHEETS.leaders, desc: 'Лидеры' },
    ];

    // Загружаем все листы параллельно
    const results = await Promise.allSettled(
      sheetTasks.map(async ({ name, url, desc }) => {
        const data = await loadSheet(desc, url);
        window.DATASETS[name] = data;
        return { name, count: data.length };
      })
    );

    // Проверяем результаты
    const failed = results.filter(r => r.status === 'rejected');
    const succeeded = results.filter(r => r.status === 'fulfilled');

    if (failed.length > 0) {
      console.error("❌ Некоторые листы не удалось загрузить:");
      failed.forEach((result, index) => {
        console.error(`- ${sheetTasks[index].desc}:`, result.reason);
      });
    }

    if (succeeded.length === 0) {
      throw new Error("Не удалось загрузить ни одного листа");
    }

    console.log("✅ Загрузка завершена успешно:");
    succeeded.forEach(result => {
      const { name, count } = result.value;
      const task = sheetTasks.find(t => t.name === name);
      console.log(`- ${task.desc}: ${count} строк`);
    });

    // Добавляем информацию о времени загрузки
    window.DATASETS._loadTime = new Date();
    window.DATASETS._loadedSheets = succeeded.map(r => r.value.name);

    // Сообщаем всем модулям, что данные готовы
    console.log("📢 Отправляем событие 'sheets-ready'");
    document.dispatchEvent(new Event('sheets-ready'));

  } catch (error) {
    console.error("💥 Критическая ошибка загрузки данных:", error);
    
    // Показываем пользователю сообщение об ошибке
    const errorBlock = document.createElement('div');
    errorBlock.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 1000;
      max-width: 300px;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorBlock.innerHTML = `
      <strong>⚠️ Ошибка загрузки данных</strong><br>
      <small>${error.message}</small><br>
      <button onclick="location.reload()" style="margin-top:10px;padding:5px 10px;border:none;background:white;color:#ff4444;border-radius:4px;cursor:pointer;">
        Перезагрузить
      </button>
    `;
    document.body.appendChild(errorBlock);
    
    // Инициализируем пустые датасеты чтобы не ломать другие скрипты
    window.DATASETS = {
      data: [],
      plans: [],
      records: [],
      settings: [],
      ebitda: [],
      leaders: [],
      _error: error.message,
      _loadTime: new Date()
    };
    
    // Все равно отправляем событие, но с ошибкой
    document.dispatchEvent(new Event('sheets-ready'));
  }
})();
