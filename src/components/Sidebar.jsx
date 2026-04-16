import { useRef } from 'react';
import { exportAllData, importAllData } from '../utils/storage';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: '儀表板' },
  { id: 'teachers', icon: '👥', label: '老師管理' },
  { id: 'add-teacher', icon: '➕', label: '登記老師' },
  { id: 'batch-import', icon: '📥', label: '批量匯入' },
  { id: 'calendar', icon: '📅', label: '排程行事曆' },
  { id: 'available', icon: '🔍', label: '查詢空閒' },
];

export default function Sidebar({ currentPage, onNavigate, teacherCount, scheduleCount, sidebarOpen, onCloseSidebar, onDataChange }) {
  const fileInputRef = useRef(null);

  const handleExport = () => {
    exportAllData();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mode = confirm(
      '請選擇匯入方式：\n\n' +
      '按「確定」→ 取代模式（覆蓋現有資料）\n' +
      '按「取消」→ 合併模式（保留現有 + 加入新資料）'
    ) ? 'replace' : 'merge';

    if (mode === 'replace') {
      const confirmReplace = confirm('⚠️ 取代模式將覆蓋所有現有資料，確定要繼續嗎？');
      if (!confirmReplace) {
        e.target.value = '';
        return;
      }
    }

    try {
      const result = await importAllData(file, mode);
      alert(`✅ 匯入成功！\n\n老師：${result.teachers} 筆\n排程：${result.schedules} 筆`);
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(`❌ 匯入失敗：${err.message}`);
    }

    e.target.value = '';
  };

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={onCloseSidebar} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">📋</div>
            <div>
              <div className="sidebar-logo-text">代課老師管理</div>
              <div className="sidebar-logo-sub">Substitute Teacher System</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.id);
                onCloseSidebar();
              }}
              id={`nav-${item.id}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 資料備份區 */}
        <div className="sidebar-backup">
          <div className="sidebar-backup-title">💾 資料備份</div>
          <div className="sidebar-backup-btns">
            <button
              className="backup-btn backup-export"
              onClick={handleExport}
              title="匯出備份檔案"
              id="btn-export"
            >
              📤 匯出
            </button>
            <button
              className="backup-btn backup-import"
              onClick={handleImportClick}
              title="從備份檔匯入"
              id="btn-import"
            >
              📥 匯入
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-stats">
            <div className="stat-item">
              <div className="stat-value">{teacherCount}</div>
              <div className="stat-label">老師</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{scheduleCount}</div>
              <div className="stat-label">排程</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
