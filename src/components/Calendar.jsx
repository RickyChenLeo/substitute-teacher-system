import { useState, useMemo } from 'react';
import { useSchedules, useTeachers, addSchedule, deleteSchedule, updateSchedule, initializeFirebaseSync } from '../utils/storage';
import { 
  getMonthDays, getWeekDays, formatDate, formatDateChinese, getTodayStr, 
  STATUS_MAP, PERIOD_LABELS, isSameDay, getWeekRangeDisplay 
} from '../utils/helpers';
import ScheduleModal from './ScheduleModal';

export default function Calendar() {
  const today = new Date();
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [baseDate, setBaseDate] = useState(today); // 當前檢視的核心日期
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const schedules = useSchedules();
  const teachers = useTeachers();
  const todayStr = getTodayStr();

  // 導覽功能
  const goToPrev = () => {
    const next = new Date(baseDate);
    if (viewMode === 'month') next.setMonth(baseDate.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(baseDate.getDate() - 7);
    else next.setDate(baseDate.getDate() - 1);
    setBaseDate(next);
  };

  const goToNext = () => {
    const next = new Date(baseDate);
    if (viewMode === 'month') next.setMonth(baseDate.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(baseDate.getDate() + 7);
    else next.setDate(baseDate.getDate() + 1);
    setBaseDate(next);
  };

  const goToToday = () => {
    setBaseDate(today);
    setSelectedDate(todayStr);
  };

  const getSchedulesForDate = (dateStr) => {
    return schedules.filter(s => s.date === dateStr);
  };

  const getTeacherName = (tId) => {
    const found = teachers.find(t => t.id === tId);
    return found ? found.name : '尚未指派';
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleSaveSchedule = async (scheduleData) => {
    try {
      if (Array.isArray(scheduleData)) {
        if (editingSchedule) await deleteSchedule(editingSchedule.id);
        for (const d of scheduleData) await addSchedule(d);
      } else {
        if (scheduleData.id || editingSchedule?.id) {
          const targetId = scheduleData.id || editingSchedule?.id;
          await updateSchedule(targetId, scheduleData);
        } else {
          await addSchedule(scheduleData);
        }
      }
      setShowModal(false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('儲存失敗，請檢查網路連線');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!id || !window.confirm('確定要刪除嗎？')) return;
    try { await deleteSchedule(id); }
    catch (error) { alert('刪除失敗'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await updateSchedule(id, { status }); }
    catch (error) { alert('更新失敗'); }
  };

  const handleRefresh = () => {
    if (typeof initializeFirebaseSync === 'function') initializeFirebaseSync();
  };

  // 月檢視渲染
  function renderMonthView() {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const days = getMonthDays(year, month);
    
    return (
      <div className="calendar-grid-container">
        <div className="calendar-weekdays">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="calendar-weekday">{d}</div>)}
        </div>
        <div className="calendar-grid">
          {days.map((day, idx) => {
            const dateStr = formatDate(day.date);
            const daySchedules = getSchedulesForDate(dateStr);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <div
                key={idx}
                className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <span className="calendar-day-number">{day.date.getDate()}</span>
                <div className="calendar-item-tags">
                  {daySchedules.slice(0, 4).map(s => (
                    <div key={s.id} className={`calendar-tag-item ${s.status}`}>
                      {PERIOD_LABELS[s.classPeriods[0] - 1]?.slice(0, 1)} {getTeacherName(s.teacherId).slice(0, 2)}
                    </div>
                  ))}
                  {daySchedules.length > 4 && <div className="calendar-tag-item" style={{opacity:0.6}}>+{daySchedules.length - 4}...</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 週檢視渲染 (7x9 功課表)
  function renderWeekView() {
    const weekDays = getWeekDays(baseDate);
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
      <div className="week-grid-wrapper animate-in">
        <div className="week-grid">
          {/* Header Row */}
          <div className="week-header-cell">節次</div>
          {weekDays.map(d => {
            const dateStr = formatDate(d);
            return (
              <div 
                key={dateStr} 
                className={`week-header-cell ${dateStr === todayStr ? 'today' : ''}`}
                onClick={() => { setBaseDate(d); setViewMode('day'); setSelectedDate(dateStr); }}
                style={{ cursor: 'pointer' }}
              >
                <div className="week-header-date">{d.getDate()}</div>
                <div className="week-header-label">{['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}</div>
              </div>
            );
          })}

          {/* Time Rows */}
          {periods.map(p => (
            <div key={p} style={{ display: 'contents' }}>
              <div className="week-time-label">{PERIOD_LABELS[p-1]}</div>
              {weekDays.map(d => {
                const dateStr = formatDate(d);
                const slotItems = getSchedulesForDate(dateStr).filter(s => s.classPeriods.includes(p));
                return (
                  <div 
                    key={`${dateStr}-${p}`} 
                    className={`week-slot ${dateStr === todayStr ? 'today' : ''}`}
                    onClick={() => { setSelectedDate(dateStr); handleDayClick(dateStr); }}
                  >
                    {slotItems.map(s => (
                      <div key={s.id} className={`week-slot-item ${s.status}`} onClick={() => handleEdit(s)}>
                        <span className="week-teacher-name">{getTeacherName(s.teacherId)}</span>
                        <span style={{opacity: 0.7, fontSize: '10px'}}>{s.leaveTeacherName} (代)</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </useMemo>
          ))}
        </div>
      </div>
    );
  }

  // 日檢視渲染
  function renderDayView() {
    const dateStr = formatDate(baseDate);
    const daySchedules = getSchedulesForDate(dateStr);
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
      <div className="day-view-container animate-in">
        <div className="day-timeline">
          {periods.map(p => {
            const slotItems = daySchedules.filter(s => s.classPeriods.includes(p));
            return (
              <div key={p} className="day-period-card">
                <div className="day-period-label">{PERIOD_LABELS[p-1]}</div>
                <div className="day-period-content">
                  {slotItems.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>尚無排程</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {slotItems.map(s => (
                        <div key={s.id} className="schedule-item-compact" style={{ minWidth: '200px', flex: 1 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{fontWeight: 600}}>{getTeacherName(s.teacherId)} <span style={{fontSize: '11px', opacity: 0.5}}>代</span> {s.leaveTeacherName}</span>
                             <div style={{ display: 'flex', gap: '4px' }}>
                               <button className="btn-icon" onClick={() => handleEdit(s)}>✏️</button>
                               <button className="btn-icon" onClick={() => handleDeleteSchedule(s.id)}>🗑️</button>
                             </div>
                           </div>
                           <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                             <span className={`compact-status ${s.status}`}>{STATUS_MAP[s.status]?.label}</span>
                             <span style={{opacity: 0.7}}>{s.subject || '無科目'} | {s.className || '無班級'}</span>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 右側麵板 (保留現有 Side Panel 功能但在週/日檢視下視情況縮減)
  const selectedSchedules = getSchedulesForDate(selectedDate);
  const groupedSchedules = useMemo(() => {
    const groups = {};
    selectedSchedules.forEach(s => {
      const key = `${s.leaveTeacherName}-${s.teacherId}-${s.status}`;
      if (!groups[key]) groups[key] = { id: key, leaveTeacherName: s.leaveTeacherName, teacherId: s.teacherId, status: s.status, items: [] };
      groups[key].items.push(s);
    });
    return Object.values(groups);
  }, [selectedSchedules]);

  const handleDayClick = (dStr) => {
    setSelectedDate(dStr);
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  const getPeriodTypeBadge = (s) => {
    if (s.periodType === 'fullday') return { label: '整天', cls: 'badge-fullday' };
    if (s.periodType === 'halfday') return { label: '半天', cls: 'badge-halfday' };
    return { label: '單節', cls: 'badge-single' };
  };

  return (
    <div className="calendar-page animate-in">
      {/* Header With View Context */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">
              {viewMode === 'month' && `${baseDate.getFullYear()}年 ${baseDate.getMonth() + 1}月`}
              {viewMode === 'week' && getWeekRangeDisplay(baseDate)}
              {viewMode === 'day' && formatDateChinese(formatDate(baseDate))}
            </h1>
            <p className="page-subtitle">直觀掌控代課人力分佈與節次安排</p>
          </div>
          
          <div className="view-switcher">
            <button className={`view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>月檢排程</button>
            <button className={`view-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>週功課表</button>
            <button className={`view-btn ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>日檢詳情</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'month' ? '1fr 380px' : '1fr', gap: '24px' }}>
        <div className="calendar-view-container">
          {/* Navigation Controls */}
          <div className="calendar-header" style={{ border: 'none', background: 'transparent', padding: '0 0 16px 0' }}>
             <div className="calendar-nav" style={{ background: 'var(--bg-glass)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <button className="calendar-nav-btn" onClick={goToPrev}>◀</button>
              <button className="calendar-nav-btn" onClick={goToToday} style={{ fontSize: '13px', fontWeight: 600 }}>今日</button>
              <button className="calendar-nav-btn" onClick={goToNext}>▶</button>
            </div>
            <button className="btn btn-primary" onClick={handleAddNew}>➕ 新增排程</button>
          </div>

          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </div>

        {/* 只有月檢視顯示側邊欄，週/日檢視已在網格中包含足夠資訊 */}
        {viewMode === 'month' && (
          <div className="calendar-sidebar">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">{formatDateChinese(selectedDate)} 的排程</h2>
                <button className="btn-icon" onClick={handleRefresh}>🔄</button>
              </div>
              
              {groupedSchedules.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                   <p className="empty-desc">此日無特殊排程</p>
                </div>
              ) : (
                <div className="schedule-list">
                  {groupedSchedules.map(group => (
                    <div key={group.id} className="schedule-item-compact">
                       <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span className={`compact-status ${group.status}`}>{STATUS_MAP[group.status]?.label}</span>
                         <span style={{fontWeight: 600}}>{group.leaveTeacherName} → {getTeacherName(group.teacherId)}</span>
                       </div>
                       {group.items.map(s => (
                         <div key={s.id} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                           <span>{getPeriodTypeBadge(s).label} ({s.classPeriods.map(p => PERIOD_LABELS[p-1]).join(',')})</span>
                           <div style={{ display: 'flex', gap: '6px' }}>
                             <button className="link-btn" onClick={() => handleEdit(s)}>編</button>
                             <button className="link-btn" onClick={() => handleDeleteSchedule(s.id)}>刪</button>
                           </div>
                         </div>
                       ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="card" style={{ marginTop: '16px' }}>
               <h3 className="card-title" style={{ fontSize: '14px', marginBottom: '12px' }}>圖例說明</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="calendar-dot pending" /> 待確認 (橘)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="calendar-dot confirmed" /> 已確認 (綠)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span className="calendar-dot unassigned" /> 待分派 (藍)</div>
               </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
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
