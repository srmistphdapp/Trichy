/**
 * Centralized department mapping function
 * Derives department code from program name
 * Single source of truth for program-to-department mapping
 */

const PROGRAM_TO_DEPARTMENT = {
  // --- Faculty of Engineering & Technology ---
  'biomedical engineering': 'BME',
  'biomedical': 'BME',
  
  'biotechnology': 'ENGBIO', // Engineering Biotech
  'bio-technology': 'ENGBIO',
  'biotech': 'ENGBIO',
  
  'chemistry': 'ENGCHEM', // Engineering Chem
  'chemistry engineering': 'ENGCHEM',
  
  'civil engineering': 'CIVIL',
  'civil': 'CIVIL',
  
  'computer science and engineering': 'CSE',
  'computer science engineering': 'CSE',
  'computer science': 'CSE', // Engineering CS
  'cse': 'CSE',
  
  'electrical and electronics engineering': 'EEE',
  'electrical engineering': 'EEE',
  'electrical': 'EEE',
  'eee': 'EEE',
  
  'electronics and communication engineering': 'ECE',
  'electronics and communication': 'ECE',
  'electronics': 'ECE',
  'ece': 'ECE',
  
  'mathematics': 'ENGMATH', // Engineering Math
  'mathematics engineering': 'ENGMATH',
  'maths': 'ENGMATH',
  
  'mechanical engineering': 'MECH',
  'mechanical': 'MECH',
  
  'physics': 'ENGPHYS', // Engineering Physics
  'physics engineering': 'ENGPHYS',
  
  'english': 'ENGENG', // Often under S&H but sometimes Eng - kept for legacy safety
  
  // --- Faculty of Management ---
  'management studies': 'MBA',
  'business administration': 'MBA',
  'mba': 'MBA',
  'management': 'MBA',
  
  'physical education': 'PED',
  'physical edu': 'PED',
  'sports': 'PED',

  // --- Faculty of Science & Humanities ---
  'commerce': 'COMM',
  'commerce science': 'COMM',
  
  'computer science': 'CS_SCI', // Science CS (Different code)
  
  'biotechnology': 'BIO_SCI', // Science Biotech
  
  'biochemistry': 'BIOCHEM_SCI', // Science Biochem
  
  'microbiology': 'MICRO_SCI', // Science Micro
  
  'mathematics': 'MATH_SCI', // Science Math
  
  'physics': 'PHYS_SCI', // Science Physics
  
  'chemistry': 'CHEM_SCI', // Science Chemistry
  
  'english & foreign languages': 'EFL',
  'english and foreign languages': 'EFL',
  'foreign languages': 'EFL',
  
  'fashion designing': 'FASHION',
  'fashion design': 'FASHION',
  
  'tamil': 'TAMIL',
  'tamil language': 'TAMIL',
  
  'visual communication': 'VISCOM',
  'visual communications': 'VISCOM',
  
  // --- Faculty of Medical & Health Sciences ---
  // (Allied Health Sciences based on your screenshot)
  'biochemistry': 'BIOCHEM_MED', // Medical Biochem
  'microbiology': 'MICRO_MED',   // Medical Micro
  
  'occupational therapy': 'OT',
  'occupational': 'OT',
  
  'medical imaging technology': 'MIT',
  'medical imaging': 'MIT',
  'imaging technology': 'MIT',
  
  'clinical psychology': 'CP',
  'psychology': 'CP',
  
  'renal dialysis technology': 'RDT',
  'renal dialysis': 'RDT',
  'dialysis': 'RDT',
  
  'anaesthesia technology': 'AT',
  'anaesthesia': 'AT',
  'anesthesia': 'AT',

  // (Dental/Medical Legacy Mappings - kept safe to avoid breaking old data)
  'department of basic medical sciences': 'BMS',
  'basic medical sciences': 'BMS',
  'conservative dentistry': 'CDE',
  'oral pathology': 'OMPM',
  'oral surgery': 'OMS',
  'oral medicine': 'OMR',
  'orthodontics': 'ORTHO',
  'pediatric dentistry': 'PPD',
  'periodontics': 'POI',
  'prosthodontics': 'PROSTH',
  'public health dentistry': 'PHD',
};

