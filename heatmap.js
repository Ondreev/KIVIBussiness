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
  { type: 'birthday', name: 'День рождения Ирина', day: 18, month: 7, icon: '🎉' },
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
    if (!revenue || revenue === 0) return '#f1f5f9';
    const ratio = revenue / avgRevenue;
    if (ratio < 0.8) return '#dbeafe';
    if (ratio < 1.2) return '#a7f3d0';
    return '#10b981';
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
    <div class="card-light">
      <div class="card-title">🗓 Карта месяца</div>
      <div class="card-subtitle">${monthNames[currentMonth]} ${lastYear} (прошлый год)</div>
      <div class="hm-grid">
  `;

  // Заголовки дней
  weekdays.forEach(wd => {
    html += `<div class="hm-wd">${wd}</div>`;
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

    // Проверка выполнения плана ТЕКУЩЕГО года — маленький бейдж в углу
    let planIndicator = '';
    if (currentYearData[day]) {
      const dayData = currentYearData[day];
      if (dayData.plan > 0 && dayData.revenue > 0) {
        const isPlanMet = dayData.revenue >= dayData.plan;
        planIndicator = `<div class="hm-badge">${isPlanMet ? '❤️' : '🥺'}</div>`;
      }
    }

    // Точки событий внизу ячейки
    let dotsHtml = '';
    if (hasEvents) {
      const uniqueTypes = [...new Set(events.map(e => e.type))];
      dotsHtml = `<div class="hm-dots">${uniqueTypes.map(type =>
        `<span class="hm-dot" style="background:${type === 'payment' ? '#f97316' : '#a855f7'};"></span>`
      ).join('')}</div>`;
    }

    const textColor = bgColor === '#10b981' ? '#fff' : '#0f172a';
    html += `
      <div class="heatmap-day hm-day${isToday ? ' today' : ''}" data-day="${day}" style="background:${bgColor};color:${textColor};">
        ${planIndicator}
        <span>${day}</span>
        ${dotsHtml}
      </div>
    `;
  }

  html += `
      </div>
      <div class="hm-legend">
        <span><i style="background:#dbeafe;"></i>Низкая</span>
        <span><i style="background:#a7f3d0;"></i>Средняя</span>
        <span><i style="background:#10b981;"></i>Отличная</span>
        <span><i style="background:#f97316;border-radius:50%;width:7px;height:7px;"></i>Платежи</span>
        <span><i style="background:#a855f7;border-radius:50%;width:7px;height:7px;"></i>Дни рождения</span>
      </div>
      <div id="eventsBlock" style="background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:14px;margin-top:12px;display:none;"></div>
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
    
    let html = `<div style="font-size:clamp(16px,4vw,18px);font-weight:700;color:#0f172a;margin-bottom:12px;">📅 ${day} ${monthNames[currentMonth]}</div>`;

    // Информация о текущем годе (план)
    if (hasCurrentYearData) {
      const hasPlan = dayData.plan > 0;
      const isPlanMet = hasPlan && dayData.revenue >= dayData.plan;
      const planPercent = hasPlan ? Math.round(dayData.revenue / dayData.plan * 100) : 0;
      const statusColor = isPlanMet ? '#10b981' : (hasPlan ? '#ef4444' : '#94a3b8');
      const statusIcon = isPlanMet ? '❤️' : (hasPlan ? '🥺' : '📊');

      html += `
        <div style="background:white;border-left:4px solid ${statusColor};border-radius:10px;padding:12px;margin-bottom:8px;box-shadow:0 2px 8px rgba(15,23,42,0.05);">
          <div style="font-size:clamp(14px,3.5vw,16px);font-weight:800;color:#0f172a;margin-bottom:4px;">${statusIcon} ${currentYear} год</div>
          <div style="font-size:clamp(13px,3.2vw,15px);color:#64748b;">
            Выручка: <strong style="color:#6366f1;">${Math.round(dayData.revenue).toLocaleString('ru-RU')}₽</strong><br>
            ${hasPlan ? `План: <strong style="color:#0f172a;">${Math.round(dayData.plan).toLocaleString('ru-RU')}₽</strong> <span style="color:${statusColor};font-weight:700;">(${planPercent}%)</span>` : 'План не задан'}
          </div>
        </div>
      `;
    }

    if (events.length) {
      events.forEach(event => {
        const borderColor = event.type === 'payment' ? '#f97316' : '#a855f7';
        html += `
          <div style="background:white;border-left:4px solid ${borderColor};border-radius:10px;padding:12px;margin-bottom:8px;box-shadow:0 2px 8px rgba(15,23,42,0.05);">
            <div style="font-size:clamp(14px,3.5vw,16px);font-weight:800;color:#0f172a;margin-bottom:4px;">${event.icon} ${event.name}</div>
            ${event.amount ? `<div style="font-size:clamp(13px,3.2vw,15px);color:#ef4444;font-weight:700;">Сумма: ${event.amount.toLocaleString('ru-RU')}₽</div>` : ''}
          </div>
        `;
      });

      const totalPayments = events.filter(e => e.type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
      if (totalPayments) {
        html += `<div style="background:#fff7ed;border-left:4px solid #f59e0b;border-radius:10px;padding:12px;margin-top:8px;font-size:clamp(14px,3.5vw,16px);font-weight:800;color:#92400e;">💸 Итого к оплате: ${totalPayments.toLocaleString('ru-RU')}₽</div>`;
      }
    }

    if (revenue) {
      const ratio = (revenue / avgRevenue * 100).toFixed(0);
      html += `<div style="background:white;border-left:4px solid #6366f1;border-radius:10px;padding:12px;margin-top:8px;font-size:clamp(13px,3.2vw,15px);color:#64748b;box-shadow:0 2px 8px rgba(15,23,42,0.05);">📊 Выручка ${lastYear} года: <strong style="color:#6366f1;">${Math.round(revenue).toLocaleString('ru-RU')}₽</strong> (${ratio}% от среднего)</div>`;
    }

    block.innerHTML = html;
  }

  // Показываем сегодняшний день сразу
  const todayEvents = getEventsForDay(currentDay);
  showEvents(currentDay, todayEvents, revenueByDay[currentDay] || 0);

  const endTime = performance.now();
  console.log(`✅ Карта создана за ${Math.round(endTime - startTime)}ms`);
}
