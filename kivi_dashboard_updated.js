// kivi_dashboard_updated.js — финальная версия
// ВАЖНО: в index.html должен быть подключен ТОЛЬКО этот файл (kivi_dashboard.js удалить/не подключать)

// Ждём, когда sheetsLoader.js загрузит все листы
document.addEventListener("sheets-ready", () => {
  loadSummary();
  loadChart();
  buildComparisonBlock();
});

// ---- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------------------------------------------

// Чистим число: "12 345,67" -> 12345.67
function cleanNumber(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/\s/g, "").replace(",", ".")) || 0;
}

// Универсальный геттер значения колонки: берём первое подходящее имя
function getCol(row, names) {
  for (const n of names) {
    if (row[n] != null) return row[n];
  }
  return undefined;
}

// Парсим текст "YYYY-MM-DD" безопасно (без new Date на сырой строке)
function parseYMD(str) {
  if (!str) return null;
  const s = String(str).trim().replace(/\u00A0/g, " ").replace(/[^\d-]/g, ""); // убираем NBSP и мусор
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}
function isSameMonth(str, Y, M) {
  const p = parseYMD(str);
  return !!p && p.y === Y && p.m === M;
}
function toDate(p) {
  // p — результат parseYMD
  return new Date(p.y, p.m - 1, p.d);
}

// Названия колонок (поддерживаем кириллицу/латиницу)
const COLS = {
  date: ["Дата"],
  revenue: ["ТО", "TO"],     // поддержка "ТО" (кириллица) и "TO" (латиница)
  traffic: ["ТР", "TP", "TR"] // "ТР" (кириллица), "TP/TR" на всякий случай
};

// ---- СВОДКА ----------------------------------------------------------------

async function loadSummary() {
  const data    = window.DATASETS?.data || [];
  const plans   = window.DATASETS?.plans || [];
  const records = window.DATASETS?.records || [];

  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const D = now.getDate();
  const ym = now.toISOString().slice(0, 7);

  // Строки текущего месяца до текущего дня включительно
  const thisMonthRows = data.filter(r => {
    const dateStr = getCol(r, COLS.date);
    if (!isSameMonth(dateStr, Y, M)) return false;
    const p = parseYMD(dateStr);
    return p && p.d <= D && cleanNumber(getCol(r, COLS.revenue)) > 0;
  });

  // Строки прошлого года (тот же месяц) до текущего дня включительно
  const lastYearRows = data.filter(r => {
    const dateStr = getCol(r, COLS.date);
    if (!isSameMonth(dateStr, Y - 1, M)) return false;
    const p = parseYMD(dateStr);
    return p && p.d <= D && cleanNumber(getCol(r, COLS.revenue)) > 0;
  });

  // Сколько разных дней в текущем месяце учли
  const validDays = new Set(thisMonthRows.map(r => {
    const p = parseYMD(getCol(r, COLS.date));
    return p ? p.d : null;
  }).filter(Boolean));
  const dayCount = validDays.size || 1;

  const totalTo = thisMonthRows.reduce((s, r) => s + cleanNumber(getCol(r, COLS.revenue)), 0);
  const totalTr = thisMonthRows.reduce((s, r) => s + cleanNumber(getCol(r, COLS.traffic)), 0);
  const avgTo = Math.round(totalTo / dayCount);
  const avgTr = Math.round(totalTr / dayCount);
  const avgCheck = avgTr ? Math.round(avgTo / avgTr) : 0;

  // План на месяц
  const planRow = plans.find(r => r["Месяц"] === ym) || {};
  const planTo = cleanNumber(planRow["План по выручке"]);
  const planTr = cleanNumber(planRow["План по трафику"]);
  const planAvg = planTo && planTr ? Math.round(planTo / planTr) : 0;

  // Применяем к UI
  setText("planTo",      planTo.toLocaleString("ru-RU") + "₽");
  setText("planTraffic", `${planTr} чел.`);
  setText("planAvg",     planAvg + "₽");

  setText("factTo",      avgTo.toLocaleString("ru-RU") + "₽");
  setText("factTraffic", `${avgTr} чел.`);
  setText("factAvg",     avgCheck + "₽");

  // Рекорды
  const recTo = records.find(r => r["Показатель"]?.toString().toLowerCase().includes("выручка"));
  const recTr = records.find(r => r["Показатель"]?.toString().toLowerCase().includes("трафик"));
  if (recTo) setText("recordTo",      cleanNumber(recTo.Значение).toLocaleString("ru-RU") + "₽");
  if (recTr) setText("recordTraffic", cleanNumber(recTr.Значение).toLocaleString("ru-RU"));

  // Сравнение с прошлым годом (%)
  const prevTo = lastYearRows.reduce((s, r) => s + cleanNumber(getCol(r, COLS.revenue)), 0);
  const currTo = totalTo;
  const diff = prevTo ? Math.round((currTo - prevTo) / prevTo * 100) : 0;
  setText("comparePrev", (diff >= 0 ? "+" : "") + diff + "%");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ---- ГИСТОГРАММА «ПОСЛЕДНИЕ 7 ДНЕЙ» ---------------------------------------

async function loadChart() {
  const rowsAll = window.DATASETS?.data || [];
  const today = new Date();

  // фильтрация, сортировка по реальной дате
  const rows = rowsAll
    .map(r => {
      const p = parseYMD(getCol(r, COLS.date));
      return p ? { r, p, d: toDate(p) } : null;
    })
    .filter(x => x && x.d <= today && cleanNumber(getCol(x.r, COLS.revenue)) > 0)
    .sort((a, b) => a.d - b.d)
    .map(x => x.r);

  const last7 = rows.slice(-7);
  if (last7.length === 0) {
    console.warn("⚠️ Нет данных для графика за последние 7 дней");
    return;
  }

  const labels = last7.map(row => {
    const p = parseYMD(getCol(row, COLS.date));
    const d = toDate(p);
    const weekday = d.toLocaleDateString("ru-RU", { weekday: "short" });
    return `${d.getDate()} ${weekday}`;
  });

  const revenues  = last7.map(row => cleanNumber(getCol(row, COLS.revenue)));
  const highlight = last7.map(row =>
    String(row["Выполнение плана (Да/Нет)"] || "")
      .trim()
      .toLowerCase() === "да"
  );

  const yMax = Math.ceil(Math.max(...revenues) / 10000) * 10000;
  const chartEl = document.getElementById("salesChart");
  if (!chartEl) return;

  const ctx = chartEl.getContext("2d");
  if (window.salesChartInstance) window.salesChartInstance.destroy();

  window.salesChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: revenues,
        backgroundColor: highlight.map(done => (done ? "#FFD700" : "#FFFFFF")),
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
            color: ctx => (ctx.tick.value % 10000 === 0 ? "rgba(255,255,255,0.5)" : "transparent")
          }
        },
        x: { ticks: { display: false }, grid: { display: false } }
      }
    },
    plugins: [ChartDataLabels]
  });

  // подписи под столбцами
  const labelContainer = document.getElementById("customLabels");
  if (labelContainer) {
    labelContainer.innerHTML = "";
    labels.forEach((label, i) => {
      const div = document.createElement("div");
      div.className = "label-item";
      div.innerHTML = `<div class='revenue'>${revenues[i].toLocaleString("ru-RU")}</div><div class='date'>${label}</div>`;
      labelContainer.appendChild(div);
    });
  }
}

