import React, { useMemo } from 'react';
import { useContacts } from '../context/ContactContext';

/**
 * ContactTable — Excel-like compact directory grid for A3.
 * - Unit cells are merged (rowSpan) when consecutive contacts share the same unit.
 * - Unit text is displayed vertically (writing-mode: vertical-rl).
 * - Font size auto-fits based on cell size / text length.
 */
export default function ContactTable() {
    const { displayContacts, unitFontSize, extFontSize, nameFontSize, unitColors, columnColors } = useContacts();

    if (displayContacts.length === 0) {
        return <div className="directory-empty">尚無聯絡人資料</div>;
    }

    const contacts = displayContacts;

    // Layout: rows per column, number of columns
    const USABLE_HEIGHT_ROWS = 68;
    const numCols = Math.max(1, Math.ceil(contacts.length / USABLE_HEIGHT_ROWS));
    const rowsPerCol = Math.ceil(contacts.length / numCols);

    // Split contacts into column groups
    const groups = [];
    for (let i = 0; i < contacts.length; i += rowsPerCol) {
        groups.push(contacts.slice(i, i + rowsPerCol));
    }

    // Pre-compute merge info for each group
    const mergeMap = useMemo(() => {
        return groups.map(group => {
            const map = {};
            let i = 0;
            while (i < group.length) {
                const unit = group[i].unit;
                let span = 1;
                while (i + span < group.length && group[i + span].unit === unit) {
                    span++;
                }
                map[i] = { span, skip: false };
                for (let j = 1; j < span; j++) {
                    map[i + j] = { span: 0, skip: true };
                }
                i += span;
            }
            return map;
        });
    }, [groups]);

    const colWidthPct = 100 / numCols;

    // Auto-fit font for name: if text is longer, shrink (tuned for elderly readability)
    function nameAutoFontSize(text, base) {
        const len = (text || '').length;
        if (len <= 2) return base;           // 2字：維持100%
        if (len <= 3) return base * 0.95;    // 3字：95%
        if (len <= 4) return base * 0.88;    // 4字：88%
        if (len <= 5) return base * 0.78;    // 5字：78%
        return base * 0.68;                  // 6字以上：68%
    }

    // Auto-fit font for extension
    function extAutoFontSize(text, base) {
        const len = (text || '').length;
        if (len <= 5) return base;
        if (len <= 8) return base * 0.85;
        return base * 0.7;
    }

    // Auto-fit font for unit (vertical): scale based on chars vs available rows
    function unitAutoFontSize(text, rowSpan, base) {
        const len = (text || '').length;
        const availRows = rowSpan;
        if (len <= availRows) return base;
        const ratio = availRows / len;
        return Math.max(3, base * Math.min(1, ratio * 1.5));
    }

    // ─── Name-based cell highlighting for elderly readability ───
    function getNameHighlight(name) {
        if (!name) return {};
        const n = name.trim();
        if (!n) return {};
        // Pure numbers (代表號/直撥號碼) → 淡灰
        if (/^\d{4,}$/.test(n)) return { bg: '#F3F4F6' };
        if (n === '代表號') return { bg: '#F3F4F6', fw: 700 };
        // Top officials: 副縣長/秘書長 → 金黃
        if (/副縣長/.test(n) || /秘書長/.test(n)) return { bg: '#FDE68A', fw: 700 };
        // 處長/副處長 → 暖橘
        if (/處長/.test(n) || /副處長/.test(n)) return { bg: '#FED7AA', fw: 700 };
        // 總幹事/副總幹事 → 暖橘
        if (/總幹事/.test(n)) return { bg: '#FED7AA', fw: 700 };
        // 科長 → 淡綠
        if (/科長/.test(n)) return { bg: '#BBF7D0', fw: 700 };
        // 參議/秘書/督學/消保官/主任/專員 → 淡紫
        if (/參議/.test(n) || /秘書/.test(n) || /督學/.test(n) || /消保官/.test(n) || /主任/.test(n) || /專員/.test(n))
            return { bg: '#E9D5FF', fw: 600 };
        // Section names: ends with 科/室/台/組 and ≤6 chars
        if (n.length <= 6 && /[科室台組]$/.test(n)) return { bg: '#DBEAFE', fw: 700 };
        // Functional labels
        if (['保全', '收文', '檔案庫', '駕駛室', '廚房', '餐廳', '登記桌'].includes(n))
            return { bg: '#F3F4F6' };
        return {};
    }

    return (
        <table className="directory-table">
            <colgroup>
                {groups.map((_, i) => (
                    <React.Fragment key={i}>
                        <col style={{ width: `${colWidthPct * 0.18}%` }} />
                        <col style={{ width: `${colWidthPct * 0.35}%` }} />
                        <col style={{ width: `${colWidthPct * 0.47}%` }} />
                    </React.Fragment>
                ))}
            </colgroup>
            <tbody>
                {Array.from({ length: rowsPerCol }, (_, rowIdx) => (
                    <tr key={rowIdx} className="dir-row">
                        {groups.map((group, colIdx) => {
                            const c = group[rowIdx];
                            if (!c) {
                                return (
                                    <React.Fragment key={colIdx}>
                                        <td className="dir-cell dir-cell-empty">&nbsp;</td>
                                        <td className="dir-cell dir-cell-empty">&nbsp;</td>
                                        <td className="dir-cell dir-cell-empty">&nbsp;</td>
                                    </React.Fragment>
                                );
                            }

                            const merge = mergeMap[colIdx][rowIdx] || { span: 1, skip: false };

                            // Per-contact colors take priority, then column colors, then defaults
                            const unitCellColor = c.textColor || columnColors.unit || undefined;
                            const extCellColor = c.textColor || columnColors.extension || undefined;
                            const nameCellColor = c.textColor || columnColors.name || undefined;

                            const cellBg = c.bgColor || undefined;

                            // Per-contact font sizes (fallback to global)
                            const baseUnitFS = c.cellUnitFS ?? unitFontSize;
                            const baseExtFS = c.cellExtFS ?? extFontSize;
                            const baseNameFS = c.cellNameFS ?? nameFontSize;

                            const nameFontPt = nameAutoFontSize(c.name, baseNameFS);
                            const extFontPt = extAutoFontSize(c.extension, baseExtFS);

                            // Name-based highlight (only if no per-contact bgColor override)
                            const nameHL = !cellBg ? getNameHighlight(c.name) : {};

                            return (
                                <React.Fragment key={colIdx}>
                                    {/* Unit cell: merged + vertical text */}
                                    {!merge.skip && (
                                        <td
                                            className="dir-cell dir-cell-unit dir-cell-unit-start"
                                            rowSpan={merge.span}
                                            style={{
                                                backgroundColor: unitColors[c.unit] || cellBg,
                                                color: unitCellColor,
                                                fontSize: `${unitAutoFontSize(c.unit, merge.span, baseUnitFS)}pt`,
                                            }}
                                            title={c.unit}
                                        >
                                            {c.unit || ''}
                                        </td>
                                    )}
                                    {/* Extension + Name: merge if identical */}
                                    {c.extension && c.name && c.extension === c.name ? (
                                        <td
                                            className={`dir-cell dir-cell-merged ${!merge.skip || rowIdx === 0 ? 'dir-cell-unit-start' : ''}`}
                                            colSpan={2}
                                            style={{ backgroundColor: cellBg || nameHL.bg, color: extCellColor, fontWeight: nameHL.fw || undefined }}
                                        >
                                            {c.extension}
                                        </td>
                                    ) : (
                                        <>
                                            <td
                                                className={`dir-cell dir-cell-ext ${!merge.skip || rowIdx === 0 ? 'dir-cell-unit-start' : ''}`}
                                                style={{
                                                    backgroundColor: cellBg || nameHL.bg,
                                                    color: extCellColor,
                                                    fontSize: `${extFontPt}pt`,
                                                    fontWeight: nameHL.fw || undefined,
                                                }}
                                            >
                                                {c.extension || '—'}
                                            </td>
                                            <td
                                                className={`dir-cell dir-cell-name ${!merge.skip || rowIdx === 0 ? 'dir-cell-unit-start' : ''}`}
                                                style={{
                                                    backgroundColor: cellBg || nameHL.bg,
                                                    color: nameCellColor,
                                                    fontSize: `${nameFontPt}pt`,
                                                    fontWeight: nameHL.fw || undefined,
                                                }}
                                            >
                                                {c.name || ''}
                                            </td>
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
