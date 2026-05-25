const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(process.env.TEMP, 'Copy of USC Microbial Culture Collection (USCMCC).xlsx');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const wb = XLSX.readFile(filePath);
console.log('Sheet names:', wb.SheetNames);

wb.SheetNames.forEach((name, i) => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const colCount = data[0]?.length || 0;
  
  console.log(`\n=== Sheet ${i}: "${name}" ===`);
  console.log(`Rows: ${data.length}, Columns: ${colCount}`);
  console.log('First 3 rows (raw):');
  data.slice(0, 3).forEach((row, idx) => {
    console.log(`  Row ${idx}:`, row);
  });
});
