// yearComparisonChart.js — График сравнения с жирными линиями и яркими цветами

(async () => {
  const url = SHEETS.data;
  const res = await fetch(url);
  const text = await res.text();
  const data = Papa.parse(text, { header: true }).data;

  const clean = val => parseFloat((val || '0').replace(/\s/g, '').replace(',', '.'));
  const today = new Date();
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;
  const yearBeforeLast = currentYear - 2;

  const months = Array.from({ length: 12 }, (_, i) => i);
  const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const sums = {
    [currentYear]: Array(12).fill(0),
    [lastYear]: Array(12).fill(0),
    [yearBeforeLast]: Array(12).fill(0)
  };
  const counts = {
    [currentYear]: Array(12).fill(0),
    [lastYear]: Array(12).fill(0),
    [yearBeforeLast]: Array(12).fill(0)
  };

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

  // Контейнер для графика
  const container = document.createElement("div");
  container.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 24px 20px;
    margin-top: 24px;
    width: 100%;
    max-width: 640px;
    box-sizing: border-box;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  `;

  container.innerHTML = `
    <div style='font-size:clamp(18px, 4.5vw, 22px);font-weight:700;margin-bottom:16px;text-align:center;color:#333;'>
      📈 Сравнение по годам
    </div>
    <div style='font-size:clamp(12px, 3vw, 14px);color:#666;margin-bottom:20px;text-align:center;'>
      Средняя выручка по месяцам
    </div>
  `;

  const canvas = document.createElement("canvas");
  canvas.id = "yearComparison";
  canvas.style.cssText = `
    width: 100% !important;
    height: 280px !important;
    max-height: 280px;
  `;
  
  container.appendChild(canvas);
  
  document.querySelector('.container').appendChild(container);

  // Создаём график
  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: `${currentYear}`,
          data: avg(currentYear),
          borderColor: '#ff6b35',        // Оранжевый (яркий)
          backgroundColor: 'rgba(255, 107, 53, 0.15)',
          tension: 0.3,
          borderWidth: 5,                // ✅ Толщина 5
          pointRadius: 7,                // ✅ Большие точки
          pointBackgroundColor: '#ff6b35',
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointHoverRadius: 10,          // ✅ Ещё больше при hover
          pointHoverBorderWidth: 4,
          fill: true
        },
        {
          label: `${lastYear}`,
          data: avg(lastYear),
          borderColor: '#e74c3c',        // Красный (насыщенный)
          backgroundColor: 'rgba(231, 76, 60, 0.15)',
          tension: 0.3,
          borderWidth: 5,                // ✅ Толщина 5
          pointRadius: 7,
          pointBackgroundColor: '#e74c3c',
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointHoverRadius: 10,
          pointHoverBorderWidth: 4,
          fill: true
        },
        {
          label: `${yearBeforeLast}`,
          data: avg(yearBeforeLast),
          borderColor: '#2ecc71',        // Зелёный (яркий)
          backgroundColor: 'rgba(46, 204, 113, 0.15)',
          tension: 0.3,
          borderWidth: 5,                // ✅ Толщина 5
          pointRadius: 7,
          pointBackgroundColor: '#2ecc71',
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          pointHoverRadius: 10,
          pointHoverBorderWidth: 4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeInOutQuart'
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'center',
          labels: {
            boxWidth: 20,              // ✅ Больше квадраты
            boxHeight: 20,
            padding: 16,
            color: '#333',
            font: {
              weight: '700',           // ✅ Жирнее шрифт
              size: window.innerWidth < 480 ? 14 : 16,
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          titleColor: '#fff',
          bodyColor: '#fff',
          titleFont: {
            size: 15,
            weight: '700'
          },
          bodyFont: {
            size: 14,
            weight: '600'
          },
          padding: 14,
          cornerRadius: 10,
          displayColors: true,
          boxWidth: 12,
          boxHeight: 12,
          boxPadding: 6,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = Math.round(context.parsed.y).toLocaleString('ru-RU');
              return `${label}: ${value}₽`;
            }
          }
        }
      },
      scales: {
        y: {
          display: false,
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#555',
            font: {
              size: window.innerWidth < 480 ? 12 : 14,
              weight: '700'              // ✅ Жирнее подписи
            },
            padding: 10
          }
        }
      }
    }
  });

  console.log('✅ График сравнения по годам создан');
})();
