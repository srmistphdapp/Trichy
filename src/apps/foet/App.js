import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

// Supabase
import { supabase } from '../../supabaseClient';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DepartmentControl from './components/DepartmentControl';
import ScholarManagement from './components/ScholarManagement';
import AdminForwardPage from './components/AdminForwardPage';
import QueryScholar from './components/QueryScholar';
import ScholarExamDistribution from './components/ScholarExamDistribution';
import SubmissionWorkflow from './components/SubmissionWorkflow';
import Results from './components/Results';
import FOETResult from './components/FOETResult';
import QuestionPapers from './components/QuestionPapers';

// Modals
import SettingsModal from './components/Modals/SettingsModal';
import MessageBox from './components/Modals/MessageBox';

// Data and Utils
import { appData, cgpaEligibilityCriteria, facultyAcronyms } from './data/appData';
import { generateUniqueId, getFacultyDetails, getFacultyByDepartmentFromAll, checkCGPAEligibility } from './utils/helpers';

// Supabase Services
import {
  fetchFacultyScholars,
  fetchAdminForwardScholars,
  fetchQueryScholars,
  fetchFacultyExaminationRecords,
  fetchFacultyQuestionPapers,
  fetchVivaMarks,
  fetchSubmissionLogs,
  fetchDepartments
} from './services/supabaseService';

// Context for global state
const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

