// quickUpdate.js — кнопка «✏️» в шапке: форма с тремя вкладками
// (Выручка / Лидеры / План) для быстрого ввода данных прямо из телефона,
// без открытия Google Таблицы. Отправляет в Apps Script (SHEETS.updateUrl),
// затем сбрасывает кеш и перезагружает дашборд.

(function () {
  const btn = document.getElementById('quickUpdateBtn');
  if (!btn) return;

  const clean = v => parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
  const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function findTodayRow() {
    const data = window.DATASETS?.data || [];
    const ds = todayStr();
    return data.find(r => String(r['Дата'] || '').trim().startsWith(ds)) || {};
  }

  function getSetting(name) {
    const rows = window.DATASETS?.settings || [];
    const row = rows.find(r => String(r['Параметр'] || '').trim().toLowerCase() === name.toLowerCase());
    return row ? String(row['Значение'] ?? '').trim() : '';
  }

  // Разблокировка вкладки «План» держится только в памяти вкладки —
  // сбрасывается при перезагрузке страницы, пароль никуда не сохраняется
  let planAuth = null;

  // ============================ Модалка ============================

  function openModal() {
    if (document.getElementById('quOverlay')) return;
    const row = findTodayRow();
    const leadersText = (window.DATASETS?.leaders || [])
      .map(r => r['Лидеры продаж'])
      .filter(Boolean)
      .join('\n');

    const overlay = document.createElement('div');
    overlay.id = 'quOverlay';
    overlay.className = 'qu-overlay';
    overlay.innerHTML = `
      <div class="qu-modal">
        <button type="button" class="qu-close" aria-label="Закрыть">✕</button>

        <div class="qu-tabs">
          <button type="button" class="qu-tab active" data-tab="revenue">💰 Выручка</button>
          <button type="button" class="qu-tab" data-tab="leaders">🏆 Лидеры</button>
          <button type="button" class="qu-tab" data-tab="plan">📊 План</button>
        </div>

        <div class="qu-panel active" data-panel="revenue">
          <div class="sub">${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · сегодня</div>
          <div class="qu-error" id="quError"></div>
          <div class="qu-field"><label>Выручка (ТО), ₽</label><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" id="quRevenue" value="${row['ТО'] ? clean(row['ТО']) : ''}"></div>
          <div class="qu-field"><label>Трафик (ТР), чел</label><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" id="quTraffic" value="${row['ТР'] ? clean(row['ТР']) : ''}"></div>
          <div class="qu-field"><label>Средний чек (СРЧ), ₽</label><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" id="quCheck" value="${row['СРЧ'] ? clean(row['СРЧ']) : ''}"></div>
          <div class="qu-field"><label>Расчёт ASP</label><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" id="quAsp" value="${row['расчет ASP'] ? clean(row['расчет ASP']) : ''}"></div>
          <div class="qu-actions">
            <button type="button" class="qu-cancel" data-close>Отмена</button>
            <button type="button" id="quSubmit">Отправить</button>
          </div>
        </div>

        <div class="qu-panel" data-panel="leaders">
          <div class="qu-hint">Один товар на строке, топ 7–10 позиций — можно вставить списком</div>
          <div class="qu-error" id="quLeadersError"></div>
          <div class="qu-field"><textarea id="quLeadersText" rows="10">${leadersText}</textarea></div>
          <div class="qu-actions">
            <button type="button" class="qu-cancel" data-close>Отмена</button>
            <button type="button" id="quLeadersSubmit">Сохранить список</button>
          </div>
        </div>

        <div class="qu-panel" data-panel="plan" id="quPlanPanel"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    renderPlanTab(overlay);

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // не даём фону скроллиться под модалкой на мобильных

    const close = () => {
      document.body.style.overflow = prevBodyOverflow;
      overlay.remove();
    };
    overlay._close = close; // используется из submit-функций, чтобы вернуть скролл фона

    overlay.querySelector('.qu-close').addEventListener('click', close);
    overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelectorAll('.qu-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        overlay.querySelectorAll('.qu-tab').forEach(b => b.classList.toggle('active', b === tabBtn));
        overlay.querySelectorAll('.qu-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tabBtn.dataset.tab));
      });
    });

    overlay.querySelector('#quSubmit').addEventListener('click', () => submitRevenue(overlay));
    overlay.querySelector('#quLeadersSubmit').addEventListener('click', () => submitLeaders(overlay));

    // Значение поля сразу выделяется при переходе в него — можно просто
    // начать печатать новое число, не выделяя старое мышкой вручную.
    // Делегирование на overlay покрывает и поля вкладки «План», которые
    // подставляются в DOM позже, при разблокировке.
    overlay.addEventListener('focusin', e => {
      if (e.target.matches('input[type="text"], input[type="tel"], textarea')) {
        e.target.select();
      }
    });

    // Автофокус на первое пустое поле вкладки «Выручка» (открыта по умолчанию)
    const firstEmpty = overlay.querySelector('.qu-panel[data-panel="revenue"] input:not([value])') || overlay.querySelector('#quRevenue');
    firstEmpty?.focus({ preventScroll: true });
    firstEmpty?.select();
  }

  // ==================== Общая отправка на сервер ====================

  async function postToSheet(payload) {
    const res = await fetch(window.SHEETS.updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // избегаем CORS-preflight
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // Резервная отправка через скрытую форму (только для вкладки «Выручка» —
  // там плоский набор полей, который переживает form-urlencoded кодирование)
  function fallbackFormPost(payload) {
    return new Promise(resolve => {
      let iframe = document.getElementById('quHiddenFrame');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = 'quHiddenFrame';
        iframe.id = 'quHiddenFrame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = window.SHEETS.updateUrl;
      form.target = 'quHiddenFrame';
      Object.entries(payload).forEach(([k, v]) => {
        if (v == null) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      let done = false;
      const finish = () => { if (done) return; done = true; form.remove(); resolve(); };
      iframe.addEventListener('load', finish, { once: true });
      form.submit();
      setTimeout(finish, 2500); // защита, если onload не сработает
    });
  }

  function showStamp(confirmed, label) {
    const wrap = document.createElement('div');
    wrap.className = 'qu-stamp-wrap';
    wrap.innerHTML = `
      <div class="qu-stamp">✓</div>
      <div class="qu-stamp-text">${label || (confirmed ? 'Обновлено!' : 'Отправлено!')}<br>Сейчас обновим дашборд…</div>
    `;
    document.body.appendChild(wrap);

    try {
      sessionStorage.removeItem('kivi_datasets_cache_v3');
      sessionStorage.removeItem('kivi_cache_time_v3');
    } catch (e) { /* sessionStorage недоступен — переживём без сброса кеша */ }

    setTimeout(() => location.reload(), 1400);
  }

  // ========================= Вкладка «Выручка» =========================

  async function submitRevenue(overlay) {
    const errEl = overlay.querySelector('#quError');
    errEl.classList.remove('show');

    const payload = {
      action: 'revenue',
      date: todayStr(),
      revenue: overlay.querySelector('#quRevenue').value || null,
      traffic: overlay.querySelector('#quTraffic').value || null,
      avgCheck: overlay.querySelector('#quCheck').value || null,
      asp: overlay.querySelector('#quAsp').value || null,
    };

    if (!window.SHEETS?.updateUrl) {
      errEl.textContent = 'Не настроен адрес обновления (SHEETS.updateUrl в config.js)';
      errEl.classList.add('show');
      return;
    }

    const submitBtn = overlay.querySelector('#quSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка…';

    try {
      const json = await postToSheet(payload);
      if (!json.ok) throw new Error(json.error || 'Ошибка сохранения');
      overlay._close();
      showStamp(true);
    } catch (err) {
      // Сеть/CORS могли помешать прочитать ответ, но запрос на сервер мог
      // всё же дойти — пробуем понадёжнее через скрытую форму
      try {
        await fallbackFormPost(payload);
        overlay._close();
        showStamp(false);
      } catch (fallbackErr) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
        errEl.textContent = 'Не удалось сохранить: ' + err.message;
        errEl.classList.add('show');
      }
    }
  }

  // ========================= Вкладка «Лидеры» =========================

  async function submitLeaders(overlay) {
    const errEl = overlay.querySelector('#quLeadersError');
    errEl.classList.remove('show');

    const items = overlay.querySelector('#quLeadersText').value
      .split('\n').map(s => s.trim()).filter(Boolean);

    if (!items.length) {
      errEl.textContent = 'Список пуст';
      errEl.classList.add('show');
      return;
    }
    if (!window.SHEETS?.updateUrl) {
      errEl.textContent = 'Не настроен адрес обновления (SHEETS.updateUrl в config.js)';
      errEl.classList.add('show');
      return;
    }

    const btn = overlay.querySelector('#quLeadersSubmit');
    btn.disabled = true;
    btn.textContent = 'Сохранение…';

    try {
      const json = await postToSheet({ action: 'leaders', items });
      if (!json.ok) throw new Error(json.error || 'Ошибка сохранения');
      overlay._close();
      showStamp(true, 'Список лидеров обновлён!');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Сохранить список';
      errEl.textContent = 'Не удалось сохранить: ' + err.message;
      errEl.classList.add('show');
    }
  }

  // =========================== Вкладка «План» ===========================

  function buildPlanMonthsHtml(year) {
    const plans = window.DATASETS?.plans || [];
    const rows = MONTHS_RU.map((name, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const row = plans.find(r => String(r['Месяц'] || '').trim() === key) || {};
      const checkKey = Object.keys(row).find(k => k.includes('чеку'));
      const revenue = row['План по выручке'] ?? '';
      const traffic = row['План по трафику'] ?? '';
      const avgCheck = checkKey ? (row[checkKey] ?? '') : '';
      return `
        <div class="qu-month-row" data-month="${key}">
          <div class="qu-month-name">${name.slice(0, 3)}</div>
          <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" data-f="revenue" value="${revenue}">
          <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" data-f="traffic" value="${traffic}">
          <input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" data-f="avgCheck" value="${avgCheck}">
        </div>`;
    }).join('');

    return `
      <div class="qu-month-labels"><span></span><span>Выручка</span><span>Трафик</span><span>Ср.чек</span></div>
      ${rows}
    `;
  }

  function renderPlanPanel() {
    if (!planAuth) {
      return `
        <div class="qu-plan-lock">
          <div class="qu-plan-lock-icon">🔒</div>
        </div>
        <div class="qu-hint" style="text-align:center;">Доступ только для администратора</div>
        <div class="qu-error" id="quPlanError"></div>
        <div class="qu-field"><label>Телефон (логин)</label><input type="tel" inputmode="numeric" id="quPlanLogin"></div>
        <div class="qu-field"><label>Код (4 цифры)</label><input type="password" inputmode="numeric" maxlength="4" id="quPlanPass"></div>
        <button type="button" id="quPlanLoginBtn" style="width:100%;">Войти</button>
      `;
    }

    const year = new Date().getFullYear();
    return `
      <div class="qu-hint" style="margin-top:0;text-align:center;">План на ${year} год</div>
      <div class="qu-error" id="quPlanError"></div>
      <div class="qu-body-scroll">${buildPlanMonthsHtml(year)}</div>
      <button type="button" id="quPlanSaveBtn" style="width:100%;margin-top:12px;">Сохранить план</button>
    `;
  }

  function renderPlanTab(overlay) {
    const panel = overlay.querySelector('#quPlanPanel');
    panel.innerHTML = renderPlanPanel();

    if (!planAuth) {
      const doLogin = () => checkPlanLogin(overlay);
      panel.querySelector('#quPlanLoginBtn').addEventListener('click', doLogin);
      panel.querySelector('#quPlanPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    } else {
      panel.querySelector('#quPlanSaveBtn').addEventListener('click', () => submitPlan(overlay));
    }
  }

  function checkPlanLogin(overlay) {
    const panel = overlay.querySelector('#quPlanPanel');
    const errEl = panel.querySelector('#quPlanError');
    errEl.classList.remove('show');

    const login = panel.querySelector('#quPlanLogin').value.trim();
    const password = panel.querySelector('#quPlanPass').value.trim();
    const realLogin = getSetting('login');
    const realPassword = getSetting('password');

    if (!realLogin || login !== realLogin || password !== realPassword) {
      errEl.textContent = 'Неверный логин или код';
      errEl.classList.add('show');
      return;
    }

    planAuth = { login, password };
    renderPlanTab(overlay);
  }

  async function submitPlan(overlay) {
    const panel = overlay.querySelector('#quPlanPanel');
    const errEl = panel.querySelector('#quPlanError');
    errEl.classList.remove('show');

    const months = Array.from(panel.querySelectorAll('.qu-month-row')).map(row => ({
      month: row.dataset.month,
      revenue: row.querySelector('[data-f="revenue"]').value || null,
      traffic: row.querySelector('[data-f="traffic"]').value || null,
      avgCheck: row.querySelector('[data-f="avgCheck"]').value || null,
    }));

    if (!window.SHEETS?.updateUrl) {
      errEl.textContent = 'Не настроен адрес обновления (SHEETS.updateUrl в config.js)';
      errEl.classList.add('show');
      return;
    }

    const btn = panel.querySelector('#quPlanSaveBtn');
    btn.disabled = true;
    btn.textContent = 'Сохранение…';

    try {
      const json = await postToSheet({ action: 'plan', login: planAuth.login, password: planAuth.password, months });
      if (!json.ok) throw new Error(json.error || 'Ошибка сохранения');
      overlay._close();
      showStamp(true, 'План обновлён!');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Сохранить план';
      errEl.textContent = 'Не удалось сохранить: ' + err.message;
      errEl.classList.add('show');
    }
  }

  btn.addEventListener('click', openModal);
})();
