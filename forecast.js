// forecast.js — 🔮 Прогноз выручки по дням
// Модель: декомпозиция многолетних данных на 4 слоя
//   уровень (последние 28 дней) × день недели × день месяца (зарплатные
//   циклы) × особая дата (праздники/сезонные дни по прошлым годам).
// Каждый коэффициент — медиана по всем годам, а не сравнение с одним годом.

document.addEventListener('sheets-ready', () => {
  if (document.getElementById('forecastBlock')) return;

  const raw = window.DATASETS?.data || [];
  if (!raw.length) return;

  const clean = v => parseFloat(String(v ?? '0').replace(/\s/g, '').replace(',', '.')) || 0;
  const median = arr => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const pad2 = n => String(n).padStart(2, '0');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // --- 1. Собираем дневные наблюдения ---
  const days = []; // {date, y, m, d, dow, md, rev}
  for (const r of raw) {
    const s = String(r["Дата"] || '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) continue;
    const rev = clean(r["ТО"]);
    if (rev <= 0) continue;
    const date = new Date(+m[1], +m[2] - 1, +m[3]);
    if (date > today) continue;
    days.push({ date, y: +m[1], mo: +m[2], d: +m[3], dow: date.getDay(), md: `${m[2]}-${m[3]}`, rev });
  }
  if (days.length < 60) { console.warn('🔮 Forecast: мало данных (<60 дней)'); return; }
  days.sort((a, b) => a.date - b.date);

  // --- 2. Среднее по каждому месяцу (нормировка убирает рост/сезон года) ---
  const monthSum = {};
  for (const d of days) {
    const k = `${d.y}-${d.mo}`;
    (monthSum[k] = monthSum[k] || { s: 0, n: 0 });
    monthSum[k].s += d.rev; monthSum[k].n++;
  }
  const monthMean = k => monthSum[k].s / monthSum[k].n;

  // --- 3. Слой "день недели": медиана (выручка / среднее месяца) ---
  const byDow = [[], [], [], [], [], [], []];
  for (const d of days) byDow[d.dow].push(d.rev / monthMean(`${d.y}-${d.mo}`));
  const dowF = byDow.map(a => clamp(median(a) ?? 1, 0.55, 1.8));

  // --- 4. Слой "день месяца" (зарплатные циклы), очищенный от дня недели ---
  const byDom = {};
  for (const d of days) {
    const res = d.rev / (monthMean(`${d.y}-${d.mo}`) * dowF[d.dow]);
    (byDom[d.d] = byDom[d.d] || []).push(res);
  }
  const domF = {};
  for (const [dom, arr] of Object.entries(byDom)) {
    domF[dom] = arr.length >= 3 ? clamp(median(arr), 0.7, 1.5) : 1;
  }

  // --- 5. Слой "особая дата" (MM-DD по прошлым годам), очищенный от 3 и 4 ---
  const byMd = {};
  for (const d of days) {
    const res = d.rev / (monthMean(`${d.y}-${d.mo}`) * dowF[d.dow] * (domF[d.d] || 1));
    (byMd[d.md] = byMd[d.md] || []).push(res);
  }
  const mdF = {};
  for (const [md, arr] of Object.entries(byMd)) {
    mdF[md] = arr.length >= 2 ? clamp(median(arr), 0.6, 1.7) : 1;
  }

  // --- 6. Текущий уровень: среднее остатков за последние 28 дней ---
  const recent = days.slice(-28);
  const level = recent.reduce((s, d) =>
    s + d.rev / (dowF[d.dow] * (domF[d.d] || 1) * (mdF[d.md] || 1)), 0) / recent.length;

  const yearsSpan = new Set(days.map(d => d.y)).size;

  // --- 7. Прогноз на 14 дней вперёд ---
  const HOLIDAYS = {
    '01-01': 'Новый год', '01-02': 'Праздники', '01-07': 'Рождество',
    '02-14': '14 февраля', '02-23': '23 февраля', '03-08': '8 марта',
    '05-01': '1 мая', '05-09': 'День Победы', '06-12': 'День России',
    '09-01': '1 сентября', '11-04': 'День единства', '12-31': 'Канун НГ'
  };
  const PAYDAYS = new Set([1, 2, 5, 10, 15, 20, 25]);
  const DOW_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MON_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const fc = [];
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dom = date.getDate();
    const md = `${pad2(date.getMonth() + 1)}-${pad2(dom)}`;
    const fDow = dowF[date.getDay()];
    const fDom = domF[dom] || 1;
    const fMd = mdF[md] || 1;
    const value = Math.round(level * fDow * fDom * fMd / 100) * 100;

    const reasons = [];
    if (HOLIDAYS[md]) reasons.push({ t: `🎉 ${HOLIDAYS[md]}`, c: 'warm' });
    if (fDom > 1.1 && (PAYDAYS.has(dom) || PAYDAYS.has(dom - 1)))
      reasons.push({ t: '💸 зарплатные дни', c: '' });
    else if (fDom > 1.12) reasons.push({ t: `сильное число (${dom}-е)`, c: '' });
    if (fDow > 1.12) reasons.push({ t: `сильный день (${DOW_RU[date.getDay()]})`, c: '' });
    if (fMd > 1.18 && !HOLIDAYS[md]) reasons.push({ t: '✨ особый день по прошлым годам', c: '' });
    if (fDow < 0.85) reasons.push({ t: `тихий день (${DOW_RU[date.getDay()]})`, c: 'cool' });
    if (fDom < 0.88) reasons.push({ t: 'спад между зарплатами', c: 'cool' });

    fc.push({ date, dom, dow: date.getDay(), md, value, reasons });
  }

  const avgFc = fc.reduce((s, f) => s + f.value, 0) / fc.length;
  fc.forEach(f => f.pct = Math.round((f.value / avgFc - 1) * 100));

  // --- 8. Рендеринг ---
  const PALETTE = ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'];
  const min = Math.min(...fc.map(f => f.value));
  const max = Math.max(...fc.map(f => f.value));
  const tone = v => {
    const t = max > min ? (v - min) / (max - min) : 0.5;
    return Math.min(PALETTE.length - 1, Math.floor(t * PALETTE.length));
  };

  const peakValue = Math.max(...fc.map(f => f.value));

  const block = document.createElement('div');
  block.id = 'forecastBlock';
  block.className = 'card-light';

  let html = `
    <div class="card-title">🔮 Прогноз по дням</div>
    <div class="card-subtitle">дни недели · зарплатные циклы · особые даты · ${yearsSpan} ${yearsSpan === 1 ? 'год' : yearsSpan < 5 ? 'года' : 'лет'} данных</div>
    <div class="fc-strip">
  `;

  fc.forEach((f, i) => {
    const ti = tone(f.value);
    const isPeak = f.value === peakValue;
    const txt = ti >= 4 ? '#fff' : '#1e293b';
    const ev = f.reasons.find(r => r.t.startsWith('🎉')) ? '🎉'
             : f.reasons.find(r => r.t.startsWith('💸')) ? '💸' : '';
    html += `
      <div class="fc-day${isPeak ? ' peak' : ''}" data-i="${i}" style="background-color:${PALETTE[ti]};color:${txt};">
        ${ev ? `<span class="fc-ev">${ev}</span>` : ''}
        <span class="n">${f.dom}</span>
        <span class="w">${DOW_RU[f.dow]}</span>
      </div>`;
  });

  html += `</div><div class="fc-detail" id="fcDetail">нажмите на день — покажу прогноз ✨</div>`;

  // Ключевые дни: топ-2 пика и сильнейший спад
  const sorted = [...fc].sort((a, b) => b.value - a.value);
  const keys = [sorted[0], sorted[1], sorted[sorted.length - 1]];

  html += `<div class="fc-section">Ключевые дни</div>`;
  keys.forEach((f, idx) => {
    const up = idx < 2;
    const tags = f.reasons.length
      ? `<div class="fc-tags">${f.reasons.map(r => `<span class="fc-tag ${r.c}">${r.t}</span>`).join('')}</div>`
      : '';
    html += `
      <div class="fc-key ${up ? 'up' : 'down'}">
        <span class="fc-key-date">${up ? '📈' : '📉'} ${f.dom} ${MON_RU[f.date.getMonth()]} · ${DOW_RU[f.dow]}</span>
        <span class="fc-key-val ${up ? 'up' : 'down'}">~${f.value.toLocaleString('ru-RU')}₽ · ${f.pct >= 0 ? '+' : ''}${f.pct}%</span>
        ${tags}
      </div>`;
  });

  // Совет по закупке: за 2 дня до главного пика
  const peak = sorted[0];
  if (peak.pct >= 8) {
    const buyDate = new Date(peak.date);
    buyDate.setDate(peak.date.getDate() - 2);
    const buyStr = buyDate <= today ? 'уже сейчас' : `к ${buyDate.getDate()} ${MON_RU[buyDate.getMonth()]}`;
    html += `<div class="fc-tip">📦 <b>Совет:</b> сделайте закупку ${buyStr} — ${peak.dom} ${MON_RU[peak.date.getMonth()]} ожидается пик (+${peak.pct}% к среднему, ~${peak.value.toLocaleString('ru-RU')}₽).</div>`;
  }

  block.innerHTML = html;

  // Клик по дню — детали
  block.addEventListener('click', e => {
    const cell = e.target.closest('.fc-day');
    if (!cell) return;
    block.querySelectorAll('.fc-day').forEach(c => c.classList.remove('sel'));
    cell.classList.add('sel');
    const f = fc[+cell.dataset.i];
    const why = f.reasons.length ? ` · ${f.reasons.map(r => r.t).join(', ')}` : '';
    const detail = document.getElementById('fcDetail');
    if (detail) detail.innerHTML =
      `<b>${f.dom} ${MON_RU[f.date.getMonth()]} (${DOW_RU[f.dow]})</b>: ~${f.value.toLocaleString('ru-RU')}₽, ${f.pct >= 0 ? '+' : ''}${f.pct}% к среднему${why}`;
  });

  // Вставляем сразу после карты месяца — это её логичное продолжение
  const heatmap = document.getElementById('heatmapMonth');
  if (heatmap) heatmap.insertAdjacentElement('afterend', block);
  else document.querySelector('.container')?.appendChild(block);

  console.log(`🔮 Forecast: уровень=${Math.round(level)}, лет данных=${yearsSpan}, пик=${peak.dom} (${peak.pct}%)`);
});
