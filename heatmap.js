// heatmap.js — Тепловая карта месяца + События

// ====================================
// 📅 СОБЫТИЯ (редактируй здесь!)
// ====================================
const EVENTS = [
  // Аренда (2 раза в месяц)
  { type: 'payment', name: 'Аренда (1 часть)', day: 7, amount: 79000, icon: '💰' },
  { type: 'payment', name: 'Аренда (2 часть)', day: 23, amount: 63000, icon: '💰' },
  
  // Кредиты
  { type: 'payment', name: 'Кредит Сбербанк', day: 7, amount: 13100, icon: '🏦' },
  { type: 'payment', name: 'Кредит ВТБ', day: 23, amount: 14700, icon: '🏦' },
  
  // Дни рождения (month: номер месяца, если null — каждый месяц)
  { type: 'birthday', name: 'День рождения Виктора', day: 15, month: 5, icon: '🎂' },
  { type: 'birthday', name: 'День рождения Кирилла', day: 1, month: 1, icon: '🎂' },
  { type: 'birthday', name: 'День рождения Дмитрия', day: 17, month: 10, icon: '🎂' },
  { type: 'birthday', name: 'День рождения Дениса', day: 11, month: 7, icon: '🎂' },
];
// ====================================

(async function() {
  // Ждём загрузки данных
  if (!window.DATASETS || !window.DATASETS.data) {
    console.log('⏳ Ждём загрузки данных...');
    await new Promise(resolve => {
      document.addEventListener('sheets-ready', resolve, { once: true });
    });
  }

  buildHeatmap();
})();

