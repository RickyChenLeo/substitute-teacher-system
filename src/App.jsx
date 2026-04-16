import { useState } from 'react';
import { getTeachers, getSchedules } from './utils/storage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TeacherForm from './components/TeacherForm';
import TeacherList from './components/TeacherList';
import TeacherDetail from './components/TeacherDetail';
import Calendar from './components/Calendar';
import AvailableTeachers from './components/AvailableTeachers';
import BatchImport from './components/BatchImport';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [editTeacher, setEditTeacher] = useState(null);
  const [viewTeacherId, setViewTeacherId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const teachers = getTeachers();
  const schedules = getSchedules();

  const navigate = (page, data) => {
    if (page === 'edit-teacher' && data) {
      setEditTeacher(data);
      setCurrentPage('edit-teacher');
    } else {
      setEditTeacher(null);
      setCurrentPage(page);
    }
    setViewTeacherId(null);
  };

  const viewTeacher = (id) => {
    setViewTeacherId(id);
    setCurrentPage('teacher-detail');
  };

  const refresh = () => setRefreshKey(k => k + 1);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key={refreshKey} onNavigate={navigate} />;

      case 'teachers':
        return (
          <TeacherList
            key={refreshKey}
            onNavigate={navigate}
            onViewTeacher={viewTeacher}
          />
        );

      case 'add-teacher':
        return (
          <TeacherForm
            key={refreshKey}
            onSaved={() => {
              refresh();
              navigate('teachers');
            }}
          />
        );

      case 'batch-import':
        return (
          <BatchImport
            key={refreshKey}
            onNavigate={navigate}
            onImportSuccess={refresh}
          />
        );

      case 'edit-teacher':
        return (
          <TeacherForm
            key={refreshKey}
            editTeacher={editTeacher}
            onSaved={() => {
              refresh();
              if (viewTeacherId) {
                navigate('teacher-detail');
                setViewTeacherId(editTeacher.id);
              } else {
                navigate('teachers');
              }
            }}
            onCancel={() => {
              if (viewTeacherId) {
                setCurrentPage('teacher-detail');
              } else {
                navigate('teachers');
              }
            }}
          />
        );

      case 'teacher-detail':
        return (
          <TeacherDetail
            key={refreshKey}
            teacherId={viewTeacherId}
            onBack={() => navigate('teachers')}
            onEdit={(teacher) => {
              setEditTeacher(teacher);
              setCurrentPage('edit-teacher');
            }}
          />
        );

      case 'calendar':
        return <Calendar key={refreshKey} />;

      case 'available':
        return (
          <AvailableTeachers
            key={refreshKey}
            onNavigate={navigate}
            onViewTeacher={viewTeacher}
          />
        );

      default:
        return <Dashboard key={refreshKey} onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <span style={{ fontWeight: 600, marginLeft: '12px' }}>代課老師管理系統</span>
      </div>

      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        teacherCount={teachers.length}
        scheduleCount={schedules.length}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        onDataChange={refresh}
      />

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
