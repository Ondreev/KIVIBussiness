// kivi_dashboard_updated.js - ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ
document.addEventListener("sheets-ready", () => {
  console.log("📊 Данные загружены, инициализируем дашборд...");
  loadSummary();
  loadChart();
  buildComparisonBlock();
});

function cleanNumber(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
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

    const today = new Date();
    const ym = today.toISOString().slice(0, 7); // 2025-08
    const currentDay = today.getDate();
    
    console.log("Ищем данные за:", ym);
    console.log("До дня включительно:", currentDay);

    // ИСПРАВЛЕННЫЕ названия колонок согласно скриншоту
    const dateColumn = "Дата";        // Колонка A - полные даты (2025-08-17, 2025-08-18...)
    const revenueColumn = "TO";       // Колонка C - выручка
    const trafficColumn = "ТР";       // Колонка D - трафик  

    console.log("Используем колонки:", { dateColumn, revenueColumn, trafficColumn });

    // Показываем первые несколько строк для проверки
    if (data.length > 0) {
      console.log("Первые 3 строки данных:");
      data.slice(0, 3).forEach((row, i) => {
        console.log(`Строка ${i + 1}:`, {
          дата: row[dateColumn],
          выручка: row[revenueColumn],
          трафик: row[trafficColumn]
        });
      });
    }

    // Фильтруем данные за текущий месяц
    const thisMonthRows = data.filter(r => {
      const dateValue = r[dateColumn];
      if (!dateValue) return false;
      
      const dateStr = dateValue.toString();
      const d = new Date(dateValue);
      
      const startsWithYm = dateStr.startsWith(ym);
      const dayOk = d.getDate() <= currentDay;
      const hasRevenue = cleanNumber(r[revenueColumn]) > 0;
      
      if (startsWithYm) {
        console.log("🎯 Строка за текущий месяц:", {
          dateStr,
          day: d.getDate(),
          currentDay,
          dayOk,
          revenue: cleanNumber(r[revenueColumn]),
          hasRevenue,
          passes: startsWithYm && dayOk && hasRevenue
        });
      }
      
      return startsWithYm && dayOk && hasRevenue;
    });

    console.log(`Найдено строк за текущий месяц: ${thisMonthRows.length}`);

    // Фильтруем данные за прошлый год
    const lastYearDate = new Date(today);
    lastYearDate.setFullYear(today.getFullYear() - 1);
    const lastYm = lastYearDate.toISOString().slice(0, 7);
    
    const lastYearRows = data.filter(r => {
      const dateValue = r[dateColumn];
      if (!dateValue) return false;
      
      const dateStr = dateValue.toString();
      const d = new Date(dateValue);
      
      return dateStr.startsWith(lastYm) && 
             d.getDate() <= currentDay && 
             cleanNumber(r[revenueColumn]) > 0;
    });

    console.log(`Найдено строк за прошлый год (${lastYm}): ${lastYearRows.length}`);

    // Рассчитываем показатели
    const validDays = new Set(thisMonthRows.map(r => r[dateColumn].toString().split("-")[2]));
    const dayCount = validDays.size || 1;

    const totalTo = thisMonthRows.reduce((sum, r) => sum + cleanNumber(r[revenueColumn]), 0);
    const totalTr = thisMonthRows.reduce((sum, r) => sum + cleanNumber(r[trafficColumn]), 0);
    const avgTo = Math.round(totalTo / dayCount);
    const avgTr = Math.round(totalTr / dayCount);
    const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

    console.log("Рассчитанные показатели:", { 
      totalTo: totalTo.toLocaleString('ru-RU'), 
      totalTr, 
      avgTo: avgTo.toLocaleString('ru-RU'), 
      avgTr, 
      avgCheck: avgCheck.toLocaleString('ru-RU'),
      dayCount 
    });

    // Ищем план за текущий месяц
    const planRow = plans.find(r => r["Месяц"] === ym);
    console.log("Найден план для месяца:", planRow);
    
    const planTo = cleanNumber(planRow?.["План по выручке"]);
    const planTr = cleanNumber(planRow?.["План по трафику"]);
    const planAvg = planTo && planTr ? Math.round(planTo / planTr) : 0;

    // Обновляем элементы на странице
    document.getElementById("planTo").textContent = planTo.toLocaleString("ru-RU") + "₽";
    document.getElementById("planTraffic").textContent = planTr + " чел.";
    document.getElementById("planAvg").textContent = planAvg + "₽";

    document.getElementById("factTo").textContent = avgTo.toLocaleString("ru-RU") + "₽";
    document.getElementById("factTraffic").textContent = avgTr + " чел.";
    document.getElementById("factAvg").textContent = avgCheck + "₽";

    // Рекорды
    const recTo = records.find(r => r["Показатель"]?.includes("выручка"));
    const recTr = records.find(r => r["Показатель"]?.includes("трафик"));

    if (recTo) {
      document.getElementById("recordTo").textContent = 
        cleanNumber(recTo.Значение).toLocaleString("ru-RU") + "₽";
    }
    if (recTr) {
      document.getElementById("recordTraffic").textContent = 
        cleanNumber(recTr.Значение).toLocaleString("ru-RU");
    }

    // Сравнение с прошлым годом
    const prevTo = lastYearRows.reduce((s, r) => s + cleanNumber(r[revenueColumn]), 0);
    const currTo = thisMonthRows.reduce((s, r) => s + cleanNumber(r[revenueColumn]), 0);
    const diff = prevTo ? Math.round((currTo - prevTo) / prevTo * 100) : 0;
    
    document.getElementById("comparePrev").textContent = (diff >= 0 ? "+" : "") + diff + "%";

    console.log("✅ Сводка обновлена успешно!");
  } catch (error) {
    console.error("❌ Ошибка загрузки сводки:", error);
  }
}

