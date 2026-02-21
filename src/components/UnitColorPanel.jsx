import { useState } from 'react';
import { useContacts } from '../context/ContactContext';

/**
 * UnitColorPanel — lets users assign background colors to each unit (department).
 * Colors are applied instantly in the A3 preview.
 */

const PRESET_COLORS = [
    '#fef9c3', '#fde68a', '#fed7aa', '#fecaca',
    '#fbcfe8', '#e9d5ff', '#c7d2fe', '#bfdbfe',
    '#a7f3d0', '#bbf7d0', '#d9f99d', '#e5e7eb',
];

export default function UnitColorPanel() {
    const { uniqueUnits, unitColors, setUnitColor, removeUnitColor } = useContacts();
    const [expandedUnit, setExpandedUnit] = useState(null);

    if (uniqueUnits.length === 0) {
        return (
            <div className="unit-color-panel">
                <div className="unit-color-empty">尚無單位資料</div>
            </div>
        );
    }

    return (
        <div className="unit-color-panel">
            <div className="unit-color-header">
                <span>為每個單位指定背景色，即時套用到預覽</span>
            </div>
            <div className="unit-color-list">
                {uniqueUnits.map(unit => {
                    const currentColor = unitColors[unit] || '';
                    const isExpanded = expandedUnit === unit;

                    return (
                        <div key={unit} className="unit-color-item">
                            <div
                                className="unit-color-row"
                                onClick={() => setExpandedUnit(isExpanded ? null : unit)}
                            >
                                <span
                                    className="unit-color-swatch"
                                    style={{
                                        backgroundColor: currentColor || '#374151',
                                    }}
                                />
                                <span className="unit-color-name">{unit}</span>
                                <span className="unit-color-arrow">{isExpanded ? '▾' : '▸'}</span>
                            </div>

                            {isExpanded && (
                                <div className="unit-color-picker">
                                    <div className="preset-colors">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                className={`preset-btn ${currentColor === color ? 'active' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setUnitColor(unit, color)}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                    <div className="custom-color-row">
                                        <label className="custom-label">自訂：</label>
                                        <input
                                            type="color"
                                            className="custom-color-input"
                                            value={currentColor || '#ffffff'}
                                            onChange={e => setUnitColor(unit, e.target.value)}
                                        />
                                        {currentColor && (
                                            <button
                                                className="btn-clear-color"
                                                onClick={() => removeUnitColor(unit)}
                                            >
                                                清除
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
