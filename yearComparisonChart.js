// yearComparisonChart.js — сравнение выручки по месяцам за последние 3 года
document.addEventListener('sheets-ready', () => {
  const data = window.DATASETS.data;

  const clean = val => parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));
  const today = new Date();
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;
  const yearBeforeLast = currentYear - 2;

  const months = Array.from({ length: 12 }, (_, i) => i);
  const monthLabels = months.map(i => (i + 1).toString());

  const sums = { [currentYear]: Array(12).fill(0), [lastYear]: Array(12).fill(0), [yearBeforeLast]: Array(12).fill(0) };
  const counts = { [currentYear]: Array(12).fill(0), [lastYear]: Array(12).fill(0), [yearBeforeLast]: Array(12).fill(0) };

  data.forEach(row => {
    const d = new Date(row["Дата"]);
    const y = d.getFullYear();
    const m = d.getMonth();
    if ((y === currentYear || y === lastYear || y === yearBeforeLast) && row["ТО"]) {
      sums[y][m] += clean(row["ТО"]);
      counts[y][m]++;
    }
  });

  const avg = year => sums[year].map((s, i) => counts[year][i] ? s / counts[year][i] : 0);

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
        { label: `${currentYear}`, data: avg(currentYear), borderColor: '#FFD700', backgroundColor: '#FFD700', tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#FFD700' },
        { label: `${lastYear}`, data: avg(lastYear), borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#FFFFFF' },
        { label: `${yearBeforeLast}`, data: avg(yearBeforeLast), borderColor: '#42a5f5', backgroundColor: '#42a5f5', tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#42a5f5' }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 1000, easing: 'easeInOutQuad' },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 14, color: '#fff', font: { weight: 'bold', size: 16 } } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + Math.round(ctx.raw).toLocaleString('ru-RU') + '₽' } }
      },
      scales: { y: { display: false }, x: { ticks: { color: '#fff', font: { weight: 'bold', size: 16 } } } }
    }
  });
});
