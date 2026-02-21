import { useRef, useEffect, useState, useCallback } from 'react';
import ContactTable from './ContactTable';
import { useContacts } from '../context/ContactContext';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

/** Format current time as ROC (民國) calendar string */
function useRocTimestamp() {
    const fmt = () => {
        const now = new Date();
        const rocYear = now.getFullYear() - 1911;
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hour24 = now.getHours();
        const minute = now.getMinutes();
        const ampm = hour24 < 12 ? 'AM' : 'PM';
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const minStr = String(minute).padStart(2, '0');
        return `中華民國${rocYear}年${month}月${day}日 ${ampm} ${hour12}:${minStr} 更新`;
    };

    const [timestamp, setTimestamp] = useState(fmt);
    useEffect(() => {
        const id = setInterval(() => setTimestamp(fmt()), 60000);
        return () => clearInterval(id);
    }, []);
    return timestamp;
}

export default function LeftPanel() {
    const scrollRef = useRef(null);
    const pageRef = useRef(null);
    const [autoScale, setAutoScale] = useState(0.35);
    const [manualZoom, setManualZoom] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const timestamp = useRocTimestamp();
    const { displayContacts } = useContacts();

    const [titleFontSize, setTitleFontSize] = useState(24);
    const [subtitleFontSize, setSubtitleFontSize] = useState(7.5);

    // Magnifier state
    const [magnifierOn, setMagnifierOn] = useState(false);
    const [magPos, setMagPos] = useState(null);
    const MAGNIFIER_SIZE = 220;
    const MAGNIFIER_ZOOM = 3;
    const LENS_OFFSET = 130; // offset lens away from cursor so glow is visible

    const scale = manualZoom !== null ? manualZoom : autoScale;

    useEffect(() => {
        function computeScale() {
            if (!scrollRef.current) return;
            const A3_LANDSCAPE_PX = 1587;
            const availW = scrollRef.current.clientWidth - 8;
            const newScale = Math.min(1, availW / A3_LANDSCAPE_PX);
            setAutoScale(newScale);
        }
        computeScale();
        const ro = new ResizeObserver(computeScale);
        if (scrollRef.current) ro.observe(scrollRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        function onFsChange() {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            if (!isFull) setManualZoom(null);
        }
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    const handleFullscreen = useCallback(() => {
        if (scrollRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                scrollRef.current.requestFullscreen();
                const A3_LANDSCAPE_PX = 1587;
                const screenW = window.screen.width - 40;
                setManualZoom(Math.min(1, screenW / A3_LANDSCAPE_PX));
            }
        }
    }, []);

    function handlePrint() { window.print(); }

    // Excel export — use file-saver for reliable filename
    function handleExcelExport() {
        try {
            const wsData = [['單位', '分機', '姓名']];
            displayContacts.forEach(c => {
                wsData.push([c.unit || '', c.extension || '', c.name || '']);
            });
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws, '聯絡人');
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, '聯絡人.xlsx');
        } catch (err) {
            console.error('Excel export failed:', err);
            alert('Excel 匯出失敗：' + err.message);
        }
    }

    // Magnifier mouse handlers
    const handleMagMove = useCallback((e) => {
        if (!magnifierOn || !pageRef.current) return;
        const rect = pageRef.current.getBoundingClientRect();
        setMagPos({ clientX: e.clientX, clientY: e.clientY, rect });
    }, [magnifierOn]);

    const handleMagLeave = useCallback(() => {
        if (magnifierOn) setMagPos(null);
    }, [magnifierOn]);

    const zoomPercent = Math.round(scale * 100);

    // Compute magnifier lens positioning — offset to bottom-right of cursor
    let lensStyle = null;
    let innerStyle = null;
    let glowStyle = null;
    if (magnifierOn && magPos && scrollRef.current) {
        const scrollRect = scrollRef.current.getBoundingClientRect();
        const { clientX, clientY, rect: pageRect } = magPos;

        // Red glow at cursor position on the preview
        const glowLeft = clientX - scrollRect.left + scrollRef.current.scrollLeft;
        const glowTop = clientY - scrollRect.top + scrollRef.current.scrollTop;
        glowStyle = { left: glowLeft, top: glowTop };

        // Lens is offset from cursor so it doesn't cover the glow
        const lensLeft = clientX - scrollRect.left + LENS_OFFSET + scrollRef.current.scrollLeft;
        const lensTop = clientY - scrollRect.top + LENS_OFFSET + scrollRef.current.scrollTop;

        // How far cursor is into the page element
        const cursorInPageX = clientX - pageRect.left;
        const cursorInPageY = clientY - pageRect.top;

        const innerLeft = -(cursorInPageX * MAGNIFIER_ZOOM) + MAGNIFIER_SIZE / 2;
        const innerTop = -(cursorInPageY * MAGNIFIER_ZOOM) + MAGNIFIER_SIZE / 2;

        lensStyle = {
            left: lensLeft,
            top: lensTop,
            width: MAGNIFIER_SIZE,
            height: MAGNIFIER_SIZE,
        };
        innerStyle = {
            transform: `scale(${MAGNIFIER_ZOOM})`,
            transformOrigin: 'top left',
            left: innerLeft,
            top: innerTop,
            width: pageRect.width,
            height: pageRect.height,
        };
    }

    return (
        <div className="left-panel">
            <div className="panel-header">
                <h2 className="panel-title">
                    <span className="panel-icon">📄</span>
                    A3 預覽（橫式）
                </h2>
                <div className="panel-header-actions">
                    <div className="font-size-controls">
                        <span className="fs-label">標題</span>
                        <button className="fs-btn" onClick={() => setTitleFontSize(s => Math.max(10, s - 1))} title="標題字體縮小">−</button>
                        <span className="fs-value">{titleFontSize}pt</span>
                        <button className="fs-btn" onClick={() => setTitleFontSize(s => Math.min(48, s + 1))} title="標題字體放大">+</button>
                    </div>
                    <div className="font-size-controls">
                        <span className="fs-label">副標</span>
                        <button className="fs-btn" onClick={() => setSubtitleFontSize(s => Math.max(5, +(s - 0.5).toFixed(1)))} title="副標題字體縮小">−</button>
                        <span className="fs-value">{subtitleFontSize}pt</span>
                        <button className="fs-btn" onClick={() => setSubtitleFontSize(s => Math.min(18, +(s + 0.5).toFixed(1)))} title="副標題字體放大">+</button>
                    </div>

                    <div className="zoom-controls">
                        <svg className="zoom-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input type="range" className="zoom-slider" min="15" max="200" value={zoomPercent}
                            onChange={e => setManualZoom(Number(e.target.value) / 100)} title={`縮放 ${zoomPercent}%`} />
                        <span className="zoom-value">{zoomPercent}%</span>
                        {manualZoom !== null && (
                            <button className="fs-btn" onClick={() => setManualZoom(null)} title="重設為自動縮放">⟲</button>
                        )}
                    </div>

                    {/* Magnifier toggle */}
                    <button
                        className={`btn btn-magnifier ${magnifierOn ? 'active' : ''}`}
                        onClick={() => { setMagnifierOn(v => !v); setMagPos(null); }}
                        title={magnifierOn ? '關閉放大鏡' : '開啟放大鏡'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </button>

                    <button className="btn btn-fullscreen" onClick={handleFullscreen} title={isFullscreen ? '退出全螢幕' : '全螢幕預覽'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isFullscreen ? (
                                <><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
                                    <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></>
                            ) : (
                                <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>
                            )}
                        </svg>
                    </button>

                    {/* Excel export */}
                    <button className="btn btn-export" onClick={handleExcelExport} title="匯出 Excel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                            <line x1="9" y1="13" x2="15" y2="13" /><line x1="12" y1="10" x2="12" y2="16" />
                        </svg>
                        Excel
                    </button>

                    <button className="btn btn-print" onClick={handlePrint} title="列印">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        列印
                    </button>
                </div>
            </div>

            <div
                className={`a4-scroll-area ${isFullscreen ? 'fullscreen-mode' : ''} ${magnifierOn ? 'magnifier-cursor' : ''}`}
                ref={scrollRef}
                onMouseMove={handleMagMove}
                onMouseLeave={handleMagLeave}
            >
                <div className="a4-wrapper" ref={pageRef} style={{ '--a4-scale': scale }}>
                    <div className="a4-page a3-landscape">
                        <div className="a4-header">
                            <h1 className="a4-title" style={{ fontSize: `${titleFontSize}pt` }}>
                                金門縣政府網路電話一覽表(府內)
                            </h1>
                            <p className="a4-info-line" style={{ fontSize: `${subtitleFontSize}pt` }}>
                                縣民服務專線：１９９９（外縣市：0800-318823）　總機：082-318823、0978-253-902　中華電信服務專線：325005 陳小姐 ／ 315056 李先生 ／ 313018 許先生 ／ 客服專線：0800-080-123　{timestamp}
                            </p>
                        </div>
                        <ContactTable />
                        <div className="a4-footer">
                            <span>列印日期：{new Date().toLocaleDateString('zh-TW')}</span>
                        </div>
                    </div>
                </div>

                {/* Red glow on the actual preview at cursor position */}
                {glowStyle && <div className="magnifier-glow" style={glowStyle} />}

                {/* Magnifier lens overlay — offset from cursor */}
                {lensStyle && innerStyle && (
                    <div className="magnifier-lens" style={lensStyle}>
                        <div className="magnifier-content" style={innerStyle}>
                            <div className="a4-wrapper" style={{ '--a4-scale': scale }}>
                                <div className="a4-page a3-landscape">
                                    <div className="a4-header">
                                        <h1 className="a4-title" style={{ fontSize: `${titleFontSize}pt` }}>
                                            金門縣政府網路電話一覽表(府內)
                                        </h1>
                                        <p className="a4-info-line" style={{ fontSize: `${subtitleFontSize}pt` }}>
                                            縣民服務專線：１９９９（外縣市：0800-318823）　總機：082-318823、0978-253-902　中華電信服務專線：325005 陳小姐 ／ 315056 李先生 ／ 313018 許先生 ／ 客服專線：0800-080-123　{timestamp}
                                        </p>
                                    </div>
                                    <ContactTable />
                                    <div className="a4-footer">
                                        <span>列印日期：{new Date().toLocaleDateString('zh-TW')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