// ---- ТАБЛИЦА «СРАВНЕНИЕ С ПРОШЛЫМ ГОДОМ» -----------------------------------

async function buildComparisonBlock() {
  const data = window.DATASETS?.data || [];
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth() + 1;
  const D = now.getDate();

  // Текущий месяц/прошлый год (тот же месяц)
  const rowsThis = data.filter(r => isSameMonth(getCol(r, COLS.date), Y, M));
  const rowsLast = data.filter(r => isSameMonth(getCol(r, COLS.date), Y - 1, M));

  const parseRows = rows => Object.fromEntries(
    rows.map(r => {
      const p = parseYMD(getCol(r, COLS.date));
      if (!p) return [null, null];
      const day = p.d;
      const date = toDate(p);
      const traffic = Math.round(cleanNumber(getCol(r, COLS.traffic)));
      const revenue = Math.round(cleanNumber(getCol(r, COLS.revenue)));
      return [day, { day, date, traffic, revenue }];
    }).filter(([k]) => k !== null)
  );

  const mapThis = parseRows(rowsThis);
  const mapLast = parseRows(rowsLast);
  const days = Object.keys(mapThis).map(Number).filter(d => d <= D).sort((a, b) => b - a);

  const container = document.getElementById("compareTable");
  if (!container) return;

  const table = document.createElement("table");
  table.innerHTML = `<tr><th>День</th><th>Прошлый год</th><th>Текущий год</th></tr>`;

  window.allDataRows = days.map((day, i) => {
    const row = document.createElement("tr");
    if (i >= 6) row.classList.add("hidden-row");

    const curr = mapThis[day];
    const prev = mapLast[day] || { date: "-", traffic: 0, revenue: 0 };

    const wPrev = prev.date instanceof Date && !isNaN(prev.date)
      ? prev.date.toLocaleDateString("ru-RU", { weekday: "short" })
      : "-";
    const wCurr = curr.date instanceof Date && !isNaN(curr.date)
      ? curr.date.toLocaleDateString("ru-RU", { weekday: "short" })
      : "-";

    if (curr.revenue > prev.revenue) row.classList.add("highlight");

    row.innerHTML = `
      <td>${day}</td>
      <td>${wPrev}, ${prev.revenue.toLocaleString("ru-RU")}₽, ${prev.traffic}</td>
      <td>${wCurr}, ${curr.revenue.toLocaleString("ru-RU")}₽, ${curr.traffic}</td>`;
    return row;
  });

  window.allDataRows.forEach(r => table.appendChild(r));
  container.innerHTML = ""; // на случай повторной инициализации
  container.appendChild(table);
}
