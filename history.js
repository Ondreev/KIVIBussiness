// history.js — Иерархический блок "Годы → Месяцы → Дни"
// Раскрывающаяся структура с полной статистикой

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

    // Создаём блок года
    const yearBlock = document.createElement('div');
    yearBlock.className = 'year-item';
    yearBlock.innerHTML = `
      <div>
        <div class="year-title">${year} год</div>
        <div class="year-stats">${Math.round(yearRevenue).toLocaleString('ru-RU')}₽ • ${Math.round(yearTraffic)} чел.</div>
      </div>
      <div class="year-arrow">›</div>
    `;

    // Контейнер для месяцев
    const monthsContainer = document.createElement('div');
    monthsContainer.className = 'months-container';

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

      // Блок месяца
      const monthBlock = document.createElement('div');
      monthBlock.className = 'month-item';
      monthBlock.innerHTML = `
        <div>
          <div class="month-name">${getMonthName(month)}</div>
          <div class="month-stats">Средний день: ${avgRevenue.toLocaleString('ru-RU')}₽ • ${avgTraffic} чел.</div>
        </div>
        <div class="year-arrow">›</div>
      `;

      // Контейнер для дней
      const daysContainer = document.createElement('div');
      daysContainer.className = 'days-container';

      // Таблица дней
      const table = document.createElement('table');
      table.className = 'days-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>День</th>
            <th>День нед.</th>
            <th>Выручка</th>
            <th>Трафик</th>
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
        if (isWeekend) {
          row.style.background = 'rgba(255, 215, 0, 0.15)';
        }
        row.innerHTML = `
          <td><strong>${day}</strong></td>
          <td>${weekday}</td>
          <td>${Math.round(dayData.revenue).toLocaleString('ru-RU')}₽</td>
          <td>${Math.round(dayData.traffic)}</td>
        `;
        tbody.appendChild(row);
      });

      daysContainer.appendChild(table);

      // Клик по месяцу → раскрыть дни
      monthBlock.addEventListener('click', () => {
        const isOpen = monthBlock.classList.contains('active');
        
        // Закрываем все другие месяцы в этом году
        monthsContainer.querySelectorAll('.month-item').forEach(item => {
          item.classList.remove('active');
        });
        monthsContainer.querySelectorAll('.days-container').forEach(dc => {
          dc.classList.remove('open');
        });

        if (!isOpen) {
          monthBlock.classList.add('active');
          daysContainer.classList.add('open');
        }
      });

      monthBlock.appendChild(daysContainer);
      monthsContainer.appendChild(monthBlock);
    });

    // Клик по году → раскрыть месяцы
    yearBlock.addEventListener('click', (e) => {
      // Проверяем, что клик не по месяцу внутри
      if (e.target.closest('.month-item')) return;

      const isOpen = yearBlock.classList.contains('active');
      
      // Закрываем все годы
      container.querySelectorAll('.year-item').forEach(item => {
        item.classList.remove('active');
      });
      container.querySelectorAll('.months-container').forEach(mc => {
        mc.classList.remove('open');
      });

      if (!isOpen) {
        yearBlock.classList.add('active');
        monthsContainer.classList.add('open');
      }
    });

    yearBlock.appendChild(monthsContainer);
    container.appendChild(yearBlock);
  });

  console.log('✅ История по годам загружена:', years.length, 'лет');
}
