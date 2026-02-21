import React, { useMemo } from 'react';
import { useContacts } from '../context/ContactContext';

/**
 * ContactTable — Excel-like compact directory grid for A3.
 * - Unit cells are merged (rowSpan) when consecutive contacts share the same unit.
 * - Unit text is displayed vertically (writing-mode: vertical-rl).
 * - Font size auto-fits based on cell size / text length.
 */
export default function ContactTable() {
    const { displayContacts, unitFontSize, nameFontSize, unitColors } = useContacts();

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
    // mergeMap[colIdx][rowIdx] = { span: number, skip: boolean }
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

    // Column width per group: 3 sub-columns (unit, ext, name)
    const colWidthPct = 100 / numCols;

    // Auto-fit font for name: if text is longer, shrink
    function nameAutoFontSize(text) {
        const len = (text || '').length;
        if (len <= 2) return nameFontSize;
        if (len <= 3) return nameFontSize * 0.9;
        if (len <= 4) return nameFontSize * 0.8;
        return nameFontSize * 0.7;
    }

    // Auto-fit font for unit (vertical): scale based on chars vs available rows
    function unitAutoFontSize(text, rowSpan) {
        const len = (text || '').length;
        // Vertical text: available height = rowSpan * ~3.6mm
        // Each char ≈ fontSize * 0.35mm at ~5pt
        const availRows = rowSpan;
        if (len <= availRows) return unitFontSize;
        // Scale down proportionally
        const ratio = availRows / len;
        return Math.max(3, unitFontSize * Math.min(1, ratio * 1.5));
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
                            const cellStyle = {
                                backgroundColor: c.bgColor || undefined,
                                color: c.textColor || undefined,
                            };

                            const nameFontPt = nameAutoFontSize(c.name);

                            return (
                                <React.Fragment key={colIdx}>
                                    {/* Unit cell: merged + vertical text */}
                                    {!merge.skip && (
                                        <td
                                            className="dir-cell dir-cell-unit dir-cell-unit-start"
                                            rowSpan={merge.span}
                                            style={{
                                                ...cellStyle,
                                                fontSize: `${unitAutoFontSize(c.unit, merge.span)}pt`,
                                                backgroundColor: unitColors[c.unit] || cellStyle.backgroundColor,
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
                                            style={cellStyle}
                                        >
                                            {c.extension}
                                        </td>
                                    ) : (
                                        <>
                                            <td
                                                className={`dir-cell dir-cell-ext ${!merge.skip || rowIdx === 0 ? 'dir-cell-unit-start' : ''}`}
                                                style={cellStyle}
                                            >
                                                {c.extension || '—'}
                                            </td>
                                            <td
                                                className={`dir-cell dir-cell-name ${!merge.skip || rowIdx === 0 ? 'dir-cell-unit-start' : ''}`}
                                                style={{
                                                    ...cellStyle,
                                                    fontSize: `${nameFontPt}pt`,
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
