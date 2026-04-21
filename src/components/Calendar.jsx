import { useState, useMemo } from 'react';
import { useSchedules, useTeachers, addSchedule, deleteSchedule, updateSchedule, initializeFirebaseSync, getSchedulesByDate } from '../utils/storage';
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
  const [selectedIds, setSelectedIds] = useState([]); // 被選取的排程 ID
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
    setSelectedIds([]); // 切換時清空選取
  };

  const handleQuickBook = (teacherId) => {
    setEditingSchedule({ teacherId, date: selectedDate });
    setShowModal(true);
  };

  const goToNext = () => {
    const next = new Date(baseDate);
    if (viewMode === 'month') next.setMonth(baseDate.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(baseDate.getDate() + 7);
    else next.setDate(baseDate.getDate() + 1);
    setBaseDate(next);
    setSelectedIds([]); // 切換時清空選取
  };

  const goToToday = () => {
    setBaseDate(today);
    setSelectedDate(todayStr);
    setSelectedIds([]);
  };

  // 勾選邏輯
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectGroup = (items) => {
    const itemIds = items.map(s => s.id);
    const allSelected = itemIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  // 批次處理
  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await updateSchedule(id, { status });
      }
      setSelectedIds([]);
    } catch (e) {
      console.error('Bulk update failed:', e);
      alert('批次更新失敗');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !window.confirm(`確定要刪除這 ${selectedIds.length} 筆排程嗎？`)) return;
    try {
      for (const id of selectedIds) {
        await deleteSchedule(id);
      }
      setSelectedIds([]);
    } catch (e) {
      console.error('Bulk delete failed:', e);
      alert('批次刪除失敗');
    }
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

  const getPeriodTypeBadge = (s) => {
    if (s.periodType === 'fullday') return { label: '整天', cls: 'badge-fullday' };
    if (s.periodType === 'halfday') return { label: '半天', cls: 'badge-halfday' };
    return { label: '單節', cls: 'badge-single' };
  };

  const handleDayClick = (dStr) => {
    setSelectedDate(dStr);
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  // 計算當日老師可用性 (9 節課狀態)
  const availabilityStats = useMemo(() => {
    const daySchedules = getSchedulesByDate(selectedDate).filter(s => s.status !== 'rejected');
    
    return teachers.map(teacher => {
      const busyPeriods = new Set();
      let hasUnconfirmedFullDay = false;
      let hasUnconfirmedHalfDay = false;

      daySchedules.forEach(s => {
        if (s.teacherId === teacher.id) {
          if (s.classPeriods && s.classPeriods.length > 0) {
            s.classPeriods.forEach(p => busyPeriods.add(p));
          } else {
            if (s.periodType === 'fullday') hasUnconfirmedFullDay = true;
            if (s.periodType === 'halfday') hasUnconfirmedHalfDay = true;
          }
        }
      });
      
      const periodsStatus = [];
      let freeCount = 0;
      for (let p = 1; p <= 9; p++) {
        const isBusy = busyPeriods.has(p);
        let status = 'is-free';
        if (isBusy) {
          status = 'is-busy';
        } else if (hasUnconfirmedFullDay || hasUnconfirmedHalfDay) {
          status = 'is-unconfirmed';
        } else {
          freeCount++;
        }
        periodsStatus.push(status);
      }
      
      let summaryText = `${freeCount}/9 空`;
      if (hasUnconfirmedFullDay) summaryText = '整天未排';
      else if (hasUnconfirmedHalfDay) summaryText = '半天未排';

      let sortScore = freeCount;
      if (hasUnconfirmedFullDay) sortScore = -10;
      if (hasUnconfirmedHalfDay) sortScore = -5;

      return {
        id: teacher.id,
        name: teacher.name,
        freeCount,
        sortScore,
        summaryText,
        periodsStatus // ['is-busy', 'is-free', 'is-unconfirmed', ...]
      };
    }).sort((a, b) => b.sortScore - a.sortScore);
  }, [selectedDate, schedules, teachers]);

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
                  {(() => {
                    // 以老師為單位進行分組顯示，節省空間
                    const teacherGroups = {};
                    daySchedules.forEach(s => {
                      const name = getTeacherName(s.teacherId);
                      if (!teacherGroups[name]) teacherGroups[name] = { status: s.status, periods: [] };
                      teacherGroups[name].periods.push(...s.classPeriods);
                    });
                    
                    const groupEntries = Object.entries(teacherGroups);
                    // 建立縮寫映射：1->導, 2->1, 3->2, 4->3, 5->4, 6->午, 7->5, 8->6, 9->7
                    const getShortPeriod = (p) => {
                      if (p === 1) return '導';
                      if (p === 6) return '午';
                      if (p >= 2 && p <= 5) return p - 1;
                      if (p >= 7 && p <= 9) return p - 2;
                      return p;
                    };

                    return (
                      <>
                        {groupEntries.slice(0, 2).map(([name, data]) => (
                          <div key={name} className={`calendar-tag-item ${data.status}`} style={{ fontSize: '10px' }}>
                            {name} ({[...new Set(data.periods)].sort((a,b)=>a-b).map(getShortPeriod).join(',')})
                          </div>
                        ))}
                        {groupEntries.length > 2 && (
                          <div className="calendar-tag-item" style={{ opacity: 0.5, fontSize: '9px', textAlign: 'center' }}>
                            + 還有 {groupEntries.length - 2} 位
                          </div>
                        )}
                      </>
                    );
                  })()}
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
                      <div key={s.id} className={`week-slot-item ${s.status}`} style={{ position: 'relative' }}>
                        <div onClick={() => handleEdit(s)}>
                          <span className="week-teacher-name">{getTeacherName(s.teacherId)}</span>
                          <span style={{opacity: 0.7, fontSize: '10px'}}>{s.leaveTeacherName} (代)</span>
                        </div>
                        <button 
                          className="btn-icon" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(s.id); }}
                          style={{ position: 'absolute', top: '2px', right: '2px', padding: '2px', fontSize: '10px', background: 'rgba(0,0,0,0.2)' }}
                          title="刪除"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
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

  // 右側麵板
  const selectedSchedules = getSchedulesForDate(selectedDate);
  const groupedSchedules = useMemo(() => {
    const groups = {};
    selectedSchedules.forEach(s => {
      const key = `${s.leaveTeacherName}-${s.teacherId}-${s.status}`;
      if (!groups[key]) groups[key] = { id: key, leaveTeacherName: s.leaveTeacherName, teacherId: s.teacherId, status: s.status, items: [] };
      groups[key].items.push(s);
    });
    
    // 對每個分組內的項目按節次排序
    const sortedGroups = Object.values(groups).map(group => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        const aPeriod = a.classPeriods?.[0] || 0;
        const bPeriod = b.classPeriods?.[0] || 0;
        return aPeriod - bPeriod;
      })
    }));

    // 對分組本身也按最早節次排序
    return sortedGroups.sort((a, b) => {
      const aMin = Math.min(...(a.items.flatMap(i => i.classPeriods || [99])));
      const bMin = Math.min(...(b.items.flatMap(i => i.classPeriods || [99])));
      return aMin - bMin;
    });
  }, [selectedSchedules]);

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

        {/* 只有月檢視顯示側邊欄 */}
        {viewMode === 'month' && (
          <div className="calendar-sidebar">
            {/* 批次操作工具列 */}
            {selectedIds.length > 0 && (
              <div className="bulk-actions-bar">
                <span className="bulk-count">已選擇 {selectedIds.length} 筆</span>
                <div className="bulk-btns">
                  <button className="btn-icon" onClick={() => handleBulkStatus('confirmed')} title="全部確認" style={{background:'#fff', color:'var(--success)'}}>✅</button>
                  <button className="btn-icon" onClick={() => handleBulkStatus('rejected')} title="全部拒絕" style={{background:'#fff', color:'var(--danger)'}}>❌</button>
                  <button className="btn-icon" onClick={handleBulkDelete} title="全部刪除" style={{background:'#fff', color:'var(--text-muted)'}}>🗑️</button>
                  <button className="btn-icon" onClick={() => setSelectedIds([])} title="取消選擇" style={{background:'transparent', color:'#fff', border:'1px solid #fff'}}>✕</button>
                </div>
              </div>
            )}

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
                       <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span className={`compact-status ${group.status}`}>{STATUS_MAP[group.status]?.label}</span>
                           <span style={{fontWeight: 600}}>{group.leaveTeacherName} → {getTeacherName(group.teacherId)}</span>
                         </div>
                         <label className="checkbox-group-label" onClick={(e) => { e.preventDefault(); toggleSelectGroup(group.items); }}>
                           <input 
                             type="checkbox" 
                             className="custom-checkbox" 
                             checked={group.items.length > 0 && group.items.every(s => selectedIds.includes(s.id))}
                             readOnly
                           />
                           全選
                         </label>
                       </div>
                       {group.items.map(s => (
                         <div key={s.id} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                           <input 
                              type="checkbox" 
                              className="custom-checkbox" 
                              checked={selectedIds.includes(s.id)}
                              onChange={() => toggleSelect(s.id)}
                           />
                           <span style={{ flex: 1 }}>{getPeriodTypeBadge(s).label} ({s.classPeriods.map(p => PERIOD_LABELS[p-1]).join(',')})</span>
                           <div style={{ display: 'flex', gap: '4px' }}>
                             {s.status === 'pending' && (
                               <>
                                 <button className="btn-icon" onClick={() => handleStatusChange(s.id, 'confirmed')} title="確認">✅</button>
                                 <button className="btn-icon" onClick={() => handleStatusChange(s.id, 'rejected')} title="拒絕">❌</button>
                               </>
                             )}
                             <button className="btn-icon" onClick={() => handleEdit(s)} title="編輯">✏️</button>
                             <button className="btn-icon" onClick={() => handleDeleteSchedule(s.id)} title="刪除">🗑️</button>
                           </div>
                         </div>
                       ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 當日推薦候選人 (可用性視覺化) */}
            <div className="card availability-card">
               <div className="card-header">
                 <h3 className="card-title">當日推薦候選人</h3>
                 <span className="form-label-hint">點擊排表</span>
               </div>
               <div className="availability-list-scroll">
                 {availabilityStats.map(stat => (
                   <div key={stat.id} className="availability-item-row" onClick={() => handleQuickBook(stat.id)}>
                     <div className="availability-teacher-name" title={stat.name}>{stat.name}</div>
                     <div className="availability-mini-grid">
                       {stat.periodsStatus.map((statusClass, idx) => (
                         <div 
                           key={idx} 
                           className={`availability-period-dot ${statusClass}`}
                           title={PERIOD_LABELS[idx] + (statusClass === 'is-busy' ? ' (已有課)' : statusClass === 'is-unconfirmed' ? ' (未確認節次)' : ' (有空)')}
                         />
                       ))}
                     </div>
                     <div className="availability-summary-text">
                       {stat.summaryText}
                     </div>
                   </div>
                 ))}
               </div>
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
