import { useState } from 'react';
import { getTeacherById, getSchedulesByTeacher, deleteSchedule, updateSchedule } from '../utils/storage';
import { analyzeTeacher, getAnalysisSummary } from '../utils/aiEngine';
import { formatDateChinese, STATUS_MAP } from '../utils/helpers';
import AIRecommend from './AIRecommend';

export default function TeacherDetail({ teacherId, onBack, onEdit }) {
  const teacher = getTeacherById(teacherId);
  const [schedules, setSchedules] = useState(getSchedulesByTeacher(teacherId));

  if (!teacher) {
    return (
      <div className="animate-in">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <div className="empty-state">
          <div className="empty-icon">❓</div>
          <h3 className="empty-title">找不到此老師</h3>
        </div>
      </div>
    );
  }

  const recommendations = analyzeTeacher(teacher);
  const summary = getAnalysisSummary(recommendations);
  const initial = teacher.name.charAt(0);

  const handleStatusChange = (scheduleId, newStatus) => {
    updateSchedule(scheduleId, { status: newStatus });
    setSchedules(getSchedulesByTeacher(teacherId));
  };

  const handleDeleteSchedule = (scheduleId) => {
    deleteSchedule(scheduleId);
    setSchedules(getSchedulesByTeacher(teacherId));
  };

  return (
    <div className="animate-in">
      <button className="back-btn" onClick={onBack} id="btn-back">← 返回老師列表</button>

      <div className="detail-header">
        <div className="detail-avatar">{initial}</div>
        <div>
          <h1 className="detail-name">{teacher.name}</h1>
          <div className="detail-contact">
            {teacher.phone && <span>📱 {teacher.phone}</span>}
            {teacher.phone && teacher.email && <span> · </span>}
            {teacher.email && <span>✉️ {teacher.email}</span>}
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => onEdit(teacher)}
          style={{ marginLeft: 'auto' }}
          id="btn-edit-teacher"
        >
          ✏️ 編輯
        </button>
      </div>

      <div className="detail-layout">
        {/* Left Column */}
        <div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 className="card-title" style={{ marginBottom: '20px' }}>📋 基本資訊</h2>

            {teacher.education && (
              <div className="detail-section">
                <div className="detail-section-title">🎓 學歷背景</div>
                <p className="detail-text">{teacher.education}</p>
              </div>
            )}

            {teacher.expertise && (
              <div className="detail-section">
                <div className="detail-section-title">⭐ 專長描述</div>
                <p className="detail-text">{teacher.expertise}</p>
              </div>
            )}

            {teacher.experience && (
              <div className="detail-section">
                <div className="detail-section-title">📝 教學經歷</div>
                <p className="detail-text">{teacher.experience}</p>
              </div>
            )}

            {teacher.note && (
              <div className="detail-section">
                <div className="detail-section-title">💬 備註</div>
                <p className="detail-text">{teacher.note}</p>
              </div>
            )}
          </div>

          {/* Schedules */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📅 代課記錄</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                共 {schedules.length} 筆
              </span>
            </div>

            {schedules.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">📅</div>
                <p className="empty-desc">尚無代課排程記錄</p>
              </div>
            ) : (
              <div className="schedule-list">
                {schedules
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(s => (
                    <div key={s.id} className="schedule-item">
                      <div style={{ flex: 1 }}>
                        <div className="schedule-subject">{s.subject || '未指定科目'}</div>
                        <div className="schedule-info">
                          {formatDateChinese(s.date)}
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
                      <div className="schedule-actions">
                        {s.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleStatusChange(s.id, 'confirmed')}
                              title="確認"
                            >
                              ✅
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleStatusChange(s.id, 'rejected')}
                              title="拒絕"
                            >
                              ❌
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteSchedule(s.id)}
                          title="刪除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - AI */}
        <div>
          <AIRecommend
            recommendations={recommendations}
            summary={summary}
            isLive={false}
          />
        </div>
      </div>
    </div>
  );
}
