// heatmap.js — Тепловая карта месяца + События (ПРАВИЛЬНАЯ РАСЦВЕТКА)

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

document.addEventListener('sheets-ready', buildHeatmap);

function buildHeatmap() {
  const startTime = performance.now();
  console.log('🔨 Создаём карту месяца...');

  const data = window.DATASETS?.data || [];
  if (!data.length) return;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  const lastYear = currentYear - 1;

  // БЫСТРЫЙ сбор данных (один проход)
  const revenueByDay = {};
  const targetYearMonth = `${lastYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  for (let i = 0; i < data.length; i++) {
    const dateStr = data[i]["Дата"];
    if (!dateStr || !dateStr.startsWith(targetYearMonth)) continue;
    
    const day = parseInt(dateStr.split('-')[2]);
    const revenue = parseFloat((data[i]["ТО"] || '0').replace(/\s/g, '').replace(',', '.'));
    
    if (revenue > 0) {
      revenueByDay[day] = (revenueByDay[day] || 0) + revenue;
    }
  }

  // ПРАВИЛЬНАЯ цветовая шкала (на основе среднего)
  const revenues = Object.values(revenueByDay).filter(r => r > 0);
  const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;

  console.log('📊 Средняя выручка прошлого года:', Math.round(avgRevenue));

  function getColor(revenue) {
    if (!revenue || revenue === 0) return '#f0f0f0'; // нет данных
    
    // Пороги на основе среднего:
    // Низкая: 0 - 80% от среднего
    // Хорошая: 80% - 120% от среднего
    // Отличная: 120%+ от среднего
    
    const ratio = revenue / avgRevenue;
    
    if (ratio < 0.8) return '#a8dadc'; // низкая (голубой)
    if (ratio < 1.2) return '#90ee90'; // хорошая (светло-зелёный)
    return '#2d6a4f'; // отличная (тёмно-зелёный)
  }

  // События для дня
  function getEventsForDay(day) {
    return EVENTS.filter(e => e.day === day && (!e.month || e.month === currentMonth + 1));
  }

  // Контейнер
  let container = document.getElementById('heatmapMonth');
  if (!container) {
    container = document.createElement('div');
    container.id = 'heatmapMonth';
    document.querySelector('.container').appendChild(container);
  }

  // БЫСТРАЯ генерация HTML
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  let html = `
    <div style="background:rgba(255,255,255,0.95);border-radius:20px;padding:24px;margin-top:24px;max-width:640px;width:100%;box-sizing:border-box;box-shadow:0 4px 16px rgba(0,0,0,0.15);">
      <div style="font-size:clamp(20px,5vw,24px);font-weight:900;color:#333;margin-bottom:8px;text-align:center;">📅 Карта месяца</div>
      <div style="font-size:clamp(13px,3.2vw,15px);color:#666;margin-bottom:20px;text-align:center;">${monthNames[currentMonth]} ${lastYear} (прошлый год)</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:20px;">
  `;

  // Заголовки дней
  weekdays.forEach(wd => {
    html += `<div style="font-size:clamp(11px,2.8vw,13px);font-weight:700;color:#666;text-align:center;padding:8px 0;">${wd}</div>`;
  });

  // Пустые ячейки
  for (let i = 0; i < startDay; i++) {
    html += '<div></div>';
  }

  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const revenue = revenueByDay[day] || 0;
    const bgColor = getColor(revenue);
    const isToday = day === currentDay;
    const events = getEventsForDay(day);
    const hasEvents = events.length > 0;
    const dotColor = hasEvents ? (events[0].type === 'payment' ? '#e74c3c' : '#9b59b6') : '';

    html += `
      <div class="heatmap-day" data-day="${day}" style="aspect-ratio:1;background:${bgColor};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:clamp(14px,3.5vw,18px);font-weight:${isToday ? '900' : '600'};color:${bgColor === '#2d6a4f' ? 'white' : '#333'};cursor:pointer;transition:all 0.2s ease;position:relative;border:${isToday ? '3px solid #ff4081' : '2px solid transparent'};box-shadow:${isToday ? '0 0 12px rgba(255,64,129,0.5)' : 'none'};">
        ${day}
        ${hasEvents ? `<div style="position:absolute;top:4px;right:4px;width:8px;height:8px;background:${dotColor};border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>` : ''}
      </div>
    `;
  }

  html += `
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;font-size:clamp(11px,2.8vw,13px);">
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:16px;height:16px;background:#a8dadc;border-radius:4px;"></div><span style="color:#666;">Низкая (&lt;80%)</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:16px;height:16px;background:#90ee90;border-radius:4px;"></div><span style="color:#666;">Средняя (80-120%)</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:16px;height:16px;background:#2d6a4f;border-radius:4px;"></div><span style="color:#666;">Отличная (&gt;120%)</span></div>
      </div>
      <div id="eventsBlock" style="background:#f8f9fa;border-radius:12px;padding:16px;margin-top:16px;display:none;"></div>
    </div>
  `;

  container.innerHTML = html;

  // Обработчики кликов (делегирование)
  container.addEventListener('click', e => {
    const dayCell = e.target.closest('.heatmap-day');
    if (!dayCell) return;
    
    const day = parseInt(dayCell.dataset.day);
    const events = getEventsForDay(day);
    const revenue = revenueByDay[day] || 0;
    showEvents(day, events, revenue);
  });

  // Hover
  container.addEventListener('mouseover', e => {
    const dayCell = e.target.closest('.heatmap-day');
    if (!dayCell || dayCell.style.border.includes('#ff4081')) return;
    dayCell.style.transform = 'scale(1.15)';
    dayCell.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
  });

  container.addEventListener('mouseout', e => {
    const dayCell = e.target.closest('.heatmap-day');
    if (!dayCell || dayCell.style.border.includes('#ff4081')) return;
    dayCell.style.transform = 'scale(1)';
    dayCell.style.boxShadow = 'none';
  });

  // Функция показа событий
  function showEvents(day, events, revenue) {
    const block = document.getElementById('eventsBlock');
    if (!block) return;

    if (!events.length && !revenue) {
      block.style.display = 'none';
      return;
    }

    block.style.display = 'block';
    
    let html = `<div style="font-size:clamp(16px,4vw,18px);font-weight:700;color:#333;margin-bottom:12px;">📅 ${day} ${monthNames[currentMonth]}</div>`;

    if (events.length) {
      events.forEach(event => {
        const borderColor = event.type === 'payment' ? '#e74c3c' : '#9b59b6';
        html += `
          <div style="background:white;border-left:4px solid ${borderColor};border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="font-size:clamp(14px,3.5vw,16px);font-weight:700;color:#333;margin-bottom:4px;">${event.icon} ${event.name}</div>
            ${event.amount ? `<div style="font-size:clamp(13px,3.2vw,15px);color:#e74c3c;font-weight:600;">Сумма: ${event.amount.toLocaleString('ru-RU')}₽</div>` : ''}
          </div>
        `;
      });

      const totalPayments = events.filter(e => e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
      if (totalPayments) {
        html += `<div style="background:#fff3cd;border-left:4px solid #f39c12;border-radius:8px;padding:12px;margin-top:8px;font-size:clamp(14px,3.5vw,16px);font-weight:700;color:#856404;">💸 Итого к оплате: ${totalPayments.toLocaleString('ru-RU')}₽</div>`;
      }
    }

    if (revenue) {
      const ratio = (revenue / avgRevenue * 100).toFixed(0);
      html += `<div style="background:white;border-left:4px solid #667eea;border-radius:8px;padding:12px;margin-top:8px;font-size:clamp(13px,3.2vw,15px);color:#666;">📊 Выручка ${lastYear} года: <strong style="color:#667eea;">${Math.round(revenue).toLocaleString('ru-RU')}₽</strong> (${ratio}% от среднего)</div>`;
    }

    block.innerHTML = html;
  }

  // Показываем сегодняшний день сразу
  const todayEvents = getEventsForDay(currentDay);
  showEvents(currentDay, todayEvents, revenueByDay[currentDay] || 0);

  const endTime = performance.now();
  console.log(`✅ Карта создана за ${Math.round(endTime - startTime)}ms`);
}
