// kivi_dashboard_updated.js с отладкой
document.addEventListener("sheets-ready", () => {
  console.log("📊 Данные загружены, инициализируем дашборд...");
  loadSummary();
  loadChart();
  buildComparisonBlock();
});

function cleanNumber(val) {
  return parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));
}

async function loadSummary() {
  try {
    const data    = window.DATASETS.data;
    const plans   = window.DATASETS.plans;
    const records = window.DATASETS.records;

    if (!data || !plans || !records) {
      console.error("❌ Данные не загружены:", { data: !!data, plans: !!plans, records: !!records });
      return;
    }

    // 🔍 ОТЛАДКА: Показываем структуру данных
    console.log("🔍 ОТЛАДКА ДАННЫХ:");
    console.log("Всего строк данных:", data.length);
    
    if (data.length > 0) {
      console.log("Названия колонок в данных:", Object.keys(data[0]));
      console.log("Первая строка данных:", data[0]);
      console.log("Примеры первых 5 строк:");
      data.slice(0, 5).forEach((row, i) => {
        console.log(`Строка ${i + 1}:`, {
          дата: row["Дата"] || row["дата"] || row["Date"] || "НЕТ",
          выручка: row["ТО"] || row["то"] || row["Выручка"] || row["выручка"] || "НЕТ",
          трафик: row["ТР"] || row["тр"] || row["Трафик"] || row["трафик"] || "НЕТ"
        });
      });
    }

    if (plans.length > 0) {
      console.log("Названия колонок в планах:", Object.keys(plans[0]));
      console.log("Первая строка планов:", plans[0]);
    }

    const today = new Date();
    const ym = today.toISOString().slice(0, 7);
    const currentDay = today.getDate();
    
    console.log("Текущий месяц для поиска:", ym);
    console.log("Текущий день:", currentDay);

    // 🔍 Попробуем разные варианты названий колонок
    const possibleDateColumns = ["Дата", "дата", "Date", "DATE"];
    const possibleRevenueColumns = ["ТО", "то", "Выручка", "выручка", "Revenue", "revenue"];
    const possibleTrafficColumns = ["ТР", "тр", "Трафик", "трафик", "Traffic", "traffic"];

    // Найдем правильные названия колонок
    let dateColumn = possibleDateColumns.find(col => data[0] && data[0].hasOwnProperty(col));
    let revenueColumn = possibleRevenueColumns.find(col => data[0] && data[0].hasOwnProperty(col));
    let trafficColumn = possibleTrafficColumns.find(col => data[0] && data[0].hasOwnProperty(col));

    console.log("Найденные колонки:", { dateColumn, revenueColumn, trafficColumn });

    if (!dateColumn || !revenueColumn || !trafficColumn) {
      console.error("❌ Не найдены нужные колонки!");
      console.log("Доступные колонки:", Object.keys(data[0] || {}));
      return;
    }

    // Фильтруем данные за текущий месяц
    const thisMonthRows = data.filter(r => {
      const dateValue = r[dateColumn];
      if (!dateValue) return false;
      
      const d = new Date(dateValue);
      const rowYm = dateValue.slice(0, 7);
      const dayNum = d.getDate();
      
      return rowYm === ym && dayNum <= currentDay && r[revenueColumn];
    });

    console.log(`Найдено строк за текущий месяц: ${thisMonthRows.length}`);
    if (thisMonthRows.length > 0) {
      console.log("Примеры строк за текущий месяц:", thisMonthRows.slice(0, 3));
    }

    // Фильтруем данные за прошлый год
    const lastYearDate = new Date(today);
    lastYearDate.setFullYear(today.getFullYear() - 1);
    const lastYm = lastYearDate.toISOString().slice(0, 7);
    
    const lastYearRows = data.filter(r => {
      const dateValue = r[dateColumn];
      if (!dateValue) return false;
      
      const d = new Date(dateValue);
      const rowYm = dateValue.slice(0, 7);
      const dayNum = d.getDate();
      
      return rowYm === lastYm && dayNum <= currentDay && r[revenueColumn];
    });

    console.log(`Найдено строк за прошлый год (${lastYm}): ${lastYearRows.length}`);

    // Рассчитываем показатели
    const validDays = new Set(thisMonthRows.map(r => r[dateColumn].split("-")[2]));
    const dayCount = validDays.size || 1;

    const totalTo = thisMonthRows.reduce((sum, r) => sum + cleanNumber(r[revenueColumn]), 0);
    const totalTr = thisMonthRows.reduce((sum, r) => sum + parseInt(r[trafficColumn] || 0), 0);
    const avgTo = Math.round(totalTo / dayCount);
    const avgTr = Math.round(totalTr / dayCount);
    const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

    console.log("Рассчитанные показатели:", { totalTo, totalTr, avgTo, avgTr, avgCheck, dayCount });

    // Ищем план за текущий месяц
    const planRow = plans.find(r => r["Месяц"] === ym);
    console.log("Найден план для месяца:", planRow);
    
    const planTo = parseInt(planRow?.["План по выручке"] || 0);
    const planTr = parseInt(planRow?.["План по трафику"] || 0);
    const planAvg = planTo && planTr ? Math.round(planTo / planTr) : 0;

    console.log("Плановые показатели:", { planTo, planTr, planAvg });

    // Обновляем элементы на странице
    const planToEl = document.getElementById("planTo");
    const planTrafficEl = document.getElementById("planTraffic");
    const planAvgEl = document.getElementById("planAvg");
    
    if (planToEl) planToEl.textContent = planTo.toLocaleString("ru-RU") + "₽";
    if (planTrafficEl) planTrafficEl.textContent = planTr + " чел.";
    if (planAvgEl) planAvgEl.textContent = planAvg + "₽";

    const factToEl = document.getElementById("factTo");
    const factTrafficEl = document.getElementById("factTraffic");
    const factAvgEl = document.getElementById("factAvg");
    
    if (factToEl) factToEl.textContent = avgTo.toLocaleString("ru-RU") + "₽";
    if (factTrafficEl) factTrafficEl.textContent = avgTr + " чел.";
    if (factAvgEl) factAvgEl.textContent = avgCheck + "₽";

    // Записи
    const recTo = records.find(r => r["Показатель"]?.includes("выручка"));
    const recTr = records.find(r => r["Показатель"]?.includes("трафик"));

    const recordToEl = document.getElementById("recordTo");
    const recordTrafficEl = document.getElementById("recordTraffic");
    
    if (recordToEl) {
      recordToEl.textContent = parseInt((recTo?.Значение || '0').replace(/\s/g, '')).toLocaleString("ru-RU") + "₽";
    }
    if (recordTrafficEl) {
      recordTrafficEl.textContent = parseInt((recTr?.Значение || '0').replace(/\s/g, '')).toLocaleString("ru-RU");
    }

    // Сравнение с прошлым годом
    const prevTo = lastYearRows.reduce((s, r) => s + cleanNumber(r[revenueColumn]), 0);
    const currTo = thisMonthRows.reduce((s, r) => s + cleanNumber(r[revenueColumn]), 0);
    const diff = prevTo ? Math.round((currTo - prevTo) / prevTo * 100) : 0;
    
    const comparePrevEl = document.getElementById("comparePrev");
    if (comparePrevEl) {
      comparePrevEl.textContent = (diff >= 0 ? "+" : "") + diff + "%";
    }

    console.log("✅ Сводка загружена", { avgTo, avgTr, avgCheck, diff });
  } catch (error) {
    console.error("❌ Ошибка загрузки сводки:", error);
  }
}

// Остальные функции пока оставим как есть
async function loadChart() {
  // Временно отключим график для отладки данных
  console.log("📊 График временно отключен для отладки");
}

async function buildComparisonBlock() {
  // Временно отключим таблицу для отладки данных  
  console.log("📊 Таблица временно отключена для отладки");
}