function App() {
  const location = useLocation();

  // Map routes to tab names
  const getTabFromRoute = (pathname) => {
    // Remove /foet prefix if present
    const cleanPath = pathname.replace(/^\/foet/, '') || '/';
    const routeMap = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/departments': 'DepartmentControl',
      '/scholar-management': 'ScholarManagement',
      '/admin-forward': 'AdminForward',
      '/query-scholar': 'QueryScholar',
      '/examination': 'ScholarExamDistribution',
      '/workflow': 'SubmissionWorkflow',
      '/foet-result': 'FOETResult',
      '/question-papers': 'QuestionPapers'
    };
    return routeMap[cleanPath] || 'Dashboard';
  };

  // Global State
  const [selectedCampusId] = useState('RMP');
  const [selectedFacultyId] = useState('FOET');
  const [currentActiveTab, setCurrentActiveTab] = useState(getTabFromRoute(location.pathname));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Filter and Sort States
  const [departmentSortOrder, setDepartmentSortOrder] = useState('asc');
  const [departmentFilters, setDepartmentFilters] = useState({ departmentName: 'All' });
  const [examSortOrder, setExamSortOrder] = useState('asc');
  const [examFilters, setExamFilters] = useState({ department: 'All', status: 'All' });
  const [workflowSortOrder, setWorkflowSortOrder] = useState('asc');
  const [workflowFilters, setWorkflowFilters] = useState({
    mode: 'All',
    department: 'All',
    coordinatorStatus: 'All',
    adminDecision: 'All',
    vivaEvaluator: 'All'
  });
  const [scholarSortOrder, setScholarSortOrder] = useState('asc');
  const [scholarFilters, setScholarFilters] = useState({ specialization: 'All', mode: 'All' });

  // Modal States
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [messageBoxData, setMessageBoxData] = useState({
    show: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  });

  // User Settings
  const [coordinatorName, setCoordinatorName] = useState('Research Coordinator');
  const [coordinatorImage, setCoordinatorImage] = useState('https://placehold.co/40x40/EBF4FF/1D4ED8?text=RC');
  const [currentTheme, setCurrentTheme] = useState('default');
  const [coordinatorInfo, setCoordinatorInfo] = useState(null);
  const [assignedFaculty, setAssignedFaculty] = useState(null);

  // Data State (you might want to use a more sophisticated state management solution for production)
  const [data, setData] = useState(appData);

  // Supabase Data States
  const [scholarsData, setScholarsData] = useState([]);
  const [adminScholarsData, setAdminScholarsData] = useState([]);
  const [queryScholarsData, setQueryScholarsData] = useState([]);
  const [examinationsData, setExaminationsData] = useState([]);
  const [questionPapersData, setQuestionPapersData] = useState([]);
  const [vivaMarksData, setVivaMarksData] = useState([]);
  const [submissionLogsData, setSubmissionLogsData] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);

  // Load coordinator info from Supabase using authenticated user
  useEffect(() => {
    const loadCoordinatorInfo = async () => {
      try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        if (user && user.email) {
          // Fetch coordinator info from database
          const { data: coordinatorData, error } = await supabase
            .from('coordinators')
            .select('*')
            .eq('email', user.email)
            .eq('status', 'Active')
            .single();

          if (!error && coordinatorData) {
            const info = {
              name: coordinatorData.name,
              email: coordinatorData.email,
              faculty: coordinatorData.assigned_faculty,
              campus: coordinatorData.campus
            };
            setCoordinatorInfo(info);
            setAssignedFaculty(coordinatorData.assigned_faculty);
            setCoordinatorName(coordinatorData.name);
            console.log('Coordinator loaded from Supabase:', info);
            console.log('Assigned Faculty:', coordinatorData.assigned_faculty);
          } else {
            console.error('Error loading coordinator:', error);
          }
        }
      } catch (err) {
        console.error('Exception loading coordinator info:', err);
      }
    };

    // Listen to auth state changes to maintain session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);

      if (event === 'SIGNED_IN' && session) {
        // User signed in - load coordinator info
        loadCoordinatorInfo();
      } else if (event === 'SIGNED_OUT') {
        // User signed out - redirect to login
        window.location.pathname = '/';
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed - session is still valid
        console.log('Token refreshed successfully');
      }
    });

    // Initial load
    loadCoordinatorInfo();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Theme management
  const themes = {
    default: { name: 'SRM Blue', colors: { '--primary-blue': '#0d47a1', '--secondary-blue': '#1e88e5' } },
    emerald: { name: 'Emerald Sea', colors: { '--primary-blue': '#065f46', '--secondary-blue': '#10b981' } },
    indigo: { name: 'Royal Indigo', colors: { '--primary-blue': '#4338ca', '--secondary-blue': '#818cf8' } },
    crimson: { name: 'Crimson Red', colors: { '--primary-blue': '#991b1b', '--secondary-blue': '#f87171' } }
  };

  const applyTheme = useCallback((themeName) => {
    const theme = themes[themeName];
    if (!theme) return;

    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    setCurrentTheme(themeName);
    localStorage.setItem('srm-coordinator-theme', themeName);
  }, [themes]);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedName = localStorage.getItem('srm-coordinator-name');
    const savedImage = localStorage.getItem('srm-coordinator-image');
    const savedTheme = localStorage.getItem('srm-coordinator-theme') || 'default';

    if (savedName) setCoordinatorName(savedName);
    if (savedImage) setCoordinatorImage(savedImage);
    setCurrentTheme(savedTheme);

    applyTheme(savedTheme);
  }, [applyTheme]);

  // Load Supabase data on component mount
  useEffect(() => {
    const loadSupabaseData = async () => {
      setIsLoadingSupabase(true);
      try {
        // Fetch all required data from Supabase
        const [scholarsRes, adminScholarsRes, queryScholarsRes, examsRes, qpRes, vivaRes, logsRes, deptRes] = await Promise.all([
          fetchFacultyScholars(assignedFaculty),
          fetchAdminForwardScholars(assignedFaculty),
          fetchQueryScholars(assignedFaculty),
          fetchFacultyExaminationRecords(assignedFaculty),
          fetchFacultyQuestionPapers(assignedFaculty),
          fetchVivaMarks(),
          fetchSubmissionLogs(),
          fetchDepartments(assignedFaculty)
        ]);

        // Handle scholars data - already filtered by faculty in the service
        if (scholarsRes.data) {
          setScholarsData(scholarsRes.data);
          console.log(`Loaded ${scholarsRes.data.length} scholars for ${assignedFaculty}`);
        }

        // Handle admin scholars data - filtered by dept_status
        if (adminScholarsRes.data) {
          setAdminScholarsData(adminScholarsRes.data);
          console.log(`Loaded ${adminScholarsRes.data.length} admin scholars for ${assignedFaculty}`);
        }

        // Handle query scholars data - filtered by query_resolved and query_faculty
        if (queryScholarsRes.data) {
          setQueryScholarsData(queryScholarsRes.data);
          console.log(`Loaded ${queryScholarsRes.data.length} query scholars for ${assignedFaculty}`);
        }

        // Handle examinations data - already filtered by faculty in the service
        if (examsRes.data) {
          setExaminationsData(examsRes.data);
          console.log(`Loaded ${examsRes.data.length} examination records for ${assignedFaculty}`);
        }

        // Handle question papers data - already filtered by faculty in the service
        if (qpRes.data) {
          setQuestionPapersData(qpRes.data);
          console.log(`Loaded ${qpRes.data.length} question papers for ${assignedFaculty}`);
        }

        // Handle viva marks data
        if (vivaRes.data) {
          setVivaMarksData(vivaRes.data);
        }

        // Handle submission logs data
        if (logsRes.data) {
          setSubmissionLogsData(logsRes.data);
        }

        // Handle departments data - already filtered by faculty in the service
        if (deptRes.data) {
          setDepartmentsData(deptRes.data);
          console.log(`Loaded ${deptRes.data.length} departments for ${assignedFaculty}`);
        }
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        setIsLoadingSupabase(false);
      }
    };

    // Only load data when assignedFaculty is available
    if (assignedFaculty) {
      loadSupabaseData();
    }
  }, [assignedFaculty]);

  // Realtime subscription for scholar_applications changes
  useEffect(() => {
    if (!assignedFaculty) return;

    console.log('Setting up realtime subscription for scholar_applications...');

    // Subscribe to changes on scholar_applications table
    const subscription = supabase
      .channel('scholar_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'scholar_applications'
        },
        (payload) => {
          console.log('📡 Database change detected:', payload.eventType, payload);

          // Refresh data whenever any change occurs
          const refreshAfterChange = async () => {
            console.log('🔄 Refreshing data after database change...');

            try {
              const [scholarsRes, adminScholarsRes, queryScholarsRes] = await Promise.all([
                fetchFacultyScholars(assignedFaculty),
                fetchAdminForwardScholars(assignedFaculty),
                fetchQueryScholars(assignedFaculty)
              ]);

              if (scholarsRes.data) setScholarsData(scholarsRes.data);
              if (adminScholarsRes.data) setAdminScholarsData(adminScholarsRes.data);
              if (queryScholarsRes.data) setQueryScholarsData(queryScholarsRes.data);

              console.log('✓ Data refreshed after change');
            } catch (err) {
              console.error('Error refreshing after database change:', err);
            }
          };

          refreshAfterChange();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up realtime subscription...');
      subscription.unsubscribe();
    };
  }, [assignedFaculty]);

  // Message Box function
  const showMessageBox = (message, type = 'alert', onConfirm = null) => {
    setMessageBoxData({
      show: true,
      title: type === 'confirm' ? 'Please Confirm' : 'Notification',
      message,
      type,
      onConfirm
    });
  };

  const closeMessageBox = () => {
    setMessageBoxData(prev => ({ ...prev, show: false }));
  };

  const handleMessageBoxConfirm = (confirmed) => {
    if (messageBoxData.onConfirm) {
      messageBoxData.onConfirm(confirmed);
    }
    closeMessageBox();
  };

  // Save settings
  const saveSettings = (newName, newImageFile) => {
    if (newName) {
      setCoordinatorName(newName);
      localStorage.setItem('srm-coordinator-name', newName);
    }

    if (newImageFile) {
      if (newImageFile.size < 2 * 1024 * 1024 && newImageFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
          setCoordinatorImage(e.target.result);
          localStorage.setItem('srm-coordinator-image', e.target.result);
        };
        reader.readAsDataURL(newImageFile);
        return true;
      } else {
        return false;
      }
    }
    return true;
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.log('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.log('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isInFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isInFullscreen);

      // Add/remove CSS class to body for styling
      if (isInFullscreen) {
        document.body.classList.add('fullscreen-mode');
      } else {
        document.body.classList.remove('fullscreen-mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Context value
  const contextValue = {
    // Global state
    selectedCampusId,
    selectedFacultyId,
    currentActiveTab,
    setCurrentActiveTab,
    isFullscreen,
    toggleFullscreen,
    sidebarCollapsed,
    setSidebarCollapsed,

    // Filter and sort states
    departmentSortOrder,
    setDepartmentSortOrder,
    departmentFilters,
    setDepartmentFilters,
    examSortOrder,
    setExamSortOrder,
    examFilters,
    setExamFilters,
    workflowSortOrder,
    setWorkflowSortOrder,
    workflowFilters,
    setWorkflowFilters,
    scholarSortOrder,
    setScholarSortOrder,
    scholarFilters,
    setScholarFilters,

    // User settings
    coordinatorName,
    coordinatorImage,
    currentTheme,
    themes,
    applyTheme,
    saveSettings,

    // Coordinator info
    coordinatorInfo,
    assignedFaculty,

    // Data
    data,
    setData,

    // Supabase Data
    scholarsData,
    setScholarsData,
    adminScholarsData,
    setAdminScholarsData,
    queryScholarsData,
    setQueryScholarsData,
    examinationsData,
    setExaminationsData,
    questionPapersData,
    setQuestionPapersData,
    vivaMarksData,
    setVivaMarksData,
    submissionLogsData,
    setSubmissionLogsData,
    departmentsData,
    setDepartmentsData,
    isLoadingSupabase,

    // Refresh functions for updating data after mutations
    refreshScholarsData: async () => {
      if (!assignedFaculty) return;
      console.log('Refreshing scholars data after mutation...');

      try {
        const [scholarsRes, adminScholarsRes, queryScholarsRes] = await Promise.all([
          fetchFacultyScholars(assignedFaculty),
          fetchAdminForwardScholars(assignedFaculty),
          fetchQueryScholars(assignedFaculty)
        ]);

        if (scholarsRes.data) {
          setScholarsData(scholarsRes.data);
          console.log(`✓ Refreshed ${scholarsRes.data.length} scholars`);
        }

        if (adminScholarsRes.data) {
          setAdminScholarsData(adminScholarsRes.data);
          console.log(`✓ Refreshed ${adminScholarsRes.data.length} admin scholars`);
        }

        if (queryScholarsRes.data) {
          setQueryScholarsData(queryScholarsRes.data);
          console.log(`✓ Refreshed ${queryScholarsRes.data.length} query scholars`);
        }

        return true;
      } catch (err) {
        console.error('Error refreshing scholars data:', err);
        return false;
      }
    },

    // Utility functions
    showMessageBox,
    generateUniqueId,
    getFacultyDetails: () => getFacultyDetails(selectedCampusId, selectedFacultyId, data),
    getFacultyByDepartmentFromAll: (departmentName) => getFacultyByDepartmentFromAll(departmentName, selectedCampusId, data),
    checkCGPAEligibility: (scholar) => checkCGPAEligibility(scholar, selectedCampusId, selectedFacultyId, cgpaEligibilityCriteria),

    // Constants
    facultyAcronyms,
    cgpaEligibilityCriteria
  };

  // Update active tab when route changes
  useEffect(() => {
    setCurrentActiveTab(getTabFromRoute(location.pathname));
  }, [location.pathname]);


  return (
    <AppContext.Provider value={contextValue}>
      <div className="sidebar-layout-container">
        <Sidebar />

        {/* Main Content Area */}
        <main className={`main-content-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <Header />
          <div className="content-wrapper">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/departments" element={<DepartmentControl />} />
              <Route path="/scholar-management" element={<ScholarManagement />} />
              <Route path="/admin-forward" element={<AdminForwardPage />} />
              <Route path="/query-scholar" element={<QueryScholar />} />
              <Route path="/examination" element={<ScholarExamDistribution />} />
              <Route path="/workflow" element={<SubmissionWorkflow />} />
              <Route path="/results" element={<Results />} />
              <Route path="/foet-result" element={<FOETResult />} />
              <Route path="/question-papers" element={<QuestionPapers />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <MessageBox
        {...messageBoxData}
        onClose={closeMessageBox}
        onConfirm={handleMessageBoxConfirm}
      />
    </AppContext.Provider>
  );
}

export default App;