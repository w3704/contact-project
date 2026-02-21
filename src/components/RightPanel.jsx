import { useState } from 'react';
import ContactList from './ContactList';
import CsvImporter from './CsvImporter';
import UnitColorPanel from './UnitColorPanel';

const TABS = [
    { id: 'list', label: '聯絡人清單', icon: '👥' },
    { id: 'csv', label: 'CSV 匯入', icon: '📋' },
    { id: 'unitColor', label: '單位顏色', icon: '🎨' },
];

export default function RightPanel() {
    const [activeTab, setActiveTab] = useState('list');

    return (
        <div className="right-panel">
            <div className="panel-header">
                <h2 className="panel-title">
                    <span className="panel-icon">✏️</span>
                    聯絡人管理
                </h2>
            </div>

            <div className="tab-bar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 'list' && <ContactList />}
                {activeTab === 'csv' && <CsvImporter />}
                {activeTab === 'unitColor' && <UnitColorPanel />}
            </div>
        </div>
    );
}
