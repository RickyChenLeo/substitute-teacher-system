import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

// 在記憶體中暫存，供非 Hook 的純邏輯函數 (如匯出) 讀取
let memoryTeachers = [];
let memorySchedules = [];

// 給 Hook 註冊用
const teacherListeners = new Set();
const scheduleListeners = new Set();

// ========================
// 初始化 Firebase 同步
// ========================
export function initializeFirebaseSync() {
  if (window._sUnsub) window._sUnsub();
  if (window._tUnsub) window._tUnsub();

  const tUnsub = onSnapshot(collection(db, 'teachers'), snapshot => {
    // 使用 Map 去重，防止 ID 重複產生幻影
    const uniqueMap = new Map();
    // 必須把 id 放在最後解構，確保能蓋過資料庫內可能殘留的 id
    snapshot.docs.forEach(d => uniqueMap.set(d.id, { ...d.data(), id: d.id }));
    memoryTeachers = Array.from(uniqueMap.values());
    teacherListeners.forEach(cb => cb([...memoryTeachers]));
  }, err => console.error('Teacher Sync Error:', err));
  
  const sUnsub = onSnapshot(collection(db, 'schedules'), snapshot => {
    const uniqueMap = new Map();
    snapshot.docs.forEach(d => uniqueMap.set(d.id, { ...d.data(), id: d.id }));
    memorySchedules = Array.from(uniqueMap.values());
    scheduleListeners.forEach(cb => cb([...memorySchedules]));
  }, err => console.error('Schedule Sync Error:', err));
  
  window._tUnsub = tUnsub;
  window._sUnsub = sUnsub;

  return () => {
    tUnsub();
    sUnsub();
  };
}

// ========================
// Custom Hooks
// ========================
export function useTeachers() {
  const [teachers, setTeachers] = useState(memoryTeachers);
  useEffect(() => {
    setTeachers(memoryTeachers); // Initial sync in case it loaded before mount
    teacherListeners.add(setTeachers);
    return () => teacherListeners.delete(setTeachers);
  }, []);
  return teachers;
}

export function useSchedules() {
  const [schedules, setSchedules] = useState(memorySchedules);
  useEffect(() => {
    setSchedules(memorySchedules);
    scheduleListeners.add(setSchedules);
    return () => scheduleListeners.delete(setSchedules);
  }, []);
  return schedules;
}

// ========================
// 同步讀取 (僅用於輔助)
// ========================
export function getTeachers() {
  return [...memoryTeachers];
}

export function getSchedules() {
  return [...memorySchedules];
}

export function getTeacherById(id) {
  return memoryTeachers.find(t => t.id === id) || null;
}

export function getSchedulesByTeacher(teacherId) {
  return memorySchedules.filter(s => s.teacherId === teacherId);
}

export function getSchedulesByDate(dateStr) {
  return memorySchedules.filter(s => s.date === dateStr);
}

// ========================
// 寫入 API (Firebase)
// ========================

// 老師操作
export async function addTeacher(teacher) {
  const newTeacher = { ...teacher, createdAt: new Date().toISOString() };
  await addDoc(collection(db, 'teachers'), newTeacher);
  return newTeacher;
}

