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
  
  // 🔍 ДЕТАЛЬНАЯ ОТЛАДКА для декабря 2023-2025
  const originalStr = String(str).trim();
  if (originalStr.includes('-12-') && originalStr.includes('202')) {
    const day = originalStr.split('-')[2];
    if (day && parseInt(day) <= 5) {
      console.log(`🔍 parseYMD для декабря день ${day}:`, {
        original: str,
        cleaned: s,
        matched: !!m,
        result: m ? { y: +m[1], m: +m[2], d: +m[3] } : null
      });
    }
  }
  
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

  // 🔍 ОТЛАДКА: считаем строки по месяцам
  const debugCount = {};

  data.forEach(row => {
    const dateStr = getCol(row, HISTORY_COLS.date);
    const p = parseYMD(dateStr);
    if (!p) return;

    const revenue = cleanNumber(getCol(row, HISTORY_COLS.revenue));
    const traffic = cleanNumber(getCol(row, HISTORY_COLS.traffic));

    // УБРАЛ проверку if (revenue === 0) return;
    // Теперь показываем ВСЕ дни, включая выходные с нулевой выручкой

    const { y, m, d } = p;
    
    // 🔍 ОТЛАДКА: считаем строки декабря 2025
    if (y === 2025 && m === 12) {
      const key = `${y}-${m}`;
      if (!debugCount[key]) debugCount[key] = [];
      debugCount[key].push(d);
      
      // Детальный лог для дней 1-5
      if (d <= 5) {
        console.log(`🔍 День ${d} декабря 2025: выручка=${revenue}, трафик=${traffic}, dateStr="${dateStr}"`);
      }
    }

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
  
  // 🔍 ОТЛАДКА: выводим дни декабря 2025
  Object.keys(debugCount).forEach(key => {
    const days = debugCount[key].sort((a, b) => a - b);
    console.log(`🔍 Декабрь 2025: найдено ${days.length} дней:`, days);
  });
  
  // 🔍 ОТЛАДКА: проверяем structure для декабря 2025
  if (structure[2025] && structure[2025][12]) {
    const dec2025Days = Object.keys(structure[2025][12]).map(Number).sort((a, b) => a - b);
    console.log(`🔍 В structure[2025][12]:`, dec2025Days);
  }

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
      background: #f8fafc;
      border-radius: 18px;
      padding: 16px 14px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid #eef2f7;
      text-align: center;
    `;

    yearBlock.innerHTML = `
      <div style='font-size:11px;color:#94a3b8;margin-bottom:6px;font-weight:800;text-transform:uppercase;letter-spacing:1px;'>${year} год</div>
      <div style='font-size:clamp(26px, 7vw, 36px);font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg, #6366f1, #a855f7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;line-height:1.05;'>${Math.round(yearRevenue).toLocaleString('ru-RU')}₽</div>
      <div style='display:flex;justify-content:center;align-items:baseline;gap:14px;flex-wrap:wrap;font-size:clamp(12px, 3.2vw, 14px);color:#64748b;font-weight:600;'>
        <span><b style='font-size:clamp(15px, 4vw, 18px);font-weight:900;color:#6366f1;'>${Math.round(yearTraffic).toLocaleString('ru-RU')}</b> чеков</span>
        <span><b style='font-size:clamp(15px, 4vw, 18px);font-weight:900;color:#a855f7;'>${avgCheck.toLocaleString('ru-RU')}₽</b> ср. чек</span>
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
        background: #fff;
        border-radius: 14px;
        padding: 12px 14px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid #eef2f7;
      `;

      monthBlock.innerHTML = `
        <div style='display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;'>
          <div style='font-size:clamp(15px, 3.8vw, 17px);font-weight:800;color:#0f172a;'>${getMonthName(month)}</div>
          <div style='font-size:clamp(12px, 3.2vw, 14px);color:#64748b;font-weight:600;white-space:nowrap;'>
            <b style='color:#6366f1;'>${avgRevenue.toLocaleString('ru-RU')}₽</b> · ${avgTraffic} чел · <b style='color:#a855f7;'>${avgMonthCheck}₽</b>
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
        margin-top: 16px;
      `;

      // Таблица дней
      const table = document.createElement('table');
      table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        font-size: clamp(12px, 3.1vw, 13.5px);
        background: #fff;
        border-radius: 12px;
      `;

      table.innerHTML = `
        <thead>
          <tr>
            <th style='padding:9px 4px;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:center;width:15%;border-bottom:2px solid #eef2f7;'>День</th>
            <th style='padding:9px 4px;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:center;width:15%;border-bottom:2px solid #eef2f7;'>Д.н.</th>
            <th style='padding:9px 4px;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:right;width:45%;border-bottom:2px solid #eef2f7;'>Выручка</th>
            <th style='padding:9px 4px;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;text-align:center;width:25%;border-bottom:2px solid #eef2f7;'>Чеков</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');

      // 🔍 ОТЛАДКА: логируем какие дни отрисовываем для декабря 2025
      if (year === 2025 && month === 12) {
        console.log(`🔍 Отрисовка декабря 2025: дней в массиве = ${days.length}`, days);
      }

      // Сортируем дни от последнего к первому
      days.sort((a, b) => b - a).forEach(day => {
        // 🔍 ОТЛАДКА: логируем первые 5 дней декабря 2025
        if (year === 2025 && month === 12 && day <= 5) {
          console.log(`🔍 Отрисовка декабря 2025, день ${day}:`, monthData[day]);
        }
        
        const dayData = monthData[day];
        const weekday = getWeekday(year, month, day);
        const isWeekend = ['сб', 'вс'].includes(weekday.toLowerCase());

        const row = document.createElement('tr');
        row.style.cssText = `
          ${isWeekend ? 'background:#fffbeb;' : 'background:#fff;'}
          transition: background 0.2s ease;
          border-bottom: 1px solid #f1f5f9;
        `;

        row.innerHTML = `
          <td style='padding:9px 4px;text-align:center;color:#0f172a;'><strong>${day}</strong></td>
          <td style='padding:9px 4px;text-align:center;color:#94a3b8;'>${weekday}</td>
          <td style='padding:9px 4px;text-align:right;padding-right:8px;color:#0f172a;'><strong>${Math.round(dayData.revenue).toLocaleString('ru-RU')}₽</strong></td>
          <td style='padding:9px 4px;text-align:center;color:#64748b;'>${Math.round(dayData.traffic)}</td>
        `;

        row.addEventListener('mouseenter', () => {
          row.style.background = '#eef2ff';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = isWeekend ? '#fffbeb' : '#fff';
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
          item.style.background = '#fff';
          item.style.borderColor = '#eef2f7';
          item.style.boxShadow = 'none';
        });
        monthsContainer.querySelectorAll('.days-container-compact').forEach(dc => {
          dc.style.maxHeight = '0';
        });

        if (!isOpen) {
          monthBlock.classList.add('active');
          monthBlock.style.borderColor = '#6366f1';
          monthBlock.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.18)';
          daysContainer.style.maxHeight = '2000px';
        }
      });

      monthBlock.addEventListener('mouseenter', () => {
        if (!monthBlock.classList.contains('active')) {
          monthBlock.style.borderColor = '#c7d2fe';
        }
      });
      monthBlock.addEventListener('mouseleave', () => {
        if (!monthBlock.classList.contains('active')) {
          monthBlock.style.borderColor = '#eef2f7';
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
        item.style.background = '#f8fafc';
        item.style.borderColor = '#eef2f7';
        item.style.transform = 'scale(1)';
        item.style.boxShadow = 'none';
      });
      container.querySelectorAll('.months-container-compact').forEach(mc => {
        mc.style.maxHeight = '0';
      });

      if (!isOpen) {
        yearBlock.classList.add('active');
        yearBlock.style.background = '#fff';
        yearBlock.style.borderColor = '#6366f1';
        yearBlock.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.18)';
        monthsContainer.style.maxHeight = '3000px';
      }
    });

    // Hover эффекты для года
    yearBlock.addEventListener('mouseenter', () => {
      if (!yearBlock.classList.contains('active')) {
        yearBlock.style.transform = 'translateY(-2px)';
        yearBlock.style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.08)';
      }
    });
    yearBlock.addEventListener('mouseleave', () => {
      if (!yearBlock.classList.contains('active')) {
        yearBlock.style.transform = 'translateY(0)';
        yearBlock.style.boxShadow = 'none';
      }
    });

    yearBlock.appendChild(monthsContainer);
    container.appendChild(yearBlock);
  });

  console.log('✅ История по годам загружена:', years.length, 'лет');
}
