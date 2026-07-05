/**
 * Apps Script для таблицы "ТО КИВИ Маркет" — вспомогательная функция очистки
 * колонок + веб-хук для формы «Внести данные» (вкладки Выручка/Лидеры/План)
 * в приложении KIVI Business.
 *
 * УСТАНОВКА / ОБНОВЛЕНИЕ (без смены ссылки):
 * 1. Выделите весь код в редакторе Apps Script (Ctrl+A) и замените этим файлом.
 * 2. Сохраните (Ctrl+S).
 * 3. Deploy → Manage deployments → ✏️ (карандаш) → Version: New version → Deploy.
 *    Ссылка /exec остаётся прежней, config.js трогать не нужно.
 */

const SHEET_NAME = 'Данные';
const PLANS_SHEET_NAME = 'Планы';
const LEADERS_SHEET_NAME = 'Лидеры';
const SETTINGS_SHEET_NAME = 'Настройки';
const UPDATE_SECRET = ''; // например: 'kivi-2026' — оставьте пустым, чтобы не проверять

// Метка версии — меняется при каждом обновлении файла. Откройте ссылку
// /exec прямо в браузере (просто вставьте в адресную строку) — если тут
// показана СТАРАЯ версия, значит деплой не подхватил новый код: проверьте,
// что код сохранён (Ctrl+S) и что вы создали именно НОВУЮ ВЕРСИЮ в
// Manage deployments (не «Test deployments» — та ссылку не меняет).
const SCRIPT_VERSION = '2026-07-05-tabs-v1';

// ====================================================================
// Существующая функция очистки чисел в колонках ТО (C) и ТР (E)
// ====================================================================
function convertColumnsC_E_toNumbers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const rangeC = sheet.getRange("C2:C");
  const valuesC = rangeC.getValues();
  const cleanedC = valuesC.map(row => {
    const cell = row[0];
    if (typeof cell === "string") {
      const num = parseFloat(cell.replace(/\s/g, "").replace(",", "."));
      return [isNaN(num) ? "" : num];
    }
    return [cell];
  });
  rangeC.setValues(cleanedC);

  const rangeE = sheet.getRange("E2:E");
  const valuesE = rangeE.getValues();
  const cleanedE = valuesE.map(row => {
    const cell = row[0];
    if (typeof cell === "string") {
      const num = parseFloat(cell.replace(/\s/g, "").replace(",", "."));
      return [isNaN(num) ? "" : num];
    }
    return [cell];
  });
  rangeE.setValues(cleanedE);
}

// ====================================================================
// Точка входа: маршрутизация по payload.action
// ====================================================================
function doPost(e) {
  try {
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      payload = e.parameter; // резервный путь: обычная HTML-форма (без CORS)
    }

    if (UPDATE_SECRET && payload.secret !== UPDATE_SECRET) {
      return jsonOutput({ ok: false, error: 'Неверный токен доступа' });
    }

    const action = payload.action || 'revenue';
    if (action === 'leaders') return handleLeaders(payload);
    if (action === 'plan') return handlePlan(payload);
    return handleRevenue(payload);
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  return jsonOutput({ ok: true, message: 'KIVI Business update endpoint работает', version: SCRIPT_VERSION });
}

