// advisor.js - исправленная версия с правильными названиями колонок

async function runAdvisor() {
  try {
    const data = window.DATASETS.data;
    const costs = window.DATASETS.ebitda;

    if (!data || !costs) {
      console.error("❌ Advisor: Данные не загружены:", { data: !!data, costs: !!costs });
      return;
    }

    const clean = v => parseFloat((v || '0').toString().replace(/\s/g, '').replace(',', '.'));

    const today = new Date();
    const ym = today.toISOString().slice(0, 7);

    // ИСПРАВЛЕННЫЕ названия колонок
    const dateColumn = "Дата";           // Было "День"
    const revenueColumn = "TO";          // Было "ТО" 
    const aspColumn = "расчет ASP";      // Возможно тоже нужно исправить

    console.log("🤖 Advisor: Используем колонки:", { dateColumn, revenueColumn, aspColumn });

    const validRows = data.filter(r => {
      const dateValue = r[dateColumn];
      if (!dateValue || !dateValue.toString().startsWith(ym)) return false;
      
      const revenue = clean(r[revenueColumn]);
      const asp = clean(r[aspColumn]);
      
      return revenue > 0 && asp > 0;
    });

    console.log(`🤖 Advisor: Найдено валидных строк: ${validRows.length}`);

    if (validRows.length === 0) {
      console.warn("⚠️ Advisor: Нет валидных данных для анализа");
      
      // Показываем первые несколько строк для отладки
      console.log("🔍 Первые 3 строки данных для отладки:");
      data.slice(0, 3).forEach((row, i) => {
        console.log(`Строка ${i + 1}:`, {
          дата: row[dateColumn],
          выручка: row[revenueColumn],
          asp: row[aspColumn]
        });
      });
      
      return;
    }

    const avgRevenue = validRows.reduce((s, r) => s + clean(r[revenueColumn]), 0) / validRows.length;
    const avgAspCount = validRows.reduce((s, r) => s + clean(r[aspColumn]), 0) / validRows.length;
    const asp = avgAspCount ? Math.round(avgRevenue / avgAspCount) : 0;

    let totalCosts = 0;
    costs.forEach(row => {
      const value = clean(row["Значение"]);
      const type = (row["Тип"] || '').toLowerCase();
      if (type.includes("руб")) totalCosts += value;
      else if (type.includes("%")) totalCosts += avgRevenue * value / 100;
    });

    const ebitda = avgRevenue - totalCosts;

    // Логика советника
    let advice = "✅ Всё в порядке. Все показатели выполняются! Вы молодцы!!! Продолжаем удерживать курс. Не забываем про наши ценности: Улыбчивость, добродушный ЗАБОТЛИВЫЙ тон. Напоминаем про подписку в Телеграм. Подарки делаем от души, в руки, с улыбкой, смотря прямо в глаза Покупателю. Не будьте грубыми и равнодушными. Этот негативный фактор может разрушить динамику роста!";

    if (asp < 250) {
      advice = "📊 ASP слишком низкий. Рекомендуется: апсейлы, увеличение ассортимента, комплекты. Продаем больше костюмов, комплекты носков, усиливаем средний чек!";
    } else if (avgRevenue < 25000) {
      advice = "📉 Средняя выручка ниже нормы. Усильте промо и визуал в ключевые дни, активно подписываем на наш канал в Телеграмм, это увеличит трафик и решит проблему. Реагируем на посетителей более активно, увеличиваем средний чек. Помним про наши ценности: улыбка, доброжелательность, дружеский тон. Слушайте себя, как вы общаетесь с Покупателями! Не допускайте равнодушия или грубости! Активно рассказывайте про наши акции с воодушевлением в голосе";
    } else if (ebitda < 2000) {
      advice = "🚨 EBITDA отрицательная. Необходимо сократить % расходов или повысить наценку, это КРИТИЧЕСКИЙ ФАКТОР. Снижаем смены сотрудникам, убираем допсмены, вызываем промоутеров. Если сейчас все пустить на самоток, потом будет поздно. Поинтересуйтесь, почему люди уходят. Включите режим ОСОБЕННОЙ ЗАБОТЫ о постетителях Магазина. Бизнес требует радикального вмешательства в процесс! Все учредители должны работать вместе. Проведите SWOT-аналиг. Определите ключевую причину падения прибыли и поставьте план на PDCA основу. Проведите анализ с ИИ. Соберите собрание и обсудите эту проблему в ближайшее время!";
    }

    // Удаляем старый блок
    const oldAdvisor = document.querySelector("#advisorBlock");
    if (oldAdvisor) {
      oldAdvisor.remove();
    }

    // Создаем новый блок
    const block = document.createElement("div");
    block.id = "advisorBlock";
    block.style.background = "#222";
    block.style.color = "#fff";
    block.style.borderRadius = "16px";
    block.style.padding = "20px";
    block.style.marginTop = "24px";
    block.style.width = "95%";
    block.style.maxWidth = "600px";
    block.style.boxSizing = "border-box";
    block.style.fontFamily = "monospace";
    block.style.boxShadow = "0 0 16px rgba(255,255,255,0.3)";

    block.innerHTML = `
      <div style='font-size:18px;font-weight:bold;margin-bottom:12px;text-align:center;'>🤖 Советник дня</div>
      <div style='font-size:14px;text-align:center;'>${advice}</div>
      <div style='font-size:12px;margin-top:12px;opacity:0.7;text-align:center;'>
        ASP: ${asp}₽ | Выручка: ${Math.round(avgRevenue).toLocaleString('ru-RU')}₽ | EBITDA: ${Math.round(ebitda).toLocaleString('ru-RU')}₽
      </div>
    `;

    document.body.appendChild(block);

    console.log("✅ Советник дня загружен", { 
      asp, 
      avgRevenue: Math.round(avgRevenue), 
      ebitda: Math.round(ebitda),
      validRowsCount: validRows.length 
    });
  } catch (error) {
    console.error("❌ Ошибка Advisor:", error);
  }
}

document.addEventListener("sheets-ready", () => {
  console.log("🤖 Инициализируем Advisor...");
  runAdvisor();
});
