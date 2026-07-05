/**
 * Apps Script для таблицы "ТО КИВИ Маркет" — вспомогательная функция очистки
 * колонок + веб-хук для кнопки «✏️ Внести данные» в приложении KIVI Business.
 *
 * УСТАНОВКА:
 * 1. Google Таблица → Расширения → Apps Script — вставьте этот файл целиком
 *    (или добавьте doPost/doGet/jsonOutput к уже существующему скрипту).
 * 2. Deploy → New deployment → тип "Web app":
 *      Execute as: Me
 *      Who has access: Anyone
 * 3. Скопируйте URL вида https://script.google.com/macros/s/XXXX/exec
 *    и вставьте его в config.js → SHEETS.updateUrl.
 * 4. (Необязательно, но рекомендуется) впишите свой токен в UPDATE_SECRET
 *    ниже и тот же токен передайте на клиенте — см. quickUpdate.js.
 * 5. После КАЖДОГО изменения этого скрипта нужно создавать НОВУЮ версию
 *    деплоя (Deploy → Manage deployments → ✏️ → New version), иначе
 *    старый /exec URL продолжит работать по старому коду.
 */

const SHEET_NAME = 'Данные';
const UPDATE_SECRET = ''; // например: 'kivi-2026' — оставьте пустым, чтобы не проверять

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
// Веб-хук для приложения: обновляет сегодняшнюю строку по названиям
// колонок (не по буквам!) — устойчиво к перестановке столбцов.
// Если строки на эту дату ещё нет (месяц не был подготовлен заранее),
// создаёт новую строку и сама корректно проставляет Дата/День/План.
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
          const plans = ss.getSheetByName('Планы');
          if (plans) {
            const pValues = plans.getDataRange().getValues();
            const pHeaders = pValues[0];
            const pCol = name => pHeaders.indexOf(name);
            const pMonth = pCol('Месяц'), pRevenue = pCol('План по выручке');
            // "Месяц" в листе "Планы" хранится как настоящая дата (не текст) —
            // сравниваем по году/месяцу, а не строкой, иначе совпадения не будет
            const monthKey = raw => raw instanceof Date
              ? Utilities.formatDate(raw, tz, 'yyyy-MM')
              : String(raw || '').trim().slice(0, 7);
            const monthRow = pMonth > -1 && pValues.find((r, i) => i > 0 && monthKey(r[pMonth]) === ym);
            if (monthRow) {
              const daysInMonth = new Date(y, m, 0).getDate();
              dailyPlan = Math.round(Number(monthRow[pRevenue]) / daysInMonth);
            }
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
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  return jsonOutput({ ok: true, message: 'KIVI Business update endpoint работает' });
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
