import { useState, useMemo } from 'react';
import { useSchedules, useTeachers, addSchedule, deleteSchedule, updateSchedule } from '../utils/storage';
import { getMonthDays, formatDate, formatDateChinese, getTodayStr, STATUS_MAP } from '../utils/helpers';
import ScheduleModal from './ScheduleModal';

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const schedules = useSchedules();
  const teachers = useTeachers();

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

  const handleAddNew = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleSaveSchedule = (scheduleData) => {
    if (Array.isArray(scheduleData)) {
      if (editingSchedule) {
        deleteSchedule(editingSchedule.id);
      }
      scheduleData.forEach(d => addSchedule(d));
    } else {
      if (scheduleData.id) {
        updateSchedule(scheduleData.id, scheduleData);
      } else {
        addSchedule(scheduleData);
      }
    }
    setShowModal(false);
  };

  const handleDeleteSchedule = (id) => {
    deleteSchedule(id);
  };

  const handleStatusChange = (id, status) => {
    updateSchedule(id, { status });
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
                今
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
                  onClick={handleAddNew}
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
            <div className="empty-state" style={{ padding: '64px 24px' }}>
                <p className="empty-desc">此日無排程安排，所有老師皆為空閒</p>
              </div>
            ) : (
              <div className="schedule-list">
                {selectedSchedules.map(s => {
                  const periodBadge = getPeriodTypeBadge(s);
                  return (
                    <div key={s.id} className="schedule-item-compact">
                      <div className="compact-main" style={{ flex: 1 }}>
                        <div className="compact-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className={`compact-status ${s.status}`} style={{
                            background: STATUS_MAP[s.status]?.bg,
                            color: STATUS_MAP[s.status]?.color,
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                          }}>
                            {STATUS_MAP[s.status]?.label}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            <span style={{opacity: 0.6}}>{s.leaveTeacherName || '未填'}</span> <span style={{margin:'0 4px', opacity:0.3}}>→</span> 
                            <span style={{color: s.status === 'unassigned' ? 'var(--text-muted)' : 'var(--primary-400)'}}>
                              {s.status === 'unassigned' ? '尚未指派' : getTeacherName(s.teacherId)}
                            </span>
                          </span>
                        </div>
                        <div className="compact-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          {s.subject && <span>{s.subject}</span>}
                          {s.subject && <span style={{opacity: 0.3}}>|</span>}
                          <span>{periodBadge.label} ({(s.classPeriods || []).map(p => `第${p}節`).join(', ')})</span>
                          {s.className && (
                            <>
                              <span style={{opacity: 0.3}}>|</span>
                              <span>{s.className}</span>
                            </>
                          )}
                        </div>
                        {s.note && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', background: 'var(--bg-glass)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            {s.note}
                          </div>
                        )}
                      </div>

                      <div className="compact-actions" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '12px' }}>
                        {s.status === 'unassigned' && (
                          <button
                            className="btn-icon"
                            style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', width: '100%' }}
                            onClick={() => handleEdit(s)}
                            title="指派代課老師"
                          >🔎</button>
                        )}
                        {s.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn-icon"
                              style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}
                              onClick={() => handleStatusChange(s.id, 'confirmed')}
                              title="確認"
                            >✅</button>
                            <button
                              className="btn-icon"
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
                              onClick={() => handleStatusChange(s.id, 'rejected')}
                              title="拒絕"
                            >❌</button>
                          </div>
                        )}
                        <button
                          className="btn-icon"
                          style={{ background: 'var(--bg-glass)', color: 'var(--text-muted)', width: s.status !== 'pending' ? '100%' : undefined }}
                          onClick={() => handleDeleteSchedule(s.id)}
                          title="刪除"
                        >🗑️</button>
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
          editSchedule={editingSchedule}
          onSave={handleSaveSchedule}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