// ====================================================================
// Вкладка «Выручка»: обновляет сегодняшнюю строку в "Данные" по названиям
// колонок (не по буквам!) — устойчиво к перестановке столбцов.
// Если строки на эту дату ещё нет (месяц не был подготовлен заранее),
// создаёт новую строку и сама корректно проставляет Дата/День/План.
// ====================================================================
function handleRevenue(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return jsonOutput({ ok: false, error: `Лист "${SHEET_NAME}" не найден` });

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const col = name => headers.indexOf(name);

  const cDate = col('Дата'), cDay = col('День'), cTo = col('ТО'), cTr = col('ТР'),
        cCheck = col('СРЧ'), cPlan = col('План на день'), cAsp = col('расчет ASP');
  // "Выполнение плана (Да/Нет)" сознательно не трогаем — см. комментарий ниже

  if (cDate === -1) return jsonOutput({ ok: false, error: 'Колонка "Дата" не найдена' });

  const targetDate = String(payload.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return jsonOutput({ ok: false, error: 'Неверный формат даты (нужно YYYY-MM-DD)' });
  }

  const tz = ss.getSpreadsheetTimeZone();
  const dateAsStr = raw => raw instanceof Date
    ? Utilities.formatDate(raw, tz, 'yyyy-MM-dd')
    : String(raw || '').trim().slice(0, 10);

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (dateAsStr(values[i][cDate]) === targetDate) { rowIndex = i + 1; break; }
  }

  const [y, m, d] = targetDate.split('-').map(Number);
  const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']; // индекс = Date.getDay()
  const weekday = WEEKDAYS_RU[new Date(y, m - 1, d).getDay()];
  const isNewRow = rowIndex === -1;

  if (isNewRow) {
    // Строки на эту дату нет (месяц не подготовили заранее) — создаём
    rowIndex = values.length + 1;
    if (cDate > -1) sheet.getRange(rowIndex, cDate + 1).setNumberFormat('@').setValue(targetDate);
    if (cDay > -1) sheet.getRange(rowIndex, cDay + 1).setValue(weekday);
  }

  if (payload.revenue !== '' && payload.revenue != null && cTo > -1)
    sheet.getRange(rowIndex, cTo + 1).setValue(Number(payload.revenue));
  if (payload.traffic !== '' && payload.traffic != null && cTr > -1)
    sheet.getRange(rowIndex, cTr + 1).setValue(Number(payload.traffic));
  if (payload.avgCheck !== '' && payload.avgCheck != null && cCheck > -1)
    sheet.getRange(rowIndex, cCheck + 1).setValue(Number(payload.avgCheck));
  if (payload.asp !== '' && payload.asp != null && cAsp > -1)
    sheet.getRange(rowIndex, cAsp + 1).setValue(Number(payload.asp));

  // План на день: если пуст — подставляем. Берём план из другой строки
  // этого же месяца (обычно план одинаков весь месяц), а если в этом
  // месяце вообще нет строк с планом — считаем месячный план ÷ число
  // дней в месяце (грубая оценка, стоит проверить вручную)
  if (cPlan > -1) {
    const existingRow = isNewRow ? null : values[rowIndex - 1];
    const existingPlan = existingRow ? Number(existingRow[cPlan]) || 0 : 0;
    if (!existingPlan) {
      let dailyPlan = 0;
      const ym = targetDate.slice(0, 7);
      for (let i = 1; i < values.length; i++) {
        if (dateAsStr(values[i][cDate]).startsWith(ym)) {
          const v = Number(values[i][cPlan]) || 0;
          if (v > 0) { dailyPlan = v; break; }
        }
      }
      if (!dailyPlan) {
        const monthRow = findPlanMonthRow(ss, ym);
        if (monthRow) {
          const daysInMonth = new Date(y, m, 0).getDate();
          dailyPlan = Math.round(monthRow.revenue / daysInMonth);
        }
      }
      if (dailyPlan) sheet.getRange(rowIndex, cPlan + 1).setValue(dailyPlan);
    }
  }

  // ВАЖНО: колонку "Выполнение плана (Да/Нет)" сюда НЕ пишем — она обычно
  // заполнена формулой (нередко ARRAYFORMULA на весь столбец), а любая
  // запись через setValue() в отдельную ячейку внутри диапазона такой
  // формулы удаляет её целиком, стирая значения во всех остальных строках.
  // Формула в самом листе пересчитает Да/Нет сама после обновления ТО.

  return jsonOutput({ ok: true, row: rowIndex, date: targetDate, weekday: weekday, created: isNewRow });
}

// ====================================================================
// Вкладка «Лидеры»: заменяет весь список топ-продаж (лист "Лидеры")
// ====================================================================
function handleLeaders(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LEADERS_SHEET_NAME);
  if (!sheet) return jsonOutput({ ok: false, error: `Лист "${LEADERS_SHEET_NAME}" не найден` });

  const items = Array.isArray(payload.items)
    ? payload.items
    : String(payload.items || '').split('\n');

  const cleaned = items.map(s => String(s || '').trim()).filter(Boolean);
  if (!cleaned.length) return jsonOutput({ ok: false, error: 'Список пуст' });

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
  }
  sheet.getRange(2, 1, cleaned.length, 1).setValues(cleaned.map(v => [v]));

  return jsonOutput({ ok: true, count: cleaned.length });
}

