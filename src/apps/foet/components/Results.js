 import { useState, useEffect } from 'react';
import { SlidersHorizontal, ChevronRight, X, Eye, Send, ArrowUpDown } from 'lucide-react';
import { useAppContext } from '../App';
import * as XLSX from 'xlsx';
import RankListModal from './RankListModal';
import MessageBox from './Modals/MessageBox';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import './Results.css';

// Department mapping for short forms
const DEPARTMENT_MAPPING = {
  // Faculty of Engineering & Technology (11 departments)
  'Biomedical Engineering': 'BME',
  'Biotechnology': 'ENGBIO',
  'Chemistry': 'ENGCHEM', 
  'Civil Engineering': 'CIVIL',
  'Computer Science and Engineering': 'CSE',
  'Computer Science And Engineering': 'CSE',
  'Computer Science Engineering': 'CSE',
  'Electrical and Electronics Engineering': 'EEE',
  'Electronics and Communication Engineering': 'ECE',
  'English': 'ENGENG', 
  'Mathematics': 'ENGMATH', 
  'Mechanical Engineering': 'MECH',
  'Physics': 'ENGPHYS', 
  
  // Faculty of Management (1 department)
  'Management Studies': 'MBA',
  
  // Faculty of Medical and Health Sciences (10 departments)
  'Department of Basic Medical Sciences': 'BMS',
  'Basic Medical Sciences': 'BMS',
  'Department of Conservative Dentistry & Endodontics': 'CDE',
  'Conservative Dentistry & Endodontics': 'CDE',
  'Department of Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
  'Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
  'Department of Oral and Maxillofacial Surgery': 'OMS',
  'Oral and Maxillofacial Surgery': 'OMS',
  'Department of Oral Medicine and Radiology': 'OMR',
  'Oral Medicine and Radiology': 'OMR',
  'Department of Orthodontics': 'ORTHO',
  'Orthodontics': 'ORTHO',
  'Department of Pediatric and Preventive Dentistry': 'PPD',
  'Pediatric and Preventive Dentistry': 'PPD',
  'Department of Periodontics and Oral Implantology': 'POI',
  'Periodontics and Oral Implantology': 'POI',
  'Department of Prosthodontics': 'PROSTH',
  'Prosthodontics': 'PROSTH',
  'Department of Public Health Dentistry': 'PHD',
  'Public Health Dentistry': 'PHD',
  
  // Faculty of Science & Humanities (8 departments)
  'Biotechnology': 'BIO', 
  'Commerce': 'COMM',
  'Computer Science': 'CS',
  'English & Foreign Languages': 'EFL',
  'Fashion Designing': 'FASHION',
  'Mathematics': 'MATH', 
  'Tamil': 'TAMIL',
  'Visual Communication': 'VISCOM',
  'Visual Communications': 'VISCOM'
};

