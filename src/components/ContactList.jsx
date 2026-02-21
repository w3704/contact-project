import { useState, useRef, useCallback } from 'react';
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

/* ─── Smart Color Picker Popover ─── */
function ColorPickerPopover({ value, onChange, onClose }) {
    const popoverRef = useRef(null);
    const triggerRect = useRef(null);

    // Position the popover so it doesn't go off-screen
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const handleSetPosition = useCallback((rect) => {
        triggerRect.current = rect;
        const popW = 72;
        const popH = 60;
        let left = rect.left + rect.width / 2 - popW / 2;
        let top = rect.bottom + 4;

        // Prevent right edge clipping
        if (left + popW > window.innerWidth - 8) {
            left = window.innerWidth - popW - 8;
        }
        // Prevent left edge clipping
        if (left < 8) left = 8;
        // Prevent bottom edge clipping
        if (top + popH > window.innerHeight - 8) {
            top = rect.top - popH - 4;
        }
        setPos({ top, left });
    }, []);

    return (
        <>
            <div className="color-picker-backdrop" onClick={onClose} />
            <div
                className="color-picker-popover"
                ref={(el) => {
                    popoverRef.current = el;
                }}
                style={{ top: pos.top, left: pos.left }}
            >
                <input
                    type="color"
                    value={value}
                    onChange={onChange}
                    autoFocus
                />
            </div>
        </>
    );
}

function ColorSwatchButton({ value, defaultValue, onChange, dashed, title }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const [popoverPos, setPopoverPos] = useState(null);

    const handleOpen = useCallback(() => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const popW = 72;
            const popH = 60;
            let left = rect.left + rect.width / 2 - popW / 2;
            let top = rect.bottom + 4;

            if (left + popW > window.innerWidth - 8) {
                left = window.innerWidth - popW - 8;
            }
            if (left < 8) left = 8;
            if (top + popH > window.innerHeight - 8) {
                top = rect.top - popH - 4;
            }
            setPopoverPos({ top, left });
        }
        setOpen(true);
    }, []);

    return (
        <>
            <span
                ref={btnRef}
                className={`color-swatch ${dashed ? 'color-swatch-text' : ''}`}
                style={{ background: value || defaultValue }}
                onClick={handleOpen}
                title={title}
            />
            {open && popoverPos && (
                <>
                    <div className="color-picker-backdrop" onClick={() => setOpen(false)} />
                    <div
                        className="color-picker-popover"
                        style={{ top: popoverPos.top, left: popoverPos.left }}
                    >
                        <input
                            type="color"
                            value={value || defaultValue}
                            onChange={onChange}
                            autoFocus
                        />
                    </div>
                </>
            )}
        </>
    );
}

