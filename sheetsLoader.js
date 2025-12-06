// sheetsLoader.js — Быстрая загрузка с кешированием

(async () => {
  try {
    console.log("⚡ Загрузка данных (оптимизированная)...");
    
    if (!window.SHEETS) {
      throw new Error("Конфигурация SHEETS не найдена");
    }

    window.DATASETS = {};

    // Проверяем кеш (sessionStorage)
    const CACHE_KEY = 'kivi_datasets_cache';
    const CACHE_TIME_KEY = 'kivi_cache_time';
    const CACHE_LIFETIME = 5 * 60 * 1000; // 5 минут

    const cachedData = sessionStorage.getItem(CACHE_KEY);
    const cacheTime = sessionStorage.getItem(CACHE_TIME_KEY);
    
    if (cachedData && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_LIFETIME) {
        console.log("🚀 Загрузка из кеша (мгновенно!)");
        window.DATASETS = JSON.parse(cachedData);
        document.dispatchEvent(new Event('sheets-ready'));
        return;
      }
    }

    // Загружаем с сервера
    const loadSheet = async (name, url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
      const text = await response.text();
      const parsed = Papa.parse(text, { header: true });
      return parsed.data.filter(row => Object.values(row).some(v => v && v.trim()));
    };

    const sheets = [
      { name: 'data', url: SHEETS.data },
      { name: 'plans', url: SHEETS.plans },
      { name: 'records', url: SHEETS.records },
      { name: 'settings', url: SHEETS.settings },
      { name: 'ebitda', url: SHEETS.ebitda },
      { name: 'leaders', url: SHEETS.leaders },
    ];

    // ПАРАЛЛЕЛЬНАЯ загрузка (в 6 раз быстрее!)
    const results = await Promise.all(
      sheets.map(async ({ name, url }) => {
        const data = await loadSheet(name, url);
        return { name, data };
      })
    );

    // Складываем результаты
    results.forEach(({ name, data }) => {
      window.DATASETS[name] = data;
      console.log(`✅ ${name}: ${data.length} строк`);
    });

    window.DATASETS._loadTime = new Date();

    // Сохраняем в кеш
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(window.DATASETS));
    sessionStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

    console.log("📢 Данные готовы!");
    document.dispatchEvent(new Event('sheets-ready'));

  } catch (error) {
    console.error("❌ Ошибка:", error);
    
    window.DATASETS = { data: [], plans: [], records: [], settings: [], ebitda: [], leaders: [], _error: error.message };
    
    const errorBlock = document.createElement('div');
    errorBlock.style.cssText = `position:fixed;top:20px;right:20px;background:#ff4444;color:white;padding:15px;border-radius:8px;z-index:1000;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
    errorBlock.innerHTML = `<strong>⚠️ Ошибка загрузки</strong><br><small>${error.message}</small><br><button onclick="sessionStorage.clear();location.reload()" style="margin-top:10px;padding:5px 10px;border:none;background:white;color:#ff4444;border-radius:4px;cursor:pointer;">Перезагрузить</button>`;
    document.body.appendChild(errorBlock);
    
    document.dispatchEvent(new Event('sheets-ready'));
  }
})();
