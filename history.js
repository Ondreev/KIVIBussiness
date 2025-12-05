// history.js — Компактная история выручки (исправлен баг с декабрём)

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

  const today = new Date();
  const currentYear = today.getFullYear();

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

    // ✅ ИСПРАВЛЕНИЕ: для прошлых лет показываем ВСЕ дни
    // Для текущего года показываем только до сегодняшнего дня
    const rowDate = new Date(y, m - 1, d);
    if (y === currentYear && rowDate > today) return;

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
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      padding: 24px 16px;
      margin-bottom: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid rgba(102, 126, 234, 0.3);
      text-align: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    `;

    yearBlock.innerHTML = `
      <div style='font-size:clamp(16px, 4vw, 20px);color:#666;margin-bottom:12px;font-weight:600;'>${year} год</div>
      <div style='font-size:clamp(36px, 9vw, 48px);font-weight:900;background:linear-gradient(135deg, #667eea, #764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px;line-height:1;'>${Math.round(yearRevenue).toLocaleString('ru-RU')}₽</div>
      <div style='display:flex;justify-content:center;align-items:center;gap:clamp(12px, 3vw, 20px);flex-wrap:wrap;'>
        <div style='font-size:clamp(14px, 3.5vw, 16px);color:#555;font-weight:600;'>
          <span style='font-size:clamp(18px, 4.5vw, 22px);font-weight:900;color:#667eea;'>${Math.round(yearTraffic).toLocaleString('ru-RU')}</span> чеков
        </div>
        <div style='color:#ccc;font-size:20px;'>•</div>
        <div style='font-size:clamp(14px, 3.5vw, 16px);color:#555;font-weight:600;'>
          <span style='font-size:clamp(18px, 4.5vw, 22px);font-weight:900;color:#764ba2;'>${avgCheck.toLocaleString('ru-RU')}₽</span> ср. чек
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
      margin-top: 20px;
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
        background: #f8f9fa;
        border-radius: 16px;
        padding: 20px 16px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid #e0e0e0;
        text-align: center;
      `;

      monthBlock.innerHTML = `
        <div style='font-size:clamp(18px, 4.5vw, 22px);font-weight:700;color:#333;margin-bottom:12px;'>${getMonthName(month)}</div>
        <div style='font-size:clamp(13px, 3.2vw, 15px);color:#666;line-height:1.6;'>
          Средний день:<br>
          <strong style='font-size:clamp(16px, 4vw, 18px);color:#667eea;'>${avgRevenue.toLocaleString('ru-RU')}₽</strong> • 
          <strong style='color:#333;'>${avgTraffic}</strong> чел. • 
          <strong style='color:#764ba2;'>${avgMonthCheck}₽</strong> чек
        </div>
      `;

      // Контейнер для дней
      const daysContainer = document.createElement('div');
      daysContainer.className = 'days-container-compact';
      daysContainer.style.cssText = `
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.5s ease-out;
        margin-top: 16px;
      `;

      // Таблица дней
      const table = document.createElement('table');
      table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: clamp(11px, 2.8vw, 13px);
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      `;
      
      table.innerHTML = `
        <thead>
          <tr style='background:#667eea;color:#fff;'>
            <th style='padding:10px 4px;font-weight:600;text-align:center;width:15%;'>День</th>
            <th style='padding:10px 4px;font-weight:600;text-align:center;width:15%;'>Д.н.</th>
            <th style='padding:10px 4px;font-weight:600;text-align:center;width:45%;'>Выручка</th>
            <th style='padding:10px 4px;font-weight:600;text-align:center;width:25%;'>Чеков</th>
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
          ${isWeekend ? 'background:#fff3cd;' : 'background:#fff;'}
          transition: background 0.2s ease;
          border-bottom: 1px solid #f0f0f0;
        `;
        
        row.innerHTML = `
          <td style='padding:10px 4px;text-align:center;color:#333;'><strong>${day}</strong></td>
          <td style='padding:10px 4px;text-align:center;color:#666;'>${weekday}</td>
          <td style='padding:10px 4px;text-align:right;padding-right:8px;color:#333;'><strong>${Math.round(dayData.revenue).toLocaleString('ru-RU')}₽</strong></td>
          <td style='padding:10px 4px;text-align:center;color:#666;'>${Math.round(dayData.traffic)}</td>
        `;

        row.addEventListener('mouseenter', () => {
          row.style.background = '#e7f3ff';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = isWeekend ? '#fff3cd' : '#fff';
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
          item.style.background = '#f8f9fa';
          item.style.borderColor = '#e0e0e0';
          item.style.boxShadow = 'none';
        });
        monthsContainer.querySelectorAll('.days-container-compact').forEach(dc => {
          dc.style.maxHeight = '0';
        });

        if (!isOpen) {
          monthBlock.classList.add('active');
          monthBlock.style.background = '#fff';
          monthBlock.style.borderColor = '#667eea';
          monthBlock.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.2)';
          daysContainer.style.maxHeight = '2000px';
        }
      });

      monthBlock.addEventListener('mouseenter', () => {
        if (!monthBlock.classList.contains('active')) {
          monthBlock.style.background = '#fff';
          monthBlock.style.borderColor = '#ccc';
        }
      });
      monthBlock.addEventListener('mouseleave', () => {
        if (!monthBlock.classList.contains('active')) {
          monthBlock.style.background = '#f8f9fa';
          monthBlock.style.borderColor = '#e0e0e0';
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
        item.style.background = 'rgba(255, 255, 255, 0.95)';
        item.style.borderColor = 'rgba(102, 126, 234, 0.3)';
        item.style.transform = 'scale(1)';
        item.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
      });
      container.querySelectorAll('.months-container-compact').forEach(mc => {
        mc.style.maxHeight = '0';
      });

      if (!isOpen) {
        yearBlock.classList.add('active');
        yearBlock.style.borderColor = '#667eea';
        yearBlock.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.3)';
        monthsContainer.style.maxHeight = '3000px';
      }
    });

    // Hover эффекты для года
    yearBlock.addEventListener('mouseenter', () => {
      if (!yearBlock.classList.contains('active')) {
        yearBlock.style.transform = 'translateY(-2px)';
        yearBlock.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
      }
    });
    yearBlock.addEventListener('mouseleave', () => {
      if (!yearBlock.classList.contains('active')) {
        yearBlock.style.transform = 'translateY(0)';
        yearBlock.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
      }
    });

    yearBlock.appendChild(monthsContainer);
    container.appendChild(yearBlock);
  });

  console.log('✅ История по годам загружена:', years.length, 'лет');
}