async function loadChart() {
  try {
    const allRows = window.DATASETS.data;
    if (!allRows) return;

    const today = new Date();
    const dateColumn = "Дата";     // ИСПРАВЛЕНО
    const revenueColumn = "TO";    // ИСПРАВЛЕНО

    // Фильтруем строки с валидными данными
    const rows = allRows.filter(r => {
      const dateValue = r[dateColumn];
      if (!dateValue) return false;
      
      const d = new Date(dateValue);
      return !isNaN(d) && 
             d <= today && 
             cleanNumber(r[revenueColumn]) > 0;
    });

    // Сортируем по дате и берем последние 7 дней
    const sortedRows = rows.sort((a, b) => new Date(a[dateColumn]) - new Date(b[dateColumn]));
    const last7 = sortedRows.slice(-7);

    if (last7.length === 0) {
      console.warn("⚠️ Нет данных для графика за последние 7 дней");
      return;
    }

    const labels = last7.map(row => {
      const date = new Date(row[dateColumn]);
      const weekday = date.toLocaleDateString("ru-RU", { weekday: 'short' });
      return `${date.getDate()} ${weekday}`;
    });

    const revenues = last7.map(row => cleanNumber(row[revenueColumn]));
    const highlight = last7.map(row => 
      row["Выполнение плана (Да/Нет)"]?.toString().trim().toLowerCase() === "да"
    );
    
    const yMax = Math.ceil(Math.max(...revenues) / 10000) * 10000;

    const chartEl = document.getElementById("salesChart");
    if (!chartEl) return;

    const ctx = chartEl.getContext("2d");

    if (window.salesChartInstance) {
      window.salesChartInstance.destroy();
    }

    window.salesChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          data: revenues,
          backgroundColor: highlight.map(done => done ? '#FFD700' : '#FFFFFF'),
          borderRadius: 10,
          barPercentage: 0.8,
          categoryPercentage: 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: yMax,
            ticks: { display: false },
            grid: {
              color: context => context.tick.value % 10000 === 0 ? 'rgba(255,255,255,0.5)' : 'transparent'
            }
          },
          x: {
            ticks: { display: false },
            grid: { display: false }
          }
        }
      },
      plugins: [ChartDataLabels]
    });

    // Обновляем подписи под графиком
    const labelContainer = document.getElementById("customLabels");
    if (labelContainer) {
      labelContainer.innerHTML = "";
      labels.forEach((label, i) => {
        const div = document.createElement("div");
        div.className = "label-item";
        div.innerHTML = `<div class='revenue'>${revenues[i].toLocaleString('ru-RU')}</div><div class='date'>${label}</div>`;
        labelContainer.appendChild(div);
      });
    }

    console.log("✅ График загружен");
  } catch (error) {
    console.error("❌ Ошибка загрузки графика:", error);
  }
}

async function buildComparisonBlock() {
  try {
    const data = window.DATASETS.data;
    if (!data) return;

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastYear = new Date(now);
    lastYear.setFullYear(now.getFullYear() - 1);
    const lastMonth = lastYear.toISOString().slice(0, 7);
    const todayDate = now.getDate();

    const dateColumn = "Дата";      // ИСПРАВЛЕНО
    const revenueColumn = "TO";     // ИСПРАВЛЕНО
    const trafficColumn = "ТР";     // ИСПРАВЛЕНО

    const rowsThis = data.filter(r => r[dateColumn]?.toString().startsWith(thisMonth));
    const rowsLast = data.filter(r => r[dateColumn]?.toString().startsWith(lastMonth));

    const parseRows = rows => Object.fromEntries(rows.map(r => {
      const dateStr = r[dateColumn]?.toString();
      if (!dateStr) return [null, null];
      
      const day = parseInt(dateStr.split("-")[2]);
      const date = new Date(dateStr);
      const traffic = Math.round(cleanNumber(r[trafficColumn]));
      const revenue = Math.round(cleanNumber(r[revenueColumn]));
      return [day, { day, date, traffic, revenue }];
    }).filter(([key]) => key !== null));

    const mapThis = parseRows(rowsThis);
    const mapLast = parseRows(rowsLast);
    const days = Object.keys(mapThis).map(Number).filter(d => d <= todayDate).sort((a, b) => b - a);

    const compareTableEl = document.getElementById("compareTable");
    if (!compareTableEl) return;

    const table = document.createElement('table');
    table.innerHTML = `<tr><th>День</th><th>Прошлый год</th><th>Текущий год</th></tr>`;

    window.allDataRows = days.map((day, i) => {
      const row = document.createElement('tr');
      if (i >= 6) row.classList.add('hidden-row');

      const current = mapThis[day];
      const previous = mapLast[day] || { date: '-', traffic: 0, revenue: 0 };

      const w1 = previous.date instanceof Date && !isNaN(previous.date)
        ? previous.date.toLocaleDateString('ru-RU', { weekday: 'short' })
        : '-';
      const w2 = current.date instanceof Date && !isNaN(current.date)
        ? current.date.toLocaleDateString('ru-RU', { weekday: 'short' })
        : '-';

      if (current.revenue > previous.revenue) row.classList.add('highlight');

      row.innerHTML = `
        <td>${day}</td>
        <td>${w1}, ${previous.revenue.toLocaleString("ru-RU")}₽, ${previous.traffic} чел.</td>
        <td>${w2}, ${current.revenue.toLocaleString("ru-RU")}₽, ${current.traffic} чел.</td>`;
      return row;
    });

    window.allDataRows.forEach(r => table.appendChild(r));
    compareTableEl.appendChild(table);

    console.log("✅ Таблица сравнения загружена");
  } catch (error) {
    console.error("❌ Ошибка создания таблицы сравнения:", error);
  }
}
