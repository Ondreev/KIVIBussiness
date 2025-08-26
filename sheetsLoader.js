// sheetsLoader.js
// Загружаем нужные листы ОДИН РАЗ и раздаём всем модулям
(async () => {
  // Сюда положим наборы
  window.DATASETS = {};

  // Список листов, которые реально нужны на странице
  // (можешь удалить те, что точно нигде не используются)
  const tasks = [
    fetch(SHEETS.data).then(r => r.text()).then(t => window.DATASETS.data = Papa.parse(t, { header: true }).data),
    fetch(SHEETS.plans).then(r => r.text()).then(t => window.DATASETS.plans = Papa.parse(t, { header: true }).data),
    fetch(SHEETS.records).then(r => r.text()).then(t => window.DATASETS.records = Papa.parse(t, { header: true }).data),
    fetch(SHEETS.settings).then(r => r.text()).then(t => window.DATASETS.settings = Papa.parse(t, { header: true }).data),
    fetch(SHEETS.ebitda).then(r => r.text()).then(t => window.DATASETS.ebitda = Papa.parse(t, { header: true }).data),
    fetch(SHEETS.leaders).then(r => r.text()).then(t => window.DATASETS.leaders = Papa.parse(t, { header: true }).data),
  ];

  await Promise.all(tasks);

  // Сообщаем всем модулям, что данные готовы
  document.dispatchEvent(new Event('sheets-ready'));
})();
