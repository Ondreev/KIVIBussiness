// advisor.js — Умный AI-советник с глубокой аналитикой

(async () => {
  const dataUrl = SHEETS.data;
  const ebitdaUrl = SHEETS.ebitda;
  const leadersUrl = SHEETS.leaders;

  const parse = async (url) => {
    const res = await fetch(url);
    const text = await res.text();
    return Papa.parse(text, { header: true }).data;
  };

  const clean = v => parseFloat((v || '0').toString().replace(/\s/g, '').replace(',', '.'));

  const data = await parse(dataUrl);
  const costs = await parse(ebitdaUrl);
  const leaders = await parse(leadersUrl);

  const today = new Date();
  const ym = today.toISOString().slice(0, 7);
  const currentDay = today.getDate();
  const dayOfWeek = today.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;

  // Данные текущего месяца
  const thisMonthData = data.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"]?.startsWith(ym) && d <= today && clean(r["ТО"]) > 0;
  });

  // Данные прошлого года (тот же месяц)
  const lastYearMonth = data.filter(r => {
    const d = new Date(r["Дата"]);
    return d.getFullYear() === lastYear && d.getMonth() === today.getMonth() && d.getDate() <= currentDay && clean(r["ТО"]) > 0;
  });

  // Последние 7 дней
  const last7Days = thisMonthData.slice(-7);

  // Расчёты
  const avgRevenue = thisMonthData.reduce((s, r) => s + clean(r["ТО"]), 0) / thisMonthData.length;
  const avgTraffic = thisMonthData.reduce((s, r) => s + clean(r["ТР"]), 0) / thisMonthData.length;
  const avgASP = thisMonthData.reduce((s, r) => s + clean(r["расчет ASP"]), 0) / thisMonthData.length;
  const asp = avgASP ? Math.round(avgRevenue / avgASP) : 0;

  // EBITDA
  let totalCosts = 0;
  costs.forEach(row => {
    const value = clean(row["Значение"]);
    const type = (row["Тип"] || '').toLowerCase();
    if (type.includes("руб")) totalCosts += value;
    else if (type.includes("%")) totalCosts += avgRevenue * value / 100;
  });
  const ebitda = avgRevenue - totalCosts;
  const ebitdaPercent = avgRevenue ? Math.round((ebitda / avgRevenue) * 100) : 0;

  // Сравнение с прошлым годом
  const lastYearAvg = lastYearMonth.length > 0 ? lastYearMonth.reduce((s, r) => s + clean(r["ТО"]), 0) / lastYearMonth.length : 0;
  const growthPercent = lastYearAvg ? Math.round(((avgRevenue - lastYearAvg) / lastYearAvg) * 100) : 0;

  // Тренд за последние 7 дней
  const trend7Days = last7Days.length >= 2 ? clean(last7Days[last7Days.length - 1]["ТО"]) - clean(last7Days[0]["ТО"]) : 0;
  const trendDirection = trend7Days > 0 ? 'рост' : trend7Days < 0 ? 'падение' : 'стабильность';

  // Лидеры продаж (топ-3)
  const top3Leaders = leaders.filter(r => r["Лидеры продаж"]).map(r => r["Лидеры продаж"]).slice(0, 3);

  // Прогноз выполнения плана
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const forecast = Math.round(avgRevenue * daysInMonth);

  // 🧠 УМНЫЙ АНАЛИЗ И СОВЕТЫ
  const insights = [];
  const warnings = [];
  const actions = [];

  // === АНАЛИЗ РЕНТАБЕЛЬНОСТИ ===
  if (ebitdaPercent < 0) {
    warnings.push('🚨 Критично: отрицательная рентабельность');
    actions.push('Срочно пересмотреть расходы и цены');
    insights.push(`EBITDA ${ebitdaPercent}% — бизнес работает в убыток. Необходимо: 1) Снизить переменные расходы на 15-20%, 2) Повысить цены на 5-10%, 3) Сфокусироваться на высокомаржинальных товарах`);
  } else if (ebitdaPercent < 10) {
    warnings.push('⚠️ Низкая рентабельность');
    insights.push(`EBITDA ${ebitdaPercent}% — ниже целевого уровня (15-20%). Рекомендации: проверить закупочные цены, оптимизировать штатное расписание, пересмотреть акции и скидки`);
  } else if (ebitdaPercent > 25) {
    insights.push(`✅ Отличная рентабельность ${ebitdaPercent}%! Можно инвестировать в рекламу или улучшение сервиса`);
  }

  // === АНАЛИЗ СРЕДНЕГО ЧЕКА ===
  if (asp < 200) {
    warnings.push('📉 Низкий средний чек');
    actions.push('Кассирам: активно предлагать сопутствующие товары');
    insights.push(`Средний чек ${asp}₽ — ниже нормы. ТАКТИКА: обучить кассиров техникам допродаж (кросс-селл), создать готовые комбо-предложения, выделить импульсные товары у кассы`);
  } else if (asp > 300) {
    insights.push(`💎 Высокий средний чек ${asp}₽ — отлично работают кассиры!`);
  }

  // === АНАЛИЗ ТРАФИКА ===
  if (avgTraffic < 20) {
    warnings.push('👥 Низкий трафик посетителей');
    actions.push('Увеличить маркетинговую активность');
    insights.push(`Трафик ${Math.round(avgTraffic)} чел/день — недостаточно. ДЕЙСТВИЯ: запустить таргетированную рекламу, провести акцию "приведи друга", усилить присутствие в соцсетях, проверить видимость вывески`);
  }

  // === СРАВНЕНИЕ С ПРОШЛЫМ ГОДОМ ===
  if (growthPercent < -10) {
    warnings.push(`📊 Падение на ${Math.abs(growthPercent)}% к прошлому году`);
    insights.push(`Выручка упала на ${Math.abs(growthPercent)}% по сравнению с ${lastYear} годом. СРОЧНО: анализ конкурентов, опрос клиентов о причинах, проверка качества продукции и сервиса`);
  } else if (growthPercent > 15) {
    insights.push(`🚀 Рост на ${growthPercent}% к прошлому году — отличная динамика!`);
  } else if (growthPercent >= 0 && growthPercent <= 5) {
    insights.push(`Стабильность (+${growthPercent}%), но можно больше. Внедрите новый продукт или услугу для ускорения роста`);
  }

  // === АНАЛИЗ ТРЕНДА (7 ДНЕЙ) ===
  if (trendDirection === 'падение') {
    warnings.push('📉 Негативный тренд последних дней');
    insights.push(`Выручка падает последние 7 дней (${Math.round(trend7Days)}₽). Возможные причины: сезонность, усталость персонала, проблемы с поставками. Проведите совещание с командой`);
  } else if (trendDirection === 'рост') {
    insights.push(`📈 Позитивный тренд! Выручка растёт (+${Math.round(trend7Days)}₽ за неделю). Продолжайте в том же духе!`);
  }

  // === ДЕНЬ НЕДЕЛИ ===
  if (isWeekend) {
    insights.push(`🎉 Выходной день — пик трафика! Увеличьте штат кассиров, подготовьте дополнительный запас популярных товаров. Фокус: скорость обслуживания`);
  } else {
    if (dayOfWeek === 1) { // Понедельник
      insights.push(`☕ Понедельник — обычно медленный старт недели. Запустите утреннюю акцию (скидка до 12:00) для привлечения клиентов`);
    } else if (dayOfWeek === 5) { // Пятница
      insights.push(`🎊 Пятница — предвыходной всплеск! Подготовьте промо на "выходной набор", усильте выкладку импульсных товаров`);
    }
  }

  // === ЛИДЕРЫ ПРОДАЖ ===
  if (top3Leaders.length > 0) {
    actions.push(`Продвигать: ${top3Leaders.join(', ')}`);
    insights.push(`🏆 ТОП товары этого месяца: ${top3Leaders.join(', ')}. ЗАКУПКА: увеличьте запас на 30%, разместите на видном месте, обучите кассиров рассказывать о преимуществах`);
  }

  // === ЗАКУПКА ===
  const last3Days = thisMonthData.slice(-3);
  const avg3 = last3Days.reduce((sum, r) => sum + clean(r["ТО"]), 0) / (last3Days.length || 1);
  const recommendedPurchase = Math.round(avg3 * 4 * 0.45);
  insights.push(`💰 Рекомендованная закупка: ${recommendedPurchase.toLocaleString('ru-RU')}₽ (45% от прогноза 4-дневной выручки). Не превышайте на 5000₽, чтобы сохранить оборачиваемость`);

  // === ПРОГНОЗ МЕСЯЦА ===
  if (forecast < avgRevenue * 0.9 * daysInMonth) {
    warnings.push('⚠️ Риск не выполнить план');
    insights.push(`Прогноз месяца: ${forecast.toLocaleString('ru-RU')}₽. Для выполнения плана нужно увеличить средний день на ${Math.round((avgRevenue * 0.9 * daysInMonth - forecast) / (daysInMonth - currentDay))}₽. МЕРЫ: промо-акции, расширение ассортимента, увеличение часов работы`);
  }

  // === СЕЗОННОСТЬ ===
  const month = today.getMonth() + 1;
  if ([12, 1, 2].includes(month)) {
    insights.push(`❄️ Зимний сезон: акцент на горячие напитки, согревающие товары. Создайте праздничную атмосферу (декор, музыка)`);
  } else if ([6, 7, 8].includes(month)) {
    insights.push(`☀️ Летний сезон: прохладительные напитки, мороженое. Усильте холодильное оборудование, расширьте холодную витрину`);
  }

  // === КАЧЕСТВО ОБСЛУЖИВАНИЯ ===
  if (avgTraffic > 0 && asp < 250) {
    insights.push(`🎓 Низкий чек при нормальном трафике = слабые продажи кассиров. ОБУЧЕНИЕ: проведите тренинг по техникам допродаж, введите KPI на средний чек с бонусами`);
  }

  // === ОПТИМИЗАЦИЯ РАСХОДОВ ===
  if (ebitdaPercent < 15) {
    insights.push(`💸 Аудит расходов: проверьте топ-5 статей затрат. Возможные резервы: пересмотр договоров с поставщиками (-5-7%), оптимизация графика персонала (-10-15% ФОТ), энергосбережение (-3-5% коммуналка)`);
  }

  // 🎨 СОЗДАНИЕ БЛОКА СОВЕТНИКА
  const container = document.createElement("div");
  container.style.cssText = `
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
    border-radius: 20px;
    padding: 24px;
    margin-top: 24px;
    width: 100%;
    max-width: 640px;
    box-sizing: border-box;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Заголовок
  let html = `
    <div style='font-size:clamp(20px, 5vw, 24px);font-weight:900;margin-bottom:8px;text-align:center;'>
      🧠 Советник дня
    </div>
    <div style='font-size:clamp(11px, 2.8vw, 13px);opacity:0.8;text-align:center;margin-bottom:20px;'>
      Умный анализ на основе ${thisMonthData.length} дней данных
    </div>
  `;

  // Ключевые метрики
  html += `
    <div style='display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;'>
      <div style='background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center;'>
        <div style='font-size:clamp(10px,2.5vw,12px);opacity:0.7;margin-bottom:4px;'>ASP</div>
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;'>${asp}₽</div>
      </div>
      <div style='background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center;'>
        <div style='font-size:clamp(10px,2.5vw,12px);opacity:0.7;margin-bottom:4px;'>Выручка</div>
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;'>${Math.round(avgRevenue).toLocaleString('ru-RU')}₽</div>
      </div>
      <div style='background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center;'>
        <div style='font-size:clamp(10px,2.5vw,12px);opacity:0.7;margin-bottom:4px;'>EBITDA</div>
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;color:${ebitdaPercent < 0 ? '#e74c3c' : ebitdaPercent < 10 ? '#f39c12' : '#2ecc71'};'>${ebitdaPercent}%</div>
      </div>
    </div>
  `;

  // Предупреждения (если есть)
  if (warnings.length > 0) {
    html += `
      <div style='background:rgba(231,76,60,0.2);border-left:4px solid #e74c3c;border-radius:8px;padding:14px;margin-bottom:16px;'>
        <div style='font-size:clamp(13px,3.2vw,15px);font-weight:700;margin-bottom:8px;'>⚠️ Требуют внимания:</div>
        ${warnings.map(w => `<div style='font-size:clamp(12px,3vw,14px);margin-bottom:6px;line-height:1.4;'>• ${w}</div>`).join('')}
      </div>
    `;
  }

  // Действия
  if (actions.length > 0) {
    html += `
      <div style='background:rgba(52,152,219,0.2);border-left:4px solid #3498db;border-radius:8px;padding:14px;margin-bottom:16px;'>
        <div style='font-size:clamp(13px,3.2vw,15px);font-weight:700;margin-bottom:8px;'>🎯 Действия на сегодня:</div>
        ${actions.map(a => `<div style='font-size:clamp(12px,3vw,14px);margin-bottom:6px;line-height:1.4;'>• ${a}</div>`).join('')}
      </div>
    `;
  }

  // Инсайты
  html += `
    <div style='background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;'>
      <div style='font-size:clamp(14px,3.5vw,16px);font-weight:700;margin-bottom:12px;'>💡 Аналитика и рекомендации:</div>
      ${insights.map((ins, i) => `
        <div style='font-size:clamp(12px,3vw,13px);line-height:1.5;margin-bottom:${i < insights.length - 1 ? '12px' : '0'};opacity:0.95;'>
          ${ins}
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
  document.querySelector('.container').appendChild(container);

  console.log('✅ Умный советник создан');
})();
