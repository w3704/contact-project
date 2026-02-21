import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { CSV_RAW } from '../csvData.js';

// ─── localStorage helpers ────────────────────────
const LS_KEYS = {
    contacts: 'cp_contacts',
    sortField: 'cp_sortField',
    sortDir: 'cp_sortDir',
    unitColors: 'cp_unitColors',
    unitFontSize: 'cp_unitFontSize',
    extFontSize: 'cp_extFontSize',
    nameFontSize: 'cp_nameFontSize',
    columnColors: 'cp_columnColors',
    pageTitle: 'cp_pageTitle',
    pageSubtitle: 'cp_pageSubtitle',
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

// ─── Elderly-Friendly Default Color Palette ───
// Soft pastels for background — high contrast with dark text for readability
// Grouped by category so adjacent departments are visually distinct
const DEFAULT_UNIT_COLORS = {
    // ── 行政首長 (VIP) — warm gold/amber tones ──
    '縣長室': '#FFF3CD',   // 淡金黃
    '接待室': '#FFF8E1',   // 淡米黃
    '副縣長室': '#FFEEBA',   // 金黃
    '秘書長室': '#FFE0B2',   // 淺橘
    '秘書參議': '#FFE8CC',   // 暖杏色
    '消保': '#FFF0DB',   // 淺杏

    // ── 服務類 — 中性灰藍 ──
    '1999縣民熱線': '#E3F2FD',   // 淡天藍
    '服務中心': '#E8EAF6',   // 淡薰衣草
    '服務台': '#ECEFF1',   // 淡灰
    '保全': '#F5F5F5',   // 極淡灰

    // ── 一級處室 — 各處獨立色系 ──
    '民政處': '#E8F5E9',   // 淡綠
    '財政處': '#E0F2F1',   // 淡青綠
    '城鄉發展處': '#E1F5FE',   // 淡水藍
    '產業發展處': '#F3E5F5',   // 淡紫
    '教育處': '#FFF3E0',   // 淡橙
    '社會處': '#FCE4EC',   // 淡粉紅
    '工務處': '#E0F7FA',   // 淡水青
    '觀光處': '#F1F8E9',   // 淡蘋果綠
    '主計處': '#EDE7F6',   // 淡薰衣草紫
    '人事處': '#FBE9E7',   // 淡珊瑚
    '政風處': '#EFEBE9',   // 淡暖灰

    // ── 社會處附屬 ──
    '社會處_金城社福中心': '#F8BBD0', // 淺粉
    '社會處_金湖社福中心': '#F0BBF0', // 淺紫粉

    // ── 綜合行政 ──
    '綜合發展處': '#E8EAF6',   // 淡靛藍
    '總務科': '#F5F5F5',   // 極淡灰
    '出納': '#ECEFF1',   // 淡灰藍
    '餐廳': '#FFF9C4',   // 淡檸檬

    // ── 其他單位 ──
    '會議室': '#F5F5F5',   // 極淡灰
    '選委會': '#E8F5E9',   // 淡綠
    '工策會': '#E3F2FD',   // 淡天藍
};

// VIP units that get row-level highlight (senior officials)
const VIP_UNITS = new Set(['縣長室', '副縣長室', '秘書長室']);

// Add unique IDs, sort order, and default colors to the raw CSV data
const INITIAL_DATA = CSV_RAW.map((row, idx) => ({
    id: uuidv4(),
    sortOrder: idx + 1,
    unit: row.unit,
    extension: row.extension,
    name: row.name,
    bgColor: '',
    textColor: '',
    cellUnitFS: null,
    cellExtFS: null,
    cellNameFS: null,
}));

const ContactContext = createContext(null);

export function ContactProvider({ children }) {
    // Load contacts: prefer localStorage, fall back to CSV seed data
    const [contacts, setContacts] = useState(() => {
        const stored = lsGet(LS_KEYS.contacts, null);
        if (stored && Array.isArray(stored)) {
            // Ensure sortOrder exists for legacy data
            return stored.map((c, idx) => ({
                ...c,
                sortOrder: c.sortOrder ?? (idx + 1),
            }));
        }
        return INITIAL_DATA;
    });

    // Sort & search state — persisted
    const [sortField, setSortField] = useState(() => lsGet(LS_KEYS.sortField, null));
    const [sortDir, setSortDir] = useState(() => lsGet(LS_KEYS.sortDir, 'asc'));
    const [searchTerm, setSearchTerm] = useState('');

    // Font size state — persisted
    const [unitFontSize, setUnitFontSize] = useState(() => lsGet(LS_KEYS.unitFontSize, 5.5));
    const [extFontSize, setExtFontSize] = useState(() => lsGet(LS_KEYS.extFontSize, 5.5));
    const [nameFontSize, setNameFontSize] = useState(() => lsGet(LS_KEYS.nameFontSize, 6.5));

    // Per-column text colors for A3 preview — persisted
    const [columnColors, setColumnColors] = useState(() => lsGet(LS_KEYS.columnColors, { unit: '', extension: '', name: '' }));

    // Unit colors map: { unitName: '#hexColor' } — defaults to elderly-friendly palette
    const [unitColors, setUnitColors] = useState(() => lsGet(LS_KEYS.unitColors, DEFAULT_UNIT_COLORS));

    // Page title & subtitle — customizable
    const DEFAULT_TITLE = '金門縣政府網路電話一覽表(府內)';
    const DEFAULT_SUBTITLE = '縣民服務專線：１９９９（外縣市：0800-318823）　總機：082-318823、0978-253-902　中華電信服務專線：325005 陳小姐 ／ 315056 李先生 ／ 313018 許先生 ／ 客服專線：0800-080-123';
    const [pageTitle, setPageTitle] = useState(() => lsGet(LS_KEYS.pageTitle, DEFAULT_TITLE));
    const [pageSubtitle, setPageSubtitle] = useState(() => lsGet(LS_KEYS.pageSubtitle, DEFAULT_SUBTITLE));

    // ─── Persist to localStorage ───
    useEffect(() => { lsSet(LS_KEYS.contacts, contacts); }, [contacts]);
    useEffect(() => { lsSet(LS_KEYS.sortField, sortField); }, [sortField]);
    useEffect(() => { lsSet(LS_KEYS.sortDir, sortDir); }, [sortDir]);
    useEffect(() => { lsSet(LS_KEYS.unitFontSize, unitFontSize); }, [unitFontSize]);
    useEffect(() => { lsSet(LS_KEYS.extFontSize, extFontSize); }, [extFontSize]);
    useEffect(() => { lsSet(LS_KEYS.nameFontSize, nameFontSize); }, [nameFontSize]);
    useEffect(() => { lsSet(LS_KEYS.columnColors, columnColors); }, [columnColors]);
    useEffect(() => { lsSet(LS_KEYS.unitColors, unitColors); }, [unitColors]);
    useEffect(() => { lsSet(LS_KEYS.pageTitle, pageTitle); }, [pageTitle]);
    useEffect(() => { lsSet(LS_KEYS.pageSubtitle, pageSubtitle); }, [pageSubtitle]);

    // ─── Contact CRUD ───
    const addContact = useCallback((requestedSortOrder) => {
        setContacts(prev => {
            const so = typeof requestedSortOrder === 'number'
                ? requestedSortOrder
                : (prev.length > 0 ? Math.max(...prev.map(c => c.sortOrder || 0)) + 1 : 1);
            const newContact = {
                id: uuidv4(),
                sortOrder: so,
                unit: '', extension: '', name: '', bgColor: '', textColor: ''
            };
            // Insert in order based on sortOrder
            const newList = [...prev, newContact];
            newList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            return newList;
        });
    }, []);

    const removeContact = useCallback((id) => {
        setContacts(prev => prev.filter(c => c.id !== id));
    }, []);

    const updateContact = useCallback((id, field, value) => {
        setContacts(prev => {
            const updated = prev.map(c => c.id === id ? { ...c, [field]: value } : c);
            // If sortOrder changed, re-sort the list
            if (field === 'sortOrder') {
                updated.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            }
            return updated;
        });
    }, []);

    const reorderContacts = useCallback((newOrder) => {
        setContacts(newOrder);
    }, []);

    const clearContacts = useCallback(() => {
        setContacts([]);
    }, []);

    // Batch update multiple contacts at once
    const batchUpdateContacts = useCallback((ids, updates) => {
        const idSet = new Set(ids);
        setContacts(prev => prev.map(c => idSet.has(c.id) ? { ...c, ...updates } : c));
    }, []);

    // Batch adjust per-contact font size (relative +/-)
    const batchAdjustFontSize = useCallback((ids, field, delta) => {
        const idSet = new Set(ids);
        const globalDefaults = { cellUnitFS: unitFontSize, cellExtFS: extFontSize, cellNameFS: nameFontSize };
        setContacts(prev => prev.map(c => {
            if (!idSet.has(c.id)) return c;
            const current = c[field] ?? globalDefaults[field];
            const newVal = Math.max(3, Math.min(20, +(current + delta).toFixed(1)));
            return { ...c, [field]: newVal };
        }));
    }, [unitFontSize, extFontSize, nameFontSize]);

    // Batch reset per-contact font size to global default
    const batchResetFontSize = useCallback((ids, field) => {
        const idSet = new Set(ids);
        setContacts(prev => prev.map(c => idSet.has(c.id) ? { ...c, [field]: null } : c));
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
                let cmp;
                if (sortField === 'sortOrder') {
                    cmp = (a.sortOrder || 0) - (b.sortOrder || 0);
                } else {
                    const va = (a[sortField] || '').toLowerCase();
                    const vb = (b[sortField] || '').toLowerCase();
                    cmp = va.localeCompare(vb, 'zh-Hant');
                }
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }
        // Default: sort by sortOrder when no field sort is active
        // (contacts are already kept sorted by sortOrder in setContacts)

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
            .map((row, idx) => {
                let unit = (row[0] || '').trim();
                if (unit) lastUnit = unit;
                else unit = lastUnit;
                return {
                    id: uuidv4(),
                    sortOrder: idx + 1,
                    unit,
                    extension: (row[1] || '').trim(),
                    name: (row[2] || '').trim(),
                    bgColor: '',
                    textColor: '',
                    cellUnitFS: null,
                    cellExtFS: null,
                    cellNameFS: null,
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
            settings: { unitColors, unitFontSize, extFontSize, nameFontSize, columnColors, pageTitle, pageSubtitle },
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        saveAs(blob, `聯絡人備份_${new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')}.json`);
    }, [contacts, unitColors, unitFontSize, extFontSize, nameFontSize, columnColors, pageTitle, pageSubtitle]);

    // ─── JSON import ───
    const importFromJson = useCallback((jsonText) => {
        try {
            const data = JSON.parse(jsonText);
            if (!data.contacts || !Array.isArray(data.contacts)) {
                return { success: false, message: 'JSON 格式不正確：找不到聯絡人資料' };
            }
            // Restore contacts (ensure IDs and sortOrder exist)
            const restored = data.contacts.map((c, idx) => ({
                id: c.id || uuidv4(),
                sortOrder: c.sortOrder ?? (idx + 1),
                unit: c.unit || '',
                extension: c.extension || '',
                name: c.name || '',
                bgColor: c.bgColor || '',
                textColor: c.textColor || '',
                cellUnitFS: c.cellUnitFS ?? null,
                cellExtFS: c.cellExtFS ?? null,
                cellNameFS: c.cellNameFS ?? null,
            }));
            restored.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setContacts(restored);
            // Restore settings if present
            if (data.settings) {
                if (data.settings.unitColors) setUnitColors(data.settings.unitColors);
                if (data.settings.unitFontSize) setUnitFontSize(data.settings.unitFontSize);
                if (data.settings.extFontSize) setExtFontSize(data.settings.extFontSize);
                if (data.settings.nameFontSize) setNameFontSize(data.settings.nameFontSize);
                if (data.settings.columnColors) setColumnColors(data.settings.columnColors);
                if (data.settings.pageTitle !== undefined) setPageTitle(data.settings.pageTitle);
                if (data.settings.pageSubtitle !== undefined) setPageSubtitle(data.settings.pageSubtitle);
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
            batchUpdateContacts, batchAdjustFontSize, batchResetFontSize,
            importFromCsv, exportToJson, importFromJson,
            sortField, setSortField, sortDir, setSortDir,
            searchTerm, setSearchTerm,
            unitFontSize, setUnitFontSize, extFontSize, setExtFontSize,
            nameFontSize, setNameFontSize,
            columnColors, setColumnColors,
            unitColors, setUnitColor, removeUnitColor,
            pageTitle, setPageTitle, pageSubtitle, setPageSubtitle,
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
