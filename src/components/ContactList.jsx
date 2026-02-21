import { useState, useRef, useCallback, useEffect } from 'react';
import { saveAs } from 'file-saver';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useContacts } from '../context/ContactContext';

const PRESET_COLORS = [
    { color: '#FF0000', label: '紅', cls: 'preset-red' },
    { color: '#0000FF', label: '藍', cls: 'preset-blue' },
    { color: '#FFD700', label: '黃', cls: 'preset-yellow' },
];

/* ─── Color Picker with Presets ─── */
function ColorPickerWithPresets({ value, defaultValue, onChange, onClose }) {
    const [showCustom, setShowCustom] = useState(false);

    return (
        <>
            <div className="color-picker-backdrop" onClick={onClose} />
            <div className="color-picker-preset-popover" onClick={e => e.stopPropagation()}>
                <div className="preset-row">
                    {PRESET_COLORS.map(p => (
                        <button
                            key={p.color}
                            className={`preset-btn ${p.cls}`}
                            style={{ background: p.color }}
                            onClick={() => { onChange(p.color); onClose(); }}
                            title={p.label}
                        />
                    ))}
                    <button
                        className="preset-btn preset-custom"
                        onClick={() => setShowCustom(v => !v)}
                        title="自訂顏色"
                    >🎨</button>
                    <button
                        className="preset-btn preset-clear"
                        onClick={() => { onChange(''); onClose(); }}
                        title="清除"
                    >✕</button>
                </div>
                {showCustom && (
                    <input
                        type="color"
                        className="preset-color-input"
                        value={value || defaultValue}
                        onChange={e => { onChange(e.target.value); onClose(); }}
                        autoFocus
                    />
                )}
            </div>
        </>
    );
}

/* ─── Column Color Button (for toolbar) ─── */
function ColumnColorButton({ label, value, onChange }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const [popoverPos, setPopoverPos] = useState(null);

    const handleOpen = useCallback(() => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            let left = rect.left;
            let top = rect.bottom + 4;
            if (left + 180 > window.innerWidth - 8) left = window.innerWidth - 188;
            if (left < 8) left = 8;
            setPopoverPos({ top, left });
        }
        setOpen(true);
    }, []);

    return (
        <>
            <button ref={btnRef} className="col-color-btn" onClick={handleOpen} title={`${label}文字顏色`}>
                <span className="col-color-swatch" style={{ background: value || '#94a3b8' }} />
                <span className="col-color-label">{label}</span>
            </button>
            {open && popoverPos && (
                <div style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}>
                    <ColorPickerWithPresets
                        value={value}
                        defaultValue="#1e293b"
                        onChange={val => { onChange(val); }}
                        onClose={() => setOpen(false)}
                    />
                </div>
            )}
        </>
    );
}

/* ─── Sortable row (no per-row color columns) ─── */
function SortableEditRow({ contact, selected, onToggle }) {
    const { updateContact, removeContact } = useContacts();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    // Show row background/text color if set
    const rowStyle = {};
    if (contact.bgColor) rowStyle.backgroundColor = contact.bgColor;
    if (contact.textColor) rowStyle.color = contact.textColor;

    return (
        <tr ref={setNodeRef} style={{ ...style, ...rowStyle }} className={`edit-row ${isDragging ? 'dragging' : ''} ${selected ? 'row-selected' : ''}`}>
            <td className="check-cell">
                <input type="checkbox" checked={selected} onChange={() => onToggle(contact.id)} />
            </td>
            <td className="drag-cell">
                <span {...attributes} {...listeners} className="drag-handle">
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                        <circle cx="4" cy="3" r="1.5" /><circle cx="4" cy="9" r="1.5" /><circle cx="4" cy="15" r="1.5" />
                        <circle cx="9" cy="3" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="15" r="1.5" />
                    </svg>
                </span>
            </td>
            <td className="order-cell">
                <input
                    className="cell-input order-input"
                    type="number"
                    step="0.01"
                    value={contact.sortOrder ?? ''}
                    onChange={e => updateContact(contact.id, 'sortOrder', parseFloat(e.target.value) || 0)}
                    title="排序編號"
                />
            </td>
            {[['unit', '單位'], ['extension', '分機'], ['name', '姓名']].map(([field, placeholder]) => (
                <td key={field} className="edit-cell">
                    <input
                        className="cell-input"
                        value={contact[field] ?? ''}
                        onChange={e => updateContact(contact.id, field, e.target.value)}
                        placeholder={placeholder}
                    />
                </td>
            ))}
            <td className="action-cell">
                <button
                    className="btn-icon btn-delete"
                    onClick={() => removeContact(contact.id)}
                    title="刪除"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                </button>
            </td>
        </tr>
    );
}

