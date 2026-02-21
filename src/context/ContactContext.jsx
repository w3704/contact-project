import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import CSV_RAW from '../csvData.js';

// ─── localStorage helpers ────────────────────────
const LS_KEYS = {
    contacts: 'cp_contacts',
    sortField: 'cp_sortField',
    sortDir: 'cp_sortDir',
    unitColors: 'cp_unitColors',
    unitFontSize: 'cp_unitFontSize',
    nameFontSize: 'cp_nameFontSize',
};

function lsGet(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
}
function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// Add unique IDs and default colors to the raw CSV data
const INITIAL_DATA = CSV_RAW.map(row => ({
    id: uuidv4(),
    unit: row.unit,
    extension: row.extension,
    name: row.name,
    bgColor: '',
    textColor: '',
}));

const ContactContext = createContext(null);

export function ContactProvider({ children }) {
    // Load contacts: prefer localStorage, fall back to CSV seed data
    const [contacts, setContacts] = useState(() => lsGet(LS_KEYS.contacts, INITIAL_DATA));

    // Sort & search state — persisted
    const [sortField, setSortField] = useState(() => lsGet(LS_KEYS.sortField, null));
    const [sortDir, setSortDir] = useState(() => lsGet(LS_KEYS.sortDir, 'asc'));
    const [searchTerm, setSearchTerm] = useState('');

    // Font size state — persisted
    const [unitFontSize, setUnitFontSize] = useState(() => lsGet(LS_KEYS.unitFontSize, 5.5));
    const [nameFontSize, setNameFontSize] = useState(() => lsGet(LS_KEYS.nameFontSize, 5.5));

    // Unit colors map: { unitName: '#hexColor' }
    const [unitColors, setUnitColors] = useState(() => lsGet(LS_KEYS.unitColors, {}));

    // ─── Persist to localStorage ───
    useEffect(() => { lsSet(LS_KEYS.contacts, contacts); }, [contacts]);
    useEffect(() => { lsSet(LS_KEYS.sortField, sortField); }, [sortField]);
    useEffect(() => { lsSet(LS_KEYS.sortDir, sortDir); }, [sortDir]);
    useEffect(() => { lsSet(LS_KEYS.unitFontSize, unitFontSize); }, [unitFontSize]);
    useEffect(() => { lsSet(LS_KEYS.nameFontSize, nameFontSize); }, [nameFontSize]);
    useEffect(() => { lsSet(LS_KEYS.unitColors, unitColors); }, [unitColors]);

    // ─── Contact CRUD ───
    const addContact = useCallback(() => {
        setContacts(prev => [...prev, {
            id: uuidv4(), unit: '', extension: '', name: '', bgColor: '', textColor: ''
        }]);
    }, []);

    const removeContact = useCallback((id) => {
        setContacts(prev => prev.filter(c => c.id !== id));
    }, []);

    const updateContact = useCallback((id, field, value) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    }, []);

    const reorderContacts = useCallback((newOrder) => {
        setContacts(newOrder);
    }, []);

    const clearContacts = useCallback(() => {
        setContacts([]);
    }, []);

    // ─── Unit color helpers ───
    const setUnitColor = useCallback((unitName, color) => {
        setUnitColors(prev => ({ ...prev, [unitName]: color }));
    }, []);

    const removeUnitColor = useCallback((unitName) => {
        setUnitColors(prev => {
            const next = { ...prev };
            delete next[unitName];
            return next;
        });
    }, []);

    // ─── Derived: filtered + sorted contacts ───
    const displayContacts = useMemo(() => {
        let list = contacts;

        const term = searchTerm.trim().toLowerCase();
        if (term) {
            list = list.filter(c =>
                (c.unit || '').toLowerCase().includes(term) ||
                (c.extension || '').toLowerCase().includes(term) ||
                (c.name || '').toLowerCase().includes(term)
            );
        }

        if (sortField) {
            list = [...list].sort((a, b) => {
                const va = (a[sortField] || '').toLowerCase();
                const vb = (b[sortField] || '').toLowerCase();
                const cmp = va.localeCompare(vb, 'zh-Hant');
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }

        return list;
    }, [contacts, searchTerm, sortField, sortDir]);

    // Unique unit list (derived from contacts, for UnitColorPanel)
    const uniqueUnits = useMemo(() => {
        const seen = new Set();
        return contacts
            .map(c => c.unit)
            .filter(u => u && !seen.has(u) && seen.add(u));
    }, [contacts]);

    // ─── CSV import ───
    const importFromCsv = useCallback((csvText) => {
        const result = Papa.parse(csvText.trim(), { skipEmptyLines: true });
        const rows = result.data;
        if (!rows || rows.length === 0) return { success: false, message: '沒有可匯入的資料' };

        const firstRow = rows[0].map(s => s.trim());
        const isHeader = firstRow.some(cell =>
            ['單位', '分機', '姓名', 'unit', 'extension', 'name'].includes(cell)
        );
        const dataRows = isHeader ? rows.slice(1) : rows;
        if (dataRows.length === 0) return { success: false, message: '沒有資料列' };

        let lastUnit = '';
        const imported = dataRows
            .filter(row => row.some(cell => cell.trim() !== ''))
            .map(row => {
                let unit = (row[0] || '').trim();
                if (unit) lastUnit = unit;
                else unit = lastUnit;
                return {
                    id: uuidv4(),
                    unit,
                    extension: (row[1] || '').trim(),
                    name: (row[2] || '').trim(),
                    bgColor: '',
                    textColor: '',
                };
            });

        setContacts(imported);
        return { success: true, message: `已匯入 ${imported.length} 筆聯絡人` };
    }, []);

    // ─── JSON export ───
    const exportToJson = useCallback(() => {
        const data = {
            version: 1,
            exportedAt: new Date().toISOString(),
            contacts,
            settings: { unitColors, unitFontSize, nameFontSize },
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        saveAs(blob, `聯絡人備份_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.json`);
    }, [contacts, unitColors, unitFontSize, nameFontSize]);

    // ─── JSON import ───
    const importFromJson = useCallback((jsonText) => {
        try {
            const data = JSON.parse(jsonText);
            if (!data.contacts || !Array.isArray(data.contacts)) {
                return { success: false, message: 'JSON 格式不正確：找不到聯絡人資料' };
            }
            // Restore contacts (ensure IDs exist)
            const restored = data.contacts.map(c => ({
                id: c.id || uuidv4(),
                unit: c.unit || '',
                extension: c.extension || '',
                name: c.name || '',
                bgColor: c.bgColor || '',
                textColor: c.textColor || '',
            }));
            setContacts(restored);
            // Restore settings if present
            if (data.settings) {
                if (data.settings.unitColors) setUnitColors(data.settings.unitColors);
                if (data.settings.unitFontSize) setUnitFontSize(data.settings.unitFontSize);
                if (data.settings.nameFontSize) setNameFontSize(data.settings.nameFontSize);
            }
            return { success: true, message: `已匯入 ${restored.length} 筆聯絡人（含設定）` };
        } catch (err) {
            return { success: false, message: 'JSON 解析失敗：' + err.message };
        }
    }, []);

    return (
        <ContactContext.Provider value={{
            contacts, setContacts, displayContacts, uniqueUnits,
            addContact, removeContact, updateContact, reorderContacts, clearContacts,
            importFromCsv, exportToJson, importFromJson,
            sortField, setSortField, sortDir, setSortDir,
            searchTerm, setSearchTerm,
            unitFontSize, setUnitFontSize, nameFontSize, setNameFontSize,
            unitColors, setUnitColor, removeUnitColor,
        }}>
            {children}
        </ContactContext.Provider>
    );
}

export function useContacts() {
    const ctx = useContext(ContactContext);
    if (!ctx) throw new Error('useContacts must be used within ContactProvider');
    return ctx;
}
