import { useState } from 'react';
import { useTeachers, deleteTeacher } from '../utils/storage';
import TeacherCard from './TeacherCard';

export default function TeacherList({ onNavigate, onViewTeacher }) {
  const [search, setSearch] = useState('');
  const teachers = useTeachers();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const filtered = teachers.filter(t => {
    const term = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      (t.education || '').toLowerCase().includes(term) ||
      (t.expertise || '').toLowerCase().includes(term) ||
      (t.phone || '').includes(term)
    );
  });

  const handleDelete = (id) => {
    deleteTeacher(id);
    setDeleteConfirm(null);
  };

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteTeacher(id));
    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">老師管理</h1>
          <p className="page-subtitle">共 {teachers.length} 位代課老師</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('add-teacher')} id="btn-add-teacher">
          ➕ 登記老師
        </button>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="搜尋老師姓名、學歷、專長..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="search-teachers"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3 className="empty-title">
            {teachers.length === 0 ? '尚未登記任何老師' : '找不到符合條件的老師'}
          </h3>
          <p className="empty-desc">
            {teachers.length === 0
              ? '點擊上方按鈕開始登記代課老師'
              : '嘗試不同的搜尋條件'}
          </p>
          {teachers.length === 0 && (
            <button className="btn btn-primary" onClick={() => onNavigate('add-teacher')}>
              ➕ 登記第一位老師
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: 'var(--bg-glass)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
              <input 
                type="checkbox" 
                checked={filtered.length > 0 && selectedIds.size === filtered.length}
                onChange={handleSelectAll}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              全選 ({selectedIds.size} / {filtered.length})
            </label>
            
            {selectedIds.size > 0 && (
              <button className="btn btn-danger btn-sm" onClick={() => setBulkDeleteConfirm(true)}>
                🗑️ 刪除已選 ({selectedIds.size})
              </button>
            )}
          </div>
          <div className="teacher-grid stagger-in">
            {filtered.map(teacher => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                isSelected={selectedIds.has(teacher.id)}
                onToggleSelect={(e) => handleToggleSelect(teacher.id, e)}
                onView={() => onViewTeacher(teacher.id)}
                onEdit={() => onNavigate('edit-teacher', teacher)}
                onDelete={() => setDeleteConfirm(teacher)}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ 確認刪除</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="confirm-message">
                確定要刪除<strong> {deleteConfirm.name} </strong>的資料嗎？<br />
                此操作將同時刪除該老師的所有排程記錄，且無法復原。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)} id="btn-confirm-delete">
                🗑️ 確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {bulkDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setBulkDeleteConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ 確認批量刪除</h3>
              <button className="modal-close" onClick={() => setBulkDeleteConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="confirm-message">
                確定要刪除已選擇的<strong> {selectedIds.size} </strong>位老師嗎？<br />
                此操作將同時刪除這些老師的所有排程記錄，且無法復原。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBulkDeleteConfirm(false)}>取消</button>
              <button className="btn btn-danger" onClick={handleBulkDelete}>
                🗑️ 確認刪除全部
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
