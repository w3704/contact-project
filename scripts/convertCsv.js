const fs = require('fs');
const csv = fs.readFileSync('/home/web/antigravity/Contact/contact-project/src/newdata.csv', 'utf8');
const lines = csv.trim().split('\n');
const data = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line === '"單位","分機","姓名"') continue;
    const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)"$/);
    if (match) {
        data.push({ unit: match[1], extension: match[2], name: match[3] });
    }
}
const jsContent = '// Auto-generated from CSV data\nexport const CSV_RAW = ' + JSON.stringify(data, null, 2) + ';\n';
fs.writeFileSync('/home/web/antigravity/Contact/contact-project/src/csvData.js', jsContent);
console.log('Generated csvData.js with ' + data.length + ' records');