async function buildHeatmap() {
  console.log('🔨 Создаём карту месяца...');

  const data = window.DATASETS?.data || [];
  if (!data.length) {
    console.error('❌ Нет данных для карты месяца');
    return;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const lastYear = currentYear - 1;

  // Собираем данные прошлого года для этого месяца
  const revenueByDay = {};
  data.forEach(row => {
    const dateStr = row["Дата"];
    if (!dateStr) return;
    
    const d = new Date(dateStr);
    if (d.getFullYear() === lastYear && d.getMonth() === currentMonth) {
      const day = d.getDate();
      const revenue = parseFloat((row["ТО"] || '0').replace(/\s/g, '').replace(',', '.'));
      if (revenue > 0) {
        if (!revenueByDay[day]) revenueByDay[day] = 0;
        revenueByDay[day] += revenue;
      }
    }
  });

  // Находим макс/мин для цветовой шкалы
  const revenues = Object.values(revenueByDay);
  const maxRevenue = Math.max(...revenues, 1);
  const minRevenue = Math.min(...revenues.filter(r => r > 0), 0);

  // Цветовая функция
  function getColor(revenue) {
    if (!revenue || revenue === 0) return '#f0f0f0';
    const normalized = (revenue - minRevenue) / (maxRevenue - minRevenue);
    if (normalized < 0.33) return '#a8dadc';
    if (normalized < 0.66) return '#90ee90';
    return '#2d6a4f';
  }

  // Получаем события для текущего месяца
  function getEventsForDay(day) {
    return EVENTS.filter(e => {
      if (e.day !== day) return false;
      if (e.month && e.month !== currentMonth + 1) return false;
      return true;
    });
  }

  // Создаём или находим контейнер
  let container = document.getElementById('heatmapMonth');
  if (!container) {
    container = document.createElement('div');
    container.id = 'heatmapMonth';
    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
      mainContainer.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
  }

  container.innerHTML = '';
  container.style.cssText = `
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    padding: 24px;
    margin-top: 24px;
    max-width: 640px;
    width: 100%;
    box-sizing: border-box;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  `;

  // Заголовок
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const header = document.createElement('div');
  header.style.cssText = `
    font-size: clamp(20px, 5vw, 24px);
    font-weight: 900;
    color: #333;
    margin-bottom: 8px;
    text-align: center;
  `;
  header.innerHTML = `📅 Карта месяца`;
  container.appendChild(header);

  const subtitle = document.createElement('div');
  subtitle.style.cssText = `
    font-size: clamp(13px, 3.2vw, 15px);
    color: #666;
    margin-bottom: 20px;
    text-align: center;
  `;
  subtitle.textContent = `${monthNames[currentMonth]} ${lastYear} (прошлый год)`;
  container.appendChild(subtitle);

  // Календарная сетка
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-bottom: 20px;
  `;

  // Заголовки дней недели
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  weekdays.forEach(wd => {
    const cell = document.createElement('div');
    cell.style.cssText = `
      font-size: clamp(11px, 2.8vw, 13px);
      font-weight: 700;
      color: #666;
      text-align: center;
      padding: 8px 0;
    `;
    cell.textContent = wd;
    grid.appendChild(cell);
  });

  // Пустые ячейки до начала месяца
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    grid.appendChild(empty);
  }

  // Ячейки дней
  for (let day = 1; day <= daysInMonth; day++) {
    const revenue = revenueByDay[day] || 0;
    const bgColor = getColor(revenue);
    const isToday = day === currentDay;
    const events = getEventsForDay(day);
    const hasEvents = events.length > 0;

    const cell = document.createElement('div');
    cell.style.cssText = `
      aspect-ratio: 1;
      background: ${bgColor};
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(14px, 3.5vw, 18px);
      font-weight: ${isToday ? '900' : '600'};
      color: ${bgColor === '#2d6a4f' ? 'white' : '#333'};
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border: ${isToday ? '3px solid #ff4081' : '2px solid transparent'};
      box-shadow: ${isToday ? '0 0 12px rgba(255, 64, 129, 0.5)' : 'none'};
    `;

    // Номер дня
    const dayNum = document.createElement('div');
    dayNum.textContent = day;
    cell.appendChild(dayNum);

    // Индикатор события (точка в углу)
    if (hasEvents) {
      const indicator = document.createElement('div');
      const eventType = events[0].type;
      const dotColor = eventType === 'payment' ? '#e74c3c' : '#9b59b6';
      
      indicator.style.cssText = `
        position: absolute;
        top: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        background: ${dotColor};
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
      `;
      cell.appendChild(indicator);
    }

    // Hover
    cell.addEventListener('mouseenter', () => {
      if (!isToday) {
        cell.style.transform = 'scale(1.15)';
        cell.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
      }
    });
    cell.addEventListener('mouseleave', () => {
      if (!isToday) {
        cell.style.transform = 'scale(1)';
        cell.style.boxShadow = 'none';
      }
    });

    // Клик — показать события
    cell.addEventListener('click', () => {
      showEvents(day, events, revenue);
    });

    grid.appendChild(cell);
  }

  container.appendChild(grid);

  // Легенда
  const legend = document.createElement('div');
  legend.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    font-size: clamp(11px, 2.8vw, 13px);
  `;

  const legendItems = [
    { color: '#f0f0f0', label: 'Нет данных' },
    { color: '#a8dadc', label: 'Низкая' },
    { color: '#90ee90', label: 'Хорошая' },
    { color: '#2d6a4f', label: 'Отличная' },
  ];

  legendItems.forEach(item => {
    const div = document.createElement('div');
    div.style.cssText = `display: flex; align-items: center; gap: 6px;`;
    div.innerHTML = `
      <div style='width: 16px; height: 16px; background: ${item.color}; border-radius: 4px;'></div>
      <span style='color: #666;'>${item.label}</span>
    `;
    legend.appendChild(div);
  });

  container.appendChild(legend);

  // Блок событий
  const eventsBlock = document.createElement('div');
  eventsBlock.id = 'eventsBlock';
  eventsBlock.style.cssText = `
    background: #f8f9fa;
    border-radius: 12px;
    padding: 16px;
    margin-top: 16px;
    display: none;
  `;
  container.appendChild(eventsBlock);

  // Функция показа событий
  function showEvents(day, events, revenue) {
    const block = document.getElementById('eventsBlock');
    if (!block) return;

    if (events.length === 0 && revenue === 0) {
      block.style.display = 'none';
      return;
    }

    block.style.display = 'block';
    block.innerHTML = '';

    // Заголовок
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: clamp(16px, 4vw, 18px);
      font-weight: 700;
      color: #333;
      margin-bottom: 12px;
    `;
    title.textContent = `📅 ${day} ${monthNames[currentMonth]}`;
    block.appendChild(title);

    // События
    if (events.length > 0) {
      events.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.style.cssText = `
          background: white;
          border-left: 4px solid ${event.type === 'payment' ? '#e74c3c' : '#9b59b6'};
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        `;

        let content = `<div style='font-size: clamp(14px, 3.5vw, 16px); font-weight: 700; color: #333; margin-bottom: 4px;'>
          ${event.icon} ${event.name}
        </div>`;

        if (event.amount) {
          content += `<div style='font-size: clamp(13px, 3.2vw, 15px); color: #e74c3c; font-weight: 600;'>
            Сумма: ${event.amount.toLocaleString('ru-RU')}₽
          </div>`;
        }

        eventDiv.innerHTML = content;
        block.appendChild(eventDiv);
      });

      // Итоговая сумма платежей
      const totalPayments = events.filter(e => e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
      if (totalPayments > 0) {
        const totalDiv = document.createElement('div');
        totalDiv.style.cssText = `
          background: #fff3cd;
          border-left: 4px solid #f39c12;
          border-radius: 8px;
          padding: 12px;
          margin-top: 8px;
          font-size: clamp(14px, 3.5vw, 16px);
          font-weight: 700;
          color: #856404;
        `;
        totalDiv.textContent = `💸 Итого к оплате: ${totalPayments.toLocaleString('ru-RU')}₽`;
        block.appendChild(totalDiv);
      }
    }

    // Выручка прошлого года
    if (revenue > 0) {
      const revenueDiv = document.createElement('div');
      revenueDiv.style.cssText = `
        background: white;
        border-left: 4px solid #667eea;
        border-radius: 8px;
        padding: 12px;
        margin-top: 8px;
        font-size: clamp(13px, 3.2vw, 15px);
        color: #666;
      `;
      revenueDiv.innerHTML = `📊 Выручка ${lastYear} года: <strong style='color:#667eea;'>${Math.round(revenue).toLocaleString('ru-RU')}₽</strong>`;
      block.appendChild(revenueDiv);
    }
  }

  // Показываем события сегодняшнего дня сразу
  const todayEvents = getEventsForDay(currentDay);
  const todayRevenue = revenueByDay[currentDay] || 0;
  showEvents(currentDay, todayEvents, todayRevenue);

  console.log('✅ Карта месяца с событиями создана');
}
