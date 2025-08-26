const FILE_ID = "1tTpD8d0U7P7BDjWNUritaGcuottV-cFg8mLPltaWrFI";
const csvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${FILE_ID}/export?format=csv&gid=${gid}`;

const SHEETS = {
  data: csvUrl(2099900296),
  plans: csvUrl(1774855984),
  records: csvUrl(143269600),
  settings: csvUrl(251925978),
  ebitda: csvUrl(567373639),
  leaders: csvUrl(1406705679),
};

window.SHEETS = SHEETS; // чтобы был доступ из любых скриптов
