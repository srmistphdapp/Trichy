import { supabase, supabaseAdmin } from '../supabaseClient';

/**
 * Supervisor Service
 * Handles all supervisor-related operations
 */

// Fetch all supervisors with vacancy calculations
export const fetchSupervisors = async () => {
  try {
    // Fetch directly from supervisors table instead of using RPC
    const { data, error } = await supabase
      .from('supervisors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching supervisors:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} supervisors from Supabase`);
    console.log('📊 Raw supervisor data sample:', data?.[0]);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSupervisors:', err);
    return { data: null, error: err };
  }
};

// Fetch single supervisor by ID
export const fetchSupervisorById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('supervisors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching supervisor by ID:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSupervisorById:', err);
    return { data: null, error: err };
  }
};

// Add new supervisor
export const addSupervisor = async (supervisorData) => {
  try {
    console.log('Adding supervisor:', supervisorData);
    
    const { data, error } = await supabase
      .from('supervisors')
      .insert([supervisorData])
      .select();

    if (error) {
      console.error('Error adding supervisor:', error);
      return { data: null, error };
    }

    console.log('✅ Supervisor added successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in addSupervisor:', err);
    return { data: null, error: err };
  }
};

// Update supervisor
export const updateSupervisor = async (id, updates) => {
  try {
    console.log('Updating supervisor:', id, updates);
    
    const { data, error } = await supabase
      .from('supervisors')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating supervisor:', error);
      return { data: null, error };
    }

    console.log('✅ Supervisor updated successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateSupervisor:', err);
    return { data: null, error: err };
  }
};

// Delete supervisor
export const deleteSupervisor = async (id) => {
  try {
    console.log('Deleting supervisor:', id);
    
    const { data, error } = await supabase
      .from('supervisors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supervisor:', error);
      return { data: null, error };
    }

    console.log('✅ Supervisor deleted successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in deleteSupervisor:', err);
    return { data: null, error: err };
  }
};

// Get qualified scholars for a supervisor by faculty and department
// Fetches scholars who have completed examination (all marks entered), faculty, and department
// Update in supervisorService.js
// In supervisorService.js
export const getQualifiedScholarsByFacultyDept = async (facultyName, departmentName, scholarType = null, limit = 50) => {
  try {
    console.log(`🔍 Querying scholars for Faculty: "${facultyName}", Dept: "${departmentName}", Type: "${scholarType || 'ALL'}"`);

    // Fetch all records - we filter in memory because program and department matching are complex
    const { data: allScholars, error } = await supabaseAdmin
      .from('examination_records')
      .select('*');

    if (error) {
      console.error('❌ Error fetching scholars:', error);
      return { data: null, error };
    }

    console.log(`📊 Total scholars in database: ${allScholars?.length || 0}`);
    if (allScholars && allScholars.length > 0) {
      console.log('📋 Sample record columns:', Object.keys(allScholars[0]));
      console.log('📋 Sample record:', {
        institution: allScholars[0].institution,
        faculty: allScholars[0].faculty,
        department: allScholars[0].department,
        program: allScholars[0].program,
        program_type: allScholars[0].program_type,
        supervisor_name: allScholars[0].supervisor_name
      });
    }

    const qualifiedScholars = (allScholars || []).filter(record => {
      // 1. AVAILABILITY: Must not be assigned yet (CRITICAL - must be unassigned)
      const isUnassigned = !record.supervisor_name || record.supervisor_name.trim() === '';
      if (!isUnassigned) {
        return false;
      }

      // 2. BASIC DATA: Must have name and application number
      if (!record.registered_name && !record.name) {
        return false;
      }

      // 3. FACULTY MATCH: Use institution field (more reliable than faculty field)
      // The institution field contains just "Medical And Health Sciences"
      // Target faculty has "Faculty of Medical and Health Sciences"
      // Strip "Faculty of " from target and normalize both for flexible matching
      const recInstitution = (record.institution || '').toLowerCase().trim();
      const targetFacultyNormalized = facultyName
        .replace(/^faculty\s+of\s+/i, '') // Remove "Faculty of " prefix
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and'); // Replace & with "and"
      
      // Also normalize the DB institution for comparison (& to and, Science vs Sciences)
      const recInstitutionNormalized = recInstitution
        .replace(/&/g, 'and')
        .replace(/sciences?$/i, 'sciences'); // Normalize singular/plural
      
      const targetNormalized = targetFacultyNormalized
        .replace(/sciences?$/i, 'sciences'); // Normalize singular/plural
      
      const facultyMatch = recInstitutionNormalized.includes(targetNormalized) || 
                          targetNormalized.includes(recInstitutionNormalized);
      
      if (!facultyMatch) {
        console.log(`❌ Faculty mismatch: DB="${recInstitution}" (normalized: "${recInstitutionNormalized}") vs Target="${facultyName}" (normalized: "${targetNormalized}"`);
        return false;
      }

      // 4. DEPT/PROGRAM MATCH: Check both department and program fields
      // Department might be in: department, program, or program_name field
      const recDept = (record.department || '').toLowerCase().trim();
      const recProg = (record.program || '').toLowerCase().trim();
      const targetDept = departmentName.toLowerCase().trim();
      
      // Match if any of these conditions are true:
      // - exact match in department field
      // - exact match in program field
      // - target appears in either field
      const deptMatch = recDept.includes(targetDept) || 
                        recProg.includes(targetDept) || 
                        targetDept.includes(recDept);
      
      if (!deptMatch) {
        console.log(`❌ Department/Program mismatch: Dept="${recDept}" | Program="${recProg}" vs Target="${targetDept}"`);
        return false;
      }

      // 5. ATTENDANCE: Exclude absent scholars
      const marksStr = String(record.total_marks || '').toLowerCase();
      if (marksStr.includes('absent')) {
        return false;
      }

      // 6. SCHOLAR TYPE MATCH: Filter by program_type if scholarType is specified
      // Skip type filtering if scholarType is null, empty, or contains "all"
      if (scholarType && scholarType.trim() !== '' && !scholarType.toLowerCase().includes('all')) {
        const recType = (record.program_type || record.type || '').toLowerCase().trim();
        const targetType = scholarType.toLowerCase().trim();
        const typeMatch = recType.includes(targetType) || targetType.includes(recType);
        
        if (!typeMatch) {
          console.log(`❌ Scholar type mismatch: DB="${recType}" vs Target="${targetType}"`);
          return false;
        }
      }

      console.log(`✅ Scholar passed filter: ${record.registered_name || record.name}`);
      return true;
    });

    console.log(`✅ Qualified scholars after filtering: ${qualifiedScholars.length}`);
    if (qualifiedScholars.length === 0) {
      console.log('⚠️ No scholars match the criteria.');
      if (allScholars && allScholars.length > 0) {
        console.log('Sample DB record:', allScholars[0]);
        console.log('Target search: Faculty="' + facultyName + '" Department="' + departmentName + '"');
      }
    }

    // Sort by marks descending
    const sorted = qualifiedScholars.sort((a, b) => 
      (parseFloat(b.total_marks) || 0) - (parseFloat(a.total_marks) || 0)
    ).slice(0, limit);

    console.log(`📋 Returning ${sorted.length} scholars to dropdown`);
    return { data: sorted, error: null };
  } catch (err) {
    console.error('💥 Service Exception:', err);
    return { data: null, error: err };
  }
};