function SortableEditRow({ contact }) {
    const { updateContact, removeContact } = useContacts();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <tr ref={setNodeRef} style={style} className={`edit-row ${isDragging ? 'dragging' : ''}`}>
            <td className="drag-cell">
                <span {...attributes} {...listeners} className="drag-handle">
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                        <circle cx="4" cy="3" r="1.5" /><circle cx="4" cy="9" r="1.5" /><circle cx="4" cy="15" r="1.5" />
                        <circle cx="9" cy="3" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="15" r="1.5" />
                    </svg>
                </span>
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

            {/* Background color picker */}
            <td className="color-cell" title="背景色">
                <ColorSwatchButton
                    value={contact.bgColor}
                    defaultValue="#ffffff"
                    onChange={e => updateContact(contact.id, 'bgColor', e.target.value)}
                    title="選擇背景色"
                />
            </td>

            {/* Text color picker */}
            <td className="color-cell" title="字體色">
                <ColorSwatchButton
                    value={contact.textColor}
                    defaultValue="#1e293b"
                    onChange={e => updateContact(contact.id, 'textColor', e.target.value)}
                    dashed
                    title="選擇字體色"
                />
            </td>

            {/* Clear colors button */}
            <td className="color-cell" title="清除顏色">
                {(contact.bgColor || contact.textColor) && (
                    <button
                        className="btn-icon btn-clear-color"
                        onClick={() => {
                            updateContact(contact.id, 'bgColor', '');
                            updateContact(contact.id, 'textColor', '');
                        }}
                        title="清除顏色設定"
                    >✕</button>
                )}
            </td>

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
function StaticEditRow({ contact }) {
    const { updateContact, removeContact } = useContacts();

    return (
        <tr className="edit-row">
            <td className="drag-cell">
                <span className="drag-handle drag-handle-disabled">
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
                        <circle cx="4" cy="3" r="1.5" /><circle cx="4" cy="9" r="1.5" /><circle cx="4" cy="15" r="1.5" />
                        <circle cx="9" cy="3" r="1.5" /><circle cx="9" cy="9" r="1.5" /><circle cx="9" cy="15" r="1.5" />
                    </svg>
                </span>
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

            <td className="color-cell" title="背景色">
                <ColorSwatchButton
                    value={contact.bgColor}
                    defaultValue="#ffffff"
                    onChange={e => updateContact(contact.id, 'bgColor', e.target.value)}
                    title="選擇背景色"
                />
            </td>
            <td className="color-cell" title="字體色">
                <ColorSwatchButton
                    value={contact.textColor}
                    defaultValue="#1e293b"
                    onChange={e => updateContact(contact.id, 'textColor', e.target.value)}
                    dashed
                    title="選擇字體色"
                />
            </td>
            <td className="color-cell" title="清除顏色">
                {(contact.bgColor || contact.textColor) && (
                    <button
                        className="btn-icon btn-clear-color"
                        onClick={() => {
                            updateContact(contact.id, 'bgColor', '');
                            updateContact(contact.id, 'textColor', '');
                        }}
                        title="清除顏色設定"
                    >✕</button>
                )}
            </td>
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

export default function ContactList() {
    const {
        contacts, addContact, reorderContacts, displayContacts, clearContacts,
        sortField, setSortField, sortDir, setSortDir,
        searchTerm, setSearchTerm,
        unitFontSize, setUnitFontSize, nameFontSize, setNameFontSize,
        exportToJson, importFromJson,
    } = useContacts();
    const [activeId, setActiveId] = useState(null);
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

        // When sorting/filtering is active, "bake" the displayed order into contacts
        const baseList = isFiltering ? [...displayContacts] : [...contacts];
        const oldIndex = baseList.findIndex(c => c.id === active.id);
        const newIndex = baseList.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(baseList, oldIndex, newIndex);

        // Clear sort FIRST, then apply the new order
        if (sortField) {
            setSortField(null);
            setSortDir('asc');
        }
        if (searchTerm.trim()) {
            // Search is active — reorder only within visible items
            const visibleIds = new Set(displayContacts.map(c => c.id));
            const hidden = contacts.filter(c => !visibleIds.has(c.id));
            reorderContacts([...newOrder, ...hidden]);
        } else {
            reorderContacts(newOrder);
        }
    }

    const activeContact = contacts.find(c => c.id === activeId);

    // Toggle sort
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

    return (
        <div className="contact-list-panel">
            <div className="list-toolbar">
                <span className="contact-count">
                    {searchTerm.trim() ? `${displayContacts.length} / ${contacts.length}` : `${contacts.length}`} 筆聯絡人
                </span>
                <div className="toolbar-right">
                    {/* Font size controls for preview */}
                    <div className="font-size-controls">
                        <span className="fs-label">單位</span>
                        <button
                            className="fs-btn"
                            onClick={() => setUnitFontSize(s => Math.max(3, +(s - 0.5).toFixed(1)))}
                            title="單位字體縮小"
                        >−</button>
                        <span className="fs-value">{unitFontSize}pt</span>
                        <button
                            className="fs-btn"
                            onClick={() => setUnitFontSize(s => Math.min(10, +(s + 0.5).toFixed(1)))}
                            title="單位字體放大"
                        >+</button>
                    </div>
                    <div className="font-size-controls">
                        <span className="fs-label">姓名</span>
                        <button
                            className="fs-btn"
                            onClick={() => setNameFontSize(s => Math.max(3, +(s - 0.5).toFixed(1)))}
                            title="姓名字體縮小"
                        >−</button>
                        <span className="fs-value">{nameFontSize}pt</span>
                        <button
                            className="fs-btn"
                            onClick={() => setNameFontSize(s => Math.min(10, +(s + 0.5).toFixed(1)))}
                            title="姓名字體放大"
                        >+</button>
                    </div>
                    <button className="btn btn-add" onClick={addContact}>
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
                                <th className="drag-col"></th>
                                <th className="sort-header" onClick={() => handleSortClick('unit')}>
                                    單位 <SortArrow field="unit" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className="sort-header" onClick={() => handleSortClick('extension')}>
                                    分機 <SortArrow field="extension" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th className="sort-header" onClick={() => handleSortClick('name')}>
                                    姓名 <SortArrow field="name" sortField={sortField} sortDir={sortDir} />
                                </th>
                                <th title="背景色">🎨</th>
                                <th title="字體色">🖋</th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <SortableContext items={displayContacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            <tbody>
                                {displayContacts.map(contact => (
                                    <SortableEditRow key={contact.id} contact={contact} />
                                ))}
                                {displayContacts.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="empty-hint">
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
                                        <td colSpan={4}></td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