/* ─── Static row (used when sorting is active, no DnD) ─── */
function StaticEditRow({ contact, selected, onToggle }) {
    const { updateContact, removeContact } = useContacts();

    const rowStyle = {};
    if (contact.bgColor) rowStyle.backgroundColor = contact.bgColor;
    if (contact.textColor) rowStyle.color = contact.textColor;

    return (
        <tr className={`edit-row ${selected ? 'row-selected' : ''}`} style={rowStyle}>
            <td className="check-cell">
                <input type="checkbox" checked={selected} onChange={() => onToggle(contact.id)} />
            </td>
            <td className="drag-cell">
                <span className="drag-handle drag-handle-disabled">
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                        <circle cx="4" cy="3" r="1.5" /><circle cx="4" cy="9" r="1.5" /><circle cx="4" cy="15" r="1.5" />
                        <circle cx="9" cy="3" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="15" r="1.5" />
                    </svg>
                </span>
            </td>
            <td className="order-cell">
                <input
                    className="cell-input order-input"
                    type="number"
                    step="0.01"
                    value={contact.sortOrder ?? ''}
                    onChange={e => updateContact(contact.id, 'sortOrder', parseFloat(e.target.value) || 0)}
                    title="排序編號"
                />
            </td>
            {[['unit', '單位'], ['extension', '分機'], ['name', '姓名']].map(([field, placeholder]) => (
                <td key={field} className="edit-cell">
                    <input
                        className="cell-input"
                        value={contact[field] ?? ''}
                        onChange={e => updateContact(contact.id, field, e.target.value)}
                        placeholder={placeholder}
                    />
                </td>
            ))}
            <td className="action-cell">
                <button
                    className="btn-icon btn-delete"
                    onClick={() => removeContact(contact.id)}
                    title="刪除"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                    </svg>
                </button>
            </td>
        </tr>
    );
}

/* ─── Sort arrow indicator ─── */
function SortArrow({ field, sortField, sortDir }) {
    if (sortField !== field) return <span className="sort-arrow sort-arrow-inactive">⇅</span>;
    return <span className="sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

/* ─── Add Contact Modal ─── */
function AddContactModal({ contacts, onConfirm, onCancel }) {
    const maxOrder = contacts.length > 0
        ? contacts.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0)
        : 0;
    const defaultOrder = Math.ceil(maxOrder) + 1;
    const [value, setValue] = useState(defaultOrder.toFixed(2));
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleConfirm = () => {
        const so = parseFloat(value);
        if (isNaN(so)) {
            alert('請輸入有效的數字');
            return;
        }
        onConfirm(parseFloat(so.toFixed(2)));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">📌 新增聯絡人</h3>
                <p className="modal-desc">
                    請輸入排序編號（支援小數兩位）<br />
                    目前最大編號：<strong>{maxOrder.toFixed(2)}</strong>
                </p>
                <input
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    className="modal-input"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`例如 ${defaultOrder} 或 ${(defaultOrder - 0.5).toFixed(2)}`}
                />
                <div className="modal-actions">
                    <button className="btn modal-cancel" onClick={onCancel}>取消</button>
                    <button className="btn btn-add modal-confirm" onClick={handleConfirm}>確定新增</button>
                </div>
            </div>
        </div>
    );
}