// Map department codes to faculty names
const DEPARTMENT_TO_FACULTY = {
  // Engineering
  'BME': 'Faculty of Engineering & Technology',
  'ENGBIO': 'Faculty of Engineering & Technology',
  'ENGCHEM': 'Faculty of Engineering & Technology',
  'CIVIL': 'Faculty of Engineering & Technology',
  'CSE': 'Faculty of Engineering & Technology',
  'EEE': 'Faculty of Engineering & Technology',
  'ECE': 'Faculty of Engineering & Technology',
  'ENGENG': 'Faculty of Engineering & Technology',
  'ENGMATH': 'Faculty of Engineering & Technology',
  'MECH': 'Faculty of Engineering & Technology',
  'ENGPHYS': 'Faculty of Engineering & Technology',
  
  // Management
  'MBA': 'Faculty of Management',
  'PED': 'Faculty of Management', // Updated based on screenshot
  
  // Science & Humanities
  'COMM': 'Faculty of Science & Humanities',
  'CS_SCI': 'Faculty of Science & Humanities',
  'BIO_SCI': 'Faculty of Science & Humanities',
  'BIOCHEM_SCI': 'Faculty of Science & Humanities',
  'MICRO_SCI': 'Faculty of Science & Humanities',
  'MATH_SCI': 'Faculty of Science & Humanities',
  'PHYS_SCI': 'Faculty of Science & Humanities',
  'CHEM_SCI': 'Faculty of Science & Humanities',
  'EFL': 'Faculty of Science & Humanities',
  'FASHION': 'Faculty of Science & Humanities',
  'TAMIL': 'Faculty of Science & Humanities',
  'VISCOM': 'Faculty of Science & Humanities',
  
  // Medical & Health Sciences
  'BIOCHEM_MED': 'Faculty of Medical & Health Science',
  'MICRO_MED': 'Faculty of Medical & Health Science',
  'OT': 'Faculty of Medical & Health Science',
  'MIT': 'Faculty of Medical & Health Science',
  'CP': 'Faculty of Medical & Health Science',
  'RDT': 'Faculty of Medical & Health Science',
  'AT': 'Faculty of Medical & Health Science',
  
  // Medical Legacy
  'BMS': 'Faculty of Medical & Health Science',
  'CDE': 'Faculty of Medical & Health Science',
  'OMPM': 'Faculty of Medical & Health Science',
  'OMS': 'Faculty of Medical & Health Science',
  'OMR': 'Faculty of Medical & Health Science',
  'ORTHO': 'Faculty of Medical & Health Science',
  'PPD': 'Faculty of Medical & Health Science',
  'POI': 'Faculty of Medical & Health Science',
  'PROSTH': 'Faculty of Medical & Health Science',
  'PHD': 'Faculty of Medical & Health Science',
};

/**
 * Extract department code from program name with faculty context
 */
