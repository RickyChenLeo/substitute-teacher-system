export default function AIRecommend({ recommendations, summary, isLive }) {
  return (
    <div className="card ai-card">
      <div className="ai-badge">
        {isLive && <span className="ai-badge-pulse" />}
        <span>🤖 AI 科目推薦</span>
      </div>

      <p className="ai-summary">{summary}</p>

      {recommendations.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <div className="empty-icon">🔍</div>
          <p className="empty-desc">
            請在左側填寫老師的學歷、專長或教學經歷，<br />
            AI 會即時分析並推薦適合的代課科目
          </p>
        </div>
      ) : (
        <div className="ai-recommend-list">
          {recommendations.map(rec => (
            <div key={rec.subject.id} className="ai-recommend-item">
              <div
                className="ai-subject-icon"
                style={{ background: `${rec.subject.color}15` }}
              >
                {rec.subject.icon}
              </div>
              <div className="ai-subject-info">
                <div className="ai-subject-name">{rec.subject.name}</div>
                <div
                  className="ai-subject-confidence"
                  style={{ color: rec.confidenceColor }}
                >
                  {rec.confidenceLabel} · 匹配度 {rec.score}%
                </div>
              </div>
              <div className="ai-score-bar">
                <div
                  className="ai-score-fill"
                  style={{
                    width: `${rec.score}%`,
                    background: `linear-gradient(90deg, ${rec.confidenceColor}, ${rec.subject.color})`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
