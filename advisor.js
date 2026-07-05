// advisor.js — 🧠 Советник дня: умный брифинг по данным
// Принципы: данные вместо «стены текста», фокус дня вычисляется по самой
// слабой метрике (каждый день разный), советы ротируются по дню года,
// раздел для руководителей свёрнут по умолчанию.

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
  const fmt = v => Math.round(v).toLocaleString('ru-RU');

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
  const dayOfYear = Math.floor((today - new Date(currentYear, 0, 0)) / 864e5);

  // Кто работает
  const cashierToday = [2, 3, 4].includes(dayOfWeek) ? 'Дмитрий' : 'Денис';
  const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const todayName = dayNames[dayOfWeek];
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  // === ДАННЫЕ ===
  const miniblocks = window.DATASETS?.miniblocks || [];
  const recordRevenueBlock = miniblocks.find(b => b.label === "Рекорд ТО");
  const recordTrafficBlock = miniblocks.find(b => b.label === "Рекорд ТР");
  const planBlock = miniblocks.find(b => b.label === "План ТО");
  const growthBlock = miniblocks.find(b => b.label && b.label.includes("прошл. год"));

  let maxRevenue = recordRevenueBlock ? clean(recordRevenueBlock.value) : 0;
  let maxTraffic = recordTrafficBlock ? clean(recordTrafficBlock.value) : 0;

  // План на день из данных
  let dailyPlan = 27000;
  const currentMonthRows = data.filter(r => r["Дата"]?.startsWith(ym));
  const rowWithPlan = currentMonthRows.find(r => r["План на день"] && clean(r["План на день"]) > 0);
  if (rowWithPlan) dailyPlan = clean(rowWithPlan["План на день"]);
  else if (planBlock) dailyPlan = clean(planBlock.value);

  // Рост от прошлого года
  let growthPercent = 0;
  if (growthBlock) {
    const match = (growthBlock.value || '').match(/-?\d+/);
    if (match) growthPercent = parseInt(match[0]);
  }

  // Рекорды fallback из данных
  if (maxRevenue === 0 || maxTraffic === 0) {
    data.forEach(r => {
      const rev = clean(r["ТО"]);
      const traf = clean(r["ТР"]);
      if (rev > maxRevenue) maxRevenue = rev;
      if (traf > maxTraffic) maxTraffic = traf;
    });
  }

  // Только ЗАВЕРШЁННЫЕ дни (без сегодняшнего частичного) — иначе средняя, а
  // значит и «амбициозная» цель дня, занижается недобранной за неполные
  // сутки выручкой и почти не отличается от обычного плана
  const parseYMD = str => {
    const m = String(str || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
  };

  let thisMonthData = data.filter(r => {
    const p = parseYMD(r["Дата"]);
    return p && p.y === currentYear && p.mo === today.getMonth() + 1 && p.d < currentDay && clean(r["ТО"]) > 0;
  });
  if (!thisMonthData.length) {
    // Начало месяца: завершённых дней ещё нет — берём последние 30 дней истории
    const todayMidnight = new Date(currentYear, today.getMonth(), currentDay);
    thisMonthData = data.filter(r => {
      const p = parseYMD(r["Дата"]);
      if (!p) return false;
      return new Date(p.y, p.mo - 1, p.d) < todayMidnight && clean(r["ТО"]) > 0;
    }).slice(-30);
  }
  if (!thisMonthData.length) return;

  // Прошлый год, тот же день
  const lastYearSameDay = data.find(r => {
    const d = new Date(r["Дата"]);
    return d.getFullYear() === lastYear && d.getMonth() === today.getMonth() && d.getDate() === currentDay;
  });
  const lySameDayRev = lastYearSameDay ? clean(lastYearSameDay["ТО"]) : 0;
  const lySameDayName = lastYearSameDay ? dayNames[new Date(lastYearSameDay["Дата"]).getDay()] : null;

  // Расчёты
  const totalRevenue = thisMonthData.reduce((s, r) => s + clean(r["ТО"]), 0);
  const totalTraffic = thisMonthData.reduce((s, r) => s + clean(r["ТР"]), 0);
  const avgRevenue = totalRevenue / thisMonthData.length;
  const avgTraffic = totalTraffic / thisMonthData.length;
  const avgCheck = totalTraffic ? Math.round(totalRevenue / totalTraffic) : 0;
  const avgASP = thisMonthData.reduce((s, r) => s + clean(r["расчет ASP"]), 0) / thisMonthData.length;
  const asp = avgASP ? Math.round(avgRevenue / avgASP) : 0;

  const targetRevenue = avgRevenue > dailyPlan ? Math.round(avgRevenue) : dailyPlan;
  const targetTraffic = avgCheck ? Math.ceil(targetRevenue / avgCheck) : 0;

  // Премии
  const bonusIfPlan = Math.round((dailyPlan - dailyPlan * 0.04) * 0.05);
  const bonusIfTarget = Math.round((targetRevenue - targetRevenue * 0.04) * 0.05);

  // EBITDA
  let totalCosts = 0;
  const costBreakdown = [];
  costs.forEach(row => {
    const value = clean(row["Значение"]);
    const type = (row["Тип"] || '').toLowerCase();
    let cost = 0;
    if (type.includes("руб")) cost = value;
    else if (type.includes("%")) cost = avgRevenue * value / 100;
    if (cost > 0) {
      totalCosts += cost;
      costBreakdown.push({ name: row["Статья"], value: cost, percent: Math.round((cost / avgRevenue) * 100) });
    }
  });
  const ebitda = avgRevenue - totalCosts;
  const ebitdaPercent = avgRevenue ? Math.round((ebitda / avgRevenue) * 100) : 0;
  costBreakdown.sort((a, b) => b.value - a.value);

  // Тренд 7 дней
  const last7 = thisMonthData.slice(-7);
  const trend7 = last7.length >= 2 ? clean(last7[last7.length - 1]["ТО"]) - clean(last7[0]["ТО"]) : 0;

  // Лидеры
  const cleanName = n => n.replace(/^(VC|AN)\s+/, '');
  const leadersList = leaders.filter(r => r["Лидеры продаж"]).map(r => r["Лидеры продаж"]);
  const top3 = leadersList.slice(0, 3).map(cleanName);

  // Закупка
  const last3 = thisMonthData.slice(-3);
  const avg3 = last3.reduce((s, r) => s + clean(r["ТО"]), 0) / (last3.length || 1);
  const recommendedPurchase = Math.round(avg3 * 4 * 0.45);

  // === ФОКУС ДНЯ: самая слабая метрика, каждый день пересчитывается ===
  const revenueGap = maxRevenue - targetRevenue;
  const rotate = (arr, n = 2) => {
    if (arr.length <= n) return arr;
    const start = dayOfYear % arr.length;
    return Array.from({ length: n }, (_, i) => arr[(start + i) % arr.length]);
  };

  let focus;
  if (ebitdaPercent < 5) {
    focus = {
      icon: '🚨', title: `EBITDA ${ebitdaPercent}% — контроль расходов`,
      actions: [
        ...costBreakdown.slice(0, 2).map(c => `${c.name}: ${fmt(c.value)}₽/день (${c.percent}%) — главный расход`),
        'обсудить условия с поставщиками — каждые −5% решают'
      ]
    };
  } else if (avgCheck && avgCheck < 650) {
    focus = {
      icon: '🛒', title: `Средний чек ${avgCheck}₽ — цель ${Math.round(avgCheck * 1.1)}₽+`,
      actions: rotate([
        'предлагай комплекты: футболка + носки, худи + трусы',
        'импульсные товары у кассы — носки каждому',
        `апсейл: «к этому отлично подойдёт…» (+${Math.round(avgCheck * 0.1)}₽ к чеку достаточно)`,
        'акция «Всё по 350₽» — называй вслух каждому'
      ], 3)
    };
  } else if (avgTraffic < 25) {
    focus = {
      icon: '🚪', title: `Трафик ${Math.round(avgTraffic)} чел/день — приводим людей`,
      actions: rotate([
        'открытые двери + музыка — магазин должен «звучать»',
        'акционный стенд ближе ко входу',
        'пост в Telegram «КИВИ Маркет» про новинки дня',
        'витрина: обновить самый заметный манекен'
      ], 3)
    };
  } else if (growthPercent < -3) {
    focus = {
      icon: '📊', title: `Отстаём от прошлого года на ${Math.abs(growthPercent)}% — догоняем`,
      actions: rotate([
        'каждый чек на счету — максимум внимания каждому гостю',
        '«счастливые часы» 17:00–19:00 со скидкой 10%',
        'допродажа на кассе каждому покупателю',
        'напомнить подписчикам Telegram об акциях'
      ], 3)
    };
  } else if (revenueGap > 0 && revenueGap < maxRevenue * 0.15) {
    focus = {
      icon: '🏆', title: `До рекорда ${fmt(revenueGap)}₽ — он реален сегодня!`,
      actions: [
        `рекорд ${fmt(maxRevenue)}₽ — премия за него +2000₽`,
        'вечерние часы решают — держим темп до закрытия',
        'каждому гостю — комплект, а не один товар'
      ]
    };
  } else {
    focus = {
      icon: '✅', title: 'Показатели в норме — закрепляем результат',
      actions: rotate([
        'сервис на максимум: улыбка в первые 5 секунд',
        'следи за слотами в «Цели дня» — иди по графику',
        'поддерживай порядок в примерочных и на кассе',
        'собирай подписки в Telegram — это завтрашний трафик'
      ], 3)
    };
  }

  // Совет дня (ротация по дню года — не повторяется подряд)
  const SCRIPTS = [
    '«К этой футболке отлично подойдут носки — показать?»',
    '«Комплектом выгоднее — подобрать пару?»',
    '«У нас акция “Всё по 350₽” — взгляните»',
    '«Наличными удобно? Так даже выгоднее» (−3% эквайринг)',
    '«Спасибо! Подписывайтесь на Telegram “КИВИ Маркет” — там акции раньше всех»',
    '«От 499₽ — подарочная упаковка в подарок 🎁»'
  ];
  const scriptOfDay = SCRIPTS[dayOfYear % SCRIPTS.length];

  // === РЕНДЕРИНГ ===
  const container = document.createElement('div');
  container.id = 'advisorBlock';
  container.className = 'card-light';

  const ebColor = ebitdaPercent < 5 ? '#ef4444' : ebitdaPercent < 10 ? '#f59e0b' : '#10b981';

  let html = `
    <div class="card-title">🧠 Советник дня</div>
    <div class="card-subtitle">${currentDay} ${monthNames[today.getMonth()]}, ${todayName} · смена: <b>${cashierToday}</b></div>

    <div class="adv-metrics">
      <div class="adv-metric"><b>${asp}₽</b><span>Цена товара</span></div>
      <div class="adv-metric"><b>${avgCheck}₽</b><span>Средний чек</span></div>
      <div class="adv-metric"><b style="color:${ebColor};">${ebitdaPercent}%</b><span>EBITDA</span></div>
    </div>

    <div class="adv-focus">
      <div class="adv-focus-label">Фокус дня</div>
      <div class="adv-focus-title">${focus.icon} ${focus.title}</div>
      <ul class="adv-list">${focus.actions.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>

    <div class="adv-goals">
      <div class="adv-goal"><div class="t">План дня</div><div class="v">${fmt(dailyPlan)}₽</div><div class="p">премия +${fmt(bonusIfPlan)}₽</div></div>
      <div class="adv-goal"><div class="t">Цель дня</div><div class="v">${fmt(targetRevenue)}₽</div><div class="p">премия +${fmt(bonusIfTarget)}₽</div></div>
      <div class="adv-goal"><div class="t">Рекорд ТО</div><div class="v">${fmt(maxRevenue)}₽</div><div class="p">премия +2 000₽</div></div>
      <div class="adv-goal"><div class="t">Рекорд ТР</div><div class="v">${fmt(maxTraffic)} чел</div><div class="p">премия +800₽</div></div>
    </div>
  `;

  // Контекст дня — только цифры
  const trendCls = trend7 >= 0 ? 'up' : 'down';
  html += `<div>`;
  if (lySameDayRev > 0) {
    const wd = lySameDayName && lySameDayName !== todayName ? ` (${lySameDayName})` : '';
    html += `<div class="adv-row"><span>Год назад в этот день${wd}</span><b>${fmt(lySameDayRev)}₽</b></div>`;
  }
  html += `<div class="adv-row"><span>Тренд за 7 дней</span><b class="${trendCls}">${trend7 >= 0 ? '↑ +' : '↓ −'}${fmt(Math.abs(trend7))}₽</b></div>`;
  if (growthPercent !== 0) {
    html += `<div class="adv-row"><span>К прошлому году (месяц)</span><b class="${growthPercent >= 0 ? 'up' : 'down'}">${growthPercent >= 0 ? '+' : ''}${growthPercent}%</b></div>`;
  }
  if (targetTraffic) {
    html += `<div class="adv-row"><span>Нужно гостей для цели</span><b>${targetTraffic}+</b></div>`;
  }
  html += `</div>`;

  // Совет дня (меняется каждый день)
  html += `<div class="adv-tip">💬 <b>Фраза дня:</b> ${scriptOfDay}</div>`;

  // Для руководителей — свёрнуто
  html += `
    <details class="adv-more">
      <summary>👔 Для руководителей</summary>
      <div class="adv-row"><span>EBITDA</span><b style="color:${ebColor};">${fmt(ebitda)}₽ · ${ebitdaPercent}%</b></div>
      ${costBreakdown.slice(0, 3).map(c => `<div class="adv-row"><span>— ${c.name}</span><b>${fmt(c.value)}₽ (${c.percent}%)</b></div>`).join('')}
      <div class="adv-row"><span>Рекомендуемая закупка</span><b>${fmt(recommendedPurchase)}₽</b></div>
      <div class="adv-row"><span>Лимит закупки</span><b>${fmt(recommendedPurchase + 5000)}₽</b></div>
      ${top3.length ? `<div class="adv-row"><span>Усилить запас</span><b style="white-space:normal;text-align:right;">${top3.join(', ')}</b></div>` : ''}
    </details>
  `;

  container.innerHTML = html;

  // Вставляем в правую колонку (десктоп) или .container (мобильная)
  const target = document.querySelector('.right-column') || document.querySelector('.container');
  if (target) target.appendChild(container);

  console.log('✅ Советник дня создан (брифинг)');
})();
