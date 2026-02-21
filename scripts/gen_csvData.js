/**
 * gen_csvData.js
 * 
 * Re-generates src/csvData.js from the raw CSV file.
 * Uses fill-down logic: if a row's unit is empty, inherit the most recent
 * non-empty unit from the SAME column position (i.e. left to right scanning
 * down each column group).
 *
 * Usage:
 *   node scripts/gen_csvData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSV_FILE = path.join(__dirname, '..', '金門縣政府網路電話號碼一覽表_轉換_含單位.csv');
const OUT_FILE = path.join(__dirname, '..', 'src', 'csvData.js');

/** Parse a simple CSV (comma-separated, no quoting needed for this data) */
function parseCSV(text) {
    return text
        .split(/\r?\n/)
        .map(line => line.split(','));
}

function main() {
    const raw = fs.readFileSync(CSV_FILE, 'utf8');
    const allRows = parseCSV(raw);

    // First row is header: 單位,分機,姓名
    const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

    // Fill-down: scan rows sequentially, carry forward last non-empty unit
    let lastUnit = '';
    const records = dataRows.map(row => {
        const unit = (row[0] || '').trim();
        const extension = (row[1] || '').trim();
        const name = (row[2] || '').trim();

        const resolvedUnit = unit || lastUnit;
        if (unit) lastUnit = unit;

        return { unit: resolvedUnit, extension, name };
    });

    // Emit JS
    const lines = ["const CSV_DATA = ["];
    for (const r of records) {
        const u = JSON.stringify(r.unit);
        const e = JSON.stringify(r.extension);
        const n = JSON.stringify(r.name);
        lines.push(`  { unit: ${u}, extension: ${e}, name: ${n} },`);
    }
    lines.push("];");
    lines.push("");
    lines.push("export default CSV_DATA;");
    lines.push("");

    fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf8');
    console.log(`Written ${records.length} records to ${OUT_FILE}`);
}

main();
