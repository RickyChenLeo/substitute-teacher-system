import { useState } from 'react';
import { addTeacher, updateTeacher } from '../utils/storage';
import { analyzeTeacher, getAnalysisSummary } from '../utils/aiEngine';
import AIRecommend from './AIRecommend';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  education: '',
  expertise: '',
  experience: '',
  note: ''
};

export default function TeacherForm({ editTeacher, onSaved, onCancel }) {
  const [form, setForm] = useState(editTeacher || EMPTY_FORM);
  const [recommendations, setRecommendations] = useState(
    editTeacher ? analyzeTeacher(editTeacher) : []
  );
  const [showPreview, setShowPreview] = useState(!!editTeacher);

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);

    // 即時 AI 分析
    const recs = analyzeTeacher(updated);
    setRecommendations(recs);
    if (recs.length > 0 && !showPreview) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('請輸入老師姓名');
      return;
    }

    // 儲存 AI 推薦結果
    const recs = analyzeTeacher(form);
    const recommendedSubjects = recs.map(r => ({
      id: r.subject.id,
      name: r.subject.name,
      icon: r.subject.icon,
      confidence: r.confidence,
      score: r.score
    }));

    const teacherData = {
      ...form,
      recommendedSubjects
    };

    if (editTeacher && editTeacher.id) {
      await updateTeacher(editTeacher.id, teacherData);
    } else {
      await addTeacher(teacherData);
    }

    onSaved();
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">{editTeacher ? '編輯老師' : '登記代課老師'}</h1>
        <p className="page-subtitle">填寫老師資訊，系統會自動分析適合的代課科目</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">姓名 *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="例：王小明"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  id="input-name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">電話</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="例：0912-345-678"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  id="input-phone"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="例：teacher@example.com"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                id="input-email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">學歷背景</label>
              <textarea
                className="form-textarea"
                placeholder="例：國立台灣師範大學體育系畢業、教育學碩士"
                value={form.education}
                onChange={e => handleChange('education', e.target.value)}
                id="input-education"
              />
              <p className="form-hint">💡 填寫學歷有助於 AI 更準確推薦適合教授的科目</p>
            </div>

            <div className="form-group">
              <label className="form-label">專長描述</label>
              <textarea
                className="form-textarea"
                placeholder="例：擅長籃球、排球教學，有體適能指導員證照"
                value={form.expertise}
                onChange={e => handleChange('expertise', e.target.value)}
                id="input-expertise"
              />
              <p className="form-hint">💡 描述老師的專長、證照、特殊技能</p>
            </div>

            <div className="form-group">
              <label className="form-label">教學經歷</label>
              <textarea
                className="form-textarea"
                placeholder="例：曾於XX國小代課體育2年，XX國中代課自然1學期"
                value={form.experience}
                onChange={e => handleChange('experience', e.target.value)}
                id="input-experience"
              />
              <p className="form-hint">💡 過去的代課或教學經驗</p>
            </div>

            <div className="form-group">
              <label className="form-label">備註</label>
              <textarea
                className="form-textarea"
                placeholder="其他備註事項..."
                value={form.note}
                onChange={e => handleChange('note', e.target.value)}
                style={{ minHeight: '60px' }}
                id="input-note"
              />
            </div>

            <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
              {onCancel && (
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                  取消
                </button>
              )}
              <button type="submit" className="btn btn-primary" id="btn-save-teacher">
                {editTeacher ? '💾 儲存變更' : '✅ 登記老師'}
              </button>
            </div>
          </form>
        </div>

        {/* AI Preview */}
        <div>
          <AIRecommend
            recommendations={recommendations}
            summary={getAnalysisSummary(recommendations)}
            isLive={true}
          />
        </div>
      </div>
    </div>
  );
}
