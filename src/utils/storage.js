/**
 * LocalStorage 工具函數
 * 管理代課老師資料與排程的持久化儲存
 */

const TEACHERS_KEY = 'substitute_teachers';
const SCHEDULES_KEY = 'substitute_schedules';

// ====== 老師資料 ======

export function getTeachers() {
  try {
    const data = localStorage.getItem(TEACHERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTeachers(teachers) {
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
}

export function addTeacher(teacher) {
  const teachers = getTeachers();
  const newTeacher = {
    ...teacher,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    createdAt: new Date().toISOString()
  };
  teachers.push(newTeacher);
  saveTeachers(teachers);
  return newTeacher;
}

export function updateTeacher(id, updates) {
  const teachers = getTeachers();
  const index = teachers.findIndex(t => t.id === id);
  if (index !== -1) {
    teachers[index] = { ...teachers[index], ...updates, updatedAt: new Date().toISOString() };
    saveTeachers(teachers);
    return teachers[index];
  }
  return null;
}

export function deleteTeacher(id) {
  const teachers = getTeachers().filter(t => t.id !== id);
  saveTeachers(teachers);
  // 同時刪除相關排程
  const schedules = getSchedules().filter(s => s.teacherId !== id);
  saveSchedules(schedules);
}

export function getTeacherById(id) {
  return getTeachers().find(t => t.id === id) || null;
}

// ====== 排程資料 ======

export function getSchedules() {
  try {
    const data = localStorage.getItem(SCHEDULES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveSchedules(schedules) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
}

export function addSchedule(schedule) {
  const schedules = getSchedules();
  const newSchedule = {
    ...schedule,
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    status: schedule.status || 'pending', // pending, confirmed, rejected
    createdAt: new Date().toISOString()
  };
  schedules.push(newSchedule);
  saveSchedules(schedules);
  return newSchedule;
}

export function updateSchedule(id, updates) {
  const schedules = getSchedules();
  const index = schedules.findIndex(s => s.id === id);
  if (index !== -1) {
    schedules[index] = { ...schedules[index], ...updates };
    saveSchedules(schedules);
    return schedules[index];
  }
  return null;
}

export function deleteSchedule(id) {
  const schedules = getSchedules().filter(s => s.id !== id);
  saveSchedules(schedules);
}

export function getSchedulesByTeacher(teacherId) {
  return getSchedules().filter(s => s.teacherId === teacherId);
}

export function getSchedulesByDate(dateStr) {
  return getSchedules().filter(s => s.date === dateStr);
}

/**
 * 取得指定日期的空閒老師
 * @param {string} dateStr - 日期字串 (YYYY-MM-DD)
 * @returns {Array} 空閒老師列表
 */
export function getAvailableTeachers(dateStr) {
  const allTeachers = getTeachers();
  const busyTeacherIds = getSchedulesByDate(dateStr)
    .filter(s => s.status !== 'rejected')
    .map(s => s.teacherId);

  return allTeachers.filter(t => !busyTeacherIds.includes(t.id));
}

// ====== 資料匯出/匯入 ======

/**
 * 匯出所有資料為 JSON 檔案下載
 */
export function exportAllData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    teachers: getTeachers(),
    schedules: getSchedules()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  a.href = url;
  a.download = `代課老師管理系統_備份_${dateStr}_${timeStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 從 JSON 檔案匯入資料
 * @param {File} file - JSON 檔案
 * @param {string} mode - 'replace' 取代 | 'merge' 合併
 * @returns {Promise<{teachers: number, schedules: number}>} 匯入的數量
 */
export function importAllData(file, mode = 'replace') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.teachers || !data.schedules) {
          reject(new Error('檔案格式不正確，請選擇正確的備份檔案'));
          return;
        }

        if (mode === 'replace') {
          saveTeachers(data.teachers);
          saveSchedules(data.schedules);
        } else {
          // 合併模式：以 id 為準，避免重複
          const existingTeachers = getTeachers();
          const existingSchedules = getSchedules();
          const existingTeacherIds = new Set(existingTeachers.map(t => t.id));
          const existingScheduleIds = new Set(existingSchedules.map(s => s.id));

          const newTeachers = data.teachers.filter(t => !existingTeacherIds.has(t.id));
          const newSchedules = data.schedules.filter(s => !existingScheduleIds.has(s.id));

          saveTeachers([...existingTeachers, ...newTeachers]);
          saveSchedules([...existingSchedules, ...newSchedules]);
        }

        resolve({
          teachers: data.teachers.length,
          schedules: data.schedules.length
        });
      } catch (err) {
        reject(new Error('無法讀取檔案，請確認是正確的 JSON 備份檔'));
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}