// Assign scholar to supervisor - UPDATE examination_records table AND increment supervisor count
export const assignScholarToSupervisor = async (assignmentData) => {
  try {
    console.log('Assigning scholar to supervisor:', assignmentData);
    
    // Get supervisor data
    const { data: supervisor, error: supError } = await supabaseAdmin
      .from('supervisors')
      .select('*')
      .eq('id', assignmentData.supervisor_id)
      .single();

    if (supError) {
      console.error('Error fetching supervisor:', supError);
      return { data: null, error: supError };
    }

    // Update examination_records table with supervisor info
    const { data, error } = await supabaseAdmin
      .from('examination_records')
      .update({
        supervisor_name: supervisor.name,
        supervisor_status: 'Admitted'
      })
      .eq('id', assignmentData.scholar_id)
      .select();

    if (error) {
      console.error('Error assigning scholar:', error);
      return { data: null, error };
    }

    // Increment the appropriate current_*_scholars count based on scholar type
    const scholarType = assignmentData.scholar_type;
    let updateField = {};
    
    if (scholarType === 'Full Time') {
      updateField.current_full_time_scholars = (supervisor.current_full_time_scholars || 0) + 1;
    } else if (scholarType === 'Part Time Internal') {
      updateField.current_part_time_internal_scholars = (supervisor.current_part_time_internal_scholars || 0) + 1;
    } else if (scholarType === 'Part Time External') {
      updateField.current_part_time_external_scholars = (supervisor.current_part_time_external_scholars || 0) + 1;
    } else if (scholarType === 'Part Time Industry') {
      updateField.current_part_time_industry_scholars = (supervisor.current_part_time_industry_scholars || 0) + 1;
    }

    // Update supervisor's current count
    const { error: updateError } = await supabaseAdmin
      .from('supervisors')
      .update(updateField)
      .eq('id', assignmentData.supervisor_id);

    if (updateError) {
      console.error('Error updating supervisor count:', updateError);
      // Don't return error here - assignment was successful, just log the count update issue
    } else {
      console.log('✅ Updated supervisor count:', updateField);
    }

    console.log('✅ Scholar assigned successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in assignScholarToSupervisor:', err);
    return { data: null, error: err };
  }
};