export async function updateTeacher(id, updates) {
  await updateDoc(doc(db, 'teachers', id), { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteTeacher(id) {
  await deleteDoc(doc(db, 'teachers', id));
  // 同時刪除相關排程
  const relatedSchedules = memorySchedules.filter(s => s.teacherId === id);
  for (const s of relatedSchedules) {
    await deleteDoc(doc(db, 'schedules', s.id));
  }
}

// 供 BatchImport 使用
export async function saveTeachers(teachersArr) {
  // 在 Firebase 中，我們需要對每一筆進行新增或更新。
  // 為了簡化，如果是全新的就 addDoc，如果是現有的就 updateDoc。
  for (const t of teachersArr) {
    if (t.id && memoryTeachers.find(existing => existing.id === t.id)) {
      // 這裡原本是 LocalStorage 的覆寫邏輯。如果是原本已存在就不覆寫了。
      // BatchImport 有產生自己的隨機 id，但我們可以直接指定 document id：
      await setDoc(doc(db, 'teachers', t.id), { ...t, createdAt: t.createdAt || new Date().toISOString() });
    } else {
      // 因為 BatchImport 自行產生了 id，為了讓他保留，我們用 setDoc
      const newId = t.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      await setDoc(doc(db, 'teachers', newId), { ...t, createdAt: t.createdAt || new Date().toISOString() });
    }
  }
}

// 排程操作
export async function addSchedule(schedule) {
  const newSchedule = {
    ...schedule,
    status: schedule.status || 'pending',
    createdAt: new Date().toISOString()
  };
  delete newSchedule.id; // 不要把 id 存進 document value 中
  await addDoc(collection(db, 'schedules'), newSchedule);
}

export async function updateSchedule(id, updates) {
  if (!id) throw new Error('Update failed: Missing schedule ID');
  try {
    console.log('Attempting to update schedule:', id, updates);
    await updateDoc(doc(db, 'schedules', id), updates);
  } catch (err) {
    console.error('Firebase Update Error:', err);
    throw err;
  }
}

export async function deleteSchedule(id) {
  if (!id) throw new Error('Delete failed: Missing schedule ID');
  try {
    console.log('Attempting to delete schedule:', id);
    await deleteDoc(doc(db, 'schedules', id));
  } catch (err) {
    console.error('Firebase Delete Error:', err);
    throw err;
  }
}

export async function saveSchedules(schedulesArr) {
    for (const s of schedulesArr) {
        const scheduleData = { ...s };
        delete scheduleData.id;
        if (s.id) {
            await setDoc(doc(db, 'schedules', s.id), scheduleData);
        } else {
            await addDoc(collection(db, 'schedules'), scheduleData);
        }
    }
}

// ========================
// 應用邏輯查詢
// ========================

// (這些可以用 memoryTeachers 跟 memorySchedules 直接計算)
export function getAvailableTeachersForPeriods(dateStr, periodsToMatch) {
  const daySchedules = getSchedulesByDate(dateStr).filter(s => s.status !== 'rejected');
  
  const busyTeacherIds = daySchedules
    .filter(s => {
      const sPeriods = s.classPeriods || [];
      return sPeriods.some(p => periodsToMatch.includes(p));
    })
    .map(s => s.teacherId);

  const allTeachers = getTeachers();
  return allTeachers.filter(t => !busyTeacherIds.includes(t.id));
}

export function getAvailableTeachers(dateStr) {
  const allTeachers = getTeachers();
  const daySchedules = getSchedulesByDate(dateStr).filter(s => s.status !== 'rejected');
  return allTeachers.filter(t => {
    const isBusy = daySchedules.some(s => {
      if (s.teacherId !== t.id) return false;
      if (s.periodType === 'fullday') return true;
      return false; 
    });
    return !isBusy;
  });
}

// ========================
// 備份與還原 (可保留以防萬一)
// ========================
export function exportAllData() {
  const data = {
    teachers: memoryTeachers,
    schedules: memorySchedules,
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `substitute_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

export async function importAllData(file, mode = 'merge') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let teacherCount = 0;
        let scheduleCount = 0;

        if (data.teachers && Array.isArray(data.teachers)) {
          if (mode === 'replace') {
            // Firestore doesn't provide a direct "delete collection" from client SDK safely
            // But we can overwrite or leave it as is if we want actual replacement
            // For now, we overwrite based on ID
          }
          for (const t of data.teachers) {
            await setDoc(doc(db, 'teachers', t.id), t);
            teacherCount++;
          }
        }


        if (data.schedules && Array.isArray(data.schedules)) {
          for (const s of data.schedules) {
            await setDoc(doc(db, 'schedules', s.id), s);
            scheduleCount++;
          }
        }
        resolve({ teachers: teacherCount, schedules: scheduleCount });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}
