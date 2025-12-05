// advisor.js — Персонализированный умный советник KIVI Market v3

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
  const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const todayName = dayNames[dayOfWeek];
  const isWeekend = [0, 6].includes(dayOfWeek);

  // РЕКОРДЫ ИЗ ВЕРХНЕГО БЛОКА (window.DATASETS)
  const miniblocks = window.DATASETS?.miniblocks || [];
  const recordRevenueBlock = miniblocks.find(b => b.label === "Рекорд ТО");
  const recordTrafficBlock = miniblocks.find(b => b.label === "Рекорд ТР");
  
  const maxRevenue = recordRevenueBlock ? clean(recordRevenueBlock.value) : 0;
  const maxTraffic = recordTrafficBlock ? clean(recordTrafficBlock.value) : 0;

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

  // Аналогичный день прошлого года
  const lastYearSameDay = data.find(r => {
    const d = new Date(r["Дата"]);
    return d.getFullYear() === lastYear && d.getMonth() === today.getMonth() && d.getDate() === currentDay;
  });
  const lastYearSameDayRevenue = lastYearSameDay ? clean(lastYearSameDay["ТО"]) : 0;
  const lastYearSameDayTraffic = lastYearSameDay ? clean(lastYearSameDay["ТР"]) : 0;
  const lastYearSameDayWeekday = lastYearSameDay ? new Date(lastYearSameDay["Дата"]).getDay() : null;
  const lastYearSameDayName = lastYearSameDayWeekday !== null ? dayNames[lastYearSameDayWeekday] : null;

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

  // Расчёты
  const totalRevenue = thisMonthData.reduce((s, r) => s + clean(r["ТО"]), 0);
  const totalTraffic = thisMonthData.reduce((s, r) => s + clean(r["ТР"]), 0);
  const avgRevenue = totalRevenue / thisMonthData.length;
  const avgTraffic = totalTraffic / thisMonthData.length;
  const avgCheck = totalTraffic ? Math.round(totalRevenue / totalTraffic) : 0;
  const avgASP = thisMonthData.reduce((s, r) => s + clean(r["расчет ASP"]), 0) / thisMonthData.length;
  const asp = avgASP ? Math.round(avgRevenue / avgASP) : 0;

  // ПЛАН ИЗ ВЕРХНЕГО БЛОКА
  const planBlock = miniblocks.find(b => b.label === "План ТО");
  const dailyPlan = planBlock ? clean(planBlock.value) : 27000;

  // ЦЕЛЬ НА ДЕНЬ
  const targetRevenue = avgRevenue > dailyPlan ? Math.round(avgRevenue) : dailyPlan;
  const targetTraffic = avgTraffic > 30 ? Math.round(avgTraffic) : Math.round(dailyPlan / avgCheck);

  // ПРЕМИЯ
  const bonusIfPlan = Math.round((dailyPlan - dailyPlan * 0.04) * 0.05);
  const bonusIfTarget = Math.round((targetRevenue - targetRevenue * 0.04) * 0.05);

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

  // Лидеры продаж
  const cleanProductName = (name) => name.replace(/^(VC|AN)\s+/, '');
  const leadersList = leaders.filter(r => r["Лидеры продаж"]).map(r => r["Лидеры продаж"]);
  const vcLeaders = leadersList.filter(l => l.startsWith('VC')).slice(0, 3);
  const anLeaders = leadersList.filter(l => l.startsWith('AN')).slice(0, 3);
  const top5Overall = leadersList.slice(0, 5).map(cleanProductName);
  const top3Overall = leadersList.slice(0, 3).map(cleanProductName);

  // Закупка
  const last3Days = thisMonthData.slice(-3);
  const avg3 = last3Days.reduce((sum, r) => sum + clean(r["ТО"]), 0) / (last3Days.length || 1);
  const recommendedPurchase = Math.round(avg3 * 4 * 0.45);

  // Количество кассиров
  const cashiersToday = isWeekend && avgTraffic > 40 ? 2 : 1;

  // 🎨 СОЗДАНИЕ БЛОКОВ
  const cashierSection = [];
  const managementSection = [];
  const analyticsSection = [];
  const warnings = [];

  // === ПРИВЕТСТВИЕ ===
  cashierSection.push(`👋 Доброе утро, **${cashierToday}**! Сегодня **${todayName}**, ${currentDay} декабря.`);

  // === ПРЕДУПРЕЖДЕНИЯ ===
  if (ebitdaPercent < 5) warnings.push('🚨 Низкая рентабельность');
  if (avgCheck < 600) warnings.push(`📉 Средний чек ${avgCheck}₽ — можно увеличить`);
  if (avgTraffic < 25) warnings.push(`👥 Трафик ${Math.round(avgTraffic)} чел — ниже нормы`);
  if (growthPercent < -10) warnings.push(`📊 Падение ${Math.abs(growthPercent)}% к прошлому году`);

  // === ЦЕЛЬ НА ДЕНЬ ===
  cashierSection.push(`\n**🎯 Цель на сегодня:**`);
  cashierSection.push(`• **Выручка: ${targetRevenue.toLocaleString('ru-RU')}₽** ${targetRevenue > dailyPlan ? '(амбициозно!)' : '(план)'}`);
  cashierSection.push(`• **Средний чек: ${Math.round(avgCheck * 1.15)}₽+** (сейчас ${avgCheck}₽)`);
  cashierSection.push(`• **Трафик: ~${targetTraffic} человек**`);

  // === ПРЕМИИ ===
  cashierSection.push(`\n**💰 Твоя премия сегодня:**`);
  if (targetRevenue === dailyPlan) {
    cashierSection.push(`• При выполнении плана (${dailyPlan.toLocaleString('ru-RU')}₽): **+${bonusIfPlan}₽**`);
  } else {
    cashierSection.push(`• При ${targetRevenue.toLocaleString('ru-RU')}₽: **+${bonusIfTarget}₽**`);
  }
  
  if (maxRevenue > 0) {
    cashierSection.push(`• Побить рекорд выручки (${maxRevenue.toLocaleString('ru-RU')}₽): **+${Math.round(2000 / cashiersToday)}₽**`);
  }
  if (maxTraffic > 0) {
    cashierSection.push(`• Побить рекорд трафика (${maxTraffic} чел): **+${Math.round(800 / cashiersToday)}₽**`);
  }

  // === АНАЛИЗ ПРОШЛОГО ГОДА ===
  if (lastYearSameDayRevenue > 0 && lastYearSameDayName) {
    const diff = lastYearSameDayName !== todayName ? `(тогда был **${lastYearSameDayName}**, а сегодня **${todayName}**)` : '';
    if (lastYearSameDayRevenue > targetRevenue) {
      cashierSection.push(`\n📅 **${currentDay} декабря ${lastYear}** было ${Math.round(lastYearSameDayRevenue).toLocaleString('ru-RU')}₽ ${diff}. Это выше нашей цели — будь на пике!`);
    } else {
      cashierSection.push(`\n📅 **${currentDay} декабря ${lastYear}** было ${Math.round(lastYearSameDayRevenue).toLocaleString('ru-RU')}₽ ${diff}. Сегодня есть все шансы сделать больше!`);
    }
  }

  // === РЕКОРДЫ ===
  if (maxRevenue > 0) {
    cashierSection.push(`\n🏆 **Рекорд выручки:** ${maxRevenue.toLocaleString('ru-RU')}₽`);
    if (targetRevenue > maxRevenue * 0.9) {
      cashierSection.push(`**Мы близко к рекорду!** Побьём — получишь **+${Math.round(2000 / cashiersToday)}₽** 🔥`);
    }
  }
  if (maxTraffic > 0) {
    cashierSection.push(`🏆 **Рекорд трафика:** ${maxTraffic} чел`);
    if (targetTraffic > maxTraffic * 0.9) {
      cashierSection.push(`**Мы близко!** Побьём — **+${Math.round(800 / cashiersToday)}₽** 💪`);
    }
  }

  // === МОТИВАЦИЯ ===
  cashierSection.push(`\n**💪 ${cashierToday}, не переживай! Мы с тобой сделаем план!**`);
  if (avgCheck < 700) {
    cashierSection.push(`Давай сосредоточимся на **среднем чеке** — с утра активно предлагай комплекты и носки. К обеду выйдем на нужный темп! 🚀`);
  } else {
    cashierSection.push(`У тебя отличный средний чек! Продолжай так же, и план будет **легко**! 💯`);
  }

  // === СЕРВИС ===
  cashierSection.push(`\n**🎁 Сервис (главное!):**`);
  cashierSection.push(`• **УЛЫБАЙСЯ!** Это первое, что видит клиент`);
  cashierSection.push(`• Подарок (жвачку) давай **В РУКИ**, с улыбкой`);
  cashierSection.push(`• От 499₽ → упаковка жвачек, от 999₽ → брелок`);
  cashierSection.push(`• 2+ товара → предлагай **крафт-пакет** (не простой!)`);
  cashierSection.push(`• Зрительный контакт, дружелюбие — превосходи ожидания!`);

  if (cashierToday === 'Денис') {
    cashierSection.push(`\n**💬 Денис, важно:**`);
    cashierSection.push(`• **Смягчай голос** — тёплое общение = больше продаж 😊`);
    cashierSection.push(`• Можно шутить, но держи дистанцию`);
    cashierSection.push(`• Не переходи на личности (даже с детьми)`);
  } else {
    cashierSection.push(`\n**💬 Дима, ты молодец!**`);
    cashierSection.push(`• Клиенты тебя ценят за вежливость`);
    cashierSection.push(`• Можешь быть чуть активнее в допродажах — ты справишься!`);
  }

  // === СКРИПТЫ ===
  cashierSection.push(`\n**🛍️ Скрипты продаж:**`);
  cashierSection.push(`**Приветствие:** "Добрый день! Подскажу, если что 😊"`);
  cashierSection.push(`**Допродажа:** "Отлично! К этому обычно берут носки — покажу?"`);
  cashierSection.push(`**Акция:** "У нас акция — всё по 350₽! Посмотрите"`);
  cashierSection.push(`**Комплект:** "При покупке 3-х вещей выгоднее — покажу?"`);
  cashierSection.push(`**Оплата:** "Наличными удобно?" (ненавязчиво!)`);
  cashierSection.push(`**Прощание:** "Спасибо! И подписывайтесь на Telegram 'КИВИ Маркет' — там акции!" (показать стикер)`);

  // === TELEGRAM ===
  cashierSection.push(`\n**📱 Telegram канал:**`);
  cashierSection.push(`• Каждому показывай **стикер** с QR-кодом`);
  cashierSection.push(`• "В канале анонсы акций, первыми узнаете о новинках!"`);
  cashierSection.push(`• Это повторные покупки (+20-30% конверсии)`);

  // === ЧТО ПРЕДЛАГАТЬ ===
  cashierSection.push(`\n**🔥 Что предлагать активно:**`);
  cashierSection.push(`• **Хиты месяца:** ${top3Overall.join(', ')}`);
  cashierSection.push(`• **Импульс:** Носки у кассы, трусы комплектами`);
  cashierSection.push(`• **Комбо:** Футболка + носки, Худи + трусы`);

  // === ДЛЯ РУКОВОДИТЕЛЕЙ ===
  managementSection.push(`**📊 Виктор и Кирилл, аналитика:**`);
  
  if (ebitdaPercent < 15) {
    managementSection.push(`\n**💰 EBITDA ${ebitdaPercent}%** — ниже целевых 20%. Топ расходов:`);
    costBreakdown.sort((a, b) => b.value - a.value).slice(0, 3).forEach(c => {
      managementSection.push(`• ${c.name}: ${Math.round(c.value).toLocaleString('ru-RU')}₽/день (${c.percent}%)`);
    });
  } else {
    managementSection.push(`\n**✅ EBITDA ${ebitdaPercent}%** — отлично, особенно в кризис! 💪`);
  }

  if (vcLeaders.length !== anLeaders.length) {
    const victorTotal = vcLeaders.length;
    const kirillTotal = anLeaders.length;
    
    managementSection.push(`\n**🏆 Лидеры продаж:**`);
    if (victorTotal > kirillTotal) {
      managementSection.push(`**Виктор,** твои товары лидируют (${victorTotal} в топ-3): ${vcLeaders.map(cleanProductName).join(', ')}`);
      managementSection.push(`**Кирилл,** твои чуть отстают (${kirillTotal} в топ-3) — проверь цены/выкладку`);
    } else {
      managementSection.push(`**Кирилл,** твои товары лидируют (${kirillTotal} в топ-3): ${anLeaders.map(cleanProductName).join(', ')}`);
      managementSection.push(`**Виктор,** твои чуть отстают (${victorTotal} в топ-3) — может обновить модели?`);
    }
  } else {
    managementSection.push(`\n**🏆 Топ-5 товаров:** ${top5Overall.join(', ')}`);
  }

  managementSection.push(`\n**💼 Закупка: ${recommendedPurchase.toLocaleString('ru-RU')}₽**`);
  managementSection.push(`• Лидеры: ${top3Overall.join(', ')} — увеличить запас`);
  managementSection.push(`• Ходовики: Носки (3-5 пар), трусы (комплекты)`);
  managementSection.push(`• Не превышать ${(recommendedPurchase + 5000).toLocaleString('ru-RU')}₽`);

  // === АНАЛИТИКА ===
  if (growthPercent < 0) {
    analyticsSection.push(`📉 **Выручка ${Math.abs(growthPercent)}%** vs ${lastYear} год.`);
    analyticsSection.push(`Но в кризис держаться на уровне — уже успех! 💪`);
  } else if (growthPercent > 0) {
    analyticsSection.push(`📈 **Рост ${growthPercent}%** к прошлому году!`);
    analyticsSection.push(`В кризис это отличный показатель! 🚀`);
  }

  if (trend7Days < -1000) {
    analyticsSection.push(`\n⚠️ Выручка падает неделю (${Math.round(trend7Days)}₽)`);
    analyticsSection.push(`**Действие:** "Счастливые часы" (скидка 10% с 17:00)`);
  } else if (trend7Days > 1000) {
    analyticsSection.push(`\n📈 Рост за неделю (+${Math.round(trend7Days)}₽)!`);
  }

  // === МОТИВАЦИЯ ===
  const motivation = [];
  motivation.push(`\n🎯 **${cashierToday}, помни:**`);
  motivation.push(`• Каждый клиент уходит **счастливым**`);
  motivation.push(`• Твоя улыбка = наша репутация`);
  motivation.push(`• Превосходи ожидания — клиент вернётся!`);
  motivation.push(`\n**У тебя всё получится! KIVI — лучший магазин Реутова! 💪🔥**`);

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

  console.log('✅ Персонализированный советник v3 создан');
})();
