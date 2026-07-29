const XLSX = require('xlsx');

function generateXLSX({ title, headers, rows }) {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title || 'Report');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

module.exports = { generateXLSX };
