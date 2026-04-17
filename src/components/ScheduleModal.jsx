import { useState, useMemo } from 'react';
import { formatDateChinese } from '../utils/helpers';
import { getAvailableTeachersForPeriods } from '../utils/storage';

// 限定七大科目
const SCHEDULE_SUBJECTS = [
  { id: 'chinese', name: '國文', icon: '📖' },
  { id: 'english', name: '英文', icon: '🌍' },
  { id: 'math', name: '數學', icon: '🔢' },
  { id: 'science', name: '自然', icon: '🔬' },
  { id: 'social', name: '社會', icon: '🏛️' },
  { id: 'pe', name: '體育', icon: '⚽' },
  { id: 'health', name: '健康', icon: '❤️' },
];

const PERIOD_LABELS = ['導師時間', '第一節', '第二節', '第三節', '第四節', '午休', '第五節', '第六節', '第七節'];

export default function ScheduleModal({ date, teachers, editSchedule, onSave, onClose }) {
  const [step, setStep] = useState(editSchedule ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    leaveTeacherName: editSchedule?.leaveTeacherName || '',   // 請假老師
    subject: editSchedule?.subject || '',             // 代課科目 (非單節用)
    periodType: editSchedule?.periodType || '',          // single | halfday | fullday
    selectedPeriods: editSchedule?.classPeriods || [],     // 所有模式共用：選擇的節次
    className: editSchedule?.className || '',           // 班級 (非單節用)
    note: editSchedule?.note || ''
  });
  const [periodDetails, setPeriodDetails] = useState(() => {
    const initial = {};
    if (editSchedule?.id && editSchedule.classPeriods?.length > 0) {
      editSchedule.classPeriods.forEach(p => {
        initial[p] = { subject: editSchedule.subject || '', className: editSchedule.className || '' };
      });
    }
    return initial;
  });

  const activeDate = editSchedule?.date || date;

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // 切換 periodType 時重置已選節次
      if (field === 'periodType') {
        next.selectedPeriods = [];
      }
      return next;
    });
  };

  const togglePeriod = (periodNum) => {
    setForm(prev => {
      const exists = prev.selectedPeriods.includes(periodNum);
      const newPeriods = exists
        ? prev.selectedPeriods.filter(p => p !== periodNum)
        : [...prev.selectedPeriods, periodNum].sort((a, b) => a - b);
        
      if (!exists && prev.periodType === 'single') {
        setPeriodDetails(curr => {
          if (curr[periodNum]) return curr;
          const existingPeriods = Object.keys(curr).map(Number).sort((a,b)=>a-b);
          let fallback = { subject: '', className: '' };
          if (existingPeriods.length > 0) {
            fallback = { ...curr[existingPeriods[existingPeriods.length - 1]] };
          }
          return { ...curr, [periodNum]: fallback };
        });
      }
      return { ...prev, selectedPeriods: newPeriods };
    });
  };

  const updatePeriodDetail = (periodNum, field, value) => {
    setPeriodDetails(prev => ({
      ...prev,
      [periodNum]: {
        ...prev[periodNum] || { subject: '', className: '' },
        [field]: value
      }
    }));
  };

  const halfDayPeriods = useMemo(() => {
    // 上午下午皆可選
    return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }, []);

  const fullDayPeriods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const availablePeriods = form.periodType === 'halfday' ? halfDayPeriods : fullDayPeriods;

  const validateForm = () => {
    if (!form.leaveTeacherName.trim()) return '請填寫請假老師姓名';
    if (!form.periodType) return '請選擇節次類型';
    if (form.selectedPeriods.length === 0) return '請選擇節次';
    
    if (form.periodType === 'single') {
      for (let p of form.selectedPeriods) {
        if (!periodDetails[p]?.subject) return `請選擇第${PERIOD_LABELS[p-1]}的代課科目`;
      }
    } else {
      if (!form.subject && form.periodType === 'single') return '請選擇代課科目'; // Fallback
    }
    return null;
  };

  const handleNext = () => {
    const error = validateForm();
    if (error) return alert(error);
    setStep(2);
  };

  const constructScheduleData = (teacherId, status) => {
    if (form.periodType === 'single') {
      return form.selectedPeriods.map(p => ({
        ...(editSchedule?.id && form.selectedPeriods.length === 1 && { id: editSchedule.id }),
        leaveTeacherName: form.leaveTeacherName.trim(),
        teacherId,
        subject: periodDetails[p]?.subject || '',
        periodType: 'single',
        period: p,
        classPeriods: [p],
        periodDisplay: `單節（${PERIOD_LABELS[p - 1]}）`,
        className: periodDetails[p]?.className || '',
        note: form.note,
        date: activeDate,
        status
      }));
    }

    const periodsText = form.selectedPeriods.map(p => PERIOD_LABELS[p - 1]).join('、');
    let periodDisplay = '';
    if (form.periodType === 'single') {
      periodDisplay = periodsText;
    } else if (form.periodType === 'halfday') {
      periodDisplay = `半天（${periodsText}）`;
    } else if (form.periodType === 'fullday') {
      periodDisplay = `整天（${periodsText}）`;
    }

    return {
      ...(editSchedule?.id && { id: editSchedule.id }),
      leaveTeacherName: form.leaveTeacherName.trim(),
      teacherId,
      subject: form.subject,
      periodType: form.periodType,
      period: form.periodType,
      classPeriods: form.selectedPeriods,
      periodDisplay,
      className: form.className,
      note: form.note,
      date: activeDate,
      status
    };
  };

  const handleSaveEmpty = () => {
    const error = validateForm();
    if (error) return alert(error);
    onSave(constructScheduleData('', 'unassigned'));
  };

  const handleSelectTeacherAndSave = (selectedTeacherId) => {
    onSave(constructScheduleData(selectedTeacherId, 'pending'));
  };

  const searchSubject = form.periodType === 'single' 
    ? periodDetails[form.selectedPeriods[0]]?.subject 
    : form.subject;

  // 取空閒老師與分類
  const recommendedTeachers = useMemo(() => {
    if (step !== 2) return { high: [], medium: [], other: [] };
    const available = getAvailableTeachersForPeriods(activeDate, form.selectedPeriods);
    
    // 如果沒有選 searchSubject (整天/半天沒選)
    if (!searchSubject) {
      return { high: [], medium: [], other: available };
    }

    const high = [];
    const medium = [];
    const other = [];

    available.forEach(t => {
      const recs = t.recommendedSubjects || [];
      const match = recs.find(s => s.name === searchSubject);
      if (match && match.confidence === 'HIGH') {
        high.push(t);
      } else if (match && match.confidence === 'MEDIUM') {
        medium.push(t);
      } else {
        other.push(t);
      }
    });

    return { high, medium, other };
  }, [step, activeDate, form.selectedPeriods, searchSubject]);

  const filteredTeachers = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return recommendedTeachers;
    const filterFn = t => t.name.toLowerCase().includes(term);
    return {
      high: recommendedTeachers.high.filter(filterFn),
      medium: recommendedTeachers.medium.filter(filterFn),
      other: recommendedTeachers.other.filter(filterFn)
    };
  }, [recommendedTeachers, searchQuery]);

  const renderTeacherItem = (teacher, reason) => {
    const initial = teacher.name.charAt(0);
    return (
      <div 
        key={teacher.id} 
        className="available-item" 
        style={{ cursor: 'pointer', padding: '12px 16px', marginBottom: '8px', border: '1px solid var(--border-subtle)' }}
        onClick={() => handleSelectTeacherAndSave(teacher.id)}
      >
        <div className="teacher-avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
            {teacher.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {reason}
          </div>
        </div>
        <span className="available-badge">分派排程</span>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal schedule-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">新增排程</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="schedule-date-badge">
            {formatDateChinese(activeDate)}
          </div>

          {step === 1 && (
            <div className="animate-in">
              {/* 請假老師 */}
            <div className="form-group">
              <label className="form-label">請假老師 *</label>
              <input
                className="form-input"
                type="text"
                placeholder="輸入請假老師姓名"
                value={form.leaveTeacherName}
                onChange={e => handleChange('leaveTeacherName', e.target.value)}
                id="input-leave-teacher"
                required
              />
            </div>

            {/* 節次類型 */}
            <div className="form-group">
              <label className="form-label">節次 *</label>
              <div className="period-type-group">
                <button
                  type="button"
                  className={`period-type-btn ${form.periodType === 'single' ? 'active' : ''}`}
                  onClick={() => handleChange('periodType', 'single')}
                >
                  單節
                </button>
                <button
                  type="button"
                  className={`period-type-btn ${form.periodType === 'halfday' ? 'active' : ''}`}
                  onClick={() => handleChange('periodType', 'halfday')}
                >
                  半天
                </button>
                <button
                  type="button"
                  className={`period-type-btn ${form.periodType === 'fullday' ? 'active' : ''}`}
                  onClick={() => handleChange('periodType', 'fullday')}
                >
                  整天
                </button>
              </div>
            </div>

            {/* 單節選擇（可複選） */}
            {form.periodType === 'single' && (
              <div className="form-group animate-field">
                <label className="form-label">
                  選擇節次（可複選）
                  <span className="form-label-hint">
                    （已選 {form.selectedPeriods.length} 節）
                  </span>
                </label>
                <div className="period-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`period-btn ${form.selectedPeriods.includes(p) ? 'active' : ''}`}
                      onClick={() => togglePeriod(p)}
                    >
                      {PERIOD_LABELS[p - 1]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 半天/整天 — 有課節次勾選 */}
            {(form.periodType === 'halfday' || form.periodType === 'fullday') && (
              <div className="form-group animate-field">
                <label className="form-label">
                  勾選有課的節次
                  <span className="form-label-hint">
                    （已選 {form.selectedPeriods.length} 節）
                  </span>
                </label>
                <p className="form-hint" style={{ marginTop: 0, marginBottom: '12px' }}>
                  {form.periodType === 'halfday'
                    ? '請勾選半天中需要代課的節次，未勾選的節次可安排其他代課'
                    : '請勾選整天中需要代課的節次，未勾選的節次可安排其他代課'}
                </p>
                <div className="period-check-grid">
                  {availablePeriods.map(p => (
                    <label
                      key={p}
                      className={`period-check-item ${form.selectedPeriods.includes(p) ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.selectedPeriods.includes(p)}
                        onChange={() => togglePeriod(p)}
                        className="period-checkbox"
                      />
                      <span className="period-check-label">{PERIOD_LABELS[p - 1]}</span>
                      <span className="period-check-indicator">
                        {form.selectedPeriods.includes(p) ? '✓' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 代課科目 (非單節時顯示全域) */}
            {form.periodType !== 'single' && (
              <div className="form-group">
                <label className="form-label">
                  代課科目 {form.periodType === 'single' ? '*' : '(選填)'}
                </label>
                <div className="radio-group" style={{ flexWrap: 'wrap' }}>
                  {SCHEDULE_SUBJECTS.map(s => (
                    <div
                      key={s.id}
                      className={`radio-label ${form.subject === s.name ? 'active' : ''}`}
                      onClick={() => handleChange('subject', s.name)}
                    >
                      {s.icon} {s.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 班級 (非單節時顯示全域) */}
            {form.periodType !== 'single' && (
              <div className="form-group">
                <label className="form-label">班級 (選填)</label>
                <input
                  className="form-input"
                  placeholder="例如: 408班"
                  value={form.className}
                  onChange={e => handleChange('className', e.target.value)}
                />
              </div>
            )}

            {/* 一節一單模式的逐節設定區塊 */}
            {form.periodType === 'single' && form.selectedPeriods.length > 0 && (
              <div className="form-group" style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <label className="form-label" style={{ marginBottom: '12px' }}>各節次科目與班級對應 *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {form.selectedPeriods.map(p => (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '600', width: '70px', fontSize: '14px' }}>{PERIOD_LABELS[p-1]}</span>
                      <select 
                        className="form-select" 
                        style={{ flex: 1 }}
                        value={periodDetails[p]?.subject || ''}
                        onChange={e => updatePeriodDetail(p, 'subject', e.target.value)}
                      >
                        <option value="">選擇科目</option>
                        {SCHEDULE_SUBJECTS.map(s => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
                      </select>
                      <input 
                        className="form-input" 
                        style={{ flex: 1, minWidth: '80px' }}
                        placeholder="班級" 
                        value={periodDetails[p]?.className || ''}
                        onChange={e => updatePeriodDetail(p, 'className', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 備註 */}
            <div className="form-group">
              <label className="form-label">備註</label>
              <input
                className="form-input"
                type="text"
                placeholder="其他備註..."
                value={form.note}
                onChange={e => handleChange('note', e.target.value)}
                id="input-schedule-note"
              />
            </div>

              <div className="modal-footer" style={{ padding: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleSaveEmpty}>
                    儲存缺額 (暫找無人)
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleNext}>
                    下一步：尋找代課
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in" style={{ animationName: 'slideUp', animationDuration: '0.3s' }}>
              <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>依據需求篩選結果：</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {searchSubject ? `主題科目：${searchSubject} | ` : ''} 
                  節次：{form.selectedPeriods.map(p => PERIOD_LABELS[p-1]).join('、')}
                </div>
              </div>

              {/* 搜尋列 */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="搜尋老師姓名..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredTeachers.high.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      最佳推薦
                    </h4>
                    {filteredTeachers.high.map(t => renderTeacherItem(t, `高度符合「${searchSubject}」專長`))}
                  </div>
                )}

                {filteredTeachers.medium.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--primary-400)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      可以考慮
                    </h4>
                    {filteredTeachers.medium.map(t => renderTeacherItem(t, `部分符合「${searchSubject}」專長`))}
                  </div>
                )}

                {filteredTeachers.other.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      其他空閒老師
                    </h4>
                    {filteredTeachers.other.map(t => renderTeacherItem(t, '此時段空閒'))}
                  </div>
                )}

                {filteredTeachers.high.length === 0 && filteredTeachers.medium.length === 0 && filteredTeachers.other.length === 0 && (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <p className="empty-desc">{searchQuery ? '找不到符合搜尋條件的老師' : '此時段沒有任何空閒老師可以安排'}</p>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: 0, marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← 上一步修改需求</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
