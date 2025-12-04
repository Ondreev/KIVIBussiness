// yearComparisonChart.js — График сравнения выручки по месяцам за годы (контрастные цвета)

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
    height: 250px !important;
    max-height: 250px;
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
          borderColor: '#ffd700',        // Жёлтый (золотой)
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#ffd700',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          fill: true
        },
        {
          label: `${lastYear}`,
          data: avg(lastYear),
          borderColor: '#ff4757',        // Красный
          backgroundColor: 'rgba(255, 71, 87, 0.1)',
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#ff4757',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          fill: true
        },
        {
          label: `${yearBeforeLast}`,
          data: avg(yearBeforeLast),
          borderColor: '#7bed9f',        // Салатовый
          backgroundColor: 'rgba(123, 237, 159, 0.1)',
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#7bed9f',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
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
            boxWidth: 16,
            boxHeight: 16,
            padding: 15,
            color: '#333',
            font: {
              weight: '600',
              size: window.innerWidth < 480 ? 13 : 15,
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          titleFont: {
            size: 14,
            weight: '600'
          },
          bodyFont: {
            size: 13
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
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
          display: false,              // ✅ УБРАЛИ ОСЬ Y ПОЛНОСТЬЮ
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#666',
            font: {
              size: window.innerWidth < 480 ? 11 : 13,
              weight: '600'
            },
            padding: 8
          }
        }
      }
    }
  });

  console.log('✅ График сравнения по годам создан');
})();
