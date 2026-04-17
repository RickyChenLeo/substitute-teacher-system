export default function TeacherCard({ teacher, onView, onEdit, onDelete, isSelected, onToggleSelect }) {
  const initial = teacher.name ? teacher.name.charAt(0) : '?';
  const subjects = teacher.recommendedSubjects || [];
  const topSubjects = subjects.filter(s => s.confidence === 'HIGH' || s.confidence === 'MEDIUM').slice(0, 4);

  return (
    <div className={`teacher-card ${isSelected ? 'selected' : ''}`} onClick={onToggleSelect} id={`teacher-card-${teacher.id}`} style={{ position: 'relative', border: isSelected ? '2px solid var(--primary-500)' : undefined }}>
      <div className="teacher-card-gradient" />
      <div className="teacher-card-body">
        <div className="teacher-card-header">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={e => e.stopPropagation()}
            style={{ width: '20px', height: '20px', cursor: 'pointer', marginRight: '8px' }}
          />
          <div className="teacher-avatar">{initial}</div>
          <div>
            <div className="teacher-name">{teacher.name}</div>
            {teacher.phone && <div className="teacher-phone">{teacher.phone}</div>}
          </div>
        </div>

        {teacher.education && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {teacher.education.length > 40 ? teacher.education.substring(0, 40) + '...' : teacher.education}
          </div>
        )}

        {topSubjects.length > 0 && (
          <div className="teacher-tags">
            {topSubjects.map(s => (
              <span key={s.id} className="tag tag-subject">
                {s.icon} {s.name}
              </span>
            ))}
            {subjects.length > topSubjects.length && (
              <span className="tag" style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
                +{subjects.length - topSubjects.length}
              </span>
            )}
          </div>
        )}

        <div className="teacher-card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm btn-secondary" onClick={onView}>
            詳情
          </button>
          <button className="btn btn-sm btn-secondary" onClick={onEdit}>
            編輯
          </button>
          <button className="btn btn-sm btn-danger" onClick={onDelete}>
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}
