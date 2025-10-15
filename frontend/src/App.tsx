import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SeekerDashboard from './pages/seeker/Dashboard';
import EmployerDashboard from './pages/employer/Dashboard';
import EmployerProfile from './pages/employer/Profile';
import JobDetails from './pages/seeker/JobDetails';
import ApplicationStatus from './pages/seeker/ApplicationStatus';
import SeekerProfile from './pages/seeker/Profile';
import JobPostingForm from './pages/employer/JobPostingForm';
import ApplicationReview from './pages/employer/ApplicationReview';
import ChatPage from './pages/chat/ChatPage';
import ChatRooms from './pages/chat/ChatRooms';
import EmployerJobDetails from './pages/employer/JobDetails';
import EmployerJobEdit from './pages/employer/JobEdit';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Jobs from './pages/Jobs';

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Home />;
  return <Navigate to={user?.role === 'seeker' ? '/seeker' : '/employer'} replace />;
};

function App() {
  return (
    <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              {/* Public routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/jobs" element={<Jobs />} />

              {/* Protected routes - Job Seeker */}
              <Route element={<ProtectedRoute allowedRoles={['seeker']} />}>
                <Route path="/seeker" element={<SeekerDashboard />} />
                <Route path="/seeker/profile" element={<SeekerProfile />} />
                <Route path="/seeker/jobs/:jobId" element={<JobDetails />} />
                <Route path="/seeker/applications/:id" element={<ApplicationStatus />} />
              </Route>

              {/* Protected routes - Employer */}
              <Route element={<ProtectedRoute allowedRoles={['employer']} />}> 
                <Route path="/employer" element={<EmployerDashboard />} />
                <Route path="/employer/profile" element={<EmployerProfile />} />
                <Route path="/employer/jobs/new" element={<JobPostingForm />} />
                <Route path="/employer/jobs/:jobId" element={<EmployerJobDetails />} />
                <Route path="/employer/jobs/:jobId/edit" element={<EmployerJobEdit />} />
                <Route path="/employer/jobs/:jobId/applications" element={<ApplicationReview />} />
                <Route path="/employer/applications/:id" element={<ApplicationReview />} />
              </Route>

              {/* Chat - accessible to both roles */}
              <Route element={<ProtectedRoute allowedRoles={['seeker', 'employer']} />}> 
                <Route path="/chat" element={<ChatRooms />} />
                <Route path="/chat/:roomId" element={<ChatPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['seeker']} />}>
              <Route path="/seeker/applications" element={<ApplicationStatus />} />
              <Route path="/seeker/applications/:id" element={<ApplicationStatus />} />
              </Route>

              {/* Smart home: public landing or redirect when logged-in */}
              <Route path="/" element={<HomeRedirect />} />
            </Routes>
          </div>
        </div>
    </AuthProvider>
  );
}

export default App;