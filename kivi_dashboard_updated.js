// kivi_dashboard_updated.js
// ждём, пока sheetsLoader.js загрузит и распарсит все листы
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
    // ✅ берём готовые массивы из общего загрузчика
    const data    = window.DATASETS.data;    // "Данные"
    const plans   = window.DATASETS.plans;   // "Планы"
    const records = window.DATASETS.records; // "Рекорды"

    if (!data || !plans || !records) {
      console.error("❌ Данные не загружены:", { data: !!data, plans: !!plans, records: !!records });
      return;
    }

    const today = new Date();
    const ym = today.toISOString().slice(0, 7);
    const currentDay = today.getDate();

    const thisMonthRows = data.filter(r => {
      const d = new Date(r["Дата"]);
      return r["Дата"]?.startsWith(ym) && d.getDate() <= currentDay && r["ТО"];
    });

    const lastYearDate = new Date(today);
    lastYearDate.setFullYear(today.getFullYear() - 1);
    const lastYm = lastYearDate.toISOString().slice(0, 7);
    const lastYearRows = data.filter(r => {
      const d = new Date(r["Дата"]);
      return r["Дата"]?.startsWith(lastYm) && d.getDate() <= currentDay && r["ТО"];
    });

    const validDays = new Set(thisMonthRows.map(r => r["Дата"].split("-")[2]));
    const dayCount = validDays.size || 1;

    const totalTo = thisMonthRows.reduce((sum, r) => sum + cleanNumber(r["ТО"]), 0);
    const totalTr = thisMonthRows.reduce((sum, r) => sum + parseInt(r["ТР"] || 0), 0);
    const avgTo = Math.round(totalTo / dayCount);
    const avgTr = Math.round(totalTr / dayCount);
    const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

    const planRow = plans.find(r => r["Месяц"] === ym);
    const planTo = parseInt(planRow?.["План по выручке"] || 0);
    const planTr = parseInt(planRow?.["План по трафику"] || 0);
    const planAvg = planTo && planTr ? Math.round(planTo / planTr) : 0;

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
    if (factTrafficEl) factTrafficEl.textContent = avgTr;
    if (factAvgEl) factAvgEl.textContent = avgCheck + "₽";

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

    const prevTo = lastYearRows.reduce((s, r) => s + cleanNumber(r["ТО"]), 0);
    const currTo = thisMonthRows.reduce((s, r) => s + cleanNumber(r["ТО"]), 0);
    const diff = prevTo ? Math.round((currTo - prevTo) / prevTo * 100) : 0;
    
    const comparePrevEl = document.getElementById("comparePrev");
    if (comparePrevEl) {
      comparePrevEl.textContent = (diff >= 0 ? "+" : "") + diff + "%";
    }

    console.log("✅ Сводка загружена");
  } catch (error) {
    console.error("❌ Ошибка загрузки сводки:", error);
  }
}

async function loadChart() {
  try {
    // ✅ берём "Данные" из кэша загрузчика
    const allRows = window.DATASETS.data;
    
    if (!allRows) {
      console.error("❌ Данные для графика не загружены");
      return;
    }

    const today = new Date();

    const rows = allRows.filter(r => {
      const d = new Date(r["Дата"]);
      return r["Дата"] && r["ТО"] && !isNaN(d) && d <= today;
    });

    const last7 = rows.slice(-7);

    if (last7.length === 0) {
      console.warn("⚠️ Нет данных для графика");
      return;
    }

    const labels = last7.map(row => {
      const date = new Date(row["Дата"]);
      const weekday = date.toLocaleDateString("ru-RU", { weekday: 'short' });
      return `${date.getDate()} ${weekday}`;
    });

    const revenues = last7.map(row => cleanNumber(row["ТО"]));
    const highlight = last7.map(row => row["Выполнение плана (Да/Нет)"]?.trim().toLowerCase() === "да");
    const yMax = Math.ceil(Math.max(...revenues) / 10000) * 10000;

    const chartEl = document.getElementById("salesChart");
    if (!chartEl) {
      console.error("❌ Элемент графика не найден");
      return;
    }

    const ctx = chartEl.getContext("2d");

    // Уничтожаем предыдущий график если есть
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

    // Обновляем подписи
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
    // ✅ данные уже распарсены
    const data = window.DATASETS.data;
    
    if (!data) {
      console.error("❌ Данные для сравнения не загружены");
      return;
    }

    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const lastYear = new Date(now);
    lastYear.setFullYear(now.getFullYear() - 1);
    const lastMonth = lastYear.toISOString().slice(0, 7);
    const todayDate = now.getDate();

    const rowsThis = data.filter(r => r["Дата"]?.startsWith(thisMonth));
    const rowsLast = data.filter(r => r["Дата"]?.startsWith(lastMonth));

    const parseRows = rows => Object.fromEntries(rows.map(r => {
      const day = parseInt(r["Дата"].split("-")[2]);
      const date = new Date(r["Дата"]);
      const traffic = Math.round(parseFloat(r["ТР"]?.replace(',', '.') || 0));
      const revenue = Math.round(parseFloat(r["ТО"]?.replace(',', '.').replace(/\s/g, '') || 0));
      return [day, { day, date, traffic, revenue }];
    }));

    const mapThis = parseRows(rowsThis);
    const mapLast = parseRows(rowsLast);
    const days = Object.keys(mapThis).map(Number).filter(d => d <= todayDate).sort((a, b) => b - a);

    const compareTableEl = document.getElementById("compareTable");
    if (!compareTableEl) {
      console.error("❌ Элемент таблицы сравнения не найден");
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `<tr><th>День</th><th>Прошлый год</th><th>Текущий год</th></tr>`;

    // allDataRows — глобальная переменная объявлена в index.html
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