// ====================================================================
// Вкладка «План» (только админ): читает логин/пароль из листа "Настройки"
// и, если верно, обновляет план по месяцам года в листе "Планы".
// ====================================================================
function handlePlan(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const settings = getSettingsMap(ss);
  const realLogin = String(settings['login'] || '').trim();
  const realPassword = String(settings['password'] || '').trim();
  const givenLogin = String(payload.login || '').trim();
  const givenPassword = String(payload.password || '').trim();

  if (!realLogin || givenLogin !== realLogin || givenPassword !== realPassword) {
    return jsonOutput({ ok: false, error: 'Неверный логин или код' });
  }

  const sheet = ss.getSheetByName(PLANS_SHEET_NAME);
  if (!sheet) return jsonOutput({ ok: false, error: `Лист "${PLANS_SHEET_NAME}" не найден` });

  const months = Array.isArray(payload.months) ? payload.months : [];
  if (!months.length) return jsonOutput({ ok: false, error: 'Нет данных для сохранения' });

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const col = name => headers.indexOf(name);
  const cMonth = col('Месяц'), cRevenue = col('План по выручке'), cTraffic = col('План по трафику');
  const cCheck = headers.findIndex(h => String(h || '').includes('чеку')); // устойчиво к опечатке в названии

  if (cMonth === -1) return jsonOutput({ ok: false, error: 'Колонка "Месяц" не найдена в листе "Планы"' });

  const tz = ss.getSpreadsheetTimeZone();
  const monthKey = raw => raw instanceof Date
    ? Utilities.formatDate(raw, tz, 'yyyy-MM')
    : String(raw || '').trim().slice(0, 7);

  let updated = 0, created = 0;
  months.forEach(entry => {
    const key = String(entry.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(key)) return;

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (monthKey(values[i][cMonth]) === key) { rowIndex = i + 1; break; }
    }

    if (rowIndex === -1) {
      rowIndex = sheet.getLastRow() + 1;
      const [yy, mm] = key.split('-').map(Number);
      sheet.getRange(rowIndex, cMonth + 1).setValue(new Date(yy, mm - 1, 1));
      created++;
    } else {
      updated++;
    }

    if (entry.revenue !== '' && entry.revenue != null && cRevenue > -1)
      sheet.getRange(rowIndex, cRevenue + 1).setValue(Number(entry.revenue));
    if (entry.traffic !== '' && entry.traffic != null && cTraffic > -1)
      sheet.getRange(rowIndex, cTraffic + 1).setValue(Number(entry.traffic));
    if (entry.avgCheck !== '' && entry.avgCheck != null && cCheck > -1)
      sheet.getRange(rowIndex, cCheck + 1).setValue(Number(entry.avgCheck));
  });

  return jsonOutput({ ok: true, updated: updated, created: created });
}

// ====================================================================
// Вспомогательные функции
// ====================================================================
function getSettingsMap(ss) {
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const cParam = headers.indexOf('Параметр'), cValue = headers.indexOf('Значение');
  if (cParam === -1 || cValue === -1) return {};

  const map = {};
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][cParam] || '').trim();
    if (key) map[key] = values[i][cValue];
  }
  return map;
}

function findPlanMonthRow(ss, ym) {
  const sheet = ss.getSheetByName(PLANS_SHEET_NAME);
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const cMonth = headers.indexOf('Месяц'), cRevenue = headers.indexOf('План по выручке');
  if (cMonth === -1 || cRevenue === -1) return null;

  const tz = ss.getSpreadsheetTimeZone();
  const monthKey = raw => raw instanceof Date
    ? Utilities.formatDate(raw, tz, 'yyyy-MM')
    : String(raw || '').trim().slice(0, 7);

  for (let i = 1; i < values.length; i++) {
    if (monthKey(values[i][cMonth]) === ym) {
      return { revenue: Number(values[i][cRevenue]) || 0 };
    }
  }
  return null;
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
