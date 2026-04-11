// client/src/routes/AppRoutes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Public Pages
import Home from '../pages/public/Home';
import About from '../pages/public/About';
import Academics from '../pages/public/Academics';
import Facilities from '../pages/public/Facilities';
import Admissions from '../pages/public/Admissions';
import Contact from '../pages/public/Contact';
import Login from '../pages/public/Login';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminStudents from '../pages/admin/Students';
import AdminTeachers from '../pages/admin/Teachers';
import AdminAttendance from '../pages/admin/Attendance';
import AdminFees from '../pages/admin/Fees';
import FeesGenerator from '../pages/admin/FeesGenerator';
import AdminPayments from '../pages/admin/Payments';
import AdminReports from '../pages/admin/Reports';
import AdminCanteen from '../pages/admin/Canteen';
import AdminInventory from '../pages/admin/Inventory';
import AdminSettings from '../pages/admin/Settings';
import AdminSiblings from '../pages/admin/Siblings';
import AdminExams from '../pages/admin/exams/Exams';
import CreateExam from '../pages/admin/exams/CreateExam';
import EditExam from '../pages/admin/exams/EditExam';
import ExamResults from '../pages/admin/exams/ExamResults';
import Promotion from '../pages/admin/exams/Promotion';
import ExamReports from '../pages/admin/exams/Reports';

// Teacher Pages
import TeacherDashboard from '../pages/teacher/Dashboard';
import TeacherAttendance from '../pages/teacher/Attendance';
import TeacherClasses from '../pages/teacher/Classes';
import TeacherStudents from '../pages/teacher/Students';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import TeacherLayout from '../layouts/TeacherLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="academics" element={<Academics />} />
        <Route path="facilities" element={<Facilities />} />
        <Route path="admissions" element={<Admissions />} />
        <Route path="contact" element={<Contact />} />
        <Route path="login" element={<Login />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="fees/generator" element={<FeesGenerator />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="canteen" element={<AdminCanteen />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="siblings" element={<AdminSiblings />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="exams/create" element={<CreateExam />} />
        <Route path="exams/edit/:id" element={<EditExam />} />
        <Route path="exams/:id/results" element={<ExamResults />} />
        <Route path="exams/:id/promote" element={<Promotion />} />
        <Route path="exams/reports" element={<ExamReports />} />
      </Route>

      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="students" element={<TeacherStudents />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;
