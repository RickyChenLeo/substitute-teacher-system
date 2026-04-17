import { useTeachers, useSchedules } from '../utils/storage';
import { getTodayStr, formatDateChinese, STATUS_MAP } from '../utils/helpers';

export default function Dashboard({ onNavigate }) {
  const teachers = useTeachers();
  const schedules = useSchedules();
  const today = getTodayStr();

  const todaySchedules = schedules.filter(s => s.date === today);
  const pendingCount = schedules.filter(s => s.status === 'pending').length;
  const confirmedToday = todaySchedules.filter(s => s.status === 'confirmed').length;

  // 最近的排程（未來7天）
  const upcoming = schedules
    .filter(s => s.date >= today && s.status !== 'rejected')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // 找到老師名字
  const getTeacherName = (teacherId) => {
    const t = teachers.find(t => t.id === teacherId);
    return t ? t.name : '未知老師';
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1 className="page-title">儀表板</h1>
        <p className="page-subtitle">代課老師管理系統總覽</p>
      </div>

      <div className="dashboard-grid stagger-in">
        <div className="stat-card" id="stat-teachers">
          <div className="stat-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            👥
          </div>
          <div className="stat-card-info">
            <h3 style={{ color: 'var(--primary-400)' }}>{teachers.length}</h3>
            <p>已登記老師</p>
          </div>
        </div>

        <div className="stat-card" id="stat-today">
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            📅
          </div>
          <div className="stat-card-info">
            <h3 style={{ color: 'var(--success)' }}>{confirmedToday}</h3>
            <p>今日已確認代課</p>
          </div>
        </div>

        <div className="stat-card" id="stat-pending">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            ⏳
          </div>
          <div className="stat-card-info">
            <h3 style={{ color: 'var(--warning)' }}>{pendingCount}</h3>
            <p>待確認排程</p>
          </div>
        </div>

        <div className="stat-card" id="stat-total-schedules">
          <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            📊
          </div>
          <div className="stat-card-info">
            <h3 style={{ color: 'var(--accent-400)' }}>{schedules.length}</h3>
            <p>總排程數</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 近期排程 */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">近期排程</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('calendar')}>
              查看全部
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p className="empty-desc">目前沒有近期排程</p>
            </div>
          ) : (
            <div className="schedule-list">
              {upcoming.map(s => (
                <div key={s.id} className="schedule-item">
                  <div style={{ flex: 1 }}>
                    <div className="schedule-subject">{getTeacherName(s.teacherId)}</div>
                    <div className="schedule-info">
                      {formatDateChinese(s.date)} · {s.subject || '未指定科目'}
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

        {/* 快速操作 */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">快速操作</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 20px' }}
              onClick={() => onNavigate('add-teacher')}
              id="quick-add-teacher"
            >
              登記新老師
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 20px' }}
              onClick={() => onNavigate('calendar')}
              id="quick-calendar"
            >
              排程行事曆
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 20px' }}
              onClick={() => onNavigate('available')}
              id="quick-available"
            >
              查詢空閒老師
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 20px' }}
              onClick={() => onNavigate('teachers')}
              id="quick-teachers"
            >
              老師列表
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
