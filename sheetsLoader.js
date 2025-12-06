// sheetsLoader.js — Быстрая загрузка с кешированием и обработкой ошибок

(async () => {
  try {
    console.log("⚡ Начинаем загрузку данных из Google Sheets...");
    
    // Проверяем наличие конфигурации
    if (!window.SHEETS) {
      throw new Error("Конфигурация SHEETS не найдена. Убедитесь, что config.js загружен.");
    }

    window.DATASETS = {};

    // ===== КЕШИРОВАНИЕ =====
    const CACHE_KEY = 'kivi_datasets_cache';
    const CACHE_TIME_KEY = 'kivi_cache_time';
    const CACHE_LIFETIME = 5 * 60 * 1000; // 5 минут

    // Проверяем кеш
    const cachedData = sessionStorage.getItem(CACHE_KEY);
    const cacheTime = sessionStorage.getItem(CACHE_TIME_KEY);
    
    if (cachedData && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_LIFETIME) {
        console.log("🚀 Загрузка из кеша (мгновенно!)");
        window.DATASETS = JSON.parse(cachedData);
        console.log("✅ Данные из кеша готовы");
        document.dispatchEvent(new Event('sheets-ready'));
        return;
      } else {
        console.log("🔄 Кеш устарел, загружаем заново...");
      }
    }

    // ===== ЗАГРУЗКА С СЕРВЕРА =====
    const loadSheet = async (name, url, desc) => {
      try {
        console.log(`📥 Загружаем лист "${desc}"...`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        const parsed = Papa.parse(text, { header: true });
        
        if (parsed.errors && parsed.errors.length > 0) {
          console.warn(`⚠️ Предупреждения при парсинге "${desc}":`, parsed.errors);
        }
        
        const data = parsed.data.filter(row => {
          // Убираем пустые строки
          return Object.values(row).some(value => value && value.trim());
        });

        console.log(`✅ Лист "${desc}" загружен: ${data.length} строк`);
        return { name, data, desc };
      } catch (error) {
        console.error(`❌ Ошибка загрузки листа "${desc}":`, error);
        throw error;
      }
    };

    // Список листов
    const sheetTasks = [
      { name: 'data', url: SHEETS.data, desc: 'Данные' },
      { name: 'plans', url: SHEETS.plans, desc: 'Планы' },
      { name: 'records', url: SHEETS.records, desc: 'Рекорды' },
      { name: 'settings', url: SHEETS.settings, desc: 'Настройки' },
      { name: 'ebitda', url: SHEETS.ebitda, desc: 'EBITDA' },
      { name: 'leaders', url: SHEETS.leaders, desc: 'Лидеры' },
    ];

    // ПАРАЛЛЕЛЬНАЯ загрузка всех листов (быстрее в 6 раз!)
    const results = await Promise.allSettled(
      sheetTasks.map(({ name, url, desc }) => loadSheet(name, url, desc))
    );

    // Проверяем результаты
    const failed = results.filter(r => r.status === 'rejected');
    const succeeded = results.filter(r => r.status === 'fulfilled');

    if (failed.length > 0) {
      console.error("❌ Некоторые листы не удалось загрузить:");
      failed.forEach((result, index) => {
        const task = sheetTasks.find((t, i) => results[i] === result);
        console.error(`- ${task?.desc}:`, result.reason);
      });
    }

    if (succeeded.length === 0) {
      throw new Error("Не удалось загрузить ни одного листа");
    }

    // Складываем результаты в window.DATASETS
    console.log("✅ Загрузка завершена успешно:");
    succeeded.forEach(result => {
      const { name, data, desc } = result.value;
      window.DATASETS[name] = data;
      console.log(`- ${desc}: ${data.length} строк`);
    });

    // Добавляем метаинформацию
    window.DATASETS._loadTime = new Date();
    window.DATASETS._loadedSheets = succeeded.map(r => r.value.name);

    // Сохраняем в кеш
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(window.DATASETS));
      sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      console.log("💾 Данные сохранены в кеш");
    } catch (e) {
      console.warn("⚠️ Не удалось сохранить в кеш:", e);
    }

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
      <button onclick="sessionStorage.clear();location.reload()" style="margin-top:10px;padding:5px 10px;border:none;background:white;color:#ff4444;border-radius:4px;cursor:pointer;">
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
