import { useState, useMemo } from 'react';
import { getSchedules, getTeachers, addSchedule, deleteSchedule, updateSchedule } from '../utils/storage';
import { getMonthDays, formatDate, formatDateChinese, getTodayStr, STATUS_MAP } from '../utils/helpers';
import ScheduleModal from './ScheduleModal';

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [schedules, setSchedules] = useState(getSchedules());
  const teachers = getTeachers();

  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const todayStr = getTodayStr();

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const goToPrevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  const getSchedulesForDate = (dateStr) => {
    return schedules.filter(s => s.date === dateStr);
  };

  const getTeacherName = (teacherId) => {
    const t = teachers.find(t => t.id === teacherId);
    return t ? t.name : '未知';
  };

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
  };

  const handleAddSchedule = (scheduleData) => {
    addSchedule(scheduleData);
    setSchedules(getSchedules());
    setShowModal(false);
  };

  const handleDeleteSchedule = (id) => {
    deleteSchedule(id);
    setSchedules(getSchedules());
  };

  const handleStatusChange = (id, status) => {
    updateSchedule(id, { status });
    setSchedules(getSchedules());
  };

  const selectedSchedules = selectedDate ? getSchedulesForDate(selectedDate) : [];

  // 節次類型 badge
  const getPeriodTypeBadge = (s) => {
    if (s.periodType === 'fullday') return { label: '整天', cls: 'badge-fullday' };
    if (s.periodType === 'halfday') return { label: '半天', cls: 'badge-halfday' };
    return { label: '單節', cls: 'badge-single' };
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">排程行事曆</h1>
        <p className="page-subtitle">管理代課老師的排程與時間安排</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px', alignItems: 'start' }}>
        {/* Calendar */}
        <div className="calendar-container">
          <div className="calendar-header">
            <h2 className="calendar-title">{year}年 {monthNames[month]}</h2>
            <div className="calendar-nav">
              <button className="calendar-nav-btn" onClick={goToToday} title="今天">
                📍
              </button>
              <button className="calendar-nav-btn" onClick={goToPrevMonth} id="cal-prev">
                ◀
              </button>
              <button className="calendar-nav-btn" onClick={goToNextMonth} id="cal-next">
                ▶
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day, idx) => {
              const dateStr = formatDate(day.date);
              const daySchedules = getSchedulesForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  key={idx}
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDayClick(dateStr)}
                >
                  <span className="calendar-day-number">{day.date.getDate()}</span>
                  {daySchedules.length > 0 && (
                    <div className="calendar-day-dots">
                      {daySchedules.slice(0, 3).map((s, i) => (
                        <span key={i} className={`calendar-dot ${s.status}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h2 className="card-title">
                {selectedDate ? formatDateChinese(selectedDate) : '請選擇日期'}
              </h2>
              {selectedDate && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowModal(true)}
                  id="btn-add-schedule"
                >
                  ➕ 新增
                </button>
              )}
            </div>

            {!selectedDate ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">👈</div>
                <p className="empty-desc">點擊行事曆上的日期來查看或新增排程</p>
              </div>
            ) : selectedSchedules.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-icon">✨</div>
                <p className="empty-desc">此日無排程安排，所有老師皆為空閒</p>
              </div>
            ) : (
              <div className="schedule-list">
                {selectedSchedules.map(s => {
                  const periodBadge = getPeriodTypeBadge(s);
                  return (
                    <div key={s.id} className="schedule-item-enhanced">
                      {/* 上方：請假老師 → 代課老師 */}
                      <div className="schedule-item-top">
                        <div className="schedule-flow">
                          <span className="schedule-leave-teacher">
                            🚫 {s.leaveTeacherName || '未指定'}
                          </span>
                          <span className="schedule-arrow">→</span>
                          <span className="schedule-sub-teacher">
                            👤 {getTeacherName(s.teacherId)}
                          </span>
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

                      {/* 中間：科目 + 節次類型 + 班級 */}
                      <div className="schedule-item-detail">
                        <span className="schedule-detail-tag schedule-subject-tag">
                          📚 {s.subject || '未指定'}
                        </span>
                        <span className={`schedule-detail-tag ${periodBadge.cls}`}>
                          {periodBadge.label}
                        </span>
                        {s.className && (
                          <span className="schedule-detail-tag schedule-class-tag">
                            🏫 {s.className}
                          </span>
                        )}
                      </div>

                      {/* 節次顯示 */}
                      <div className="schedule-periods-display">
                        {s.periodType === 'single' ? (
                          <span className="period-pill active-period">第{s.period}節</span>
                        ) : (
                          (s.classPeriods || []).map(p => (
                            <span key={p} className="period-pill active-period">第{p}節</span>
                          ))
                        )}
                      </div>

                      {/* 備註 */}
                      {s.note && (
                        <div className="schedule-note-line">
                          💬 {s.note}
                        </div>
                      )}

                      {/* 操作按鈕 */}
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
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '12px', fontSize: '14px' }}>圖例說明</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span className="calendar-dot pending" /> 待確認
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span className="calendar-dot confirmed" /> 已確認
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span className="calendar-dot busy" /> 已拒絕
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && selectedDate && (
        <ScheduleModal
          date={selectedDate}
          teachers={teachers}
          onSave={handleAddSchedule}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
