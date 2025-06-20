// dailyRevenuePast.js
// Блок "Выручка по дням прошлого года" — отдельный график
// Автор: ассистент

async function loadDailyRevenuePast() {
  const sheetId = '1tTpD8d0U7P7BDjWNUritaGcuottV';
  const tabId = '1052804154';
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;

  const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&tq=&gid=${tabId}`);
  const text = await response.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));

  const rows = json.table.rows;
  const dayRevenueMap = {};

  for (const row of rows) {
    const dateCell = row.c[0];
    const revenueCell = row.c[1];
    if (!dateCell || !revenueCell) continue;
    const date = new Date(dateCell.f || dateCell.v);
    if (date.getFullYear() === lastYear && date.getMonth() === currentMonth) {
      const day = date.getDate();
      dayRevenueMap[day] = (dayRevenueMap[day] || 0) + revenueCell.v;
    }
  }

  renderDailyRevenueChart(dayRevenueMap);
}

function renderDailyRevenueChart(data) {
  const container = document.createElement('div');
  container.style.marginTop = '20px';
  container.innerHTML = `<h3 style="text-align:center;margin-bottom:10px;">Выручка по дням — ${getMonthName(new Date().getMonth())} ${new Date().getFullYear() - 1}</h3><div id="daily-revenue-graph" style="display:flex;align-items:flex-end;height:150px;width:100%;overflow-x:auto;padding:0 10px;gap:4px;"></div>`;

  document.body.appendChild(container);

  const graph = container.querySelector('#daily-revenue-graph');
  const maxRevenue = Math.max(...Object.values(data));

  for (let day = 1; day <= 31; day++) {
    const revenue = data[day] || 0;
    const barHeight = (revenue / maxRevenue) * 100;
    const date = new Date(new Date().getFullYear() - 1, new Date().getMonth(), day);
    const isWeekend = [0, 6].includes(date.getDay());

    const bar = document.createElement('div');
    bar.style.height = `${barHeight}%`;
    bar.style.width = '10px';
    bar.style.backgroundColor = isWeekend ? 'yellow' : 'white';
    bar.style.border = '1px solid #ccc';
    bar.style.position = 'relative';

    if (revenue > 0) {
      bar.title = `${day} число: ${revenue.toLocaleString()} ₽`;
    }

    const label = document.createElement('div');
    label.textContent = day;
    label.style.fontSize = '10px';
    label.style.textAlign = 'center';
    label.style.marginTop = '4px';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.appendChild(bar);
    wrapper.appendChild(label);

    graph.appendChild(wrapper);
  }
}

function getMonthName(index) {
  return ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][index];
}

// Запуск при загрузке
window.addEventListener('DOMContentLoaded', loadDailyRevenuePast);