// Fetch assignments for a supervisor - FROM examination_records
export const fetchSupervisorAssignments = async (supervisorId) => {
  try {
    // Get supervisor name first
    const { data: supervisor, error: supError } = await supabase
      .from('supervisors')
      .select('name')
      .eq('id', supervisorId)
      .single();

    if (supError) {
      console.error('Error fetching supervisor:', supError);
      return { data: null, error: supError };
    }

    // Fetch scholars assigned to this supervisor from examination_records
    const { data, error } = await supabase
      .from('examination_records')
      .select('*')
      .eq('supervisor_name', supervisor.name)
      .eq('supervisor_status', 'Admitted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supervisor assignments:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSupervisorAssignments:', err);
    return { data: null, error: err };
  }
};

// Fetch all assignments - FROM examination_records
export const fetchAllAssignments = async () => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .select('*')
      .not('supervisor_name', 'is', null)
      .eq('supervisor_status', 'Admitted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all assignments:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} assignments from examination_records`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchAllAssignments:', err);
    return { data: null, error: err };
  }
};

// Unassign scholar from supervisor
// Unassign scholar from supervisor - UPDATE examination_records AND decrement supervisor count
export const unassignScholar = async (scholarId) => {
  try {
    console.log('Unassigning scholar:', scholarId);
    
    // First, get the scholar's current assignment info
    const { data: scholarData, error: fetchError } = await supabaseAdmin
      .from('examination_records')
      .select('supervisor_name, type, program_type')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('Error fetching scholar data:', fetchError);
      return { data: null, error: fetchError };
    }

    const supervisorName = scholarData.supervisor_name;
    const scholarType = scholarData.type || scholarData.program_type;

    // Clear supervisor_name and supervisor_status in examination_records
    const { data, error } = await supabaseAdmin
      .from('examination_records')
      .update({
        supervisor_name: null,
        supervisor_status: null
      })
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('Error unassigning scholar:', error);
      return { data: null, error };
    }

    // Decrement the supervisor's count if we have supervisor info
    if (supervisorName) {
      // Get supervisor by name
      const { data: supervisor, error: supError } = await supabaseAdmin
        .from('supervisors')
        .select('*')
        .eq('name', supervisorName)
        .single();

      if (!supError && supervisor) {
        let updateField = {};
        
        // Determine which field to decrement based on scholar type
        if (scholarType && scholarType.toLowerCase().includes('full')) {
          updateField.current_full_time_scholars = Math.max(0, (supervisor.current_full_time_scholars || 0) - 1);
        } else if (scholarType && scholarType.toLowerCase().includes('internal')) {
          updateField.current_part_time_internal_scholars = Math.max(0, (supervisor.current_part_time_internal_scholars || 0) - 1);
        } else if (scholarType && scholarType.toLowerCase().includes('external')) {
          updateField.current_part_time_external_scholars = Math.max(0, (supervisor.current_part_time_external_scholars || 0) - 1);
        } else if (scholarType && scholarType.toLowerCase().includes('industry')) {
          updateField.current_part_time_industry_scholars = Math.max(0, (supervisor.current_part_time_industry_scholars || 0) - 1);
        }

        // Update supervisor's current count
        if (Object.keys(updateField).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('supervisors')
            .update(updateField)
            .eq('id', supervisor.id);

          if (updateError) {
            console.error('Error updating supervisor count:', updateError);
          } else {
            console.log('✅ Decremented supervisor count:', updateField);
          }
        }
      }
    }

    console.log('✅ Scholar unassigned successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in unassignScholar:', err);
    return { data: null, error: err };
  }
};

// Update admitted counts from examination_records
export const updateAdmittedCounts = async () => {
  try {
    console.log('Updating admitted counts...');
    
    const { data, error } = await supabase
      .rpc('update_supervisor_admitted_counts');

    if (error) {
      console.error('Error updating admitted counts:', error);
      return { data: null, error };
    }

    console.log('✅ Admitted counts updated successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in updateAdmittedCounts:', err);
    return { data: null, error: err };
  }
};

// Get vacancy summary
export const getVacancySummary = async () => {
  try {
    const { data, error } = await supabase
      .rpc('get_supervisor_vacancy_summary');

    if (error) {
      console.error('Error fetching vacancy summary:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getVacancySummary:', err);
    return { data: null, error: err };
  }
};

// Fetch faculties and departments from departments table
export const fetchFacultiesAndDepartments = async () => {
  try {
    const { data: departmentsData, error } = await supabase
      .from('departments')
      .select('*')
      .order('faculty', { ascending: true })
      .order('department_name', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      return { data: null, error };
    }

    // Group departments by faculty
    const grouped = {};
    (departmentsData || []).forEach(dept => {
      if (!grouped[dept.faculty]) {
        grouped[dept.faculty] = {
          id: dept.faculty, // Use full faculty name as ID to avoid collisions
          name: dept.faculty,
          departments: []
        };
      }
      grouped[dept.faculty].departments.push({
        id: `${dept.id}`,
        name: dept.department_name,
        faculty: dept.faculty
      });
    });

    const facultiesArray = Object.values(grouped);
    console.log(`✅ Fetched ${facultiesArray.length} faculties with departments`);
    
    return { data: facultiesArray, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultiesAndDepartments:', err);
    return { data: null, error: err };
  }
};
