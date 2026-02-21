import { useContacts } from '../context/ContactContext';

export default function PageSettingsPanel() {
    const { pageTitle, setPageTitle, pageSubtitle, setPageSubtitle } = useContacts();

    return (
        <div className="page-settings-panel">
            <div className="settings-group">
                <label className="settings-label">📝 標題</label>
                <input
                    type="text"
                    className="settings-input"
                    value={pageTitle}
                    onChange={e => setPageTitle(e.target.value)}
                    placeholder="請輸入標題"
                />
            </div>

            <div className="settings-group">
                <label className="settings-label">📋 副標題</label>
                <textarea
                    className="settings-textarea"
                    value={pageSubtitle}
                    onChange={e => setPageSubtitle(e.target.value)}
                    placeholder="請輸入副標題（服務專線等資訊）"
                    rows={4}
                />
            </div>

            <p className="settings-hint">
                💡 修改後左邊 A3 預覽會即時更新，備份時也會一起匯出。
            </p>
        </div>
    );
}
