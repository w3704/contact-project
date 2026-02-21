import { useState, useCallback } from 'react';
import { useContacts } from '../context/ContactContext';

const SAMPLE_CSV = `單位,分機,姓名
金門縣政府(府內),62115,王涵
金門縣政府(府內),62233,蔡祥瑞
金門縣政府(府內),66315,高菊禎
金門縣政府(府內),62424,陳柏璋
金門縣政府(府內),62536,葉融`;

export default function CsvImporter() {
    const { importFromCsv } = useContacts();
    const [csvText, setCsvText] = useState('');
    const [message, setMessage] = useState(null);

    const handleImport = useCallback(() => {
        if (!csvText.trim()) {
            setMessage({ type: 'error', text: '請先貼上 CSV 資料' });
            return;
        }
        const result = importFromCsv(csvText);
        setMessage({ type: result.success ? 'success' : 'error', text: result.message });
        if (result.success) setTimeout(() => setMessage(null), 3000);
    }, [csvText, importFromCsv]);

    const handleClear = () => { setCsvText(''); setMessage(null); };
    const handleLoadSample = () => { setCsvText(SAMPLE_CSV); setMessage(null); };
    const handlePaste = () => {
        setTimeout(() => {
            setMessage({ type: 'info', text: '已貼上內容，點擊「匯入」按鈕以載入資料' });
        }, 100);
    };

    return (
        <div className="csv-importer">
            <div className="csv-format-hint">
                <span className="hint-label">格式：</span>
                <code>單位, 分機, 姓名</code>
                <button className="btn-link" onClick={handleLoadSample}>載入範例</button>
            </div>

            <textarea
                className="csv-textarea"
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                onPaste={handlePaste}
                placeholder={`在此貼上 CSV 內容，例如：\n單位,分機,姓名\n金門縣政府(府內),62115,王涵\n金門縣政府(府內),62233,蔡祥瑞`}
                rows={10}
                spellCheck={false}
            />

            {message && (
                <div className={`import-message msg-${message.type}`}>
                    {message.type === 'success' && '✅ '}
                    {message.type === 'error' && '❌ '}
                    {message.type === 'info' && 'ℹ️ '}
                    {message.text}
                </div>
            )}

            <div className="csv-actions">
                <button className="btn btn-ghost" onClick={handleClear} disabled={!csvText}>清除</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={!csvText.trim()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
                        <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
                    </svg>
                    匯入聯絡人
                </button>
            </div>
        </div>
    );
}
