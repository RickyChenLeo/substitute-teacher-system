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
  const [form, setForm] = useState({
    leaveTeacherName: editSchedule?.leaveTeacherName || '',   // 請假老師
    subject: editSchedule?.subject || '',             // 代課科目
    periodType: editSchedule?.periodType || '',          // single | halfday | fullday
    selectedPeriods: editSchedule?.classPeriods || [],     // 所有模式共用：選擇的節次
    className: editSchedule?.className || '',           // 班級
    note: editSchedule?.note || ''
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
      return {
        ...prev,
        selectedPeriods: exists
          ? prev.selectedPeriods.filter(p => p !== periodNum)
          : [...prev.selectedPeriods, periodNum].sort((a, b) => a - b)
      };
    });
  };

  const halfDayPeriods = useMemo(() => {
    // 上午下午皆可選
    return [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }, []);

  const fullDayPeriods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const availablePeriods = form.periodType === 'halfday' ? halfDayPeriods : fullDayPeriods;

  const handleNext = () => {
    if (!form.leaveTeacherName.trim()) {
      alert('請填寫請假老師姓名');
      return;
    }
    if (!form.periodType) {
      alert('請選擇節次類型');
      return;
    }
    if (!form.subject && form.periodType === 'single') {
      alert('請選擇代課科目');
      return;
    }
    if (form.selectedPeriods.length === 0) {
      alert('請選擇節次');
      return;
    }
    setStep(2);
  };

  const constructScheduleData = (teacherId, status) => {
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
    if (!form.leaveTeacherName.trim()) return alert('請填寫請假老師姓名');
    if (!form.periodType) return alert('請選擇節次類型');
    if (form.selectedPeriods.length === 0) return alert('請選擇節次');

    onSave(constructScheduleData('', 'unassigned'));
  };

  const handleSelectTeacherAndSave = (selectedTeacherId) => {
    onSave(constructScheduleData(selectedTeacherId, 'pending'));
  };

  // 取空閒老師與分類
  const recommendedTeachers = useMemo(() => {
    if (step !== 2) return { high: [], medium: [], other: [] };
    const available = getAvailableTeachersForPeriods(activeDate, form.selectedPeriods);
    
    // 如果沒有選 form.subject (整天/半天沒選)
    if (!form.subject) {
      return { high: [], medium: [], other: available };
    }

    const high = [];
    const medium = [];
    const other = [];

    available.forEach(t => {
      const recs = t.recommendedSubjects || [];
      const match = recs.find(s => s.name === form.subject);
      if (match && match.confidence === 'HIGH') {
        high.push(t);
      } else if (match && match.confidence === 'MEDIUM') {
        medium.push(t);
      } else {
        other.push(t);
      }
    });

    return { high, medium, other };
  }, [step, activeDate, form.selectedPeriods, form.subject]);

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
          <h3 className="modal-title">➕ 新增排程</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="schedule-date-badge">
            📅 {formatDateChinese(activeDate)}
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
                  <span className="period-type-icon">1️⃣</span>
                  單節
                </button>
                <button
                  type="button"
                  className={`period-type-btn ${form.periodType === 'halfday' ? 'active' : ''}`}
                  onClick={() => handleChange('periodType', 'halfday')}
                >
                  <span className="period-type-icon">🌤️</span>
                  半天
                </button>
                <button
                  type="button"
                  className={`period-type-btn ${form.periodType === 'fullday' ? 'active' : ''}`}
                  onClick={() => handleChange('periodType', 'fullday')}
                >
                  <span className="period-type-icon">☀️</span>
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

            {/* 代課科目 (選整天或半天則不強迫選) */}
            {form.periodType !== 'fullday' && form.periodType !== 'halfday' && (
              <div className="form-group animate-field">
                <label className="form-label">代課科目 {form.periodType === 'single' ? '*' : ''}</label>
                <div className="subject-chips">
                  {SCHEDULE_SUBJECTS.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className={`subject-chip ${form.subject === s.name ? 'active' : ''}`}
                      onClick={() => handleChange('subject', form.subject === s.name ? '' : s.name)}
                    >
                      <span className="subject-chip-icon">{s.icon}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 班級 */}
            <div className="form-group">
              <label className="form-label">班級</label>
              <input
                className="form-input"
                type="text"
                placeholder="例：三年一班"
                value={form.className}
                onChange={e => handleChange('className', e.target.value)}
                id="input-class"
              />
            </div>

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
                    下一步：尋找代課 🔎
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
                  {form.subject ? `科目：${form.subject} | ` : ''} 
                  節次：{form.selectedPeriods.map(p => PERIOD_LABELS[p-1]).join('、')}
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {recommendedTeachers.high.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⭐ 最佳推薦
                    </h4>
                    {recommendedTeachers.high.map(t => renderTeacherItem(t, `高度符合「${form.subject}」專長`))}
                  </div>
                )}

                {recommendedTeachers.medium.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--primary-400)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      👍 可以考慮
                    </h4>
                    {recommendedTeachers.medium.map(t => renderTeacherItem(t, `部分符合「${form.subject}」專長`))}
                  </div>
                )}

                {recommendedTeachers.other.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      👥 其他空閒老師
                    </h4>
                    {recommendedTeachers.other.map(t => renderTeacherItem(t, '此時段空閒'))}
                  </div>
                )}

                {recommendedTeachers.high.length === 0 && recommendedTeachers.medium.length === 0 && recommendedTeachers.other.length === 0 && (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <div className="empty-icon">😅</div>
                    <p className="empty-desc">此時段沒有任何空閒老師可以安排</p>
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
