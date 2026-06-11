// advisor.js — Умный советник KIVI Market (финальная версия)

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
  const currentHour = today.getHours();
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
  
  // Название текущего месяца (родительный падеж)
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const currentMonthName = monthNames[today.getMonth()];

  // РЕКОРДЫ
  const miniblocks = window.DATASETS?.miniblocks || [];
  const recordRevenueBlock = miniblocks.find(b => b.label === "Рекорд ТО");
  const recordTrafficBlock = miniblocks.find(b => b.label === "Рекорд ТР");
  const planBlock = miniblocks.find(b => b.label === "План ТО");
  const growthBlock = miniblocks.find(b => b.label && b.label.includes("прошл. год"));
  
  let maxRevenue = recordRevenueBlock ? clean(recordRevenueBlock.value) : 0;
  let maxTraffic = recordTrafficBlock ? clean(recordTrafficBlock.value) : 0;
  
  // План на день из ДАННЫХ (а не из miniblocks!)
  let dailyPlan = 27000; // fallback
  
  // Ищем среди ВСЕХ строк текущего месяца (любая строка с планом)
  const currentMonthRows = data.filter(r => r["Дата"]?.startsWith(ym));
  console.log(`📊 Найдено строк за ${ym}:`, currentMonthRows.length);
  
  // Берём первую строку где есть план
  const rowWithPlan = currentMonthRows.find(r => r["План на день"] && clean(r["План на день"]) > 0);
  
  if (rowWithPlan) {
    dailyPlan = clean(rowWithPlan["План на день"]);
    console.log('✅ План на день из данных:', dailyPlan, '(строка:', rowWithPlan["Дата"], ')');
  } else if (planBlock) {
    dailyPlan = clean(planBlock.value);
    console.log('⚠️ План на день из miniblocks (fallback):', dailyPlan);
  } else {
    console.warn('❌ План не найден! Используем fallback:', dailyPlan);
  }
  
  console.log('📅 Итоговый план на день:', dailyPlan);
  
  // РОСТ от прошлого года (из блока)
  let growthPercent = 0;
  if (growthBlock) {
    const growthText = growthBlock.value || '';
    const match = growthText.match(/-?\d+/);
    if (match) growthPercent = parseInt(match[0]);
  }

  // Если рекорды не загрузились из miniblocks, ищем в данных
  if (maxRevenue === 0 || maxTraffic === 0) {
    data.forEach(r => {
      const rev = clean(r["ТО"]);
      const traf = clean(r["ТР"]);
      if (rev > maxRevenue) maxRevenue = rev;
      if (traf > maxTraffic) maxTraffic = traf;
    });
  }

  console.log('📊 Данные загружены:', { maxRevenue, maxTraffic, dailyPlan, growthPercent });

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
  const lastYearSameDayWeekday = lastYearSameDay ? new Date(lastYearSameDay["Дата"]).getDay() : null;
  const lastYearSameDayName = lastYearSameDayWeekday !== null ? dayNames[lastYearSameDayWeekday] : null;

  // Последние 7 дней
  const last7Days = thisMonthData.slice(-7);

  // Расчёты
  const totalRevenue = thisMonthData.reduce((s, r) => s + clean(r["ТО"]), 0);
  const totalTraffic = thisMonthData.reduce((s, r) => s + clean(r["ТР"]), 0);
  const avgRevenue = totalRevenue / thisMonthData.length;
  const avgTraffic = totalTraffic / thisMonthData.length;
  const avgCheck = totalTraffic ? Math.round(totalRevenue / totalTraffic) : 0;
  const avgASP = thisMonthData.reduce((s, r) => s + clean(r["расчет ASP"]), 0) / thisMonthData.length;
  const asp = avgASP ? Math.round(avgRevenue / avgASP) : 0;

  // ЦЕЛЬ НА ДЕНЬ
  const targetRevenue = avgRevenue > dailyPlan ? Math.round(avgRevenue) : dailyPlan;
  const targetTraffic = Math.ceil(targetRevenue / avgCheck);

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
  const cashiersToday = 1; // обычно 1, в выходные может быть 2

  // Определяем время суток для советов
  let timeOfDay = '';
  if (currentHour < 12) timeOfDay = 'утро';
  else if (currentHour < 17) timeOfDay = 'день';
  else timeOfDay = 'вечер';

  // 🎨 СОЗДАНИЕ БЛОКОВ
  const cashierSection = [];
  const managementSection = [];
  const analyticsSection = [];
  const warnings = [];

  // === ПРИВЕТСТВИЕ ===
  if (timeOfDay === 'утро') {
    cashierSection.push(`👋 Доброе утро, **${cashierToday}**! Сегодня **${todayName}**, ${currentDay} ${currentMonthName}.`);
  } else if (timeOfDay === 'день') {
    cashierSection.push(`👋 **${cashierToday}**, добрый день! Как проходит смена?`);
  } else {
    cashierSection.push(`👋 **${cashierToday}**, добрый вечер! Завершаем день на высокой ноте!`);
  }

  // === ПРЕДУПРЕЖДЕНИЯ ===
  if (ebitdaPercent < 5) warnings.push('🚨 EBITDA 4% — критично низко');
  if (avgCheck < 650) warnings.push(`📉 Средний чек ${avgCheck}₽ — есть резерв`);
  if (avgTraffic < 25) warnings.push(`👥 Трафик ${Math.round(avgTraffic)} чел — ниже нормы`);
  if (growthPercent < -3) warnings.push(`📊 Отстаём от прошлого года на ${Math.abs(growthPercent)}%`);

  // === ЦЕЛЬ НА ДЕНЬ ===
  cashierSection.push(`\n**🎯 Цель на сегодня:**`);
  cashierSection.push(`• **Выручка: ${targetRevenue.toLocaleString('ru-RU')}₽** ${targetRevenue > dailyPlan ? '(выше плана!)' : '(план)'}`);
  cashierSection.push(`• **Средний чек: ${Math.round(avgCheck * 1.1)}₽+** (сейчас ${avgCheck}₽)`);
  cashierSection.push(`• **Трафик: ${targetTraffic}+ человек**`);

  // === ПРЕМИИ ===
  cashierSection.push(`\n**💰 Твоя премия:**`);
  cashierSection.push(`• План (${dailyPlan.toLocaleString('ru-RU')}₽): **+${bonusIfPlan}₽**`);
  if (targetRevenue > dailyPlan) {
    cashierSection.push(`• Цель (${targetRevenue.toLocaleString('ru-RU')}₽): **+${bonusIfTarget}₽**`);
  }
  cashierSection.push(`• Рекорд выручки (${maxRevenue.toLocaleString('ru-RU')}₽): **+2000₽**`);
  cashierSection.push(`• Рекорд трафика (${maxTraffic} чел): **+800₽**`);

  // === АНАЛИЗ ПРОШЛОГО ГОДА ===
  if (lastYearSameDayRevenue > 0) {
    const diff = lastYearSameDayName && lastYearSameDayName !== todayName ? ` (был **${lastYearSameDayName}**)` : '';
    const currentMonthNumber = String(today.getMonth() + 1).padStart(2, '0');
    cashierSection.push(`\n📅 **${currentDay}.${currentMonthNumber}.${lastYear}:** ${Math.round(lastYearSameDayRevenue).toLocaleString('ru-RU')}₽${diff}`);
    if (targetRevenue > lastYearSameDayRevenue) {
      cashierSection.push(`Сегодня цель выше — отличный шанс показать рост! 📈`);
    }
  }

  // === РЕКОРДЫ ===
  cashierSection.push(`\n**🏆 Наши рекорды:**`);
  cashierSection.push(`• Выручка: **${maxRevenue.toLocaleString('ru-RU')}₽**`);
  cashierSection.push(`• Трафик: **${maxTraffic} чел**`);
  
  const revenueGap = maxRevenue - targetRevenue;
  const trafficGap = maxTraffic - targetTraffic;
  
  if (revenueGap < maxRevenue * 0.15) {
    cashierSection.push(`\n🔥 До рекорда выручки **${revenueGap.toLocaleString('ru-RU')}₽** — реально побить!`);
  }
  if (trafficGap < maxTraffic * 0.15) {
    cashierSection.push(`🔥 До рекорда трафика **${trafficGap} чел** — можем!`);
  }

  // === МОТИВАЦИЯ ПО ВРЕМЕНИ ===
  if (timeOfDay === 'утро') {
    cashierSection.push(`\n**💪 Утренний настрой:**`);
    if (avgCheck < 700) {
      cashierSection.push(`• Сосредоточься на **среднем чеке** с первых клиентов`);
      cashierSection.push(`• Активно предлагай **комплекты** (футболка + носки)`);
      cashierSection.push(`• К обеду выйдем на нужный темп!`);
    } else {
      cashierSection.push(`• Средний чек ${avgCheck}₽ — отлично!`);
      cashierSection.push(`• Держи такой же темп весь день`);
    }
  } else if (timeOfDay === 'день') {
    cashierSection.push(`\n**📊 Промежуточный итог:**`);
    cashierSection.push(`• Данные обновляются — следи за динамикой`);
    if (avgRevenue < dailyPlan * 0.7) {
      cashierSection.push(`• Нужно ускориться — вечером больше клиентов!`);
    } else {
      cashierSection.push(`• Хороший темп, продолжай!`);
    }
  } else {
    cashierSection.push(`\n**🌆 Вечерний рывок:**`);
    cashierSection.push(`• Последние часы — самое время для рекорда!`);
    cashierSection.push(`• Вечером обычно больше покупок`);
  }

  // === СЕРВИС ===
  cashierSection.push(`\n**🎁 Сервис:**`);
  cashierSection.push(`• **Улыбка** — первое впечатление`);
  cashierSection.push(`• Подарок **в руки** (жвачка всем, от 499₽ — упаковка, от 999₽ — брелок)`);
  cashierSection.push(`• 2+ товара → **крафт-пакет**`);
  cashierSection.push(`• Каждому про **Telegram** (QR-код на кассе)`);

  // === ПЕРСОНАЛИЗАЦИЯ (раз в неделю для Дениса) ===
  if (cashierToday === 'Денис' && dayOfWeek === 5) { // только в пятницу
    cashierSection.push(`\n**💬 Денис, совет недели:**`);
    cashierSection.push(`• Клиенты ценят твою энергию! Чуть мягче в тоне — и продажи пойдут ещё лучше 😊`);
  } else if (cashierToday === 'Дмитрий') {
    cashierSection.push(`\n**💬 Дима:**`);
    cashierSection.push(`• Ты всё делаешь правильно — клиенты довольны!`);
    cashierSection.push(`• Можешь быть чуть активнее в допродажах`);
  }

  // === СКРИПТЫ ===
  cashierSection.push(`\n**🛍️ Скрипты:**`);
  cashierSection.push(`"Добрый день! Подскажу, если нужно 😊"`);
  cashierSection.push(`"К этому отлично подойдут носки — покажу?"`);
  cashierSection.push(`"Акция 'Всё по 350₽' — посмотрите"`);
  cashierSection.push(`"Комплект выгоднее — подберём?"`);
  cashierSection.push(`"Наличными удобно?" (экономим 3% на эквайринге)`);
  cashierSection.push(`"Спасибо! И подписывайтесь на Telegram 'КИВИ Маркет'"`);

  // === ЧТО ПРОДАВАТЬ ===
  cashierSection.push(`\n**🔥 Приоритеты:**`);
  cashierSection.push(`• **Хиты:** ${top3Overall.join(', ')}`);
  cashierSection.push(`• **Импульс:** Носки (у кассы), трусы (комплектами)`);
  cashierSection.push(`• **Комбо:** Футболка + носки, Худи + трусы`);

  // === ДЛЯ РУКОВОДИТЕЛЕЙ ===
  managementSection.push(`**📊 Смотрим мои рекомендации:**`);
  
  managementSection.push(`\n**💰 EBITDA ${ebitdaPercent}%** (прибыль после всех расходов)`);
  if (ebitdaPercent < 10) {
    managementSection.push(`Низковато. Топ-3 расхода:`);
    costBreakdown.sort((a, b) => b.value - a.value).slice(0, 3).forEach(c => {
      managementSection.push(`• ${c.name}: ${Math.round(c.value).toLocaleString('ru-RU')}₽/день (${c.percent}%)`);
    });
    managementSection.push(`**Резервы:** пересмотр условий с поставщиками (-5%), оптимизация графика`);
  } else {
    managementSection.push(`Нормальный показатель для кризиса. Есть куда расти — цель 15-20%`);
  }

  // === ЛИДЕРЫ VC vs AN ===
  if (vcLeaders.length !== anLeaders.length) {
    managementSection.push(`\n**🏆 Лидеры:**`);
    if (vcLeaders.length > anLeaders.length) {
      managementSection.push(`**Виктор:** ${vcLeaders.map(cleanProductName).join(', ')} (${vcLeaders.length} в топ-3)`);
      managementSection.push(`**Кирилл:** проверь выкладку/цены — отстаёшь`);
    } else {
      managementSection.push(`**Кирилл:** ${anLeaders.map(cleanProductName).join(', ')} (${anLeaders.length} в топ-3)`);
      managementSection.push(`**Виктор:** обнови ассортимент?`);
    }
  } else {
    managementSection.push(`\n**🏆 Топ-5:** ${top5Overall.join(', ')}`);
  }

  managementSection.push(`\n**💼 Закупка: ${recommendedPurchase.toLocaleString('ru-RU')}₽**`);
  managementSection.push(`• ${top3Overall.join(', ')} — увеличить запас`);
  managementSection.push(`• Носки (3-5 пар), трусы (комплекты)`);
  managementSection.push(`• Лимит: ${(recommendedPurchase + 5000).toLocaleString('ru-RU')}₽`);

  // === АНАЛИТИКА ===
  if (growthPercent !== 0) {
    if (growthPercent < 0) {
      analyticsSection.push(`📊 **${Math.abs(growthPercent)}%** от прошлого года (данные на ${currentHour}:00)`);
      analyticsSection.push(`В кризис держаться рядом — успех. Цель: выйти в 0 к концу месяца`);
    } else {
      analyticsSection.push(`📈 **+${growthPercent}%** к прошлому году!`);
      analyticsSection.push(`Отличная динамика в кризис! 🚀`);
    }
  }

  if (trend7Days < -1000) {
    analyticsSection.push(`\n⚠️ Выручка падает неделю (-${Math.round(Math.abs(trend7Days))}₽)`);
    analyticsSection.push(`**Срочно:** "Счастливые часы" (скидка 10% с 17:00-19:00)`);
  } else if (trend7Days > 1000) {
    analyticsSection.push(`\n📈 Рост за неделю (+${Math.round(trend7Days)}₽) — продолжайте!`);
  }

  // === МОТИВАЦИЯ ===
  const motivation = [];
  motivation.push(`**${cashierToday}, у тебя всё получится!**`);
  motivation.push(`• Каждый клиент уходит от тебя — **счастливым**`);
  motivation.push(`• Твоя улыбка = наш успех`);
  motivation.push(`• Превосходи все ожидания!`);
  motivation.push(`\n**КИВИ Маркет — лучший магазин Реутова! 💪🔥**`);

  // 🎨 РЕНДЕРИНГ
  const container = document.createElement("div");
  container.className = "card-dark";

  let html = `
    <div class='card-title'>🧠 Советник дня</div>
    <div class='card-subtitle'>KIVI Market • ${timeOfDay} • ${cashierToday}</div>
  `;

  // Метрики
  html += `
    <div style='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:20px;'>
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
        <div style='font-size:clamp(18px,4.5vw,22px);font-weight:900;color:${ebitdaPercent < 5 ? '#e74c3c' : ebitdaPercent < 10 ? '#f39c12' : '#2ecc71'};'>${ebitdaPercent}%</div>
      </div>
    </div>
  `;

  // Предупреждения
  if (warnings.length > 0) {
    html += `
      <div style='background:rgba(231,76,60,0.2);border-left:4px solid #e74c3c;border-radius:8px;padding:14px;margin-bottom:16px;'>
        <div style='font-size:clamp(13px,3.2vw,15px);font-weight:700;margin-bottom:8px;'>⚠️ Внимание:</div>
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
  container.id = 'advisorBlock';
  
  // Вставляем в правую колонку (десктоп) или .container (мобильная)
  const target = document.querySelector('.right-column') || document.querySelector('.container');
  if (target) target.appendChild(container);

  console.log('✅ Умный советник создан (финал)');
})();
