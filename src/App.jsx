import { useState, useCallback, useRef, useEffect } from 'react';
import { ContactProvider } from './context/ContactContext';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import './App.css';

export default function App() {
  const [leftWidth, setLeftWidth] = useState(55); // percentage
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!dragging.current) return;
      const pct = (e.clientX / window.innerWidth) * 100;
      // Clamp between 25% and 80%
      setLeftWidth(Math.min(80, Math.max(25, pct)));
    }
    function handleMouseUp() {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <ContactProvider>
      <div
        className="app-layout"
        style={{ gridTemplateColumns: `${leftWidth}% 0px 1fr` }}
      >
        <LeftPanel />
        <div
          className="resize-handle"
          onMouseDown={handleMouseDown}
        >
          <div className="resize-handle-line" />
        </div>
        <RightPanel />
      </div>
    </ContactProvider>
  );
}
