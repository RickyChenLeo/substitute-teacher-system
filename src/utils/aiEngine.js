/**
 * AI 科目推薦引擎
 * 根據老師的學歷、專長、教學經歷，透過關鍵字比對與權重計算
 * 自動推薦適合代課的科目
 */

import { SUBJECTS, CONFIDENCE_LEVELS } from '../data/subjects';

/**
 * 計算文字與科目關鍵字的匹配分數
 * @param {string} text - 要分析的文字
 * @param {string[]} keywords - 關鍵字列表
 * @returns {number} 匹配分數 (0-100)
 */
function calculateMatchScore(text, keywords) {
  if (!text || text.trim() === '') return 0;

  const normalizedText = text.toLowerCase().trim();
  let totalScore = 0;
  let matchCount = 0;

  keywords.forEach(keyword => {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedText.includes(normalizedKeyword)) {
      // 完全匹配得更高分
      const keywordLength = normalizedKeyword.length;
      // 較長的關鍵字匹配權重更高（更精確的匹配）
      const lengthBonus = Math.min(keywordLength / 3, 3);
      totalScore += 10 + lengthBonus;
      matchCount++;
    }
  });

  // 匹配數量越多，信心越高
  const countBonus = Math.min(matchCount * 5, 30);
  return Math.min(totalScore + countBonus, 100);
}

/**
 * 分析老師資訊，推薦適合的代課科目
 * @param {Object} teacher - 老師資訊
 * @param {string} teacher.education - 學歷背景
 * @param {string} teacher.expertise - 專長描述
 * @param {string} teacher.experience - 教學經歷
 * @returns {Array} 推薦結果，按信心指數排序
 */
export function analyzeTeacher(teacher) {
  const { education = '', expertise = '', experience = '' } = teacher;

  // 不同欄位的權重
  const weights = {
    education: 0.35,    // 學歷最重要
    expertise: 0.40,    // 專長最關鍵
    experience: 0.25    // 經歷輔助
  };

  const recommendations = [];

  SUBJECTS.forEach(subject => {
    const educationScore = calculateMatchScore(education, subject.keywords);
    const expertiseScore = calculateMatchScore(expertise, subject.keywords);
    const experienceScore = calculateMatchScore(experience, subject.keywords);

    const weightedScore = Math.round(
      educationScore * weights.education +
      expertiseScore * weights.expertise +
      experienceScore * weights.experience
    );

    if (weightedScore >= CONFIDENCE_LEVELS.LOW.min) {
      let confidence;
      if (weightedScore >= CONFIDENCE_LEVELS.HIGH.min) {
        confidence = 'HIGH';
      } else if (weightedScore >= CONFIDENCE_LEVELS.MEDIUM.min) {
        confidence = 'MEDIUM';
      } else {
        confidence = 'LOW';
      }

      recommendations.push({
        subject: subject,
        score: weightedScore,
        confidence: confidence,
        confidenceLabel: CONFIDENCE_LEVELS[confidence].label,
        confidenceColor: CONFIDENCE_LEVELS[confidence].color,
        details: {
          educationScore,
          expertiseScore,
          experienceScore
        }
      });
    }
  });

  // 按分數排序
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations;
}

/**
 * 取得 AI 分析摘要文字
 * @param {Array} recommendations - 推薦結果
 * @returns {string} 摘要文字
 */
export function getAnalysisSummary(recommendations) {
  if (recommendations.length === 0) {
    return '尚無足夠資訊進行科目推薦，請補充更多老師的學歷、專長或教學經歷。';
  }

  const highRecs = recommendations.filter(r => r.confidence === 'HIGH');
  const medRecs = recommendations.filter(r => r.confidence === 'MEDIUM');

  let summary = '';

  if (highRecs.length > 0) {
    const names = highRecs.map(r => r.subject.name).join('、');
    summary += `高度適合教授：${names}。`;
  }

  if (medRecs.length > 0) {
    const names = medRecs.map(r => r.subject.name).join('、');
    summary += `也適合教授：${names}。`;
  }

  return summary || '根據資料分析，此老師有多個可考慮的科目方向。';
}
