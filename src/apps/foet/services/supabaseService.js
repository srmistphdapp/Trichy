import { supabase } from '../../../supabaseClient';

// Map faculty names to status values
const FACULTY_TO_STATUS = {
  'Faculty of Engineering & Technology': 'Forwarded to Engineering',
  'Faculty of Science & Humanities': 'Forwarded to Science',
  'Faculty of Management': 'Forwarded to Management',
  'Faculty of Medical & Health Science': 'Forwarded to Medical'
};

// Map faculty names to dept_status values for admin
const FACULTY_TO_DEPT_STATUS = {
  'Faculty of Engineering & Technology': 'Back_To_Engineering',
  'Faculty of Science & Humanities': 'Back_To_Science',
  'Faculty of Management': 'Back_To_Management',
  'Faculty of Medical & Health Science': 'Back_To_Medical'
};

// Get status value for a faculty
export const getStatusForFaculty = (facultyName) => {
  return FACULTY_TO_STATUS[facultyName] || null;
};

// Get dept_status value for admin based on faculty
export const getDeptStatusForFaculty = (facultyName) => {
  return FACULTY_TO_DEPT_STATUS[facultyName] || null;
};

// Fetch scholars for faculty portal (Research Coordinator view) - filtered by status AND faculty/institution
export const fetchFacultyScholars = async (assignedFaculty) => {
  try {
    console.log(`Fetching scholars for assigned faculty: ${assignedFaculty}`);
    
    if (!assignedFaculty) {
      console.warn('No assigned faculty provided');
      return { data: [], error: null };
    }

    // Map faculty to status values for filtering
    const statusValue = getStatusForFaculty(assignedFaculty);
    console.log(`Normalized faculty: ${assignedFaculty}, Status filter: ${statusValue}`);

    if (!statusValue) {
      console.warn('Could not map faculty to status value');
      return { data: [], error: null };
    }

    // Query scholars filtered by BOTH:
    // 1. Status column (e.g., "Forwarded to Medical") AND faculty column matches assignedFaculty
    // 2. OR scholars with faculty_forward = "Back_To_Director" AND faculty column matches assignedFaculty (re-submissions)
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*, program_type')
      .or(`and(status.eq.${statusValue},faculty.eq.${assignedFaculty}),and(faculty_forward.eq.Back_To_Director,faculty.eq.${assignedFaculty})`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching faculty scholars:', error);
      return { data: null, error };
    }

    console.log(`Found ${data?.length || 0} scholars with status: ${statusValue} AND faculty: ${assignedFaculty}`);
    
    // Debug: Log first few scholars to verify filtering
    if (data && data.length > 0) {
      console.log('Sample scholars:', data.slice(0, 3).map(s => ({
        name: s.registered_name,
        faculty: s.faculty,
        status: s.status,
        faculty_forward: s.faculty_forward
      })));
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch scholars for admin forward page - filtered by faculty and dept_status
export const fetchAdminForwardScholars = async (assignedFaculty) => {
  try {
    console.log(`Fetching admin forward scholars for assigned faculty: ${assignedFaculty}`);
    
    if (!assignedFaculty) {
      console.warn('No assigned faculty provided for admin forward');
      return { data: [], error: null };
    }

    // Normalize faculty name to handle variations
    const facultyMapping = {
      'Faculty of Engineering & Technology': 'Faculty of Engineering & Technology',
      'Faculty of Science & Humanities': 'Faculty of Science & Humanities',
      'Faculty of Management': 'Faculty of Management',
      'Faculty of Medical & Health Science': 'Faculty of Medical & Health Science',
      'Faculty of Medical and Health Sciences': 'Faculty of Medical & Health Science'
    };

    let normalizedFaculty = assignedFaculty;
    if (assignedFaculty && facultyMapping[assignedFaculty]) {
      normalizedFaculty = facultyMapping[assignedFaculty];
    }

    const deptStatusValue = getDeptStatusForFaculty(assignedFaculty);
    console.log(`Normalized faculty: ${normalizedFaculty}, Dept status: ${deptStatusValue}`);

    // Query scholars filtered by faculty AND (dept_status OR dept_review with Approved/Rejected)
    // This includes:
    // 1. Scholars with dept_status = Back_To_* (explicitly marked to return)
    // 2. Scholars with dept_review = 'Approved' or 'Rejected' (approved/rejected by departments)
    let query = supabase
      .from('scholar_applications')
      .select('*, program_type')
      .eq('faculty', normalizedFaculty)
      .or(`dept_status.eq.${deptStatusValue},dept_review.eq.Approved,dept_review.eq.Rejected`)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin forward scholars:', error);
      return { data: null, error };
    }

    console.log(`Found ${data?.length || 0} admin forward scholars for faculty: ${normalizedFaculty}`);
    
    // Debug: Log first few scholars to verify filtering
    if (data && data.length > 0) {
      console.log('Sample admin forward scholars:', data.slice(0, 3).map(s => ({
        name: s.registered_name,
        faculty: s.faculty,
        dept_status: s.dept_status,
        dept_review: s.dept_review
      })));
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchAdminForwardScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch examination records for faculty portal
export const fetchFacultyExaminations = async () => {
  try {
    const { data, error } = await supabase
      .from('examinations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching faculty examinations:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyExaminations:', err);
    return { data: null, error: err };
  }
};

// Fetch question papers for faculty filtered by assigned faculty
export const fetchFacultyQuestionPapers = async (assignedFaculty) => {
  try {
    // Normalize faculty name to handle variations
    const facultyMapping = {
      'Faculty of Engineering & Technology': 'Faculty of Engineering & Technology',
      'Faculty of Science & Humanities': 'Faculty of Science & Humanities',
      'Faculty of Management': 'Faculty of Management',
      'Faculty of Medical & Health Science': 'Faculty of Medical and Health Sciences',
      'Faculty of Medical and Health Sciences': 'Faculty of Medical and Health Sciences'
    };

    let normalizedFaculty = assignedFaculty;
    if (assignedFaculty && facultyMapping[assignedFaculty]) {
      normalizedFaculty = facultyMapping[assignedFaculty];
    }

    let query = supabase
      .from('question_papers')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by faculty_name if provided
    if (normalizedFaculty) {
      query = query.eq('faculty_name', normalizedFaculty);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching question papers:', error);
      return { data: null, error };
    }

    console.log(`Fetched ${data?.length || 0} question papers for faculty: ${normalizedFaculty}`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyQuestionPapers:', err);
    return { data: null, error: err };
  }
};

// Update scholar status
export const updateScholarStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating scholar status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateScholarStatus:', err);
    return { data: null, error: err };
  }
};

// Fetch viva marks for scholars
export const fetchVivaMarks = async () => {
  try {
    const { data, error } = await supabase
      .from('viva_marks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching viva marks:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchVivaMarks:', err);
    return { data: null, error: err };
  }
};

// Fetch submission logs
export const fetchSubmissionLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('submission_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submission logs:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSubmissionLogs:', err);
    return { data: null, error: err };
  }
};

// Add submission log
export const addSubmissionLog = async (logData) => {
  try {
    const { data, error } = await supabase
      .from('submission_logs')
      .insert([logData])
      .select();

    if (error) {
      console.error('Error adding submission log:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in addSubmissionLog:', err);
    return { data: null, error: err };
  }
};

// Fetch departments filtered by faculty
export const fetchDepartments = async (assignedFaculty) => {
  try {
    // Normalize faculty name to handle variations
    // Map coordinator faculty names to departments table faculty names
    const facultyMapping = {
      'Faculty of Engineering & Technology': 'Faculty of Engineering & Technology',
      'Faculty of Science & Humanities': 'Faculty of Science & Humanities',
      'Faculty of Management': 'Faculty of Management',
      'Faculty of Medical & Health Science': 'Faculty of Medical and Health Sciences',
      'Faculty of Medical and Health Sciences': 'Faculty of Medical and Health Sciences'
    };

    let normalizedFaculty = assignedFaculty;
    if (assignedFaculty && facultyMapping[assignedFaculty]) {
      normalizedFaculty = facultyMapping[assignedFaculty];
    }

    let query = supabase
      .from('departments')
      .select('*')
      .order('department_name', { ascending: true });

    // Filter by faculty if provided
    if (normalizedFaculty) {
      query = query.eq('faculty', normalizedFaculty);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching departments:', error);
      return { data: null, error };
    }

    console.log(`Fetched ${data?.length || 0} departments for faculty: ${normalizedFaculty}`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchDepartments:', err);
    return { data: null, error: err };
  }
};

// Update scholar faculty_status for department forwarding
export const updateScholarFacultyStatus = async (scholarId, facultyStatus, forwardingStatus) => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .update({ 
        faculty_status: facultyStatus,
        status: forwardingStatus
      })
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('Error updating scholar faculty_status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateScholarFacultyStatus:', err);
    return { data: null, error: err };
  }
};

// Batch update multiple scholars' faculty_status
export const batchUpdateScholarsFacultyStatus = async (scholarIds, facultyStatus, forwardingStatus) => {
  try {
    // Update each scholar individually to ensure proper tracking
    const results = await Promise.all(
      scholarIds.map(id =>
        supabase
          .from('scholar_applications')
          .update({ 
            faculty_status: facultyStatus,
            status: forwardingStatus
          })
          .eq('id', id)
          .select()
      )
    );

    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Errors during batch update:', errors);
      return {
        data: results.map(r => r.data).filter(Boolean),
        error: `${errors.length} update(s) failed`
      };
    }

    return {
      data: results.map(r => r.data).flat(),
      error: null
    };
  } catch (err) {
    console.error('Exception in batchUpdateScholarsFacultyStatus:', err);
    return { data: null, error: err };
  }
};

// Fetch examination records filtered by faculty with scholar details
export const fetchFacultyExaminationRecords = async (assignedFaculty) => {
  try {
    // Normalize faculty name to handle variations
    const facultyMapping = {
      'Faculty of Engineering & Technology': ['Faculty of Engineering & Technology', 'Engineering And Technology'],
      'Faculty of Science & Humanities': ['Faculty of Science & Humanities', 'Science And Humanities'],
      'Faculty of Management': ['Faculty of Management', 'Management'],
      'Faculty of Medical & Health Science': ['Faculty of Medical & Health Science', 'Faculty of Medical and Health Sciences', 'Medical And Health Sciences', 'Medical and Health Sciences'],
      'Faculty of Medical and Health Sciences': ['Faculty of Medical & Health Science', 'Faculty of Medical and Health Sciences', 'Medical And Health Sciences', 'Medical and Health Sciences']
    };

    // Get all possible faculty name variations for the assigned faculty
    const facultyVariations = facultyMapping[assignedFaculty] || [assignedFaculty];
    
    console.log(`Fetching examination records for faculty: ${assignedFaculty}`);
    console.log(`Faculty variations to search:`, facultyVariations);

    // Get ALL examination records for this faculty from the faculty column using OR condition
    const { data: examData, error: examError } = await supabase
      .from('examination_records')
      .select('*')
      .or(facultyVariations.map(faculty => `faculty.eq.${faculty}`).join(','))
      .order('created_at', { ascending: false });

    if (examError) {
      console.error('Error fetching examination records:', examError);
      return { data: null, error: examError };
    }

    console.log(`Found ${examData?.length || 0} examination records for faculty variations: ${facultyVariations.join(', ')}`);

    // Get scholar applications to join with examination records
    const { data: scholarData, error: scholarError } = await supabase
      .from('scholar_applications')
      .select('id, registered_name, application_no, faculty, program');

    if (scholarError) {
      console.error('Error fetching scholar applications:', scholarError);
      return { data: null, error: scholarError };
    }

    // Create maps for scholar lookup - try multiple matching strategies
    const scholarMapByAppNo = {};
    const scholarMapById = {};
    scholarData.forEach(scholar => {
      if (scholar.application_no) {
        scholarMapByAppNo[scholar.application_no] = scholar;
      }
      if (scholar.id) {
        scholarMapById[scholar.id] = scholar;
      }
    });

    console.log(`Created scholar maps: ${Object.keys(scholarMapByAppNo).length} by app_no, ${Object.keys(scholarMapById).length} by id`);

    // Combine examination records with scholar information
    const combinedData = examData.map(examRecord => {
      let scholar = {};
      
      // Try to find scholar by application_no first
      if (examRecord.application_no) {
        scholar = scholarMapByAppNo[examRecord.application_no] || {};
        if (scholar.registered_name) {
          console.log(`✓ Found scholar by app_no ${examRecord.application_no}: ${scholar.registered_name}`);
        }
      }
      
      // If not found by app_no, try by scholar_id if available
      if (!scholar.registered_name && examRecord.scholar_id) {
        scholar = scholarMapById[examRecord.scholar_id] || {};
        if (scholar.registered_name) {
          console.log(`✓ Found scholar by scholar_id ${examRecord.scholar_id}: ${scholar.registered_name}`);
        }
      }
      
      // If still not found, try by examiner_name as fallback
      if (!scholar.registered_name && examRecord.examiner_name) {
        console.log(`⚠ Using examiner_name as fallback: ${examRecord.examiner_name}`);
      }

      // Helper function to check if faculty_written indicates marks are forwarded
      const isWrittenMarksForwarded = (facultyWritten) => {
        if (!facultyWritten) return false;
        const forwardedPatterns = [
          'Forwarded to Engineering',
          'Forwarded to Science',
          'Forwarded to Medical',
          'Forwarded to Management'
        ];
        return forwardedPatterns.some(pattern => 
          facultyWritten.includes(pattern)
        );
      };

      // Helper function to check if faculty_interview indicates viva marks are forwarded
      const isVivaMarksForwarded = (facultyInterview) => {
        if (!facultyInterview) return false;
        const forwardedPatterns = [
          'Forwarded_To_Engineering',
          'Forwarded_To_Medical',
          'Forwarded_To_Science',
          'Forwarded_To_Management'
        ];
        return forwardedPatterns.some(pattern => 
          facultyInterview.includes(pattern)
        );
      };

      return {
        ...examRecord,
        // Use registered_name directly from examination_records table first, then fallback to scholar join
        registered_name: examRecord.registered_name || scholar.registered_name || examRecord.examiner_name || 'N/A',
        scholar_faculty: scholar.faculty || examRecord.faculty || 'N/A',
        program: scholar.program || examRecord.program || examRecord.faculty || 'N/A', // Use faculty as fallback for program
        // Preserve original written_marks and faculty_written values for pending detection
        written_marks: examRecord.written_marks,
        faculty_written: examRecord.faculty_written,
        // Preserve original interview_marks and faculty_interview values for pending detection
        interview_marks: examRecord.interview_marks,
        faculty_interview: examRecord.faculty_interview,
        // Director interview status for forwarding to director
        director_interview: examRecord.director_interview || 'Pending'
      };
    });

    console.log(`Fetched ${combinedData?.length || 0} examination records for faculty: ${assignedFaculty}`);
    console.log('Sample examination records with type:', combinedData.slice(0, 3).map(record => ({
      id: record.id,
      registered_name: record.registered_name,
      faculty: record.faculty,
      type: record.type,
      written_marks: record.written_marks,
      interview_marks: record.interview_marks
    }))); // Debug log with type field
    return { data: combinedData, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyExaminationRecords:', err);
    return { data: null, error: err };
  }
};


// Fetch scholars with resolved queries for query scholar page
export const fetchQueryScholars = async (assignedFaculty) => {
  try {
    console.log(`Fetching query scholars for assigned faculty: ${assignedFaculty}`);
    
    if (!assignedFaculty) {
      console.warn('No assigned faculty provided for query scholars');
      return { data: [], error: null };
    }

    // Normalize faculty name to handle variations
    const facultyMapping = {
      'Faculty of Engineering & Technology': 'Faculty of Engineering & Technology',
      'Faculty of Science & Humanities': 'Faculty of Science & Humanities',
      'Faculty of Management': 'Faculty of Management',
      'Faculty of Medical & Health Science': 'Faculty of Medical & Health Science',
      'Faculty of Medical and Health Sciences': 'Faculty of Medical & Health Science'
    };

    let normalizedFaculty = assignedFaculty;
    if (assignedFaculty && facultyMapping[assignedFaculty]) {
      normalizedFaculty = facultyMapping[assignedFaculty];
    }

    // Map faculty to query_faculty values for additional filtering if needed
    const facultyToQueryFaculty = {
      'Faculty of Engineering & Technology': 'Forward to Engineering',
      'Faculty of Science & Humanities': 'Forward to Science',
      'Faculty of Management': 'Forward to Management',
      'Faculty of Medical & Health Science': 'Forward to Medical'
    };

    const queryFacultyValue = facultyToQueryFaculty[assignedFaculty];
    console.log(`Normalized faculty: ${normalizedFaculty}, Query faculty: ${queryFacultyValue}`);

    // Query scholars filtered by faculty and query resolution status
    // Scholars with resolved queries should appear in FOET if:
    // 1. Faculty matches AND query_resolved = 'Query Resolved'
    // 2. OR Faculty matches AND they have been forwarded back from departments after query resolution
    let query = supabase
      .from('scholar_applications')
      .select('*, program_type')
      .eq('faculty', normalizedFaculty)
      .eq('query_resolved', 'Query Resolved')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resolved query scholars:', error);
      return { data: null, error };
    }

    console.log(`Found ${data?.length || 0} resolved query scholars for faculty: ${normalizedFaculty}`);
    
    // Debug: Log first few scholars to verify filtering
    if (data && data.length > 0) {
      console.log('Sample query scholars:', data.slice(0, 3).map(s => ({
        name: s.registered_name,
        faculty: s.faculty,
        query_resolved: s.query_resolved,
        query_faculty: s.query_faculty
      })));
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchQueryScholars:', err);
    return { data: null, error: err };
  }
};

// Refresh examination records data
export const refreshExaminationRecords = async (assignedFaculty) => {
  return await fetchFacultyExaminationRecords(assignedFaculty);
};

// Update director_interview status in examination_records
export const updateDirectorInterviewStatus = async (recordId, status) => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .update({ director_interview: status })
      .eq('id', recordId)
      .select();

    if (error) {
      console.error('Error updating director_interview status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateDirectorInterviewStatus:', err);
    return { data: null, error: err };
  }
};
