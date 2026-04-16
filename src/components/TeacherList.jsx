import { useState } from 'react';
import { getTeachers, deleteTeacher } from '../utils/storage';
import TeacherCard from './TeacherCard';

export default function TeacherList({ onNavigate, onViewTeacher }) {
  const [search, setSearch] = useState('');
  const [teachers, setTeachers] = useState(getTeachers());
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    setTeachers(getTeachers());
    setDeleteConfirm(null);
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
        <div className="teacher-grid stagger-in">
          {filtered.map(teacher => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onView={() => onViewTeacher(teacher.id)}
              onEdit={() => onNavigate('edit-teacher', teacher)}
              onDelete={() => setDeleteConfirm(teacher)}
            />
          ))}
        </div>
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
    </div>
  );
}
