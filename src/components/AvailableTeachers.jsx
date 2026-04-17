import { useState } from 'react';
import { useTeachers, useSchedules, getAvailableTeachers } from '../utils/storage';
import { getTodayStr, formatDateChinese, STATUS_MAP } from '../utils/helpers';

export default function AvailableTeachers({ onNavigate, onViewTeacher }) {
  const [queryDate, setQueryDate] = useState(getTodayStr());
  const allTeachers = useTeachers();
  const allSchedules = useSchedules();
  const available = getAvailableTeachers(queryDate);
  const dateSchedules = allSchedules.filter(s => s.date === queryDate);

  const getTeacherName = (id) => {
    const t = allTeachers.find(t => t.id === id);
    return t ? t.name : '未知';
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">查詢空閒老師</h1>
        <p className="page-subtitle">選擇日期，查看哪些老師當天可以代課</p>
      </div>

      {/* Date Picker */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label className="form-label">選擇查詢日期</label>
            <input
              className="form-input"
              type="date"
              value={queryDate}
              onChange={e => setQueryDate(e.target.value)}
              id="input-query-date"
            />
          </div>
          <div style={{ marginTop: '24px' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-accent)'
            }}>
              📅 {formatDateChinese(queryDate)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Available Teachers */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">✅ 空閒老師</h2>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {available.length} 位
            </span>
          </div>

          {available.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">😅</div>
              <p className="empty-desc">
                {allTeachers.length === 0
                  ? '尚未登記任何老師'
                  : '此日所有老師都已有排程'}
              </p>
            </div>
          ) : (
            <div className="available-list">
              {available.map(teacher => {
                const initial = teacher.name.charAt(0);
                const subjects = (teacher.recommendedSubjects || [])
                  .filter(s => s.confidence === 'HIGH' || s.confidence === 'MEDIUM')
                  .slice(0, 3);

                return (
                  <div
                    key={teacher.id}
                    className="available-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewTeacher(teacher.id)}
                  >
                    <div className="teacher-avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
                        {teacher.name}
                      </div>
                      {subjects.length > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {subjects.map(s => s.icon + s.name).join(' ')}
                        </div>
                      )}
                    </div>
                    <span className="available-badge">空閒</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Busy Teachers */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📅 已有排程</h2>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--warning)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {dateSchedules.length} 筆
            </span>
          </div>

          {dateSchedules.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-icon">📭</div>
              <p className="empty-desc">此日無任何排程</p>
            </div>
          ) : (
            <div className="schedule-list">
              {dateSchedules.map(s => (
                <div key={s.id} className="schedule-item">
                  <div style={{ flex: 1 }}>
                    <div className="schedule-subject">{getTeacherName(s.teacherId)}</div>
                    <div className="schedule-info">
                      {s.subject || '未指定科目'}
                      {s.period && ` · 第${s.period}節`}
                      {s.className && ` · ${s.className}`}
                    </div>
                  </div>
                  <span
                    className="schedule-status"
                    style={{
                      background: STATUS_MAP[s.status]?.bg,
                      color: STATUS_MAP[s.status]?.color
                    }}
                  >
                    {STATUS_MAP[s.status]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
