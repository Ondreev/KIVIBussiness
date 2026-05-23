// heatmap.js — Тепловая карта месяца + События (ПРАВИЛЬНАЯ РАСЦВЕТКА)

// ====================================
// 📅 СОБЫТИЯ (редактируй здесь!)
// ====================================
const EVENTS = [
  // Аренда (2 раза в месяц)
  { type: 'payment', name: 'Коммуналка', day: 2, amount: 6000, icon: '💲' },
  { type: 'payment', name: 'Аренда', day: 18, amount: 70000, icon: '💲' },
  
  // Кредиты
  { type: 'payment', name: 'Кредит 1', day: 6, amount: 25600, icon: '✔️' },
  { type: 'payment', name: 'Кредит 2', day: 20, amount: 20000, icon: '✔️' },
  { type: 'payment', name: 'Кредит 3', day: 7, amount: 10000, icon: '✔️' },
  { type: 'payment', name: 'Кредит 4', day: 10, amount: 27200, icon: '✔️' },
  { type: 'payment', name: 'Кредит 4', day: 13, amount: 6000, icon: '✔️' },
  
  // Дни рождения (month: номер месяца, если null — каждый месяц)
  { type: 'birthday', name: 'День рождения Виктора', day: 15, month: 5, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Кирилла', day: 20, month: 1, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Дмитрия', day: 17, month: 10, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Дениса', day: 11, month: 7, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Людмила', day: 15, month: 1, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Акбар', day: 16, month: 4, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Таня соседка', day: 7, month: 6, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Наташа соседка высокая', day: 22, month: 8, icon: '🎉' },
  { type: 'birthday', name: 'День рождения Нугзар', day: 15, month: 8, icon: '🎉' },
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

  // БЫСТРЫЙ сбор данных ПРОШЛОГО года
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

  // БЫСТРЫЙ сбор данных ТЕКУЩЕГО года (для проверки плана)
  const currentYearData = {};
  const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  for (let i = 0; i < data.length; i++) {
    const dateStr = data[i]["Дата"];
    if (!dateStr || !dateStr.startsWith(currentYearMonth)) continue;
    
    const day = parseInt(dateStr.split('-')[2]);
    const revenue = parseFloat((data[i]["ТО"] || '0').replace(/\s/g, '').replace(',', '.'));
    const plan = parseFloat((data[i]["План на день"] || '0').replace(/\s/g, '').replace(',', '.'));
    
    if (!currentYearData[day]) currentYearData[day] = { revenue: 0, plan: 0 };
    
    // Суммируем выручку
    if (revenue > 0) currentYearData[day].revenue += revenue;
    // Берём план (он одинаковый на весь день)
    if (plan > 0) currentYearData[day].plan = plan;
  }
  
  console.log('📊 Данные текущего года (первые 3 дня):', {
    1: currentYearData[1],
    2: currentYearData[2],
    3: currentYearData[3]
  });

  // Цветовая шкала (на основе среднего)
  const revenues = Object.values(revenueByDay).filter(r => r > 0);
  const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;

  function getColor(revenue) {
    if (!revenue || revenue === 0) return '#f0f0f0';
    const ratio = revenue / avgRevenue;
    if (ratio < 0.8) return '#a8dadc';
    if (ratio < 1.2) return '#90ee90';
    return '#2d6a4f';
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
    // Вставляем в правую колонку (десктоп) или .container (мобильная)
    const target = document.querySelector('.right-column') || document.querySelector('.container');
    if (target) target.appendChild(container);
  }

  // Генерация HTML
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  let html = `
    <div style="background:rgba(255,255,255,0.95);border-radius:20px;padding:24px;margin-bottom:24px;width:100%;box-sizing:border-box;box-shadow:0 4px 16px rgba(0,0,0,0.15);">
      <div style="font-size:clamp(20px,5vw,24px);font-weight:900;color:#333;margin-bottom:8px;text-align:center;"> Карта месяца</div>
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
    
    // Проверка выполнения плана ТЕКУЩЕГО года
    let planIndicator = '';
    if (currentYearData[day]) {
      const dayData = currentYearData[day];
      if (dayData.plan > 0 && dayData.revenue > 0) {
        const isPlanMet = dayData.revenue >= dayData.plan;
        const icon = isPlanMet ? '❤️' : '🥺';
        // Позиционируем ЗА ПРЕДЕЛАМИ кубика в правом верхнем углу
        planIndicator = `<div style="position:absolute;top:-8px;right:-8px;font-size:18px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));z-index:10;">${icon}</div>`;
        
        // Отладка первых 5 дней
        if (day <= 5) {
          console.log(`День ${day}: выручка=${dayData.revenue.toFixed(0)}, план=${dayData.plan}, выполнен=${isPlanMet}`);
        }
      }
    }
    
    // Генерируем звёздочки для ВСЕХ событий
    let starsHtml = '';
    if (hasEvents) {
      const uniqueTypes = [...new Set(events.map(e => e.type))]; // уникальные типы
      uniqueTypes.forEach(type => {
        const color = type === 'payment' ? '#ff6b35' : '#9b59b6'; // оранжевый или фиолетовый
        starsHtml += `<span style="color:${color};font-size:14px;line-height:1;">★</span>`;
      });
    }

    html += `
      <div class="heatmap-day" data-day="${day}" style="aspect-ratio:1;background:${bgColor};border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:clamp(14px,3.5vw,18px);font-weight:${isToday ? '900' : '600'};color:${bgColor === '#2d6a4f' ? 'white' : '#333'};cursor:pointer;transition:all 0.2s ease;position:relative;border:${isToday ? '3px solid #ff4081' : '2px solid transparent'};box-shadow:${isToday ? '0 0 12px rgba(255,64,129,0.5)' : 'none'};padding:4px;overflow:visible;">
        ${planIndicator}
        <div style="flex:1;display:flex;align-items:center;">${day}</div>
        ${hasEvents ? `<div style="display:flex;gap:2px;margin-top:-2px;">${starsHtml}</div>` : ''}
      </div>
    `;
  }

  html += `
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;font-size:clamp(11px,2.8vw,13px);">
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:16px;height:16px;background:#a8dadc;border-radius:4px;"></div><span style="color:#666;">Низкая</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:16px;height:16px;background:#90ee90;border-radius:4px;"></div><span style="color:#666;">Средняя</span></div>
        <div style="display:flex;align-items:center;gap:6px;"><div style="width:16px;height:16px;background:#2d6a4f;border-radius:4px;"></div><span style="color:#666;">Отличная</span></div>
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;font-size:clamp(11px,2.8vw,13px);">
        <div style="display:flex;align-items:center;gap:4px;"><span style="color:#ff6b35;font-size:16px;">★</span><span style="color:#666;">Платежи</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><span style="color:#9b59b6;font-size:16px;">★</span><span style="color:#666;">Дни рождения</span></div>
      </div>
      <div id="eventsBlock" style="background:#f8f9fa;border-radius:12px;padding:16px;margin-top:16px;display:none;"></div>
    </div>
  `;

  container.innerHTML = html;

  // Обработчики кликов
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

    const dayData = currentYearData[day];
    const hasCurrentYearData = dayData && dayData.revenue > 0;

    if (!events.length && !revenue && !hasCurrentYearData) {
      block.style.display = 'none';
      return;
    }

    block.style.display = 'block';
    
    let html = `<div style="font-size:clamp(16px,4vw,18px);font-weight:700;color:#333;margin-bottom:12px;">📅 ${day} ${monthNames[currentMonth]}</div>`;

    // Информация о текущем годе (план)
    if (hasCurrentYearData) {
      const hasPlan = dayData.plan > 0;
      const isPlanMet = hasPlan && dayData.revenue >= dayData.plan;
      const planPercent = hasPlan ? Math.round(dayData.revenue / dayData.plan * 100) : 0;
      const statusColor = isPlanMet ? '#28a745' : (hasPlan ? '#dc3545' : '#999');
      const statusIcon = isPlanMet ? '❤️' : (hasPlan ? '🥺' : '📊');
      
      console.log(`Событие день ${day}:`, {
        revenue: dayData.revenue,
        plan: dayData.plan,
        hasPlan,
        isPlanMet,
        planPercent
      });
      
      html += `
        <div style="background:white;border-left:4px solid ${statusColor};border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="font-size:clamp(14px,3.5vw,16px);font-weight:700;color:#333;margin-bottom:4px;">${statusIcon} ${currentYear} год</div>
          <div style="font-size:clamp(13px,3.2vw,15px);color:#666;">
            Выручка: <strong style="color:#667eea;">${Math.round(dayData.revenue).toLocaleString('ru-RU')}₽</strong><br>
            ${hasPlan ? `План: <strong>${Math.round(dayData.plan).toLocaleString('ru-RU')}₽</strong> <span style="color:${statusColor};font-weight:600;">(${planPercent}%)</span>` : 'План не задан'}
          </div>
        </div>
      `;
    }

    if (events.length) {
      events.forEach(event => {
        const borderColor = event.type === 'payment' ? '#ff6b35' : '#9b59b6';
        html += `
          <div style="background:white;border-left:4px solid ${borderColor};border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="font-size:clamp(14px,3.5vw,16px);font-weight:700;color:#333;margin-bottom:4px;">${event.icon} ${event.name}</div>
            ${event.amount ? `<div style="font-size:clamp(13px,3.2vw,15px);color:#e74c3c;font-weight:600;">Сумма: ${event.amount.toLocaleString('ru-RU')}₽</div>` : ''}
          </div>
        `;
      });

      const totalPayments = events.filter(e => e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
      if (totalPayments) {
        html += `<div style="background:#fff3cd;border-left:4px solid #f39c12;border-radius:8px;padding:12px;margin-top:8px;font-size:clamp(14px,3.5vw,16px);font-weight:700;color:#856404;">💩 Итого к оплате: ${totalPayments.toLocaleString('ru-RU')}₽</div>`;
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
