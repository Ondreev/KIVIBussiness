// advisor.js — Персонализированный умный советник KIVI Market

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
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;

  // Определяем кто работает
  const cashierToday = [2, 3, 4].includes(dayOfWeek) ? 'Дмитрий' : 'Денис';
  const cashierPersonality = cashierToday === 'Дмитрий' 
    ? 'Дима, ты отлично справляешься! Сегодня' 
    : 'Денис, с добрым утром! Сегодня';
  
  const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const todayName = dayNames[dayOfWeek];
  const isWeekend = [0, 6].includes(dayOfWeek);

  // Данные текущего месяца
  const thisMonthData = data.filter(r => {
    const d = new Date(r["Дата"]);
    return r["Дата"]?.startsWith(ym) && d <= today && clean(r["ТО"]) > 0;
  });

  // Данные прошлого года
  const lastYearMonth = data.filter(r => {
    const d = new Date(r["Дата"]);
    return d.getFullYear() === lastYear && d.getMonth() === today.getMonth() && clean(r["ТО"]) > 0;
  });

  // Последние 7 дней
  const last7Days = thisMonthData.slice(-7);

  // Карта месяца прошлого года
  const lastYearHeatmap = {};
  lastYearMonth.forEach(r => {
    const d = new Date(r["Дата"]);
    const day = d.getDate();
    if (!lastYearHeatmap[day]) lastYearHeatmap[day] = 0;
    lastYearHeatmap[day] += clean(r["ТО"]);
  });

  // Прогноз на следующие 3 дня
  const next3DaysForecast = [];
  for (let i = 1; i <= 3; i++) {
    const nextDay = currentDay + i;
    const lastYearRevenue = lastYearHeatmap[nextDay] || 0;
    if (lastYearRevenue > 0) {
      next3DaysForecast.push({ day: nextDay, revenue: Math.round(lastYearRevenue) });
    }
  }

  // Расчёты
  const totalRevenue = thisMonthData.reduce((s, r) => s + clean(r["ТО"]), 0);
  const totalTraffic = thisMonthData.reduce((s, r) => s + clean(r["ТР"]), 0);
  const avgRevenue = totalRevenue / thisMonthData.length;
  const avgTraffic = totalTraffic / thisMonthData.length;
  const avgCheck = totalTraffic ? Math.round(totalRevenue / totalTraffic) : 0;
  const avgASP = thisMonthData.reduce((s, r) => s + clean(r["расчет ASP"]), 0) / thisMonthData.length;
  const asp = avgASP ? Math.round(avgRevenue / avgASP) : 0;

  // EBITDA
  let totalCosts = 0;
  let costBreakdown = [];
  costs.forEach(row => {
    const value = clean(row["Значение"]);
    const type = (row["Тип"] || '').toLowerCase();
    let cost = 0;
    if (type.includes("руб")) cost = value;
    else if (type.includes("%")) cost = avgRevenue * value / 100;
    if (cost > 0) {
      totalCosts += cost;
      costBreakdown.push({ 
        name: row["Статья"], 
        value: cost, 
        percent: Math.round((cost / avgRevenue) * 100)
      });
    }
  });
  const ebitda = avgRevenue - totalCosts;
  const ebitdaPercent = avgRevenue ? Math.round((ebitda / avgRevenue) * 100) : 0;

  // Сравнение с прошлым годом
  const lastYearTotal = lastYearMonth.reduce((s, r) => s + clean(r["ТО"]), 0);
  const lastYearAvg = lastYearMonth.length > 0 ? lastYearTotal / lastYearMonth.length : 0;
  const growthPercent = lastYearAvg ? Math.round(((avgRevenue - lastYearAvg) / lastYearAvg) * 100) : 0;

  // Тренд 7 дней
  const trend7Days = last7Days.length >= 2 ? clean(last7Days[last7Days.length - 1]["ТО"]) - clean(last7Days[0]["ТО"]) : 0;

  // Лидеры продаж (убираем префиксы VC/AN)
  const cleanProductName = (name) => {
    return name.replace(/^(VC|AN)\s+/, '');
  };
  
  const leadersList = leaders.filter(r => r["Лидеры продаж"]).map(r => r["Лидеры продаж"]);
  const vcLeaders = leadersList.filter(l => l.startsWith('VC')).slice(0, 3);
  const anLeaders = leadersList.filter(l => l.startsWith('AN')).slice(0, 3);
  const top5Overall = leadersList.slice(0, 5).map(cleanProductName);
  const top3Overall = leadersList.slice(0, 3).map(cleanProductName);

  // Закупка
  const last3Days = thisMonthData.slice(-3);
  const avg3 = last3Days.reduce((sum, r) => sum + clean(r["ТО"]), 0) / (last3Days.length || 1);
  const recommendedPurchase = Math.round(avg3 * 4 * 0.45);

  // 🎨 СОЗДАНИЕ БЛОКОВ
  const cashierSection = [];
  const managementSection = [];
  const analyticsSection = [];
  const warnings = [];

  // === ПРИВЕТСТВИЕ ===
  cashierSection.push(`👋 ${cashierPersonality} **${todayName}**, ${currentDay} декабря.`);

  // === ПРЕДУПРЕЖДЕНИЯ ===
  if (ebitdaPercent < 5) {
    warnings.push('🚨 Низкая рентабельность — требует внимания');
  }
  if (avgCheck < 600) {
    warnings.push(`📉 Средний чек ${avgCheck}₽ — можно увеличить`);
  }
  if (avgTraffic < 25) {
    warnings.push(`👥 Трафик ${Math.round(avgTraffic)} чел — ниже нормы`);
  }
  if (growthPercent < -10) {
    warnings.push(`📊 Падение ${Math.abs(growthPercent)}% к прошлому году`);
  }

  // === ДЛЯ КАССИРА ===
  cashierSection.push(`\n**🎯 Твоя задача на смену:**`);
  cashierSection.push(`• Средний чек: **${Math.round(avgCheck * 1.15)}₽+** (сейчас ${avgCheck}₽)`);
  cashierSection.push(`• Выручка: **${Math.round(avgRevenue * 1.1).toLocaleString('ru-RU')}₽+** (средний день)`);
  if (isWeekend) {
    cashierSection.push(`• Это **выходной** — будет много клиентов, работай быстро!`);
  }

  cashierSection.push(`\n**🎁 Сервис (главное!):**`);
  cashierSection.push(`• **УЛЫБАЙСЯ!** Это первое, что видит клиент`);
  cashierSection.push(`• Подарок (жвачку) давай **В РУКИ**, с улыбкой`);
  cashierSection.push(`• От 499₽ → упаковка жвачек, от 999₽ → брелок`);
  cashierSection.push(`• 2+ товара → предлагай **крафт-пакет** (не простой!)`);
  cashierSection.push(`• Зрительный контакт, дружелюбие — превосходи ожидания!`);

  if (cashierToday === 'Денис') {
    cashierSection.push(`\n**💬 Денис, важно:**`);
    cashierSection.push(`• **Смягчай голос** — это не тренировка, а магазин 😊`);
    cashierSection.push(`• Можно шутить, но держи дистанцию`);
    cashierSection.push(`• Не переходи на личности (даже с детьми)`);
  } else {
    cashierSection.push(`\n**💬 Дима, ты молодец!**`);
    cashierSection.push(`• Продолжай в том же духе — клиенты тебя ценят`);
    cashierSection.push(`• Можешь быть чуть активнее в допродажах`);
  }

  cashierSection.push(`\n**🛍️ Скрипты продаж:**`);
  cashierSection.push(`**Приветствие:** "Добрый день! Подскажу, если что 😊"`);
  cashierSection.push(`**Допродажа:** "Отлично! К этому обычно берут носки/трусы — покажу?"`);
  cashierSection.push(`**Акция:** "У нас акция — всё по 350₽! Посмотрите, может что-то понравится"`);
  cashierSection.push(`**Комплект:** "При покупке 3-х вещей получится выгоднее — покажу варианты?"`);
  cashierSection.push(`**Оплата:** "Наличными удобно? (ненавязчиво!)"`);
  cashierSection.push(`**Прощание:** "Спасибо! Ждём снова! И подписывайтесь на наш Telegram 'КИВИ Маркет' — там акции и новинки" (показать стикер)`);

  cashierSection.push(`\n**📱 Telegram канал:**`);
  cashierSection.push(`• Каждому клиенту показывай **стикер** с QR-кодом`);
  cashierSection.push(`• "В канале анонсы акций, первыми узнаете о новинках!"`);
  cashierSection.push(`• Это увеличивает повторные покупки (конверсию) на 20-30%`);

  cashierSection.push(`\n**🔥 Что предлагать активно:**`);
  cashierSection.push(`• **Хиты месяца:** ${top3Overall.join(', ')}`);
  cashierSection.push(`• **Импульс:** Носки (всегда у кассы!), трусы комплектами`);
  cashierSection.push(`• **Комбо:** Футболка + носки, Худи + трусы`);

  // === ДЛЯ РУКОВОДИТЕЛЕЙ ===
  managementSection.push(`**📊 Виктор и Кирилл, аналитика:**`);
  
  if (ebitdaPercent < 15) {
    managementSection.push(`\n**💰 EBITDA ${ebitdaPercent}%** — ниже целевых 20%. Топ расходов:`);
    costBreakdown.sort((a, b) => b.value - a.value).slice(0, 3).forEach(c => {
      managementSection.push(`• ${c.name}: ${Math.round(c.value).toLocaleString('ru-RU')}₽/день (${c.percent}%)`);
    });
    managementSection.push(`**Действия:** Пересмотреть самые крупные статьи, возможно договориться о снижении на 5-10%`);
  } else {
    managementSection.push(`\n**✅ EBITDA ${ebitdaPercent}%** — отличный показатель! Особенно в кризис 💪`);
  }

  if (vcLeaders.length !== anLeaders.length) {
    const victorTotal = vcLeaders.length;
    const kirillTotal = anLeaders.length;
    
    managementSection.push(`\n**🏆 Лидеры продаж:**`);
    if (victorTotal > kirillTotal) {
      managementSection.push(`**Виктор,** твои товары лидируют (${victorTotal} в топ-3):`);
      managementSection.push(`${vcLeaders.map(cleanProductName).join(', ')}`);
      managementSection.push(`→ Увеличь закупку на 30-40%, размести на входе`);
      managementSection.push(`\n**Кирилл,** твои товары чуть отстают (${kirillTotal} в топ-3).`);
      managementSection.push(`→ Проанализируй: цены конкурентов, выкладка, свежесть ассортимента`);
    } else if (kirillTotal > victorTotal) {
      managementSection.push(`**Кирилл,** твои товары лидируют (${kirillTotal} в топ-3):`);
      managementSection.push(`${anLeaders.map(cleanProductName).join(', ')}`);
      managementSection.push(`→ Увеличь закупку на 30-40%, размести на входе`);
      managementSection.push(`\n**Виктор,** твои товары чуть отстают (${victorTotal} в топ-3).`);
      managementSection.push(`→ Проанализируй: возможно, нужно обновить модельный ряд`);
    }
  } else {
    managementSection.push(`\n**🏆 Топ-5 товаров месяца:** ${top5Overall.join(', ')}`);
  }

  managementSection.push(`\n**💼 Закупка на неделю: ${recommendedPurchase.toLocaleString('ru-RU')}₽**`);
  managementSection.push(`• Лидеры: ${top3Overall.join(', ')} — увеличить запас`);
  managementSection.push(`• Ходовики: Носки (берут по 3-5 пар), трусы (комплекты)`);
  managementSection.push(`• Маржа: Худи, свитшоты — высокая наценка`);
  managementSection.push(`• Не превышайте ${(recommendedPurchase + 5000).toLocaleString('ru-RU')}₽`);

  if (avgTraffic < 28) {
    managementSection.push(`\n**📢 Трафик ${Math.round(avgTraffic)} чел — можно больше:**`);
    managementSection.push(`• Таргет ВК/Инста на Реутов (3км) — "Качество от 199₽"`);
    managementSection.push(`• Штендер у входа: "АКЦИЯ: Всё по 350₽"`);
    managementSection.push(`• Партнёрство с фитнес-клубами (взаимная реклама)`);
    managementSection.push(`• Telegram-канал — делать розыгрыши для подписчиков`);
  }

  // === АНАЛИТИКА ===
  if (growthPercent < 0) {
    analyticsSection.push(`📉 **Выручка упала на ${Math.abs(growthPercent)}%** vs ${lastYear} год.`);
    analyticsSection.push(`**Возможные причины:**`);
    analyticsSection.push(`• Конкуренты (проверить цены в соседних магазинах)`);
    analyticsSection.push(`• Ассортимент (добавить новинки?)`);
    analyticsSection.push(`• Кризис — но у вас отличные результаты! Держитесь 💪`);
  } else if (growthPercent > 0) {
    analyticsSection.push(`📈 **Рост ${growthPercent}%** к прошлому году — молодцы!`);
    analyticsSection.push(`Особенно в кризис это отличный показатель. Продолжайте! 🚀`);
  }

  if (trend7Days < -1000) {
    analyticsSection.push(`\n⚠️ **Выручка падает** последние 7 дней (${Math.round(trend7Days)}₽).`);
    analyticsSection.push(`**Действия:** Запустить акцию "Счастливые часы" (скидка 10% с 17:00)`);
  } else if (trend7Days > 1000) {
    analyticsSection.push(`\n📈 **Позитивный тренд!** Выручка растёт (+${Math.round(trend7Days)}₽ за неделю)`);
  }

  if (next3DaysForecast.length > 0) {
    const spikes = next3DaysForecast.filter(f => f.revenue > avgRevenue * 1.25);
    if (spikes.length > 0) {
      analyticsSection.push(`\n⚡ **ПРОГНОЗ: ВСПЛЕСК!**`);
      spikes.forEach(s => {
        analyticsSection.push(`• **${s.day} декабря** → ожидается ~${s.revenue.toLocaleString('ru-RU')}₽`);
      });
      analyticsSection.push(`**${cashierToday},** готовься к высокому трафику! Работай быстро, активно допродавай`);
    }
  }

  // === МОТИВАЦИЯ ===
  const motivation = [];
  motivation.push(`\n🎯 **${cashierToday}, помни:**`);
  motivation.push(`• Каждый клиент должен уйти **счастливым**`);
  motivation.push(`• Ты — лицо магазина. Твоя улыбка = наша репутация`);
  motivation.push(`• Превосходи ожидания — клиент вернётся!`);
  motivation.push(`\n**Удачной смены! 💪 KIVI — лучший магазин в Реутове!**`);

  // 🎨 РЕНДЕРИНГ
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

  let html = `
    <div style='font-size:clamp(20px, 5vw, 24px);font-weight:900;margin-bottom:8px;text-align:center;'>
      🧠 Советник дня
    </div>
    <div style='font-size:clamp(11px, 2.8vw, 13px);opacity:0.8;text-align:center;margin-bottom:20px;'>
      KIVI Market • Смена: ${cashierToday}
    </div>
  `;

  // Метрики
  html += `
    <div style='display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;'>
      <div style='background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center;'>
        <div style='font-size:clamp(10px,2.5vw,12px);opacity:0.7;margin-bottom:4px;'>Цена товара</div>
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;'>${asp}₽</div>
      </div>
      <div style='background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center;'>
        <div style='font-size:clamp(10px,2.5vw,12px);opacity:0.7;margin-bottom:4px;'>Средний чек</div>
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;'>${avgCheck}₽</div>
      </div>
      <div style='background:rgba(255,255,255,0.1);border-radius:12px;padding:12px;text-align:center;'>
        <div style='font-size:clamp(10px,2.5vw,12px);opacity:0.7;margin-bottom:4px;'>EBITDA</div>
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;color:${ebitdaPercent < 5 ? '#e74c3c' : ebitdaPercent < 15 ? '#f39c12' : '#2ecc71'};'>${ebitdaPercent}%</div>
      </div>
    </div>
  `;

  // Предупреждения
  if (warnings.length > 0) {
    html += `
      <div style='background:rgba(231,76,60,0.2);border-left:4px solid #e74c3c;border-radius:8px;padding:14px;margin-bottom:16px;'>
        <div style='font-size:clamp(13px,3.2vw,15px);font-weight:700;margin-bottom:8px;'>⚠️ Требуют внимания:</div>
        ${warnings.map(w => `<div style='font-size:clamp(12px,3vw,14px);margin-bottom:6px;'>• ${w}</div>`).join('')}
      </div>
    `;
  }

  // Для кассира
  html += `
    <div style='background:rgba(52,152,219,0.2);border-left:4px solid #3498db;border-radius:8px;padding:14px;margin-bottom:16px;'>
      <div style='font-size:clamp(14px,3.5vw,16px);font-weight:700;margin-bottom:12px;'>👤 Для ${cashierToday}:</div>
      <div style='font-size:clamp(12px,3vw,13px);line-height:1.6;white-space:pre-wrap;'>${cashierSection.map(s => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')).join('\n')}</div>
    </div>
  `;

  // Для руководителей
  html += `
    <div style='background:rgba(155,89,182,0.2);border-left:4px solid #9b59b6;border-radius:8px;padding:14px;margin-bottom:16px;'>
      <div style='font-size:clamp(14px,3.5vw,16px);font-weight:700;margin-bottom:12px;'>👔 Для руководителей:</div>
      <div style='font-size:clamp(12px,3vw,13px);line-height:1.6;white-space:pre-wrap;'>${managementSection.map(s => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')).join('\n')}</div>
    </div>
  `;

  // Аналитика
  if (analyticsSection.length > 0) {
    html += `
      <div style='background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;margin-bottom:16px;'>
        <div style='font-size:clamp(14px,3.5vw,16px);font-weight:700;margin-bottom:12px;'>📊 Аналитика:</div>
        <div style='font-size:clamp(12px,3vw,13px);line-height:1.6;white-space:pre-wrap;'>${analyticsSection.map(s => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')).join('\n')}</div>
      </div>
    `;
  }

  // Мотивация
  html += `
    <div style='background:rgba(46,204,113,0.2);border-left:4px solid #2ecc71;border-radius:8px;padding:14px;'>
      <div style='font-size:clamp(12px,3vw,13px);line-height:1.6;white-space:pre-wrap;'>${motivation.map(s => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')).join('\n')}</div>
    </div>
  `;

  container.innerHTML = html;
  document.querySelector('.container').appendChild(container);

  console.log('✅ Персонализированный советник создан');
})();
