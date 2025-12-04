// heatmap.js — Тепловая карта месяца (на основе прошлого года)

document.addEventListener("sheets-ready", () => {
  buildHeatmap();
});

function buildHeatmap() {
  const data = window.DATASETS?.data || [];
  if (!data.length) return;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const lastYear = currentYear - 1;

  // Парсинг даты
  const parseYMD = (str) => {
    if (!str) return null;
    const s = String(str).trim().replace(/\u00A0/g, " ").replace(/[^\d-]/g, "");
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  };

  const cleanNumber = (val) => {
    if (val == null) return 0;
    if (typeof val === "number") return val;
    return parseFloat(String(val).replace(/\s/g, "").replace(",", ".")) || 0;
  };

  // Собираем данные за прошлый год (тот же месяц)
  const dayData = {};
  data.forEach(row => {
    const dateStr = row["Дата"] || row["Date"];
    const p = parseYMD(dateStr);
    if (!p || p.y !== lastYear || p.m !== currentMonth) return;

    const revenue = cleanNumber(row["ТО"] || row["TO"]);
    if (revenue === 0) return;

    if (!dayData[p.d]) dayData[p.d] = { revenue: 0, count: 0 };
    dayData[p.d].revenue += revenue;
    dayData[p.d].count += 1;
  });

  // Если нет данных
  if (Object.keys(dayData).length === 0) {
    console.log('ℹ️ Нет данных за прошлый год для тепловой карты');
    return;
  }

  // Находим min/max для градиента
  const revenues = Object.values(dayData).map(d => d.revenue);
  const minRevenue = Math.min(...revenues);
  const maxRevenue = Math.max(...revenues);

  // Получаем количество дней в текущем месяце
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Получаем день недели первого числа
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Понедельник = 0

  // Создаём блок
  const container = document.createElement('div');
  container.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 20px;
    margin-top: 24px;
    width: 100%;
    max-width: 640px;
    box-sizing: border-box;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  `;

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  
  container.innerHTML = `
    <div style='font-size:clamp(18px, 4.5vw, 22px);font-weight:700;margin-bottom:8px;text-align:center;color:#333;'>
      🗓️ Карта месяца
    </div>
    <div style='font-size:clamp(12px, 3vw, 14px);color:#666;margin-bottom:16px;text-align:center;'>
      ${monthNames[currentMonth - 1]} ${lastYear} (прошлый год)
    </div>
  `;

  // Сетка календаря
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 16px;
  `;

  // Заголовки дней недели
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  weekdays.forEach(day => {
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: clamp(10px, 2.5vw, 12px);
      font-weight: 600;
      text-align: center;
      padding: 6px 2px;
      color: #666;
    `;
    header.textContent = day;
    grid.appendChild(header);
  });

  // Функция для получения цвета по выручке
  const getColor = (revenue) => {
    if (!revenue) return 'rgba(200, 200, 200, 0.2)';
    const normalized = (revenue - minRevenue) / (maxRevenue - minRevenue);
    
    if (normalized < 0.25) return 'rgba(102, 126, 234, 0.3)'; // Низкая
    if (normalized < 0.5) return 'rgba(102, 126, 234, 0.5)';  // Средне-низкая
    if (normalized < 0.75) return 'rgba(255, 193, 7, 0.6)';    // Средняя
    return 'rgba(255, 107, 53, 0.8)';                          // Высокая
  };

  // Пустые ячейки в начале
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    grid.appendChild(empty);
  }

  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const dayInfo = dayData[day];
    const revenue = dayInfo ? dayInfo.revenue : 0;
    
    const cell = document.createElement('div');
    cell.style.cssText = `
      aspect-ratio: 1;
      background: ${getColor(revenue)};
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: clamp(11px, 2.8vw, 14px);
      font-weight: 600;
      color: #333;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid rgba(0, 0, 0, 0.05);
    `;

    if (revenue > 0) {
      cell.title = `${day} число: ${Math.round(revenue).toLocaleString('ru-RU')}₽`;
      cell.addEventListener('mouseenter', () => {
        cell.style.transform = 'scale(1.15)';
        cell.style.zIndex = '10';
        cell.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      });
      cell.addEventListener('mouseleave', () => {
        cell.style.transform = 'scale(1)';
        cell.style.zIndex = '1';
        cell.style.boxShadow = 'none';
      });
    }

    cell.textContent = day;
    grid.appendChild(cell);
  }

  container.appendChild(grid);

  // Легенда
  const legend = document.createElement('div');
  legend.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    font-size: clamp(10px, 2.5vw, 12px);
    color: #666;
    flex-wrap: wrap;
  `;

  legend.innerHTML = `
    <div style='display:flex;align-items:center;gap:4px;'>
      <div style='width:16px;height:16px;background:rgba(102, 126, 234, 0.3);border-radius:4px;'></div>
      <span>Низкая</span>
    </div>
    <div style='display:flex;align-items:center;gap:4px;'>
      <div style='width:16px;height:16px;background:rgba(102, 126, 234, 0.5);border-radius:4px;'></div>
      <span>Средняя</span>
    </div>
    <div style='display:flex;align-items:center;gap:4px;'>
      <div style='width:16px;height:16px;background:rgba(255, 193, 7, 0.6);border-radius:4px;'></div>
      <span>Хорошая</span>
    </div>
    <div style='display:flex;align-items:center;gap:4px;'>
      <div style='width:16px;height:16px;background:rgba(255, 107, 53, 0.8);border-radius:4px;'></div>
      <span>Отличная</span>
    </div>
  `;

  container.appendChild(legend);

  // Добавляем в контейнер
  document.querySelector('.container').appendChild(container);

  console.log(`✅ Тепловая карта построена: ${Object.keys(dayData).length} дней с данными`);
}