const Results = () => {
  const { departmentsData, vivaMarksData, examinationsData, isLoadingSupabase, assignedFaculty, coordinatorInfo, coordinatorName } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaculty, setExpandedFaculty] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [modal, setModal] = useState(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [publishDepartment, setPublishDepartment] = useState(null);
  const [publishedDepartments, setPublishedDepartments] = useState(new Set());
  const [showPublishAllConfirm, setShowPublishAllConfirm] = useState(false);
  const [showPublishAllSuccess, setShowPublishAllSuccess] = useState(false);
  const [publishAllCount, setPublishAllCount] = useState(0);
  const [isPublishConfirmed, setIsPublishConfirmed] = useState(false);
  const [isPublishAllConfirmed, setIsPublishAllConfirmed] = useState(false);
  
  // MessageBox state
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '', type: 'info' });
  
  // New state for sorting and filtering
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    department: 'all', // 'all' or specific department name
    publishStatus: 'all' // 'all', 'published', 'unpublished'
  });
  
  // Use Supabase viva marks data if available
  const [vivaMarks, setVivaMarks] = useState(vivaMarksData.length > 0 ? vivaMarksData : []);
  
  useEffect(() => {
    if (vivaMarksData.length > 0) {
      setVivaMarks(vivaMarksData);
    }
  }, [vivaMarksData]);

  // Show loading state if departments are still being fetched
  if (isLoadingSupabase) {
    return (
      <div className="results-container">
        <div className="results-header">
          <h2>Result</h2>
        </div>
        <div className="results-content">
          <div className="loading-state">
            <p>Loading departments...</p>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('Results Component Debug:');
  console.log('Assigned Faculty:', assignedFaculty);
  console.log('All Departments Data:', departmentsData);
  console.log('All Departments Count:', departmentsData?.length || 0);
  console.log('Published Departments:', filteredPublishedDepartments);
  console.log('Published Departments Count:', filteredPublishedDepartments?.length || 0);
  console.log('Faculty Object:', faculty);

  // Show message if no published departments found for this faculty
  if (!filteredPublishedDepartments || filteredPublishedDepartments.length === 0) {
    return (
      <div className="results-container">
        <div className="results-header">
          <h2>Result</h2>
        </div>
        <div className="results-content">
          <div className="no-departments">
            <p>No published results found for {assignedFaculty || 'this faculty'}.</p>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to extract department name from program string
  const extractDepartmentFromProgram = (program) => {
    console.log('🔧 Extracting department from program:', program);
    
    if (!program || program === 'N/A') {
      console.log('❌ No valid program provided');
      return '';
    }
    
    // If it's a faculty name like "Faculty of Engineering & Technology", extract the main part
    if (program.includes('Faculty of')) {
      const match = program.match(/Faculty of (.+)/i);
      if (match) {
        const department = match[1].trim();
        console.log('✅ Extracted department from faculty:', department);
        return department;
      }
    }
    
    // Extract department name from program string like "Ph.d. - Biomedical Engineering (ph.d. - Pti - E And T)"
    // Look for the pattern after "Ph.d. - " and before " ("
    const match = program.match(/Ph\.d\.\s*-\s*([^(]+)/i);
    if (match) {
      const department = match[1].trim();
      console.log('✅ Extracted department (main pattern):', department);
      return department;
    }
    
    // Try alternative patterns
    // Look for patterns like "Biomedical Engineering" directly
    const altMatch = program.match(/([A-Za-z\s]+Engineering|[A-Za-z\s]+Science|[A-Za-z\s]+Technology|[A-Za-z\s]+Management)/i);
    if (altMatch) {
      const department = altMatch[1].trim();
      console.log('✅ Extracted department (alt pattern):', department);
      return department;
    }
    
    // Fallback: return the program as is
    console.log('⚠️ Using program as department (fallback):', program);
    return program;
  };

  // Create faculty object from Supabase departments data - ONLY departments with published results
  const getPublishedDepartments = () => {
    if (!departmentsData || !examinationsData || examinationsData.length === 0) {
      return [];
    }

    // Filter departments that have published results
    return departmentsData.filter(dept => {
      // Check if this department has any published results in examination_records
      const hasPublishedResults = examinationsData.some(record => {
        // Extract department from program field
        const recordDepartment = extractDepartmentFromProgram(record.program);
        
        // Check if department matches
        const departmentMatch = recordDepartment === dept.department_name ||
                               recordDepartment.toLowerCase().includes(dept.department_name.toLowerCase()) ||
                               dept.department_name.toLowerCase().includes(recordDepartment.toLowerCase());
        
        // Check if result is published using the same keywords as line 661-670
        const isPublished = record.result_dir && 
                           (record.result_dir.includes('Published to Engineering') ||
                            record.result_dir.includes('Published to Management') ||
                            record.result_dir.includes('Published to Science') ||
                            record.result_dir.includes('Published to Medical') ||
                            record.result_dir.includes('Publish to Engineering') ||
                            record.result_dir.includes('Publish to Management') ||
                            record.result_dir.includes('Publish to Science') ||
                            record.result_dir.includes('Publish to Medical') ||
                            record.result_dir.toLowerCase().includes('publish'));
        
        return departmentMatch && isPublished;
      });
      
      return hasPublishedResults;
    });
  };

  const filteredPublishedDepartments = getPublishedDepartments();

  const faculty = {
    id: 'current_faculty',
    name: assignedFaculty || 'Faculty',
    departments: filteredPublishedDepartments.map(dept => ({
      id: dept.id,
      name: dept.department_name
    }))
  };

  console.log('Faculty Object:', faculty);

  // Filter and sort departments based on current criteria
  const getFilteredAndSortedDepartments = () => {
    let departments = [...faculty.departments];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      departments = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply department filter
    if (filters.department !== 'all') {
      departments = departments.filter(dept => dept.name === filters.department);
    }
    
    // Apply publish status filter
    if (filters.publishStatus !== 'all') {
      departments = departments.filter(dept => {
        const isPublished = publishedDepartments.has(dept.id);
        return filters.publishStatus === 'published' ? isPublished : !isPublished;
      });
    }
    
    // Apply sorting with null safety
    departments.sort((a, b) => {
      const nameA = (a.name || '').toString();
      const nameB = (b.name || '').toString();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    
    return departments;
  };

  // Handle sort button click
  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Handle filter modal
  const handleShowFilter = () => {
    setShowFilterModal(true);
  };

  const handleCloseFilter = () => {
    setShowFilterModal(false);
  };

  const handleApplyFilters = () => {
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setFilters({
      department: 'all',
      publishStatus: 'all'
    });
  };

  const handleFacultyClick = (facultyId) => {
    if (expandedFaculty === facultyId) {
      setExpandedFaculty(null);
      setSelectedDepartment(null);
    } else {
      setExpandedFaculty(facultyId);
      setSelectedDepartment(null);
    }
  };



  const handleBackToFaculty = () => {
    setSelectedDepartment(null);
  };

  const handleViewFTRanks = (department) => {
    console.log('=== VIEWING FT RANKS ===');
    console.log('Department:', department);
    console.log('Department name:', department.name);
    
    // DEBUG: Show all available departments from examination records
    if (examinationsData && examinationsData.length > 0) {
      const availableDepartments = [...new Set(examinationsData.map(record => {
        const dept = extractDepartmentFromProgram(record.program);
        return dept;
      }).filter(Boolean))];
      
      console.log('=== AVAILABLE DEPARTMENTS IN EXAMINATION RECORDS ===');
      console.log('Available departments:', availableDepartments);
      console.log(`Searching for: "${department.name}"`);
      console.log('Exact matches:', availableDepartments.filter(dept => dept === department.name));
      console.log('Partial matches:', availableDepartments.filter(dept => 
        dept.toLowerCase().includes(department.name.toLowerCase()) || 
        department.name.toLowerCase().includes(dept.toLowerCase())
      ));
    }
    
    const ftScholars = getScholarsForDepartment(department.name, 'Full Time');
    console.log('FT Scholars result:', ftScholars);
    
    const modalData = {
      deptName: department.name,
      scholarType: 'Full Time',
      rows: ftScholars.map((scholar, index) => ({
        id: scholar.id,
        rank: index + 1,
        name: scholar['Registered Name'] || scholar.registered_name || 'N/A',
        applicationNo: scholar['Application Number'] || scholar.application_no || 'N/A',
        written: scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        viva: scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        total: scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        qualified: scholar.status === 'Qualified' || (scholar.totalMarks !== 'Absent' && scholar.status !== 'Absent' && (parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 60)),
        program: scholar.program || 'N/A'
      })),
      searchActive: false
    };
    console.log('Modal data:', modalData);
    setModal(modalData);
  };

  const handleViewPTRanks = (department) => {
    console.log('=== VIEWING PT RANKS ===');
    console.log('Department:', department);
    console.log('Department name:', department.name);
    
    const ptScholars = getScholarsForDepartment(department.name, 'Part Time');
    console.log('PT Scholars result:', ptScholars);
    
    const modalData = {
      deptName: department.name,
      scholarType: 'Part Time',
      rows: ptScholars.map((scholar, index) => ({
        id: scholar.id,
        rank: index + 1,
        name: scholar['Registered Name'] || scholar.registered_name || 'N/A',
        applicationNo: scholar['Application Number'] || scholar.application_no || 'N/A',
        partTimeDetails: scholar.originalType || scholar.type || 'Internal', // Show specific part-time type
        written: scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        viva: scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        total: scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        qualified: scholar.status === 'Qualified' || (scholar.totalMarks !== 'Absent' && scholar.status !== 'Absent' && (parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 60)),
        program: scholar.program || 'N/A'
      })),
      searchActive: false
    };
    console.log('Modal data:', modalData);
    setModal(modalData);
  };



  const handlePublish = async (department) => {
    setPublishDepartment(department);
    setIsPublishConfirmed(false); // Reset confirmation state
    setShowPublishConfirm(true);
  };

  const confirmPublish = async () => {
    if (publishDepartment) {
      try {
        // Get department short form
        const deptShortForm = DEPARTMENT_MAPPING[publishDepartment.name] || publishDepartment.name;
        const publishValue = `Published_To_${deptShortForm}`;
        
        console.log(`Publishing ${publishDepartment.name} results to department with value: ${publishValue}`);
        
        // Get all scholars for this department (both FT and PT)
        const ftScholars = getScholarsForDepartment(publishDepartment.name, 'Full Time');
        const ptScholars = getScholarsForDepartment(publishDepartment.name, 'Part Time');
        const allScholars = [...ftScholars, ...ptScholars];
        
        if (allScholars.length === 0) {
          setMessageBox({ show: true, title: 'Notification', message: 'No scholars found for this department to publish.', type: 'warning' });
          setShowPublishConfirm(false);
          setPublishDepartment(null);
          return;
        }
        
        // Update dept_result column for all scholars in this department
        const scholarIds = allScholars.map(scholar => scholar.id);
        
        const { data, error } = await supabase
          .from('examination_records')
          .update({ dept_result: publishValue })
          .in('id', scholarIds);
        
        if (error) {
          console.error('Error publishing results:', error);
          setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
        } else {
          console.log(`Successfully published ${allScholars.length} scholars to ${publishDepartment.name}`);
          setPublishedDepartments(prev => new Set([...prev, publishDepartment.id]));
          setShowPublishSuccess(true);
        }
      } catch (error) {
        console.error('Exception during publish:', error);
        setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
      }
      
      setShowPublishConfirm(false);
    }
  };

  const cancelPublish = () => {
    setShowPublishConfirm(false);
    setPublishDepartment(null);
    setIsPublishConfirmed(false); // Reset confirmation state
  };

  const closeSuccessModal = () => {
    setShowPublishSuccess(false);
    setPublishDepartment(null);
  };

  const handlePublishAll = () => {
    const unpublishedDepts = faculty.departments.filter(dept => !publishedDepartments.has(dept.id));
    if (unpublishedDepts.length === 0) {
      setMessageBox({ show: true, title: 'Notification', message: 'All departments are already published!', type: 'info' });
      return;
    }
    setPublishAllCount(unpublishedDepts.length);
    setIsPublishAllConfirmed(false); // Reset confirmation state
    setShowPublishAllConfirm(true);
  };

  const confirmPublishAll = async () => {
    const unpublishedDepts = faculty.departments.filter(dept => !publishedDepartments.has(dept.id));
    
    try {
      let totalScholarsPublished = 0;
      
      for (const dept of unpublishedDepts) {
        // Get department short form
        const deptShortForm = DEPARTMENT_MAPPING[dept.name] || dept.name;
        const publishValue = `Published_To_${deptShortForm}`;
        
        // Get all scholars for this department (both FT and PT)
        const ftScholars = getScholarsForDepartment(dept.name, 'Full Time');
        const ptScholars = getScholarsForDepartment(dept.name, 'Part Time');
        const allScholars = [...ftScholars, ...ptScholars];
        
        if (allScholars.length > 0) {
          // Update dept_result column for all scholars in this department
          const scholarIds = allScholars.map(scholar => scholar.id);
          
          const { data, error } = await supabase
            .from('examination_records')
            .update({ dept_result: publishValue })
            .in('id', scholarIds);
          
          if (error) {
            console.error(`Error publishing results for ${dept.name}:`, error);
          } else {
            console.log(`Successfully published ${allScholars.length} scholars to ${dept.name}`);
            totalScholarsPublished += allScholars.length;
          }
        }
      }
      
      const newPublished = new Set(publishedDepartments);
      unpublishedDepts.forEach(dept => {
        newPublished.add(dept.id);
      });
      setPublishedDepartments(newPublished);
      
      console.log(`Total scholars published: ${totalScholarsPublished}`);
      setShowPublishAllConfirm(false);
      setShowPublishAllSuccess(true);
      
    } catch (error) {
      console.error('Exception during publish all:', error);
      setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
      setShowPublishAllConfirm(false);
    }
  };

  const cancelPublishAll = () => {
    setShowPublishAllConfirm(false);
    setPublishAllCount(0);
    setIsPublishAllConfirmed(false); // Reset confirmation state
  };

  const closePublishAllSuccess = () => {
    setShowPublishAllSuccess(false);
    setPublishAllCount(0);
  };

  const handleDownload = (department) => {
    try {
      // Get FT and PT scholars for the department
      const ftScholars = getScholarsForDepartment(department.name, 'Full Time');
      const ptScholars = getScholarsForDepartment(department.name, 'Part Time');

      console.log('Download Debug Info:');
      console.log('Department:', department.name);
      console.log('FT Scholars:', ftScholars);
      console.log('PT Scholars:', ptScholars);

      // Prepare FT data for Excel
      const ftExcelData = ftScholars.map(scholar => ({
        'Rank': scholar.rank,
        'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
        'Registered Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
        'Department': scholar.Specialization,
        'Type': scholar.program || scholar['Mode of Study'] || 'Full Time',
        'Written Marks': scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        'Interview Marks': scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        'Total Marks': scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        'Maximum Marks': 100,
        'Status': scholar.status
      }));

      // Prepare PT data for Excel
      const ptExcelData = ptScholars.map(scholar => ({
        'Rank': scholar.rank,
        'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
        'Registered Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
        'Department': scholar.Specialization,
        'Type': scholar.program || scholar['Mode of Study'] || 'Part Time',
        'Written Marks': scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
        'Interview Marks': scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
        'Total Marks': scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
        'Maximum Marks': 100,
        'Status': scholar.status
      }));

      console.log('FT Excel Data:', ftExcelData);
      console.log('PT Excel Data:', ptExcelData);

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      console.log('Creating workbook...');
      console.log('FT data length:', ftExcelData.length);
      console.log('PT data length:', ptExcelData.length);

      // Add FT sheet if there are FT scholars
      if (ftExcelData.length > 0) {
        console.log('Adding FT sheet with data:', ftExcelData);
        const ftWorksheet = XLSX.utils.json_to_sheet(ftExcelData);
        XLSX.utils.book_append_sheet(workbook, ftWorksheet, 'Full Time Ranks');
      } else {
        console.log('No FT scholars found');
      }

      // Add PT sheet if there are PT scholars
      if (ptExcelData.length > 0) {
        console.log('Adding PT sheet with data:', ptExcelData);
        const ptWorksheet = XLSX.utils.json_to_sheet(ptExcelData);
        XLSX.utils.book_append_sheet(workbook, ptWorksheet, 'Part Time Ranks');
      } else {
        console.log('No PT scholars found');
      }

      // If no data found, create an empty sheet with headers
      if (ftExcelData.length === 0 && ptExcelData.length === 0) {
        console.log('No data found, creating empty sheet');
        const emptyData = [{
          'Rank': 'No data available',
          'Application Number': '',
          'Registered Name': '',
          'Department': '',
          'Mode of Study': '',
          'Written Marks': '',
          'Interview Marks': '',
          'Total Marks': '',
          'Maximum Marks': '',
          'Status': ''
        }];
        const emptyWorksheet = XLSX.utils.json_to_sheet(emptyData);
        XLSX.utils.book_append_sheet(workbook, emptyWorksheet, 'No Data');
      }

      console.log('Workbook sheets:', workbook.SheetNames);

      // Generate filename with department name and current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `${department.name.replace(/[^a-zA-Z0-9]/g, '_')}_Ranks_${currentDate}.xlsx`;

      // Save the file
      XLSX.writeFile(workbook, filename);

      console.log(`Downloaded ranks for ${department.name}`);
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while downloading the file. Please try again.', type: 'error' });
    }
  };

  // Helper function to check if department has unpublished scholars (NULL or empty dept_result)
  const hasUnpublishedScholars = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;
    
    // Check if any scholar from this department has NULL or empty dept_result
    return examinationsData.some(record => {
      const recordDepartment = extractDepartmentFromProgram(record.program);
      const departmentMatch = recordDepartment === departmentName ||
                             recordDepartment.toLowerCase().includes(departmentName.toLowerCase()) ||
                             departmentName.toLowerCase().includes(recordDepartment.toLowerCase());
      
      // Check if dept_result is NULL, empty, or undefined
      const hasNoDeptResult = !record.dept_result || record.dept_result === '' || record.dept_result === null;
      
      return departmentMatch && hasNoDeptResult;
    });
  };

  // Helper function to check if department is already published
  const isDepartmentPublished = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;
    
    const deptShortForm = DEPARTMENT_MAPPING[departmentName] || departmentName;
    const publishValue = `Published_To_${deptShortForm}`;
    
    // Check if ALL scholars from this department have been published
    const departmentScholars = examinationsData.filter(record => {
      const recordDepartment = extractDepartmentFromProgram(record.program);
      return recordDepartment === departmentName ||
             recordDepartment.toLowerCase().includes(departmentName.toLowerCase()) ||
             departmentName.toLowerCase().includes(recordDepartment.toLowerCase());
    });
    
    if (departmentScholars.length === 0) return false;
    
    // Department is published only if ALL scholars have the publish value AND no new scholars exist
    const allPublished = departmentScholars.every(record => record.dept_result === publishValue);
    const hasNewScholars = hasUnpublishedScholars(departmentName);
    
    // Button should be disabled only if all are published AND no new scholars
    return allPublished && !hasNewScholars;
  };



  // Get scholars for a specific department and mode from examination records
  const getScholarsForDepartment = (departmentName, mode) => {
    console.log('=== DEBUG: getScholarsForDepartment ===');
    console.log(`Getting scholars for department: "${departmentName}", mode: "${mode}"`);
    console.log('examinationsData:', examinationsData);
    console.log('examinationsData length:', examinationsData?.length || 0);
    
    if (!examinationsData || examinationsData.length === 0) {
      console.log('❌ No examination records available');
      return [];
    }
    
    // DIRECTOR PORTAL METHODOLOGY: Use exact department matching like director portal
    // Filter scholars using the same approach as director portal
    const filtered = examinationsData.filter(record => {
      // Extract department from program field (same as director portal)
      const recordDepartment = extractDepartmentFromProgram(record.program);
      
      // Type matching (same as director portal) - FIXED to handle both formats
      const typeMatch = mode === 'Full Time' ? 
        (record.type === 'FT' || record.type === 'Full Time') : 
        (record.type === 'PT' || record.type === 'Part Time' || record.type === 'Part Time Internal' || record.type === 'Part Time External' || record.type === 'Part Time External (Industry)');
      
      // Department matching - try exact match first, then flexible matching
      const exactDepartmentMatch = recordDepartment === departmentName;
      const flexibleDepartmentMatch = recordDepartment && recordDepartment.toLowerCase().includes(departmentName.toLowerCase());
      const reverseDepartmentMatch = departmentName.toLowerCase().includes(recordDepartment?.toLowerCase() || '');
      
      const departmentMatch = exactDepartmentMatch || flexibleDepartmentMatch || reverseDepartmentMatch;
      
      // Published status check (same as director portal) - improved matching
      const isPublished = record.result_dir && 
                         (record.result_dir.includes('Published to Engineering') ||
                          record.result_dir.includes('Published to Management') ||
                          record.result_dir.includes('Published to Science') ||
                          record.result_dir.includes('Published to Medical') ||
                          record.result_dir.includes('Publish to Engineering') ||
                          record.result_dir.includes('Publish to Management') ||
                          record.result_dir.includes('Publish to Science') ||
                          record.result_dir.includes('Publish to Medical') ||
                          record.result_dir.toLowerCase().includes('publish'));
      
      // Total marks check (same as director portal) - include absent and partial absent scholars
      const hasTotalMarks = (record.total_marks && 
                           !isNaN(parseFloat(record.total_marks)) &&
                           parseFloat(record.total_marks) > 0) ||
                           (record.total_marks === 'Absent') ||
                           (record.written_marks === 'Ab' || record.interview_marks === 'Ab') ||
                           (record.written_marks && parseFloat(record.written_marks) > 0) ||
                           (record.interview_marks && parseFloat(record.interview_marks) > 0);
      
      console.log(`🔍 Filtering Record ${record.id}:`, {
        registered_name: record.registered_name,
        application_no: record.application_no,
        program: record.program,
        recordDepartment: recordDepartment,
        departmentName: departmentName,
        type: record.type,
        mode: mode,
        result_dir: record.result_dir,
        total_marks: record.total_marks,
        exactDepartmentMatch: exactDepartmentMatch,
        flexibleDepartmentMatch: flexibleDepartmentMatch,
        reverseDepartmentMatch: reverseDepartmentMatch,
        departmentMatch: departmentMatch,
        typeMatch: typeMatch,
        isPublished: isPublished,
        hasTotalMarks: hasTotalMarks,
        passesFilter: departmentMatch && typeMatch && isPublished && hasTotalMarks
      });
      
      return departmentMatch && typeMatch && isPublished && hasTotalMarks;
    });
    
    console.log(`✅ Found ${filtered.length} published scholars with marks for ${departmentName} (${mode})`);
    console.log('Filtered records:', filtered);
    
    // Transform and sort by total marks (same as director portal)
    const transformed = filtered
      .map((record, index) => {
        // Handle absent scholars - check if marks are 'Ab' or 'Absent' (including partial absence)
        const isCompletelyAbsent = record.total_marks === 'Absent' || 
                                  (record.written_marks === 'Ab' && record.interview_marks === 'Ab');
        const isPartiallyAbsent = (record.written_marks === 'Ab' && record.interview_marks !== 'Ab') ||
                                 (record.written_marks !== 'Ab' && record.interview_marks === 'Ab');
        
        const writtenMarks = record.written_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.written_marks) || 0);
        const vivaMarks = record.interview_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.interview_marks) || 0);
        
        let totalMarks;
        if (isCompletelyAbsent) {
          totalMarks = 'Absent';
        } else if (record.total_marks && record.total_marks !== 'Absent') {
          totalMarks = Math.round(parseFloat(record.total_marks));
        } else {
          // Calculate total for partial absence cases
          const writtenScore = record.written_marks === 'Ab' ? 0 : (parseFloat(record.written_marks) || 0);
          const vivaScore = record.interview_marks === 'Ab' ? 0 : (parseFloat(record.interview_marks) || 0);
          totalMarks = Math.round(writtenScore + vivaScore);
        }
        
        return {
          id: record.id,
          'Registered Name': record.registered_name || 'N/A',
          'Application Number': record.application_no || 'N/A',
          'Mode of Study': mode,
          Specialization: extractDepartmentFromProgram(record.program) || record.department || 'N/A',
          writtenMarks,
          vivaMarks,
          totalMarks,
          // FIXED: Store the original type from database for display
          originalType: record.type,
          type: record.type,
          // Store the program field for Part Time type display
          program: record.program || 'N/A',
          // Also include the raw field names for compatibility
          registered_name: record.registered_name || 'N/A',
          application_no: record.application_no || 'N/A',
          written_marks: writtenMarks,
          interview_marks: vivaMarks,
          total_marks: totalMarks,
          status: isCompletelyAbsent ? 'Absent' : (parseFloat(totalMarks) >= 60 ? 'Qualified' : 'Not Qualified')
        };
      })
      .sort((a, b) => {
        // Sort completely absent scholars to the bottom, then by total marks
        if (a.totalMarks === 'Absent' && b.totalMarks !== 'Absent') return 1;
        if (a.totalMarks !== 'Absent' && b.totalMarks === 'Absent') return -1;
        if (a.totalMarks === 'Absent' && b.totalMarks === 'Absent') return 0;
        return parseFloat(b.totalMarks) - parseFloat(a.totalMarks);
      })
      .map((scholar, index) => ({ ...scholar, rank: index + 1 }));
    
    console.log('Final transformed scholars:', transformed);
    return transformed;
  };

  if (selectedDepartment) {
    return (
      <div className="results-container">
        <div className="results-header">
          <h2>Result</h2>
          <div className="results-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="sort-btn"><ArrowUpDown size={16} /></button>
            <button className="filter-button">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="results-content">
          <div className="faculty-section expanded">
            <div className="faculty-header" onClick={handleBackToFaculty}>
              <ChevronRight className="faculty-icon rotated" />
              <span className="faculty-title">{faculty.name}</span>
            </div>
            
            <div className="department-list">
              <div className="department-item selected">
                <div className="department-name">{selectedDepartment.name}</div>
                <div className="department-actions">
                  <button 
                    className="action-btn view-ft-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewFTRanks(selectedDepartment);
                    }}
                  >
                    <span className="btn-icon">≡</span>
                    View FT Ranks
                  </button>
                  <button 
                    className="action-btn view-pt-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPTRanks(selectedDepartment);
                    }}
                  >
                    <span className="btn-icon">≡</span>
                    View PT Ranks
                  </button>
                  <button 
                    className={`publish-icon-btn ${
                      publishedDepartments.has(selectedDepartment.id) || isDepartmentPublished(selectedDepartment.name) ? 'published' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!publishedDepartments.has(selectedDepartment.id) && !isDepartmentPublished(selectedDepartment.name)) {
                        handlePublish(selectedDepartment);
                      }
                    }}
                    disabled={publishedDepartments.has(selectedDepartment.id) || isDepartmentPublished(selectedDepartment.name)}
                    title={publishedDepartments.has(selectedDepartment.id) || isDepartmentPublished(selectedDepartment.name) ? 'Published' : 'Publish'}
                  >
                    <Send className="publish-icon-send" />
                  </button>
                  <button 
                    className="action-btn download-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(selectedDepartment);
                    }}
                  >
                    <span className="btn-icon">↓</span>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Result</h2>
        <div className="results-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button 
            className={`sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
            onClick={handleSort}
            title={`Sort ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
          >
            <ArrowUpDown size={16} />
          </button>
          <button 
            className="scholar-control-button"
            onClick={handleShowFilter}
            title="Filter departments"
          >
            <SlidersHorizontal size={20} />
          </button>
          <button 
            className="header-btn publish-btn-header"
            onClick={handlePublishAll}
            title="Publish all departments"
          >
            Publish All
          </button>
        </div>
      </div>

      <div className="results-content">
        <div className="faculty-section">
          <div 
            className={`faculty-header ${expandedFaculty === faculty.id ? 'expanded' : ''}`}
            onClick={() => handleFacultyClick(faculty.id)}
          >
            <ChevronRight className={`faculty-icon ${expandedFaculty === faculty.id ? 'rotated' : ''}`} />
            <span className="faculty-title">{faculty.name}</span>
          </div>
          
          {expandedFaculty === faculty.id && (
            <div className="department-table">
              <div className="table-header">
                <div className="header-cell department-col">DEPARTMENT</div>
                <div className="header-cell ranks-col">FT RANKS</div>
                <div className="header-cell ranks-col">PT RANKS</div>
                <div className="header-cell publish-col">PUBLISH</div>
              </div>
              <div className="table-body">
                {getFilteredAndSortedDepartments().length === 0 ? (
                  <div className="no-results">
                    <p>No departments match your current search and filter criteria.</p>
                  </div>
                ) : (
                  getFilteredAndSortedDepartments().map((department, index) => (
                  <div 
                    key={department.id} 
                    className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}
                  >
                    <div className="table-cell department-col">
                      <span className="department-name">{department.name}</span>
                    </div>
                    <div className="table-cell ranks-col">
                      <button 
                        className="view-icon-btn view-ft-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFTRanks(department);
                        }}
                        title="View FT Ranks"
                      >
                        <Eye className="view-icon-eye" />
                      </button>
                    </div>
                    <div className="table-cell ranks-col">
                      <button 
                        className="view-icon-btn view-pt-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPTRanks(department);
                        }}
                        title="View PT Ranks"
                      >
                        <Eye className="view-icon-eye" />
                      </button>
                    </div>
                    <div className="table-cell publish-col">
                      <button 
                        className={`publish-icon-btn ${
                          publishedDepartments.has(department.id) || isDepartmentPublished(department.name) ? 'published' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!publishedDepartments.has(department.id) && !isDepartmentPublished(department.name)) {
                            handlePublish(department);
                          }
                        }}
                        disabled={publishedDepartments.has(department.id) || isDepartmentPublished(department.name)}
                        title={publishedDepartments.has(department.id) || isDepartmentPublished(department.name) ? 'Published' : 'Publish'}
                      >
                        <Send className="publish-icon-send" />
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New RankListModal */}
      {modal && (
        <RankListModal 
          modalData={modal} 
          closeModal={() => setModal(null)} 
        />
      )}



      {/* Publish Confirmation Modal */}
      {showPublishConfirm && publishDepartment && (
        <div className="publish-confirmation-modal">
          <div className="publish-confirmation-content">
            {/* Header */}
            <div className="publish-confirmation-header">
              <button 
                onClick={cancelPublish}
                className="publish-confirmation-close"
              >
                ×
              </button>
              <h2 className="publish-confirmation-title">
                Confirm Publishing
              </h2>
            </div>

            {/* Content */}
            <div className="publish-confirmation-body">
              {/* Admin Info Section */}
              <div className="admin-info-section">
                <div className="admin-info-row">
                  <span className="admin-info-label">Admin Name:</span> {coordinatorInfo?.name || coordinatorName || 'Research Coordinator'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Role:</span> Research Coordinator, {assignedFaculty || 'Faculty'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Email:</span> <span className="admin-info-email">{coordinatorInfo?.email || 'coordinator@srm.edu.in'}</span>
                </div>
              </div>

              {/* Consent & Confirmation Section */}
              <div className="consent-section">
                <h3 className="consent-title">
                  Consent & Confirmation
                </h3>
                <ul className="consent-list">
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have thoroughly reviewed all submitted results data
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have verified the authenticity of examination records
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    This action will be recorded in the system
                  </li>
                </ul>

                <div className="consent-checkbox-container">
                  <input 
                    type="checkbox" 
                    id="confirmCheckbox"
                    className="consent-checkbox"
                    checked={isPublishConfirmed}
                    onChange={(e) => setIsPublishConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirmCheckbox" className="consent-checkbox-label">
                    I confirm I have read and agree to the above terms
                  </label>
                </div>
              </div>

              {/* Conclusion */}
              <div className="conclusion-section">
                <p className="conclusion-text">
                  You are about to <span className="conclusion-bold">PUBLISH</span> results for {publishDepartment.name} to the department for further processing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <button 
                  onClick={cancelPublish}
                  className="confirmation-cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  className="confirmation-confirm-btn"
                  onClick={confirmPublish}
                  disabled={!isPublishConfirmed}
                >
                  PUBLISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Success Modal */}
      <MessageBox 
        show={showPublishSuccess && publishDepartment}
        title="Notification"
        message={`Successfully forwarded results for ${publishDepartment?.name || 'department'}.`}
        type="success"
        onClose={closeSuccessModal}
      />

      {/* Publish All Confirmation Modal */}
      {showPublishAllConfirm && (
        <div className="publish-confirmation-modal">
          <div className="publish-confirmation-content">
            {/* Header */}
            <div className="publish-confirmation-header">
              <button 
                onClick={cancelPublishAll}
                className="publish-confirmation-close"
              >
                ×
              </button>
              <h2 className="publish-confirmation-title">
                Confirm Publishing All Departments
              </h2>
            </div>

            {/* Content */}
            <div className="publish-confirmation-body">
              {/* Admin Info Section */}
              <div className="admin-info-section">
                <div className="admin-info-row">
                  <span className="admin-info-label">Admin Name:</span> {coordinatorInfo?.name || coordinatorName || 'Research Coordinator'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Role:</span> Research Coordinator, {assignedFaculty || 'Faculty'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Email:</span> <span className="admin-info-email">{coordinatorInfo?.email || 'coordinator@srm.edu.in'}</span>
                </div>
              </div>

              {/* Consent & Confirmation Section */}
              <div className="consent-section">
                <h3 className="consent-title">
                  Consent & Confirmation
                </h3>
                <ul className="consent-list">
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have thoroughly reviewed all submitted data
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have verified the authenticity of documents
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    This action will be recorded in the system
                  </li>
                </ul>

                <div className="consent-checkbox-container">
                  <input 
                    type="checkbox" 
                    id="confirmAllCheckbox"
                    className="consent-checkbox"
                    checked={isPublishAllConfirmed}
                    onChange={(e) => setIsPublishAllConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirmAllCheckbox" className="consent-checkbox-label">
                    I confirm I have read and agree to the above terms
                  </label>
                </div>
              </div>

              {/* Conclusion */}
              <div className="conclusion-section">
                <p className="conclusion-text">
                  You are about to <span className="conclusion-bold">PUBLISH</span> records for all {publishAllCount} unpublished department{publishAllCount !== 1 ? 's' : ''} to the director for further processing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <button 
                  onClick={cancelPublishAll}
                  className="confirmation-cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  className="confirm-publish-all-btn confirmation-confirm-btn"
                  onClick={confirmPublishAll}
                  disabled={!isPublishAllConfirmed}
                >
                  PUBLISH ALL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish All Success Modal */}
      <MessageBox 
        show={showPublishAllSuccess}
        title="Notification"
        message={`Successfully forwarded results for ${publishAllCount} department${publishAllCount !== 1 ? 's' : ''}.`}
        type="success"
        onClose={closePublishAllSuccess}
      />

      {/* Filter Modal - Rendered as Portal to appear on top */}
      {createPortal(
        showFilterModal && (
          <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="filter-modal" style={{ margin: 'auto', position: 'relative', zIndex: 10000 }}>
              <div className="filter-modal-header">
                <h3>Filter Departments</h3>
                <button className="modal-close-btn" onClick={handleCloseFilter}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="filter-modal-body">
                <div className="filter-group">
                  <label htmlFor="department-filter">Department</label>
                  <select 
                    id="department-filter"
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="all">All Departments</option>
                    {faculty.departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="publish-filter">Publish Status</label>
                  <select 
                    id="publish-filter"
                    value={filters.publishStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, publishStatus: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>
              
              <div className="filter-modal-footer">
                <button className="clear-btn" onClick={handleClearFilters}>Clear All</button>
                <button className="apply-btn" onClick={handleApplyFilters}>Apply Filters</button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {/* Message Box - Rendered as Portal to appear on top */}
      {createPortal(
        <MessageBox 
          show={messageBox.show}
          title={messageBox.title}
          message={messageBox.message}
          type={messageBox.type}
          onClose={() => setMessageBox({ show: false, title: '', message: '', type: 'info' })}
        />,
        document.body
      )}
    </div>
  );
};

export default Results;