export const getDepartmentFromProgram = (programName, facultyName = null) => {
  if (!programName || typeof programName !== 'string') {
    return null;
  }

  // --- CLEANING LOGIC START ---
  // 1. Lowercase
  let normalized = programName.toLowerCase();

  // 2. Remove "ph.d." prefixes
  normalized = normalized.replace(/^ph\.d\.?\s*-?\s*/, '');

  // 3. Remove content in brackets (e.g. "Physical Education (ph.d...)")
  if (normalized.includes('(')) {
      normalized = normalized.split('(')[0];
  }

  // 4. Trim whitespace
  normalized = normalized.trim();
  // --- CLEANING LOGIC END ---

  // Context-Aware Matching (Faculty Logic)
  if (facultyName) {
    const normalizedFaculty = facultyName.toLowerCase();
    
    // BIOTECHNOLOGY
    if (normalized.includes('biotechnology') || normalized.includes('biotech')) {
      if (normalizedFaculty.includes('engineering')) return 'ENGBIO';
      if (normalizedFaculty.includes('science')) return 'BIO_SCI';
    }
    
    // BIOCHEMISTRY (New conflict)
    if (normalized.includes('biochemistry')) {
      if (normalizedFaculty.includes('medical')) return 'BIOCHEM_MED';
      if (normalizedFaculty.includes('science')) return 'BIOCHEM_SCI';
    }

    // MICROBIOLOGY (New conflict)
    if (normalized.includes('microbiology')) {
      if (normalizedFaculty.includes('medical')) return 'MICRO_MED';
      if (normalizedFaculty.includes('science')) return 'MICRO_SCI';
    }
    
    // COMPUTER SCIENCE
    if (normalized.includes('computer science')) {
      if (normalizedFaculty.includes('engineering')) return 'CSE';
      if (normalizedFaculty.includes('science')) return 'CS_SCI';
    }
    
    // MATHEMATICS
    if (normalized.includes('mathematics') || normalized.includes('maths')) {
      if (normalizedFaculty.includes('engineering')) return 'ENGMATH';
      if (normalizedFaculty.includes('science')) return 'MATH_SCI';
    }

    // PHYSICS
    if (normalized.includes('physics')) {
      if (normalizedFaculty.includes('engineering')) return 'ENGPHYS';
      if (normalizedFaculty.includes('science')) return 'PHYS_SCI';
    }

    // CHEMISTRY
    if (normalized.includes('chemistry')) {
      if (normalizedFaculty.includes('engineering')) return 'ENGCHEM';
      if (normalizedFaculty.includes('science')) return 'CHEM_SCI';
    }
  }

  // Try exact match on clean string
  if (PROGRAM_TO_DEPARTMENT[normalized]) {
    return PROGRAM_TO_DEPARTMENT[normalized];
  }

  // Try partial match
  for (const [key, dept] of Object.entries(PROGRAM_TO_DEPARTMENT)) {
    if (normalized.includes(key)) {
      // Safety: Don't let "biochemistry" match "chemistry" keys blindly without context
      // But since we handled context above, this is a fallback.
      return dept;
    }
  }

  return null;
};

export const getFacultyFromDepartment = (departmentCode) => {
  if (!departmentCode) return null;
  return DEPARTMENT_TO_FACULTY[departmentCode] || null;
};

export const constructForwardingStatus = (departmentCode) => {
  const faculty = getFacultyFromDepartment(departmentCode);
  if (!faculty) return null;
  
  const statusMap = {
    'Faculty of Engineering & Technology': 'Forwarded to Engineering',
    'Faculty of Science & Humanities': 'Forwarded to Science',
    'Faculty of Management': 'Forwarded to Management',
    'Faculty of Medical & Health Science': 'Forwarded to Medical'
  };
  
  return statusMap[faculty] || null;
};

export const constructFacultyStatus = (departmentCode) => {
  if (!departmentCode) return null;
  return `FORWARDED_TO_${departmentCode}`;
};

export const validateScholarForForwarding = (scholar) => {
  if (!scholar) {
    return { canForward: false, error: 'Scholar data not found', department: null };
  }

  if (scholar.faculty_status && scholar.faculty_status.startsWith('FORWARDED_TO_')) {
    return { canForward: false, error: 'Already forwarded', department: null };
  }

  if (!scholar.program) {
    return { canForward: false, error: 'Scholar program information is missing', department: null };
  }

  // Pass faculty context to resolve overlaps
  const department = getDepartmentFromProgram(scholar.program, scholar.faculty);
  
  if (!department) {
    return {
      canForward: false,
      error: `Cannot determine department from program: "${scholar.program}" in faculty: "${scholar.faculty || 'Unknown'}"`,
      department: null
    };
  }

  return { canForward: true, error: null, department };
};

export const needsStatusSync = (scholar) => {
  if (!scholar) return false;
  return scholar.faculty_status && 
         scholar.faculty_status.startsWith('FORWARDED_TO_') && 
         !scholar.status?.startsWith('Forwarded to');
};