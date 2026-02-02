import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFilter, FaUserPlus, FaUserCheck, FaEye, FaUsers, FaFileExcel, FaExpand, FaCompress, FaTrash } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './Supervisors.css';
import {
    fetchSupervisors,
    addSupervisor,
    updateSupervisor,
    deleteSupervisor,
    fetchAllAssignments,
    unassignScholar,
    getQualifiedScholarsByFacultyDept,
    assignScholarToSupervisor,
    fetchFacultiesAndDepartments,
    updateAdmittedCounts
} from '../../../../services/supervisorService';
// REMOVED: fetchDirectorAdminScholars import - not needed anymore
import { toast } from 'react-toastify';

// 1. Accept the `isSidebarClosed` prop here
const Supervisors = ({ isSidebarClosed, onModalStateChange }) => {
    // --- STATE MANAGEMENT ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [modal, setModal] = useState({ type: null, data: null });
    const [loading, setLoading] = useState(true);

    // Track modal states and notify parent
    useEffect(() => {
        const hasModal = modal.type !== null;
        if (onModalStateChange) {
            onModalStateChange(hasModal);
        }
    }, [modal.type, onModalStateChange]);
    const [filterFaculty, setFilterFaculty] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [formData, setFormData] = useState({});
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);

    // --- DATA FROM SUPABASE ---
    const [faculties, setFaculties] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    // REMOVED: scholars state - not needed, scholars are fetched on-demand for assignment
    const [assignments, setAssignments] = useState([]);
    
    // Scholar assignment state
    const [selectedScholar, setSelectedScholar] = useState(null);
    const [selectedScholarType, setSelectedScholarType] = useState('');
    const [isDepartmentSelected, setIsDepartmentSelected] = useState(false);

    // Load data on component mount
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
            loadFaculties(),
            loadSupervisors(),
            // REMOVED loadScholars() - not needed, scholars are fetched on-demand by faculty/dept
            loadAssignments()
        ]);
        setLoading(false);
    };

    const loadFaculties = async () => {
        const { data, error } = await fetchFacultiesAndDepartments();
        if (error) {
            console.error('Error loading faculties:', error);
            toast.error('Failed to load faculties');
        } else {
            setFaculties(data || []);
        }
    };

    const loadSupervisors = async () => {
        const { data, error } = await fetchSupervisors();
        if (error) {
            console.error('Error loading supervisors:', error);
            toast.error('Failed to load supervisors');
        } else {
            // Map Supabase data to UI format
            const mappedData = (data || []).map(sup => {
                // Calculate vacancies - always calculate from max and current
                const vacancyFullTime = Math.max(0, (sup.max_full_time_scholars || 0) - (sup.current_full_time_scholars || 0));
                const vacancyPartTimeInternal = Math.max(0, (sup.max_part_time_internal_scholars || 0) - (sup.current_part_time_internal_scholars || 0));
                const vacancyPartTimeExternal = Math.max(0, (sup.max_part_time_external_scholars || 0) - (sup.current_part_time_external_scholars || 0));
                const vacancyPartTimeIndustry = Math.max(0, (sup.max_part_time_industry_scholars || 0) - (sup.current_part_time_industry_scholars || 0));
                
                return {
                    id: sup.id,
                    name: sup.name,
                    email: sup.email,
                    phone: sup.phone,
                    employeeId: sup.employee_id,
                    facultyId: sup.faculty_id,
                    facultyName: sup.faculty_name,
                    departmentId: sup.department_id,
                    departmentName: sup.department_name,
                    specialization: sup.specialization,
                    areaOfInterest: sup.area_of_interest,
                    maxFullTimeScholars: sup.max_full_time_scholars || 0,
                    maxPartTimeInternalScholars: sup.max_part_time_internal_scholars || 0,
                    maxPartTimeExternalScholars: sup.max_part_time_external_scholars || 0,
                    maxPartTimeIndustryScholars: sup.max_part_time_industry_scholars || 0,
                    currentFullTimeScholars: sup.current_full_time_scholars || 0,
                    currentPartTimeInternalScholars: sup.current_part_time_internal_scholars || 0,
                    currentPartTimeExternalScholars: sup.current_part_time_external_scholars || 0,
                    currentPartTimeIndustryScholars: sup.current_part_time_industry_scholars || 0,
                    admittedFullTime: sup.admitted_full_time || 0,
                    admittedPartTimeInternal: sup.admitted_part_time_internal || 0,
                    admittedPartTimeExternal: sup.admitted_part_time_external || 0,
                    admittedPartTimeIndustry: sup.admitted_part_time_industry || 0,
                    vacancyFullTime: vacancyFullTime,
                    vacancyPartTimeInternal: vacancyPartTimeInternal,
                    vacancyPartTimeExternal: vacancyPartTimeExternal,
                    vacancyPartTimeIndustry: vacancyPartTimeIndustry,
                    isActive: sup.is_active,
                    status: sup.status,
                    createdAt: sup.created_at,
                    updatedAt: sup.updated_at
                };
            });
            console.log(`✅ Loaded ${mappedData.length} supervisors with vacancies`);
            setSupervisors(mappedData);
        }
    };

    // REMOVED: loadScholars() - This was fetching ALL scholars unnecessarily
    // Scholar fetching for assignment is now ONLY done by loadQualifiedScholarsBySelection()
    // which correctly filters by faculty, department, published status, and unassigned status

    const loadAssignments = async () => {
        const { data, error } = await fetchAllAssignments();
        if (error) {
            console.error('Error loading assignments:', error);
        } else {
            // Map assignment data from examination_records to UI format
            const mappedData = (data || []).map(assignment => ({
                id: assignment.id,
                scholarId: assignment.id, // examination_records id
                supervisorName: assignment.supervisor_name,
                mode: assignment.type || assignment.program_type,
                scholarName: assignment.registered_name || assignment.name,
                applicationNo: assignment.application_no,
                faculty: assignment.faculty,
                department: assignment.department,
                totalMarks: assignment.total_marks,
                supervisorStatus: assignment.supervisor_status
            }));
            setAssignments(mappedData);
        }
    };

    // Load qualified scholars based on faculty and department selection
    const loadQualifiedScholarsBySelection = async (facultyName, departmentName, scholarType = null) => {
        try {
            console.log('🔍 Loading qualified scholars for faculty:', facultyName, 'department:', departmentName, 'type:', scholarType);
            const { data, error } = await getQualifiedScholarsByFacultyDept(facultyName, departmentName, scholarType, 50);

            if (error) {
                console.error('❌ Error loading qualified scholars:', error);
                toast.error(`Failed to load qualified scholars: ${error.message || 'Unknown error'}`);
                return;
            }

            console.log('✅ Qualified scholars loaded:', data);
            console.log('📋 Number of scholars:', data?.length || 0);
            console.log('📋 Sample scholar data:', data && data.length > 0 ? data[0] : 'No data');
            
            let filteredData = data || [];
            
            if (scholarType && data && data.length > 0) {
                console.log(`ℹ️ Scholar type "${scholarType}" selected.`);
                console.log(`📋 Available scholar data fields:`, Object.keys(data[0]));
            }

            // Populate the scholar dropdown - use a longer timeout and multiple retries
            const populateDropdown = () => {
                const scholarSelect = document.getElementById('scholarToAssign');
                if (!scholarSelect) {
                    console.error('❌ scholarToAssign element not found, retrying...');
                    setTimeout(populateDropdown, 100);
                    return;
                }
                
                console.log('✅ Found scholarToAssign element, populating with', filteredData.length, 'scholars');
                
                if (filteredData && filteredData.length > 0) {
                    scholarSelect.innerHTML = '<option value="">Select a qualified scholar...</option>';
                    
                    filteredData.forEach((scholar, index) => {
                        const option = document.createElement('option');
                        option.value = scholar.id;
                        
                        // Try multiple field names for scholar name
                        const scholarName = scholar.registered_name || scholar.name || scholar.applicant_name || 'Unknown Scholar';
                        const appNo = scholar.application_no || scholar.app_no || 'N/A';
                        const totalMarks = scholar.total_marks || 0;
                        
                        option.textContent = `${scholarName} (${appNo}) - Score: ${totalMarks}`;
                        option.dataset.scholarData = JSON.stringify(scholar);
                        scholarSelect.appendChild(option);
                        
                        // Debug logging for first scholar
                        if (index === 0) {
                            console.log('📋 First scholar object keys:', Object.keys(scholar));
                            console.log('📋 Scholar sample:', {
                                id: scholar.id,
                                registered_name: scholar.registered_name,
                                name: scholar.name,
                                application_no: scholar.application_no,
                                total_marks: scholar.total_marks,
                                faculty: scholar.faculty,
                                department: scholar.department
                            });
                        }
                    });
                    
                    scholarSelect.disabled = false;
                    console.log(`✅ Populated dropdown with ${filteredData.length} scholars`);
                } else {
                    scholarSelect.innerHTML = '<option value="">No qualified scholars available for this department</option>';
                    scholarSelect.disabled = true;
                    console.log('⚠️ No qualified scholars found for faculty: ' + facultyName + ', department: ' + departmentName);
                }
            };
            
            // Call populate function with increased delay to ensure DOM is ready
            setTimeout(populateDropdown, 300);

        } catch (err) {
            console.error('💥 Exception loading qualified scholars:', err);
            toast.error('Failed to load qualified scholars');
        }
    };

    // --- DERIVED STATE & FILTERING LOGIC ---
    const filteredSupervisors = supervisors.filter(sup => {
        const faculty = faculties.find(f => f.id === sup.facultyId || f.name === sup.facultyName);
        const department = faculty?.departments.find(d => d.id === sup.departmentId || d.name === sup.departmentName);
        const searchString = `${sup.name} ${sup.email} ${sup.facultyName || faculty?.name} ${sup.departmentName || department?.name} ${sup.specialization}`.toLowerCase();

        const matchesSearch = searchString.includes(searchTerm.toLowerCase());
        const matchesFaculty = !filterFaculty || sup.facultyId === filterFaculty || sup.facultyName === filterFaculty;
        const matchesDepartment = !filterDepartment || sup.departmentId === filterDepartment || sup.departmentName === filterDepartment;

        return matchesSearch && matchesFaculty && matchesDepartment;
    });

    // --- ACTION HANDLERS ---
    const openModal = (type, data = {}) => {
        setModal({ type, data });
        if (type === 'add' || type === 'edit') {
            setFormData(data);
        }

        // For assign modal, don't auto-select - let user choose
        if (type === 'assign') {
            setTimeout(() => {
                const facultySelect = document.getElementById('assignedFaculty');
                const deptSelect = document.getElementById('assignedDepartment');
                const scholarSelect = document.getElementById('scholarToAssign');

                // Reset all selects to empty - user must choose
                if (facultySelect) {
                    facultySelect.value = '';
                    facultySelect.disabled = false; // Enable for user selection
                }

                if (deptSelect) {
                    deptSelect.value = '';
                    deptSelect.disabled = true; // Disabled until faculty is selected
                }

                if (scholarSelect) {
                    scholarSelect.innerHTML = '<option value="">First select faculty and department...</option>';
                    scholarSelect.disabled = true;
                }
            }, 100);
        }
    };
    const closeModal = () => setModal({ type: null, data: null });

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'facultyId') {
            setFormData(prev => ({ ...prev, departmentId: '' }));
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try {
            if (modal.type === 'edit') {
                // Update existing supervisor
                const faculty = faculties.find(f => f.id === formData.facultyId);
                const department = faculty?.departments.find(d => d.id === formData.departmentId);

                const updates = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    employee_id: formData.employeeId,
                    faculty_id: formData.facultyId,
                    faculty_name: faculty?.name,
                    department_id: formData.departmentId,
                    department_name: department?.name,
                    specialization: formData.specialization,
                    max_full_time_scholars: parseInt(formData.maxFullTimeScholars) || 0,
                    max_part_time_internal_scholars: parseInt(formData.maxPartTimeInternalScholars) || 0,
                    max_part_time_external_scholars: parseInt(formData.maxPartTimeExternalScholars) || 0,
                    max_part_time_industry_scholars: parseInt(formData.maxPartTimeIndustryScholars) || 0,
                    is_active: formData.isActive !== undefined ? formData.isActive : true
                };

                const { data, error } = await updateSupervisor(formData.id, updates);

                if (error) {
                    toast.error('Failed to update supervisor');
                    console.error('Update error:', error);
                } else {
                    toast.success('Supervisor updated successfully!');
                    await loadSupervisors();
                    closeModal();
                }
            } else {
                // Add new supervisor
                const faculty = faculties.find(f => f.id === formData.facultyId);
                const department = faculty?.departments.find(d => d.id === formData.departmentId);

                const newSupervisor = {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    employee_id: formData.employeeId,
                    faculty_id: formData.facultyId,
                    faculty_name: faculty?.name,
                    department_id: formData.departmentId,
                    department_name: department?.name,
                    specialization: formData.specialization,
                    area_of_interest: formData.areaOfInterest ? formData.areaOfInterest.split(',').map(s => s.trim()) : [],
                    max_full_time_scholars: parseInt(formData.maxFullTimeScholars) || 0,
                    max_part_time_internal_scholars: parseInt(formData.maxPartTimeInternalScholars) || 0,
                    max_part_time_external_scholars: parseInt(formData.maxPartTimeExternalScholars) || 0,
                    max_part_time_industry_scholars: parseInt(formData.maxPartTimeIndustryScholars) || 0,
                    is_active: true,
                    status: 'Active',
                    created_by: 'director' // You can get this from auth context
                };

                const { data, error } = await addSupervisor(newSupervisor);

                if (error) {
                    toast.error('Failed to add supervisor');
                    console.error('Add error:', error);
                } else {
                    toast.success('Supervisor added successfully!');
                    await loadSupervisors();
                    // Update admitted counts after adding supervisor
                    await updateAdmittedCounts();
                    closeModal();
                }
            }
        } catch (err) {
            console.error('Form submission error:', err);
            toast.error('An error occurred');
        }
    };

    const handleFacultyChange = (facultyId) => {
        const deptSelect = document.getElementById('assignedDepartment');
        const scholarSelect = document.getElementById('scholarToAssign');
        
        // Reset following selections
        deptSelect.value = '';
        setSelectedScholarType(''); // Clear type
        setSelectedScholar(null);
        if (scholarSelect) {
            scholarSelect.innerHTML = '<option value="">First select department...</option>';
            scholarSelect.disabled = true;
        }

        // Logic to show/hide options...
        const allOptions = deptSelect.querySelectorAll('option');
        allOptions.forEach(opt => opt.style.display = 'none');
        const selectedFaculty = faculties.find(f => f.id === facultyId);
        if (selectedFaculty) {
            selectedFaculty.departments.forEach(dept => {
                const opt = deptSelect.querySelector(`option[value="${dept.id}"]`);
                if (opt) opt.style.display = 'block';
            });
            deptSelect.disabled = false;
        }
    };

    const handleDepartmentChange = async (departmentId) => {
        const facultyId = document.getElementById('assignedFaculty').value;
        
        // Reset following steps
        setSelectedScholarType('');
        setSelectedScholar(null);
        const scholarSelect = document.getElementById('scholarToAssign');
        if (scholarSelect) {
            scholarSelect.innerHTML = '<option value="">Select scholar type...</option>';
            scholarSelect.disabled = true;
        }

        if (facultyId && departmentId) {
            setIsDepartmentSelected(true);
            console.log('✅ Faculty and Department IDs selected');
        } else {
            setIsDepartmentSelected(false);
        }
    };

    const handleTypeChange = async (type) => {
        setSelectedScholarType(type);
        setSelectedScholar(null);
        
        const scholarSelect = document.getElementById('scholarToAssign');
        const facultyId = document.getElementById('assignedFaculty').value;
        const departmentId = document.getElementById('assignedDepartment').value;
        
        // Allow empty string (which means "All types - no filter")
        // Only return early if there's no faculty and department selected
        if (!facultyId || !departmentId) {
            scholarSelect.innerHTML = '<option value="">First select department...</option>';
            scholarSelect.disabled = true;
            return;
        }
        
        // CRITICAL FIX: Find the actual String Names for the selected IDs
        const selectedFaculty = faculties.find(f => f.id === facultyId);
        const selectedDepartment = selectedFaculty?.departments.find(d => String(d.id) === String(departmentId));

        if (selectedFaculty && selectedDepartment) {
            scholarSelect.innerHTML = '<option value="">Searching for qualified scholars...</option>';
            scholarSelect.disabled = true;

            console.log(`🚀 Loading: ${selectedFaculty.name} | ${selectedDepartment.name} | Type: ${type || 'ALL'}`);
            
            // Call service with NAMES, not IDs
            // Pass type as-is (empty string or actual type value)
            await loadQualifiedScholarsBySelection(selectedFaculty.name, selectedDepartment.name, type || null);
        } else {
            toast.error("Could not determine Department name. Please re-select.");
        }
    };
    
    const handleScholarChange = (scholarId) => {
        const scholarSelect = document.getElementById('scholarToAssign');
        const selectedOption = scholarSelect.options[scholarSelect.selectedIndex];
        
        if (scholarId && selectedOption && selectedOption.dataset.scholarData) {
            const scholarData = JSON.parse(selectedOption.dataset.scholarData);
            setSelectedScholar(scholarData);
        } else {
            setSelectedScholar(null);
        }
    };

    const handleAssignScholar = async () => {
        const scholarSelect = document.getElementById('scholarToAssign');
        const scholarId = scholarSelect.value;

        if (!scholarId) {
            alert('Please select a scholar to assign');
            return;
        }
        
        if (!selectedScholarType) {
            alert('Please select the scholar type (Full Time, Part Time Internal, etc.)');
            return;
        }

        // Get scholar data from the selected option
        const selectedOption = scholarSelect.options[scholarSelect.selectedIndex];
        const scholarData = JSON.parse(selectedOption.dataset.scholarData || '{}');

        console.log('📋 Scholar data from dropdown:', scholarData);
        console.log('📋 Selected type:', selectedScholarType);

        if (!scholarData.id && !scholarId) {
            alert('Scholar data not found. Please try again.');
            return;
        }
        
        // Check if supervisor has vacancy for the selected type
        const supervisor = modal.data;
        let hasVacancy = false;
        let vacancyField = '';
        
        switch(selectedScholarType) {
            case 'Full Time':
                hasVacancy = (supervisor.vacancyFullTime || 0) > 0;
                vacancyField = 'Full Time';
                break;
            case 'Part Time Internal':
                hasVacancy = (supervisor.vacancyPartTimeInternal || 0) > 0;
                vacancyField = 'Part Time Internal';
                break;
            case 'Part Time External':
                hasVacancy = (supervisor.vacancyPartTimeExternal || 0) > 0;
                vacancyField = 'Part Time External';
                break;
            case 'Part Time Industry':
                hasVacancy = (supervisor.vacancyPartTimeIndustry || 0) > 0;
                vacancyField = 'Part Time Industry';
                break;
            default:
                alert('Invalid scholar type selected');
                return;
        }
        
        if (!hasVacancy) {
            alert(`No vacancy available for ${vacancyField} scholars. Please check supervisor capacity.`);
            return;
        }

        try {
            // Prepare assignment data - just need supervisor_id and scholar_id
            const assignmentData = {
                supervisor_id: modal.data.id,
                scholar_id: scholarData.id || scholarId,
                scholar_type: selectedScholarType
            };

            console.log('💾 Assigning scholar to supervisor:', assignmentData);

            // This will update examination_records with supervisor_name and supervisor_status = "Admitted"
            const { data, error } = await assignScholarToSupervisor(assignmentData);

            if (error) {
                toast.error(`Failed to assign scholar: ${error.message || 'Unknown error'}`);
                console.error('Assignment error:', error);
                return;
            }

            console.log('✅ Assignment saved:', data);
            toast.success(`Scholar ${scholarData.registered_name || scholarData.name} assigned as ${selectedScholarType}!`);

            // Reset state
            setSelectedScholar(null);
            setSelectedScholarType('');

            // Reload data
            await loadAssignments();
            await loadSupervisors();

            closeModal();

        } catch (err) {
            console.error('💥 Exception assigning scholar:', err);
            toast.error('Failed to assign scholar');
        }
    };

    const handleUnassign = async (assignmentId) => {
        if (window.confirm('Are you sure you want to unassign this scholar?')) {
            const { data, error } = await unassignScholar(assignmentId);

            if (error) {
                toast.error('Failed to unassign scholar');
                console.error('Unassign error:', error);
            } else {
                toast.success('Scholar unassigned successfully!');
                await loadAssignments();
                await loadSupervisors(); // Reload to update current counts
            }
        }
    };

    const handleDeleteSupervisor = async (supervisorId) => {
        if (window.confirm('Are you sure you want to delete this supervisor? This will also remove all their scholar assignments.')) {
            const { data, error } = await deleteSupervisor(supervisorId);

            if (error) {
                toast.error('Failed to delete supervisor');
                console.error('Delete error:', error);
            } else {
                toast.success('Supervisor deleted successfully!');
                await loadSupervisors();
                await loadAssignments();
            }
        }
    };

    const generateSupervisorReport = () => {
        const dataForReport = supervisors.map(supervisor => {
            const faculty = faculties.find(f => f.id === supervisor.facultyId);
            const department = faculty?.departments.find(d => d.id === supervisor.departmentId);
            const supervisorAssignments = assignments.filter(a => a.supervisorName === supervisor.name);
            const assignedScholarsList = supervisorAssignments.map(a => {
                // Assignment already contains all scholar data from examination_records
                const assignmentInfo = a.faculty && a.department
                    ? ` (${a.faculty} - ${a.department})`
                    : '';
                return `${a.applicationNo} - ${a.scholarName}${assignmentInfo}`;
            }).join('\n');
            const assignedFT = supervisorAssignments.filter(a => a.mode === 'Full Time').length;
            const assignedPT = supervisorAssignments.filter(a => a.mode === 'Part Time').length;

            return {
                'Supervisor Name': supervisor.name, 'Email': supervisor.email, 'Faculty': faculty?.name || 'N/A',
                'Department': department?.name || 'N/A', 'Specialization': supervisor.specialization,
                'Assigned Scholars': assignedScholarsList || 'No scholars assigned',
                'Full Time Slots': `${assignedFT}/${supervisor.maxFullTimeScholars}`, 'Part Time Slots': `${assignedPT}/${supervisor.maxPartTimeScholars}`,
                'Status': supervisor.isActive ? 'Active' : 'Inactive', 'Total Assigned': supervisorAssignments.length, 'Last Updated': new Date().toLocaleDateString(),
            };
        });
        const ws = XLSX.utils.json_to_sheet(dataForReport);
        ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 35 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 },];
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            const cell_address = { c: 5, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (ws[cell_ref]) { ws[cell_ref].s = { alignment: { wrapText: true, vertical: 'top' } }; }
        }
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supervisor Assignments");
        XLSX.writeFile(wb, `Supervisor_Assignments_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.error(err));
        } else { document.exitFullscreen(); }
    };

    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    // Calculate statistics for tiles using Supabase data
    const totalFullTimeVacancy = supervisors.reduce((sum, sup) => {
        return sum + (sup.vacancyFullTime || 0);
    }, 0);

    const totalFullTimeAdmitted = supervisors.reduce((sum, sup) => {
        return sum + (sup.currentFullTimeScholars || 0);
    }, 0);

    // Combined Part Time calculations (Internal + External + Industry)
    const totalPartTimeVacancy = supervisors.reduce((sum, sup) => {
        return sum + (sup.vacancyPartTimeInternal || 0) + (sup.vacancyPartTimeExternal || 0) + (sup.vacancyPartTimeIndustry || 0);
    }, 0);

    const totalPartTimeAdmitted = supervisors.reduce((sum, sup) => {
        return sum + (sup.currentPartTimeInternalScholars || 0) + (sup.currentPartTimeExternalScholars || 0) + (sup.currentPartTimeIndustryScholars || 0);
    }, 0);

    // --- RENDER ---
    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading supervisors...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`h-full w-full flex flex-col bg-transparent relative transition-all duration-300 ${isFullscreen ? 'fullscreen-mode p-4' : 'p-0'}`}>
            <button onClick={toggleFullscreen} className="absolute top-10 right-4 z-20 bg-white-600 hover:bg-gray-200 p-2 rounded-full text-gray" title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}>
                {isFullscreen ? <FaCompress /> : <FaExpand />}
            </button>

            <div className="flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-black">Supervisors</h2>
                </div>

                {/* Statistics Tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Full Time Vacancy</p>
                                <p className="text-2xl font-bold text-blue-600">{totalFullTimeVacancy}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Full Time Admitted</p>
                                <p className="text-2xl font-bold text-green-600">{totalFullTimeAdmitted}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Part Time Vacancy</p>
                                <p className="text-2xl font-bold text-orange-600">{totalPartTimeVacancy}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Part Time Admitted</p>
                                <p className="text-2xl font-bold text-purple-600">{totalPartTimeAdmitted}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Top row - Action buttons and fullscreen */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => openModal('add')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <FaUserPlus /> Add Supervisor
                        </button>
                        <button onClick={generateSupervisorReport} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                            <FaFileExcel /> Generate Report
                        </button>
                    </div>
                </div>

                {/* Bottom row - Search and filter */}
                <div className="flex justify-between items-center mb-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Supervisors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-80"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div className="relative">
                        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="bg-transparent border border-white/20 p-2.5 rounded-lg hover:bg-white/10 text-white hover:border-white/40" title="Filters">
                            <FaFilter className="w-4 h-4" />
                        </button>
                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-md shadow-lg z-20 p-4 border border-slate-700 text-white">
                                <h3 className="font-bold mb-2 text-sm">Filter By</h3>
                                <div className="space-y-2">
                                    <select value={filterFaculty} onChange={(e) => { setFilterFaculty(e.target.value); setFilterDepartment(''); }} className="w-full p-2 border rounded text-sm bg-slate-700 border-slate-600">
                                        <option value="">All Faculties</option>
                                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                    <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="w-full p-2 border rounded text-sm bg-slate-700 border-slate-600" disabled={!filterFaculty}>
                                        <option value="">All Departments</option>
                                        {filterFaculty && faculties.find(f => f.id === filterFaculty)?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 min-h-0 min-w-0 p-2">
                {/* Inner scrollable container for horizontal + vertical scroll */}
                <div className={`flex-1 overflow-auto p-1 ${isFullscreen ? 'max-w-full' : (isSidebarClosed ? 'max-w-[92.5vw]' : 'max-w-[79.5vw]')}`}>
                    <div className="max-h-[70vh] overflow-y-auto relative">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="sticky top-0 bg-white z-10">
                                <style>{`
                                .supervisors-table thead {
                                    position: sticky;
                                    top: 0;
                                    z-index: 10;
                                    background: rgb(249 250 251);
                                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                                }
                                .supervisors-table thead th {
                                    background: rgb(249 250 251) !important;
                                    position: sticky;
                                    top: 0;
                                    z-index: 11;
                                }
                            `}</style>
                                <tr>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">S.No.</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Name</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Faculty</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Department</th>
                                    <th rowSpan="2" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Specialization</th>
                                    <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">Full Time</th>
                                    <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">Part Time Internal</th>
                                    <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">Part Time External</th>
                                    <th colSpan="2" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">Part Time Industry</th>
                                    <th rowSpan="2" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 align-bottom">Actions</th>
                                </tr>
                                <tr>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Admitted</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Vacancy</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Admitted</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Vacancy</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Admitted</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Vacancy</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Admitted</th>
                                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50">Vacancy</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSupervisors.map((sup, index) => {
                                    const faculty = faculties.find(f => f.id === sup.facultyId);
                                    const department = faculty?.departments.find(d => d.id === sup.departmentId);

                                    // Use the current counts and calculated vacancies from supervisor data
                                    const admittedFT = sup.currentFullTimeScholars || 0;
                                    const vacancyFT = sup.vacancyFullTime || 0;

                                    const admittedPTI = sup.currentPartTimeInternalScholars || 0;
                                    const vacancyPTI = sup.vacancyPartTimeInternal || 0;

                                    const admittedPTE = sup.currentPartTimeExternalScholars || 0;
                                    const vacancyPTE = sup.vacancyPartTimeExternal || 0;

                                    const admittedPTInd = sup.currentPartTimeIndustryScholars || 0;
                                    const vacancyPTInd = sup.vacancyPartTimeIndustry || 0;

                                    return (
                                        <tr key={sup.id} className="hover:bg-gray-50 transition-colors duration-200">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">{index + 1}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sup.name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{faculty?.name || 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{department?.name || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{sup.specialization}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{admittedFT}</td>
                                            <td className={`px-4 py-3 text-center whitespace-nowrap text-sm font-bold ${vacancyFT > 0 ? 'text-green-600' : 'text-red-600'}`}>{vacancyFT}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{admittedPTI}</td>
                                            <td className={`px-4 py-3 text-center whitespace-nowrap text-sm font-bold ${vacancyPTI > 0 ? 'text-green-600' : 'text-red-600'}`}>{vacancyPTI}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{admittedPTE}</td>
                                            <td className={`px-4 py-3 text-center whitespace-nowrap text-sm font-bold ${vacancyPTE > 0 ? 'text-green-600' : 'text-red-600'}`}>{vacancyPTE}</td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-900">{admittedPTInd}</td>
                                            <td className={`px-4 py-3 text-center whitespace-nowrap text-sm font-bold ${vacancyPTInd > 0 ? 'text-green-600' : 'text-red-600'}`}>{vacancyPTInd}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="supervisors-actions">
                                                    <button
                                                        onClick={() => openModal('view', sup)}
                                                        className="supervisors-action-btn view"
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        onClick={() => openModal('edit', sup)}
                                                        className="supervisors-action-btn edit"
                                                        title="Edit Supervisor"
                                                    >
                                                        <svg fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        onClick={() => openModal('assign', sup)}
                                                        className="supervisors-action-btn assign"
                                                        title="Assign Scholar"
                                                    >
                                                        <FaUserCheck />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteSupervisor(sup.id)}
                                                        className="supervisors-action-btn delete"
                                                        title="Delete Supervisor"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}
            {modal.type && (
                <div className="modal-overlay flex">
                    <div className="modal-content text-black">
                        <button className="absolute top-4 right-4 text-3xl font-bold text-gray-500 hover:text-gray-800" onClick={closeModal}>&times;</button>

                        {(modal.type === 'add' || modal.type === 'edit') && <>
                            <h3 className="text-2xl font-bold mb-4">{modal.type === 'edit' ? 'Edit Supervisor' : 'Add Supervisor'}</h3>
                            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <div><label className="block text-sm font-bold mb-2">Name</label><input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} required /></div>
                                <div><label className="block text-sm font-bold mb-2">Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleFormChange} required /></div>
                                <div><label className="block text-sm font-bold mb-2">Faculty</label><select name="facultyId" value={formData.facultyId || ''} onChange={handleFormChange} required><option value="">Select Faculty</option>{faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                                <div><label className="block text-sm font-bold mb-2">Department</label><select name="departmentId" value={formData.departmentId || ''} onChange={handleFormChange} disabled={!formData.facultyId} required><option value="">Select Department</option>{formData.facultyId && faculties.find(f => f.id === formData.facultyId)?.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                <div className="md:col-span-2"><label className="block text-sm font-bold mb-2">Specialization</label><input type="text" name="specialization" value={formData.specialization || ''} onChange={handleFormChange} required /></div>

                                {/* Vacancy Slots Section */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Maximum Scholar Slots</h4>
                                </div>

                                <div><label className="block text-sm font-bold mb-2">Max Full Time Scholars</label><input type="number" name="maxFullTimeScholars" value={formData.maxFullTimeScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-bold mb-2">Max Part Time Internal</label><input type="number" name="maxPartTimeInternalScholars" value={formData.maxPartTimeInternalScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-bold mb-2">Max Part Time External</label><input type="number" name="maxPartTimeExternalScholars" value={formData.maxPartTimeExternalScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-bold mb-2">Max Part Time Industry</label><input type="number" name="maxPartTimeIndustryScholars" value={formData.maxPartTimeIndustryScholars || ''} onChange={handleFormChange} min="0" required className="w-full p-2 border rounded" /></div>

                                <div className="md:col-span-2 flex justify-end gap-3 mt-4"><button type="button" onClick={closeModal} className="btn bg-black text-gray-800 hover:bg-black text-white">Cancel</button><button type="submit" className="btn bg-blue-600 text-white hover:bg-blue-700">Save</button></div>
                            </form>
                        </>}

                        {/* --- VIEW MODAL MODIFIED --- */}
                        {modal.type === 'view' && <>
                            <h3 className="text-2xl font-bold mb-6">Supervisor Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-left">
                                {[
                                    { label: "Name", value: modal.data.name },
                                    { label: "Email", value: modal.data.email },
                                    { label: "Faculty", value: faculties.find(f => f.id === modal.data.facultyId)?.name },
                                    { label: "Department", value: faculties.flatMap(f => f.departments).find(d => d.id === modal.data.departmentId)?.name },
                                    { label: "Specialization", value: modal.data.specialization, colSpan: true },
                                ].map(({ label, value, colSpan }) => (
                                    <div key={label} className={`border-b border-gray-200 pb-2 ${colSpan ? 'md:col-span-2' : ''}`}>
                                        <p className="text-sm font-medium text-gray-500">{label}</p>
                                        <p className="mt-1 text-base text-gray-900 font-semibold">{value ?? 'N/A'}</p>
                                    </div>
                                ))}

                                {/* Maximum Slots Section */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Maximum Scholar Slots</h4>
                                </div>
                                {[
                                    { label: "Max Full Time Scholars", value: modal.data.maxFullTimeScholars },
                                    { label: "Max Part Time Internal", value: modal.data.maxPartTimeInternalScholars },
                                    { label: "Max Part Time External", value: modal.data.maxPartTimeExternalScholars },
                                    { label: "Max Part Time Industry", value: modal.data.maxPartTimeIndustryScholars },
                                ].map(({ label, value }) => (
                                    <div key={label} className="border-b border-gray-200 pb-2">
                                        <p className="text-sm font-medium text-gray-500">{label}</p>
                                        <p className="mt-1 text-base text-gray-900 font-semibold">{value ?? 0}</p>
                                    </div>
                                ))}

                                {/* Current Assignments Section */}
                                <div className="md:col-span-2 mt-4 mb-2">
                                    <h4 className="text-lg font-bold text-gray-700 border-b pb-2">Current Assignments</h4>
                                </div>
                                {[
                                    { label: "Assigned Full Time", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Full Time').length },
                                    { label: "Assigned Part Time Internal", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Part Time Internal').length },
                                    { label: "Assigned Part Time External", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Part Time External').length },
                                    { label: "Assigned Part Time Industry", value: assignments.filter(a => a.supervisorName === modal.data.name && a.mode === 'Part Time Industry').length },
                                    { label: "Total Assigned", value: assignments.filter(a => a.supervisorName === modal.data.name).length, bold: true },
                                ].map(({ label, value, bold }) => (
                                    <div key={label} className="border-b border-gray-200 pb-2">
                                        <p className="text-sm font-medium text-gray-500">{label}</p>
                                        <p className={`mt-1 text-base text-gray-900 ${bold ? 'font-bold' : 'font-semibold'}`}>{value ?? 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </>}

                        {modal.type === 'assign' && <>
                            <h3 className="text-2xl font-bold mb-4">Assign Scholar to {modal.data.name}</h3>
                            <div className="bg-gray-100 p-3 rounded-lg mb-4 text-left">
                                <h4 className="font-bold text-gray-800">Supervisor: {modal.data.name}</h4>
                                <p className="text-sm text-gray-600">{modal.data.email}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    <strong>Faculty:</strong> {modal.data.facultyName} | <strong>Department:</strong> {modal.data.departmentName}
                                </p>
                            </div>

                            <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 text-left">
                                <p className="text-sm text-blue-800">
                                    <strong>ℹ️ Select Faculty & Department:</strong> Choose the faculty and department to view available scholars.
                                    Only <strong> present scholars</strong> (excluding those marked as Absent) from the selected department will be shown.
                                </p>
                            </div>

                            <div className="assignment-form-grid text-left">
                                <div className="assignment-form-field">
                                    <label className="assignment-form-label">Faculty *</label>
                                    <select
                                        id="assignedFaculty"
                                        className="assignment-form-select"
                                        required
                                        onChange={(e) => handleFacultyChange(e.target.value)}
                                    >
                                        <option value="">Select Faculty</option>
                                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>

                                <div className="assignment-form-field">
                                    <label className="assignment-form-label">Department *</label>
                                    <select
                                        id="assignedDepartment"
                                        className="assignment-form-select"
                                        required
                                        disabled
                                        onChange={(e) => handleDepartmentChange(e.target.value)}
                                    >
                                        <option value="">Select Department</option>
                                        {faculties.map(f =>
                                            f.departments.map(d =>
                                                <option key={d.id} value={d.id} data-faculty={f.id}>{d.name}</option>
                                            )
                                        )}
                                    </select>
                                </div>
                                
                                <div className="assignment-form-field md:col-span-2">
                                    <label className="assignment-form-label">Select Scholar Type (Optional Filter) *</label>
                                    <select 
                                        className="assignment-form-select" 
                                        value={selectedScholarType}
                                        onChange={(e) => handleTypeChange(e.target.value)}
                                        required
                                        disabled={!isDepartmentSelected}
                                    >
                                        <option value="">All types - no filter</option>
                                        <option value="Full Time" disabled={(modal.data.vacancyFullTime || 0) <= 0}>
                                            Full Time {(modal.data.vacancyFullTime || 0) > 0 ? `(${modal.data.vacancyFullTime} vacancy)` : '(No vacancy)'}
                                        </option>
                                        <option value="Part Time Internal" disabled={(modal.data.vacancyPartTimeInternal || 0) <= 0}>
                                            Part Time Internal {(modal.data.vacancyPartTimeInternal || 0) > 0 ? `(${modal.data.vacancyPartTimeInternal} vacancy)` : '(No vacancy)'}
                                        </option>
                                        <option value="Part Time External" disabled={(modal.data.vacancyPartTimeExternal || 0) <= 0}>
                                            Part Time External {(modal.data.vacancyPartTimeExternal || 0) > 0 ? `(${modal.data.vacancyPartTimeExternal} vacancy)` : '(No vacancy)'}
                                        </option>
                                        <option value="Part Time Industry" disabled={(modal.data.vacancyPartTimeIndustry || 0) <= 0}>
                                            Part Time Industry {(modal.data.vacancyPartTimeIndustry || 0) > 0 ? `(${modal.data.vacancyPartTimeIndustry} vacancy)` : '(No vacancy)'}
                                        </option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Optional: Select a type to filter scholars. Leave empty to show all qualified scholars.
                                    </p>
                                </div>

                                <div className="assignment-form-field md:col-span-2">
                                    <label className="assignment-form-label">Select Scholar *</label>
                                    <select 
                                        id="scholarToAssign" 
                                        className="assignment-form-select" 
                                        required 
                                        disabled
                                        onChange={(e) => handleScholarChange(e.target.value)}
                                    >
                                        <option value="">First select department...</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {selectedScholarType ? `Showing ${selectedScholarType} scholars who are not yet assigned` : 'Showing all qualified scholars who are not yet assigned'}
                                    </p>
                                </div>
                                
                                {/* Scholar Details Table - Only show when scholar is selected */}
                                {selectedScholar && (
                                    <div className="assignment-form-field md:col-span-2 bg-white">
                                        <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">📋</span>
                                            Scholar Details
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border border-gray-300">
                                                <tbody>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Name</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.registered_name || selectedScholar.name}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Application No</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.application_no}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Faculty</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.faculty}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Department/Program</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.program || selectedScholar.department}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Type</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.type || selectedScholar.program_type}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Written Marks</td>
                                                        <td className="border border-gray-300 px-4 py-2 font-bold text-blue-600">{selectedScholar.written_marks || 'N/A'}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Interview Marks</td>
                                                        <td className="border border-gray-300 px-4 py-2 font-bold text-blue-600">{selectedScholar.interview_marks || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Total Marks</td>
                                                        <td className="border border-gray-300 px-4 py-2 font-bold text-green-600 text-lg">{selectedScholar.total_marks}</td>
                                                    </tr>
                                                    <tr className="bg-gray-50">
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Email</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.email || 'N/A'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">Phone</td>
                                                        <td className="border border-gray-300 px-4 py-2">{selectedScholar.phone || 'N/A'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="assignment-buttons">
                                <button type="button" onClick={closeModal} className="assignment-btn assignment-btn-cancel">Cancel</button>
                                <button type="button" onClick={handleAssignScholar} className="assignment-btn assignment-btn-assign">Assign Scholar</button>
                            </div>
                        </>}

                        {modal.type === 'assignments' && <>
                            <h3 className="text-2xl font-bold mb-4">Assignments for {modal.data.name}</h3>
                            <div className="text-left">
                                {assignments.filter(a => a.supervisorName === modal.data.name).map(a => {
                                    // Assignment already contains all scholar data from examination_records
                                    return (
                                        <div key={a.id} className="assignment-card">
                                            <div className="assignment-card-header">
                                                <div className="assignment-scholar-info">
                                                    <h4>{a.scholarName}</h4>
                                                    <p>Application: {a.applicationNo} | Mode: {a.mode}</p>
                                                    {a.faculty && a.department && (
                                                        <p className="assignment-faculty-info">
                                                            <strong>Assigned:</strong> {a.faculty} - {a.department}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleUnassign(a.id)}
                                                    className="assignment-unassign-btn"
                                                >
                                                    Unassign
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {assignments.filter(a => a.supervisorName === modal.data.name).length === 0 && (
                                    <p className="text-gray-500 text-center py-4">No active assignments.</p>
                                )}
                            </div>
                        </>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Supervisors;