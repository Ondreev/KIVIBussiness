window.addEventListener("DOMContentLoaded", () => {
  loadSummary();
  loadChart();
  buildComparisonBlock();
});
const urls = {
  data: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv",
  plans: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=1774855984&single=true&output=csv",
  records: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=143269600&single=true&output=csv"
};

async function loadCSV(url) {
  const res = await fetch(url);
  const text = await res.text();
  return Papa.parse(text, { header: true }).data;
}

async function loadSummary() {
  const [data, plans, records] = await Promise.all([
    loadCSV(urls.data),
    loadCSV(urls.plans),
    loadCSV(urls.records)
  ]);

  const today = new Date();
  const ym = today.toISOString().slice(0, 7);
  const currentDay = today.getDate();
  const cleanNumber = val => parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));

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

  document.getElementById("planTo").textContent = planTo.toLocaleString("ru-RU") + "₽";
  document.getElementById("planTraffic").textContent = planTr + " чел.";
  document.getElementById("planAvg").textContent = planAvg + "₽";

  document.getElementById("factTo").textContent = avgTo.toLocaleString("ru-RU") + "₽";
  document.getElementById("factTraffic").textContent = avgTr;
  document.getElementById("factAvg").textContent = avgCheck + "₽";

  const recTo = records.find(r => r["Показатель"]?.includes("выручка"));
  const recTr = records.find(r => r["Показатель"]?.includes("трафик"));

  document.getElementById("recordTo").textContent = parseInt((recTo?.Значение || '0').replace(/\s/g, '')).toLocaleString("ru-RU") + "₽";
  document.getElementById("recordTraffic").textContent = parseInt((recTr?.Значение || '0').replace(/\s/g, '')).toLocaleString("ru-RU");

  const prevTo = lastYearRows.reduce((s, r) => s + cleanNumber(r["ТО"]), 0);
  const currTo = thisMonthRows.reduce((s, r) => s + cleanNumber(r["ТО"]), 0);
  const diff = prevTo ? Math.round((currTo - prevTo) / prevTo * 100) : 0;
  document.getElementById("comparePrev").textContent = (diff >= 0 ? "+" : "") + diff + "%";
}

async function loadChart() {
  const csv = await loadCSV(urls.data);
  const today = new Date();
  const rows = csv.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"] && r["ТО"] && !isNaN(d) && d <= today;
  });
  const last7 = rows.slice(-7);

  const labels = last7.map(row => {
    const date = new Date(row["Дата"]);
    const weekday = date.toLocaleDateString("ru-RU", { weekday: 'short' });
    return `${date.getDate()} ${weekday}`;
  });

  const revenues = last7.map(row => parseFloat(row["ТО"].replace(/\s/g, '').replace(',', '.')));
  const highlight = last7.map(row => row["Выполнение плана (Да/Нет)"]?.trim().toLowerCase() === "да");
  const yMax = Math.ceil(Math.max(...revenues) / 10000) * 10000;

  const ctx = document.getElementById("salesChart").getContext("2d");
  new Chart(ctx, {
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

  const labelContainer = document.getElementById("customLabels");
  labelContainer.innerHTML = "";
  labels.forEach((label, i) => {
    const div = document.createElement("div");
    div.className = "label-item";
    div.innerHTML = `<div class='revenue'>${revenues[i].toLocaleString('ru-RU')}</div><div class='date'>${label}</div>`;
    labelContainer.appendChild(div);
  });
}

async function buildComparisonBlock() {
  const raw = await fetch(urls.data).then(r => r.text());
  const data = Papa.parse(raw, { header: true }).data;

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

  const table = document.createElement('table');
  table.innerHTML = `<tr><th>День</th><th>Прошлый год</th><th>Текущий год</th></tr>`;

  allDataRows = days.map((day, i) => {
    const row = document.createElement('tr');
    if (i >= 6) row.classList.add('hidden-row');

    const current = mapThis[day];
    const previous = mapLast[day] || { date: '-', traffic: 0, revenue: 0 };
    const weekdayNow = current.date.toLocaleDateString('ru-RU', { weekday: 'short' });
    const weekdayPrev = previous.date instanceof Date && !isNaN(previous.date)
      ? previous.date.toLocaleDateString('ru-RU', { weekday: 'short' })
      : '-';

    if (current.revenue > previous.revenue) row.classList.add('highlight');
    row.innerHTML = `
  <td>${day}</td>
  <td>${w1}, ${prev.revenue.toLocaleString("ru-RU")}, ${prev.traffic}</td>
  <td>${w2}, ${curr.revenue.toLocaleString("ru-RU")}, ${curr.traffic}</td>`;
    return row;
  });

  allDataRows.forEach(r => table.appendChild(r));
  document.getElementById("compareTable").appendChild(table);
}

window.addEventListener("DOMContentLoaded", () => {
  loadSummary();
  loadChart();
  buildComparisonBlock();
});
