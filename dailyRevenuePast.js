// dailyRevenuePast.js
// Блок "Выручка по дням прошлого года" — отдельный график по CSV
// Автор: ассистент

async function loadDailyRevenuePast() {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTM-GTiL5auNwSsi0SWkR5_YzX89K-J27vC5nw15bVJbkJRXrmXzNv4LDWb32xfVHNcYac0GnNsxJTI/pub?output=csv';

  const response = await fetch(csvUrl);
  const text = await response.text();
  const lines = text.split('\n').slice(1); // Пропускаем заголовок

  const now = new Date();
  const currentMonth = now.getMonth();
  const lastYear = now.getFullYear() - 1;

  const dayRevenueMap = {};

  for (const line of lines) {
    const columns = line.split(',');
    const dateStrRaw = columns[0]?.trim().replace(/"/g, '');
    const revenueStrRaw = columns[3]?.trim().replace(/"/g, '');
    if (!dateStrRaw || !revenueStrRaw) continue;

    let date;
    if (dateStrRaw.includes('-')) {
      const [year, month, day] = dateStrRaw.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else if (dateStrRaw.includes('.')) {
      const [day, month, year] = dateStrRaw.split('.').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      continue;
    }

    if (isNaN(date.getTime())) continue;

    const revenue = parseFloat(revenueStrRaw.replace(/\s/g, '').replace(',', '.'));

    if (date.getFullYear() === lastYear && date.getMonth() === currentMonth) {
      const day = date.getDate();
      dayRevenueMap[day] = (dayRevenueMap[day] || 0) + revenue;
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
    const barHeight = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
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
