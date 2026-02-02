import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import all the original apps
import LoginApp from './apps/login/App';
import AdminApp from './apps/admin/App';
import DirectorApp from './apps/director/App';
import DepartmentApp from './apps/department/App';
import FoetApp from './apps/foet/App';

// Import all CSS files to ensure styling is preserved
import './apps/login/index.css';
import './apps/login/App.css';
import './apps/login/pages/HomePage/HomePage.css';
import './apps/login/pages/RmpLoginPage/RmpLoginPage.css';
import './apps/login/pages/TrichyLoginPage/TrichyLoginPage.css';

import './apps/admin/index.css';
import './apps/admin/admin-portal/adminportal.css';
import './apps/admin/admin-portal/components/Checklist.css';
import './apps/admin/admin-portal/components/Examination.css';
import './apps/admin/admin-portal/components/Faculties.css';
import './apps/admin/admin-portal/components/Result.css';
import './apps/admin/admin-portal/components/ScholarManagement.css';
import './apps/admin/admin-portal/components/Sidebar.css';

import './apps/director/index.css';
import './apps/director/director-portal/DirectorPortal.css';
import './apps/director/director-portal/components/Examination.css';
import './apps/director/director-portal/components/Faculties.css';
import './apps/director/director-portal/components/PartTimeSplit.css';
import './apps/director/director-portal/components/Result.css';
import './apps/director/director-portal/components/ScholarManagement.css';
import './apps/director/director-portal/components/Sidebar.css';

import './apps/department/index.css';
import './apps/department/styles/App.css';

import './apps/foet/App.css';
import './apps/foet/components/AdminForwardPage.css';
import './apps/foet/components/Dashboard.css';
import './apps/foet/components/DepartmentControl.css';
import './apps/foet/components/Header.css';
import './apps/foet/components/Results.css';
import './apps/foet/components/ScholarExamDistribution.css';
import './apps/foet/components/ScholarManagement.css';
import './apps/foet/components/Sidebar.css';
import './apps/foet/components/SubmissionWorkflow.css';
import './apps/foet/components/Modals/MessageBox.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login routes - preserve original login system */}
        <Route path="/login/*" element={<LoginApp />} />
        
        {/* Role-specific routes - each app gets its own space */}
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/director/*" element={<DirectorApp />} />
        <Route path="/department/*" element={<DepartmentApp />} />
        <Route path="/foet/*" element={<FoetApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;