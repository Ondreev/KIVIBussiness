// history.js — Компактная история выручки (оптимизация для мобильных)

document.addEventListener("sheets-ready", () => {
  buildHistoryBlock();
});

// Утилиты
const HISTORY_COLS = {
  date: ["Дата"],
  revenue: ["ТО", "TO"],
  traffic: ["ТР", "TP", "TR"]
};

function getCol(row, names) {
  for (const n of names) {
    if (row[n] != null) return row[n];
  }
  return undefined;
}

function cleanNumber(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/\s/g, "").replace(",", ".")) || 0;
}

function parseYMD(str) {
  if (!str) return null;
  const s = String(str).trim().replace(/\u00A0/g, " ").replace(/[^\d-]/g, "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

function getMonthName(monthIndex) {
  const names = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return names[monthIndex - 1] || '';
}

function getWeekday(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

function buildHistoryBlock() {
  const data = window.DATASETS?.data || [];
  if (!data.length) return;

  // Собираем данные по годам → месяцам → дням
  const structure = {}; // year -> month -> day -> {revenue, traffic}

  data.forEach(row => {
    const dateStr = getCol(row, HISTORY_COLS.date);
    const p = parseYMD(dateStr);
    if (!p) return;

    const revenue = cleanNumber(getCol(row, HISTORY_COLS.revenue));
    const traffic = cleanNumber(getCol(row, HISTORY_COLS.traffic));

    if (revenue === 0) return;

    const { y, m, d } = p;

    if (!structure[y]) structure[y] = {};
    if (!structure[y][m]) structure[y][m] = {};
    if (!structure[y][m][d]) structure[y][m][d] = { revenue: 0, traffic: 0 };

    structure[y][m][d].revenue += revenue;
    structure[y][m][d].traffic += traffic;
  });

  // Сортируем годы (от новых к старым)
  const years = Object.keys(structure).map(Number).sort((a, b) => b - a);

  const container = document.getElementById('historyYears');
  if (!container) return;

  container.innerHTML = '';

  years.forEach(year => {
    const yearData = structure[year];
    const months = Object.keys(yearData).map(Number).sort((a, b) => a - b);

    // Считаем общую статистику года
    let yearRevenue = 0;
    let yearTraffic = 0;
    months.forEach(m => {
      const days = Object.values(yearData[m]);
      days.forEach(d => {
        yearRevenue += d.revenue;
        yearTraffic += d.traffic;
      });
    });

    const avgCheck = yearTraffic ? Math.round(yearRevenue / yearTraffic) : 0;

    // Создаём блок года
    const yearBlock = document.createElement('div');
    yearBlock.className = 'year-item-compact';
    yearBlock.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    yearBlock.innerHTML = `
      <div style='text-align:center;'>
        <div style='font-size:clamp(14px, 3.5vw, 16px);color:rgba(255,255,255,0.8);margin-bottom:8px;font-weight:500;'>${year} год</div>
        <div style='font-size:clamp(32px, 8vw, 42px);font-weight:900;color:#fff;margin-bottom:12px;text-shadow:0 2px 8px rgba(0,0,0,0.3);'>${Math.round(yearRevenue).toLocaleString('ru-RU')}₽</div>
        <div style='display:flex;justify-content:center;gap:16px;font-size:clamp(13px, 3.2vw, 15px);color:rgba(255,255,255,0.9);'>
          <div><strong>${Math.round(yearTraffic).toLocaleString('ru-RU')}</strong> чеков</div>
          <div>•</div>
          <div><strong>${avgCheck.toLocaleString('ru-RU')}₽</strong> ср. чек</div>
        </div>
      </div>
    `;

    // Контейнер для месяцев
    const monthsContainer = document.createElement('div');
    monthsContainer.className = 'months-container-compact';
    monthsContainer.style.cssText = `
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.5s ease-out;
      margin-top: 16px;
    `;

    months.forEach(month => {
      const monthData = yearData[month];
      const days = Object.keys(monthData).map(Number).sort((a, b) => a - b);

      // Статистика месяца
      let monthRevenue = 0;
      let monthTraffic = 0;
      days.forEach(d => {
        monthRevenue += monthData[d].revenue;
        monthTraffic += monthData[d].traffic;
      });

      const avgRevenue = Math.round(monthRevenue / days.length);
      const avgTraffic = Math.round(monthTraffic / days.length);
      const avgMonthCheck = avgTraffic ? Math.round(avgRevenue / avgTraffic) : 0;

      // Блок месяца
      const monthBlock = document.createElement('div');
      monthBlock.className = 'month-item-compact';
      monthBlock.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.08);
      `;

      monthBlock.innerHTML = `
        <div style='text-align:center;'>
          <div style='font-size:clamp(15px, 3.8vw, 17px);font-weight:700;color:#fff;margin-bottom:8px;'>${getMonthName(month)}</div>
          <div style='font-size:clamp(12px, 3vw, 14px);color:rgba(255,255,255,0.85);'>
            Средний день: <strong>${avgRevenue.toLocaleString('ru-RU')}₽</strong> • <strong>${avgTraffic}</strong> чел. • <strong>${avgMonthCheck}₽</strong> чек
          </div>
        </div>
      `;

      // Контейнер для дней
      const daysContainer = document.createElement('div');
      daysContainer.className = 'days-container-compact';
      daysContainer.style.cssText = `
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.5s ease-out;
        margin-top: 12px;
      `;

      // Таблица дней (как в сравнении с прошлым годом)
      const table = document.createElement('table');
      table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: clamp(11px, 2.8vw, 13px);
        background: rgba(0, 0, 0, 0.2);
        border-radius: 10px;
        overflow: hidden;
      `;
      
      table.innerHTML = `
        <thead>
          <tr style='background:rgba(0,0,0,0.3);'>
            <th style='padding:10px 6px;font-weight:600;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);'>День</th>
            <th style='padding:10px 6px;font-weight:600;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);'>Д.н.</th>
            <th style='padding:10px 6px;font-weight:600;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);'>Выручка</th>
            <th style='padding:10px 6px;font-weight:600;text-align:center;border-bottom:1px solid rgba(255,255,255,0.1);'>Чеков</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');

      // Сортируем дни от последнего к первому
      days.sort((a, b) => b - a).forEach(day => {
        const dayData = monthData[day];
        const weekday = getWeekday(year, month, day);
        const isWeekend = ['сб', 'вс'].includes(weekday.toLowerCase());

        const row = document.createElement('tr');
        row.style.cssText = `
          ${isWeekend ? 'background:rgba(255, 215, 0, 0.15);' : ''}
          transition: background 0.2s ease;
        `;
        
        row.innerHTML = `
          <td style='padding:8px 6px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);'><strong>${day}</strong></td>
          <td style='padding:8px 6px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);'>${weekday}</td>
          <td style='padding:8px 6px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);'>${Math.round(dayData.revenue).toLocaleString('ru-RU')}₽</td>
          <td style='padding:8px 6px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05);'>${Math.round(dayData.traffic)}</td>
        `;

        row.addEventListener('mouseenter', () => {
          row.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = isWeekend ? 'rgba(255, 215, 0, 0.15)' : '';
        });

        tbody.appendChild(row);
      });

      daysContainer.appendChild(table);

      // Клик по месяцу → раскрыть дни
      monthBlock.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = monthBlock.classList.contains('active');
        
        // Закрываем все другие месяцы в этом году
        monthsContainer.querySelectorAll('.month-item-compact').forEach(item => {
          item.classList.remove('active');
          item.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        monthsContainer.querySelectorAll('.days-container-compact').forEach(dc => {
          dc.style.maxHeight = '0';
        });

        if (!isOpen) {
          monthBlock.classList.add('active');
          monthBlock.style.background = 'rgba(255, 255, 255, 0.25)';
          daysContainer.style.maxHeight = '1500px';
        }
      });

      monthBlock.appendChild(daysContainer);
      monthsContainer.appendChild(monthBlock);
    });

    // Клик по году → раскрыть месяцы
    yearBlock.addEventListener('click', () => {
      const isOpen = yearBlock.classList.contains('active');
      
      // Закрываем все годы
      container.querySelectorAll('.year-item-compact').forEach(item => {
        item.classList.remove('active');
        item.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)';
        item.style.transform = 'scale(1)';
      });
      container.querySelectorAll('.months-container-compact').forEach(mc => {
        mc.style.maxHeight = '0';
      });

      if (!isOpen) {
        yearBlock.classList.add('active');
        yearBlock.style.background = 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 215, 0, 0.2) 100%)';
        monthsContainer.style.maxHeight = '2500px';
      }
    });

    // Hover эффекты
    yearBlock.addEventListener('mouseenter', () => {
      if (!yearBlock.classList.contains('active')) {
        yearBlock.style.transform = 'scale(1.02)';
        yearBlock.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      }
    });
    yearBlock.addEventListener('mouseleave', () => {
      if (!yearBlock.classList.contains('active')) {
        yearBlock.style.transform = 'scale(1)';
        yearBlock.style.boxShadow = 'none';
      }
    });

    yearBlock.appendChild(monthsContainer);
    container.appendChild(yearBlock);
  });

  console.log('✅ История по годам загружена:', years.length, 'лет');
}
