// src/App.js
import { Routes, Route } from 'react-router-dom';
import React from 'react';
import HomePage from './pages/HomePage/HomePage.js';
import UnifiedLoginPage from './pages/UnifiedLoginPage/UnifiedLoginPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage.js';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage.js';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="rmp-login" element={<UnifiedLoginPage />} />
      <Route path="trp-login" element={<UnifiedLoginPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}

export default App;
