import csv, json

data = []
with open('/home/web/antigravity/Contact/contact-project/src/newdata.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if len(row) >= 3:
            u, e, n = row[0].strip(), row[1].strip(), row[2].strip()
            if u == '單位' and e == '分機' and n == '姓名':
                continue
            data.append({'unit': u, 'extension': e, 'name': n})

js = '// Auto-generated from CSV data\nexport const CSV_RAW = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
with open('/home/web/antigravity/Contact/contact-project/src/csvData.js', 'w', encoding='utf-8') as f:
    f.write(js)
print(f'Generated csvData.js with {len(data)} records')
