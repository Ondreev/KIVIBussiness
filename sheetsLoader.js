// sheetsLoader.js — Надежная загрузка для мобильных устройств

(async () => {
  try {
    console.log("⚡ Загрузка данных (мобильная версия)...");
    
    // Проверяем конфигурацию
    if (!window.SHEETS) {
      console.error("❌ config.js не загружен");
      throw new Error("Конфигурация SHEETS не найдена");
    }

    // ЖДЁМ загрузки Papa.parse (критично для мобильных!)
    let attempts = 0;
    while (!window.Papa && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.Papa) {
      throw new Error("Papa.parse не загрузился за 5 секунд");
    }

    console.log("✅ Papa.parse готов");

    window.DATASETS = {};

    // ===== БЕЗОПАСНЫЙ КЕШ =====
    const CACHE_KEY = 'kivi_datasets_cache_v2'; // v2 = новая версия
    const CACHE_TIME_KEY = 'kivi_cache_time_v2';
    const CACHE_LIFETIME = 10 * 60 * 1000; // 10 минут (было 5)

    let useCache = false;
    try {
      // Проверяем доступность sessionStorage
      sessionStorage.setItem('test', '1');
      sessionStorage.removeItem('test');
      useCache = true;
    } catch (e) {
      console.warn("⚠️ sessionStorage недоступен (приватный режим?), кеш отключён");
    }

    // Пробуем загрузить из кеша
    if (useCache) {
      try {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        const cacheTime = sessionStorage.getItem(CACHE_TIME_KEY);
        
        if (cachedData && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_LIFETIME) {
            console.log("🚀 Загрузка из кеша");
            const parsed = JSON.parse(cachedData);
            
            // ПРОВЕРКА: есть ли данные?
            if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
              window.DATASETS = parsed;
              console.log("✅ Из кеша загружено:", {
                data: parsed.data.length,
                plans: parsed.plans?.length || 0,
                records: parsed.records?.length || 0
              });
              document.dispatchEvent(new Event('sheets-ready'));
              return;
            } else {
              console.warn("⚠️ Кеш повреждён, загружаем заново");
              sessionStorage.removeItem(CACHE_KEY);
              sessionStorage.removeItem(CACHE_TIME_KEY);
            }
          }
        }
      } catch (e) {
        console.warn("⚠️ Ошибка чтения кеша:", e);
        sessionStorage.clear(); // Очищаем повреждённый кеш
      }
    }

    // ===== ЗАГРУЗКА С СЕРВЕРА =====
    const loadSheet = async (name, url, desc) => {
      console.log(`📥 Загружаем "${desc}"...`);
      
      const response = await fetch(url, {
        cache: 'no-cache', // Важно для мобильных!
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`${desc}: HTTP ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error(`${desc}: Пустой ответ от сервера`);
      }
      
      const parsed = Papa.parse(text, { 
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false // Всё как строки
      });
      
      if (parsed.errors && parsed.errors.length > 0) {
        console.warn(`⚠️ Предупреждения "${desc}":`, parsed.errors.slice(0, 3));
      }
      
      const data = parsed.data.filter(row => {
        return Object.values(row).some(value => value && String(value).trim());
      });

      if (data.length === 0) {
        console.warn(`⚠️ "${desc}" пуст после фильтрации`);
      }

      console.log(`✅ "${desc}": ${data.length} строк`);
      return { name, data, desc };
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

    // ПАРАЛЛЕЛЬНАЯ загрузка с таймаутом
    console.log("📡 Загружаем все листы...");
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: загрузка заняла больше 30 секунд')), 30000)
    );

    const loadPromise = Promise.allSettled(
      sheetTasks.map(({ name, url, desc }) => loadSheet(name, url, desc))
    );

    const results = await Promise.race([loadPromise, timeoutPromise]);

    // Проверяем результаты
    const failed = results.filter(r => r.status === 'rejected');
    const succeeded = results.filter(r => r.status === 'fulfilled');

    if (failed.length > 0) {
      console.error("❌ Не загружено:");
      failed.forEach((result, idx) => {
        const task = sheetTasks[results.indexOf(result)];
        console.error(`- ${task?.desc}:`, result.reason?.message || result.reason);
      });
    }

    if (succeeded.length === 0) {
      throw new Error("Не удалось загрузить ни одного листа");
    }

    // Складываем данные
    console.log("✅ Загружено успешно:");
    succeeded.forEach(result => {
      const { name, data, desc } = result.value;
      window.DATASETS[name] = data;
      console.log(`- ${desc}: ${data.length} строк`);
    });

    // КРИТИЧЕСКАЯ ПРОВЕРКА
    if (!window.DATASETS.data || window.DATASETS.data.length === 0) {
      throw new Error("Основной лист 'Данные' пуст или не загрузился");
    }

    // Метаинформация
    window.DATASETS._loadTime = new Date();
    window.DATASETS._loadedSheets = succeeded.map(r => r.value.name);
    window.DATASETS._isCached = false;

    // Сохраняем в кеш (если доступен)
    if (useCache) {
      try {
        const dataToCache = JSON.stringify(window.DATASETS);
        // Проверка размера (max ~5MB в sessionStorage)
        if (dataToCache.length < 5 * 1024 * 1024) {
          sessionStorage.setItem(CACHE_KEY, dataToCache);
          sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          console.log("💾 Данные сохранены в кеш");
        } else {
          console.warn("⚠️ Данные слишком большие для кеша");
        }
      } catch (e) {
        console.warn("⚠️ Не удалось сохранить в кеш:", e.message);
      }
    }

    // Отправляем событие
    console.log("📢 Отправляем 'sheets-ready'");
    document.dispatchEvent(new Event('sheets-ready'));

  } catch (error) {
    console.error("💥 КРИТИЧЕСКАЯ ОШИБКА:", error);
    
    // Показываем ошибку пользователю
    const errorBlock = document.createElement('div');
    errorBlock.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4444;
      color: white;
      padding: 20px;
      border-radius: 12px;
      z-index: 9999;
      max-width: 90%;
      width: 300px;
      font-family: sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      text-align: center;
    `;
    errorBlock.innerHTML = `
      <div style="font-size:40px;margin-bottom:10px;">⚠️</div>
      <strong style="font-size:18px;">Ошибка загрузки</strong><br>
      <small style="font-size:13px;opacity:0.9;">${error.message}</small><br>
      <button onclick="sessionStorage.clear();localStorage.clear();location.reload()" 
              style="margin-top:15px;padding:10px 20px;border:none;background:white;color:#ff4444;
                     border-radius:6px;cursor:pointer;font-weight:600;font-size:14px;">
        Перезагрузить
      </button>
    `;
    document.body.appendChild(errorBlock);
    
    // Инициализируем пустые датасеты
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
    
    // Отправляем событие даже с ошибкой
    document.dispatchEvent(new Event('sheets-ready'));
  }
})();
