// yearComparisonChart.js — сравнение выручки по месяцам за текущий и прошлый год (линейная диаграмма)

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
  const monthLabels = months.map(i => (i + 1).toString());

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
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: `${currentYear}`,
          data: avgCurrent,
          borderColor: '#FFD700',
          backgroundColor: '#FFD700',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#FFD700'
        },
        {
          label: `${lastYear}`,
          data: avgLast,
          borderColor: '#FFFFFF',
          backgroundColor: '#FFFFFF',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#FFFFFF'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            color: '#fff',
            font: {
              weight: 'bold'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + Math.round(ctx.raw).toLocaleString('ru-RU') + '₽'
          }
        }
      },
      scales: {
        y: {
          display: false
        },
        x: {
          ticks: {
            color: '#fff',
            font: { weight: 'bold' }
          }
        }
      }
    }
  });
})();
