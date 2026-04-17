/**
 * 工具函數
 */

/**
 * 取得今天的日期字串
 * @returns {string} YYYY-MM-DD
 */
export function getTodayStr() {
  return formatDate(new Date());
}

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 格式化日期為中文顯示
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} 例如 "4月16日 (三)"
 */
export function formatDateChinese(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}月${d}日 (${w})`;
}

/**
 * 取得月份的所有日期
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array} 日期陣列
 */
export function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  // 填充月初空白（從週日開始）
  const startDay = firstDay.getDay();
  for (let i = 0; i < startDay; i++) {
    const d = new Date(year, month, -startDay + i + 1);
    days.push({ date: d, isCurrentMonth: false });
  }

  // 本月日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // 填充月末空白
  const remaining = 42 - days.length; // 6 rows * 7 cols
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, isCurrentMonth: false });
  }

  return days;
}

/**
 * 產生唯一 ID
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 狀態文字對應
 */
export const STATUS_MAP = {
  unassigned: { label: '待指派', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  pending: { label: '待確認', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  confirmed: { label: '已確認', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  rejected: { label: '已拒絕', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
};