/* ─── Batch Edit Bar ─── */
function BatchEditBar({ selectedIds, onClear }) {
    const { batchUpdateContacts, batchAdjustFontSize, batchResetFontSize } = useContacts();
    const count = selectedIds.length;

    const applyBg = (color) => batchUpdateContacts(selectedIds, { bgColor: color });
    const applyText = (color) => batchUpdateContacts(selectedIds, { textColor: color });
    const clearColors = () => batchUpdateContacts(selectedIds, { bgColor: '', textColor: '' });

    return (
        <div className="batch-bar">
            <span className="batch-count">已選 {count} 筆</span>

            {/* Color section */}
            <div className="batch-section">
                <div className="batch-group">
                    <span className="batch-label">背景色：</span>
                    {PRESET_COLORS.map(p => (
                        <button key={p.color} className={`preset-btn ${p.cls}`} style={{ background: p.color }}
                            onClick={() => applyBg(p.color)} title={p.label} />
                    ))}
                    <BatchCustomColorBtn onChange={applyBg} />
                </div>
                <div className="batch-group">
                    <span className="batch-label">字體色：</span>
                    {PRESET_COLORS.map(p => (
                        <button key={p.color} className={`preset-btn ${p.cls}`} style={{ background: p.color }}
                            onClick={() => applyText(p.color)} title={p.label} />
                    ))}
                    <BatchCustomColorBtn onChange={applyText} />
                </div>
                <button className="btn batch-clear-btn" onClick={clearColors} title="清除所選顏色">🧹 清除顏色</button>
            </div>

            {/* Font size section */}
            <div className="batch-section batch-fs-section">
                <span className="batch-label">字體大小：</span>
                {[['cellUnitFS', '單位'], ['cellExtFS', '分機'], ['cellNameFS', '姓名']].map(([field, label]) => (
                    <div key={field} className="batch-fs-group">
                        <span className="batch-fs-label">{label}</span>
                        <button className="fs-btn" onClick={() => batchAdjustFontSize(selectedIds, field, -0.5)} title={`${label}縮小`}>−</button>
                        <button className="fs-btn" onClick={() => batchAdjustFontSize(selectedIds, field, 0.5)} title={`${label}放大`}>+</button>
                        <button className="fs-btn batch-fs-reset" onClick={() => batchResetFontSize(selectedIds, field)} title={`${label}重設`}>↺</button>
                    </div>
                ))}
            </div>

            <button className="btn batch-deselect-btn" onClick={onClear} title="取消選取">取消選取</button>
        </div>
    );
}

function BatchCustomColorBtn({ onChange }) {
    const [show, setShow] = useState(false);
    return (
        <span style={{ position: 'relative', display: 'inline-flex' }}>
            <button className="preset-btn preset-custom" onClick={() => setShow(v => !v)} title="自訂顏色">🎨</button>
            {show && (
                <>
                    <div className="color-picker-backdrop" onClick={() => setShow(false)} />
                    <div className="batch-custom-picker">
                        <input type="color" autoFocus onChange={e => { onChange(e.target.value); setShow(false); }} />
                    </div>
                </>
            )}
        </span>
    );
}

