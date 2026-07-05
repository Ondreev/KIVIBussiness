// quickUpdate.js — кнопка «✏️» в шапке: быстрый ввод сегодняшних
// показателей прямо из телефона, без открытия Google Таблицы.
// Отправляет данные в Apps Script (SHEETS.updateUrl), затем сбрасывает
// кеш и перезагружает дашборд.

(function () {
  const btn = document.getElementById('quickUpdateBtn');
  if (!btn) return;

  const clean = v => parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')) || 0;

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function findTodayRow() {
    const data = window.DATASETS?.data || [];
    const ds = todayStr();
    return data.find(r => String(r['Дата'] || '').trim().startsWith(ds)) || {};
  }

  function openModal() {
    if (document.getElementById('quOverlay')) return;
    const row = findTodayRow();

    const overlay = document.createElement('div');
    overlay.id = 'quOverlay';
    overlay.className = 'qu-overlay';
    overlay.innerHTML = `
      <div class="qu-modal">
        <button type="button" class="qu-close" aria-label="Закрыть">✕</button>
        <h3>✏️ Внести данные</h3>
        <div class="sub">${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · сегодня</div>
        <div class="qu-error" id="quError"></div>
        <div class="qu-field"><label>Выручка (ТО), ₽</label><input type="number" step="any" inputmode="decimal" id="quRevenue" value="${row['ТО'] ? clean(row['ТО']) : ''}"></div>
        <div class="qu-field"><label>Трафик (ТР), чел</label><input type="number" step="any" inputmode="decimal" id="quTraffic" value="${row['ТР'] ? clean(row['ТР']) : ''}"></div>
        <div class="qu-field"><label>Средний чек (СРЧ), ₽</label><input type="number" step="any" inputmode="decimal" id="quCheck" value="${row['СРЧ'] ? clean(row['СРЧ']) : ''}"></div>
        <div class="qu-field"><label>Расчёт ASP</label><input type="number" step="any" inputmode="decimal" id="quAsp" value="${row['расчет ASP'] ? clean(row['расчет ASP']) : ''}"></div>
        <div class="qu-actions">
          <button type="button" class="qu-cancel" id="quCancel">Отмена</button>
          <button type="button" id="quSubmit">Отправить</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // не даём фону скроллиться под модалкой на мобильных

    const close = () => {
      document.body.style.overflow = prevBodyOverflow;
      overlay.remove();
    };
    overlay._close = close; // используется из submit(), чтобы вернуть скролл фона
    overlay.querySelector('.qu-close').addEventListener('click', close);
    overlay.querySelector('#quCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('#quSubmit').addEventListener('click', () => submit(overlay));

    // Автофокус на первое пустое поле (без него на мобильных клавиатура
    // иногда не поднимается сама, а лишний зум на пустое поле не нужен)
    const firstEmpty = overlay.querySelector('input:not([value])') || overlay.querySelector('#quRevenue');
    firstEmpty?.focus({ preventScroll: true });
  }

  // Резервная отправка через скрытую форму (работает даже если fetch
  // упадёт из-за CORS) — Apps Script разбирает и JSON, и form-urlencoded
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

  async function submit(overlay) {
    const errEl = overlay.querySelector('#quError');
    errEl.classList.remove('show');

    const payload = {
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
      const res = await fetch(window.SHEETS.updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // избегаем CORS-preflight
        body: JSON.stringify(payload),
      });
      const json = await res.json();
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

  function showStamp(confirmed) {
    const wrap = document.createElement('div');
    wrap.className = 'qu-stamp-wrap';
    wrap.innerHTML = `
      <div class="qu-stamp">✓</div>
      <div class="qu-stamp-text">${confirmed ? 'Обновлено!' : 'Отправлено!'}<br>Сейчас обновим дашборд…</div>
    `;
    document.body.appendChild(wrap);

    try {
      sessionStorage.removeItem('kivi_datasets_cache_v3');
      sessionStorage.removeItem('kivi_cache_time_v3');
    } catch (e) { /* sessionStorage недоступен — переживём без сброса кеша */ }

    setTimeout(() => location.reload(), 1400);
  }

  btn.addEventListener('click', openModal);
})();
