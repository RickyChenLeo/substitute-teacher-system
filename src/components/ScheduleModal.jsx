import { useState, useMemo } from 'react';
import { formatDateChinese } from '../utils/helpers';

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

export default function ScheduleModal({ date, teachers, onSave, onClose }) {
  const [form, setForm] = useState({
    leaveTeacherName: '',   // 請假老師（手動輸入）
    teacherId: '',           // 代課老師
    subject: '',             // 代課科目
    periodType: '',          // single | halfday | fullday
    selectedPeriods: [],     // 所有模式共用：選擇的節次
    className: '',           // 班級
    note: ''
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.leaveTeacherName.trim()) {
      alert('請填寫請假老師姓名');
      return;
    }
    if (!form.teacherId) {
      alert('請選擇代課老師');
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

    // 組合 period 資訊
    const periodsText = form.selectedPeriods.map(p => PERIOD_LABELS[p - 1]).join('、');
    let periodDisplay = '';
    if (form.periodType === 'single') {
      periodDisplay = periodsText;
    } else if (form.periodType === 'halfday') {
      periodDisplay = `半天（${periodsText}）`;
    } else if (form.periodType === 'fullday') {
      periodDisplay = `整天（${periodsText}）`;
    }

    onSave({
      leaveTeacherName: form.leaveTeacherName.trim(),
      teacherId: form.teacherId,
      subject: form.subject,
      periodType: form.periodType,
      period: form.periodType,
      classPeriods: form.selectedPeriods,
      periodDisplay,
      className: form.className,
      note: form.note,
      date,
      status: 'pending'
    });
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
            📅 {formatDateChinese(date)}
          </div>

          <form onSubmit={handleSubmit}>
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

            {/* 代課老師 */}
            <div className="form-group">
              <label className="form-label">代課老師 *</label>
              <select
                className="form-select"
                value={form.teacherId}
                onChange={e => handleChange('teacherId', e.target.value)}
                id="select-teacher"
                required
              >
                <option value="">-- 選擇代課老師 --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
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
              <button type="submit" className="btn btn-primary" id="btn-save-schedule">
                ✅ 新增排程
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
