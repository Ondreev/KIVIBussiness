// yearComparisonChart.js — сравнение выручки по месяцам за текущий и прошлый год

(async () => {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?gid=2099900296&single=true&output=csv";
  const res = await fetch(url);
  const text = await res.text();
  const data = Papa.parse(text, { header: true }).data;

  const clean = val => parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));
  const today = new Date();
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;

  const months = Array.from({ length: 12 }, (_, i) => i);
  const monthNames = months.map(i => new Date(2000, i).toLocaleString('ru-RU', { month: 'short' }));

  const sums = { [currentYear]: Array(12).fill(0), [lastYear]: Array(12).fill(0) };
  const counts = { [currentYear]: Array(12).fill(0), [lastYear]: Array(12).fill(0) };

  data.forEach(row => {
    const d = new Date(row["Дата"]);
    const y = d.getFullYear();
    const m = d.getMonth();
    if ((y === currentYear || y === lastYear) && row["ТО"]) {
      sums[y][m] += clean(row["ТО"]);
      counts[y][m]++;
    }
  });

  const avgCurrent = sums[currentYear].map((s, i) => counts[currentYear][i] ? s / counts[currentYear][i] : 0);
  const avgLast = sums[lastYear].map((s, i) => counts[lastYear][i] ? s / counts[lastYear][i] : 0);

  const canvas = document.createElement("canvas");
  canvas.id = "yearComparison";
  canvas.style.marginTop = "24px";
  canvas.style.maxWidth = "640px";
  canvas.style.width = "95%";

  document.body.appendChild(canvas);

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: monthNames,
      datasets: [
        {
          label: `${currentYear}`,
          data: avgCurrent,
          backgroundColor: '#42a5f5'
        },
        {
          label: `${lastYear}`,
          data: avgLast,
          backgroundColor: '#cfd8dc'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + Math.round(ctx.raw).toLocaleString('ru-RU') + '₽'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: val => val.toLocaleString('ru-RU') + '₽'
          }
        }
      }
    }
  });
})();
