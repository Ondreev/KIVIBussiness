// yearComparisonChart.js — Чистый график с цифрами и сеткой

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
  const monthLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']; // ✅ Цифры

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
    height: 300px !important;
    max-height: 300px;
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
          borderColor: '#FFD700',
          backgroundColor: 'transparent',
          tension: 0.4,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#FFD700',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          fill: false
        },
        {
          label: `${lastYear}`,
          data: avg(lastYear),
          borderColor: '#FF1744',
          backgroundColor: 'transparent',
          tension: 0.4,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#FF1744',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          fill: false
        },
        {
          label: `${yearBeforeLast}`,
          data: avg(yearBeforeLast),
          borderColor: '#00E676',
          backgroundColor: 'transparent',
          tension: 0.4,
          borderWidth: 4,
          pointRadius: 0,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#00E676',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: 5,
          right: 5
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutCubic'
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
            boxWidth: 24,
            boxHeight: 4,
            padding: 14,
            color: '#333',
            font: {
              weight: '700',
              size: window.innerWidth < 480 ? 13 : 15,
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            usePointStyle: false
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(33, 33, 33, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          titleFont: {
            size: 15,
            weight: '700'
          },
          bodyFont: {
            size: 14,
            weight: '600'
          },
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxWidth: 12,
          boxHeight: 12,
          boxPadding: 8,
          callbacks: {
            title: function(context) {
              // ✅ Показываем название месяца в tooltip
              const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                                  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
              const monthIndex = parseInt(context[0].label) - 1;
              return monthNames[monthIndex];
            },
            label: function(context) {
              const label = context.dataset.label || '';
              const value = Math.round(context.parsed.y).toLocaleString('ru-RU');
              return ` ${label}: ${value}₽`;
            }
          }
        }
      },
      scales: {
        y: {
          display: false,
          beginAtZero: true
        },
        x: {
          grid: {
            display: true,              // ✅ ВКЛЮЧИЛИ СЕТКУ
            color: 'rgba(0, 0, 0, 0.06)', // ✅ Светло-серые линии
            lineWidth: 1,
            drawBorder: false,
            drawOnChartArea: true,
            drawTicks: false
          },
          ticks: {
            color: '#666',
            font: {
              size: window.innerWidth < 480 ? 13 : 15,  // ✅ Чуть крупнее цифры
              weight: '700'
            },
            padding: 12
          }
        }
      }
    }
  });

  console.log('✅ График сравнения по годам создан');
})();
