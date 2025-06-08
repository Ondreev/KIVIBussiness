
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

function cleanNumber(val) {
  return parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));
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

  const revenues = last7.map(row => cleanNumber(row["ТО"]));
  const highlight = last7.map(row => row["Выполнение плана (Да/Нет)"]?.trim().toLowerCase() === "да");
  const yMax = Math.ceil(Math.max(...revenues) / 10000) * 10000;

  const ctx = document.getElementById("salesChart").getContext("2d");

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
    const row = document.createElement("tr");
    if (i >= 6) row.classList.add("hidden-row");

    const current = mapThis[day];
    const previous = mapLast[day] || { date: '-', traffic: 0, revenue: 0 };

    const w1 = previous.date instanceof Date && !isNaN(previous.date)
      ? previous.date.toLocaleDateString('ru-RU', { weekday: 'short' })
      : '-';
    const w2 = current.date instanceof Date && !isNaN(current.date)
      ? current.date.toLocaleDateString('ru-RU', { weekday: 'short' })
      : '-';

    if (current.revenue > previous.revenue) row.classList.add("highlight");

    row.innerHTML = `
      <td>${day}</td>
      <td>${w1}, ${previous.revenue.toLocaleString("ru-RU")}, ${previous.traffic}</td>
      <td>${w2}, ${current.revenue.toLocaleString("ru-RU")}, ${current.traffic}</td>`;
    return row;
  });

  allDataRows.forEach(row => table.appendChild(row));
  document.getElementById("compareTable").appendChild(table);
}