/* ─── Main ContactList ─── */
export default function ContactList() {
    const {
        contacts, addContact, reorderContacts, displayContacts, clearContacts,
        sortField, setSortField, sortDir, setSortDir,
        searchTerm, setSearchTerm,
        columnColors, setColumnColors,
        exportToJson, importFromJson,
    } = useContacts();
    const [activeId, setActiveId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const jsonInputRef = useRef(null);

    const isFiltering = searchTerm.trim() !== '' || sortField !== null;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    function handleDragStart(e) { setActiveId(e.active.id); }
    function handleDragEnd(e) {
        const { active, over } = e;
        setActiveId(null);
        if (!over || active.id === over.id) return;

        const baseList = isFiltering ? [...displayContacts] : [...contacts];
        const oldIndex = baseList.findIndex(c => c.id === active.id);
        const newIndex = baseList.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(baseList, oldIndex, newIndex);

        if (sortField) {
            setSortField(null);
            setSortDir('asc');
        }
        if (searchTerm.trim()) {
            const visibleIds = new Set(displayContacts.map(c => c.id));
            const hidden = contacts.filter(c => !visibleIds.has(c.id));
            reorderContacts([...newOrder, ...hidden]);
        } else {
            reorderContacts(newOrder);
        }
    }

    const activeContact = contacts.find(c => c.id === activeId);

    const handleSortClick = useCallback((field) => {
        setSortField(prev => {
            if (prev === field) {
                setSortDir(prevDir => {
                    if (prevDir === 'asc') return 'desc';
                    setSortField(null);
                    return 'asc';
                });
                return prev;
            }
            setSortDir('asc');
            return field;
        });
    }, [setSortField, setSortDir]);

    // Checkbox helpers
    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const allSelected = displayContacts.length > 0 && displayContacts.every(c => selectedIds.has(c.id));
    const toggleSelectAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayContacts.map(c => c.id)));
        }
    }, [allSelected, displayContacts]);

    const selectedArray = Array.from(selectedIds);


    return (
        <div className="contact-list-panel">
            <div className="list-toolbar">
                <span className="contact-count">
                    {searchTerm.trim() ? `${displayContacts.length} / ${contacts.length}` : `${contacts.length}`} 筆聯絡人
                </span>
                <div className="toolbar-right">
                    <button className="btn btn-add" onClick={() => setShowAddModal(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        新增
                    </button>
                    <button className="btn btn-export" onClick={() => {
                        const header = '單位,分機,姓名';
                        const rows = displayContacts.map(c =>
                            [c.unit, c.extension, c.name].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')
                        );
                        const csv = [header, ...rows].join('\n');
                        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
                        saveAs(blob, '聯絡人.csv');
                    }} title="匯出 CSV（依當前排序）">
                        📥 匯出
                    </button>
                    <button className="btn btn-json-export" onClick={exportToJson} title="備份全部資料為 JSON">
                        💾 備份
                    </button>
                    <button className="btn btn-json-import" onClick={() => jsonInputRef.current?.click()} title="從 JSON 檔案還原資料">
                        📂 還原
                    </button>
                    <input
                        ref={jsonInputRef}
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                                const result = importFromJson(evt.target.result);
                                alert(result.message);
                            };
                            reader.readAsText(file, 'UTF-8');
                            e.target.value = '';
                        }}
                    />
                    <button className="btn btn-danger" onClick={() => {
                        if (window.confirm('確定要清空所有聯絡人資料嗎？此操作無法復原。')) {
                            clearContacts();
                        }
                    }} title="清空所有資料">
                        🗑️ 清空
                    </button>
                </div>
            </div>

            {/* Column color controls */}
            <div className="column-color-bar">
                <span className="col-color-title">欄位文字顏色：</span>
                <ColumnColorButton label="單位" value={columnColors.unit}
                    onChange={v => setColumnColors(prev => ({ ...prev, unit: v }))} />
                <ColumnColorButton label="分機" value={columnColors.extension}
                    onChange={v => setColumnColors(prev => ({ ...prev, extension: v }))} />
                <ColumnColorButton label="姓名" value={columnColors.name}
                    onChange={v => setColumnColors(prev => ({ ...prev, name: v }))} />
            </div>

            {/* Batch edit bar */}
            {selectedArray.length > 0 && (
                <BatchEditBar selectedIds={selectedArray} onClear={() => setSelectedIds(new Set())} />
            )}

            {/* Search bar */}
            <div className="search-bar">
                <svg className="search-bar-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    className="search-bar-input"
                    type="text"
                    placeholder="搜尋單位、分機或姓名…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button className="search-bar-clear" onClick={() => setSearchTerm('')} title="清除搜尋">✕</button>
                )}
            </div>

            <div className="list-table-wrap">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <table className="edit-table">
                        <thead>
                            <tr>
                                <th className="check-col">
                                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="全選" />
                                </th>
                                <th className="drag-col"></th>
                                <th className="order-col sort-header" onClick={() => handleSortClick('sortOrder')}>
                                    # <SortArrow field="sortOrder" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className="sort-header" onClick={() => handleSortClick('unit')}>
                                    單位 <SortArrow field="unit" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className="sort-header" onClick={() => handleSortClick('extension')}>
                                    分機 <SortArrow field="extension" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className="sort-header" onClick={() => handleSortClick('name')}>
                                    姓名 <SortArrow field="name" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th></th>
                            </tr>
                        </thead>
                        <SortableContext items={displayContacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <tbody>
                                {displayContacts.map(contact => (
                                    <SortableEditRow
                                        key={contact.id}
                                        contact={contact}
                                        selected={selectedIds.has(contact.id)}
                                        onToggle={toggleSelect}
                                    />
                                ))}
                                {displayContacts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="empty-hint">
                                            {searchTerm.trim() ? '找不到符合的聯絡人' : '尚無聯絡人，請從下方匯入 CSV'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </SortableContext>
                    </table>
                    <DragOverlay>
                        {activeContact && (
                            <table className="edit-table drag-overlay-table">
                                <tbody>
                                    <tr className="edit-row drag-overlay-row">
                                        <td className="drag-cell">⠿</td>
                                        <td className="edit-cell"><input className="cell-input" value={activeContact.unit} readOnly /></td>
                                        <td className="edit-cell"><input className="cell-input" value={activeContact.extension} readOnly /></td>
                                        <td className="edit-cell"><input className="cell-input" value={activeContact.name} readOnly /></td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Add Contact Modal */}
            {showAddModal && <AddContactModal
                contacts={contacts}
                onConfirm={(so) => { addContact(so); setShowAddModal(false); }}
                onCancel={() => setShowAddModal(false)}
            />}
        </div>
    );
}
