import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useAppContext } from '../contexts/AppContext';
import { checkDepartmentResultsPublished } from '../services/departmentScholarService';
import { supabase } from '../../../supabaseClient';

export default function Results() {
  const { currentUser } = useAppContext();
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ type: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isResultsPublished, setIsResultsPublished] = useState(false);
  const [downloadModal, setDownloadModal] = useState({ show: false, message: '', filename: '', isError: false });

  // Check if department results are published and fetch examination records
  const checkDeptResultStatus = async () => {
    try {
      if (!currentUser?.department || !currentUser?.departmentCode) {
        return { isPublished: false, records: [] };
      }

      const { data: isPublished, error } = await checkDepartmentResultsPublished(
        currentUser.department, 
        currentUser.departmentCode
      );
      
      if (error) {
        console.error('❌ Error checking dept_result status:', error);
        return { isPublished: false, records: [] };
      }

      return { isPublished, records: [] };
    } catch (err) {
      console.error('❌ Exception checking dept_result status:', err);
      return { isPublished: false, records: [] };
    }
  };

  // Fetch examination records from examination_records table
  const fetchExaminationRecords = async () => {
    try {
      if (!currentUser?.department || !currentUser?.departmentCode) {
        return { data: [], error: 'Department information not available' };
      }

      console.log(`🔍 Fetching examination records for department: ${currentUser.department} (${currentUser.departmentCode})`);

      const expectedDeptResult = `Published_To_${currentUser.departmentCode}`;
      console.log(`📋 Looking for dept_result = "${expectedDeptResult}"`);

      const { data, error } = await supabase
        .from('examination_records')
        .select('*')
        .ilike('program', `%${currentUser.department}%`)
        .eq('dept_result', expectedDeptResult) // Filter by exact dept_result value like "Published_To_CSE"
        .order('total_marks', { ascending: false }); // Order by total_marks descending for ranking

      if (error) {
        console.error('❌ Error fetching examination records:', error);
        return { data: [], error };
      }

      console.log(`✅ Found ${data?.length || 0} examination records with dept_result = "${expectedDeptResult}"`);
      
      if (data && data.length > 0) {
        console.log(`📋 Sample records:`, data.slice(0, 3).map(r => ({ 
          name: r.registered_name, 
          dept_result: r.dept_result,
          interview_marks: r.interview_marks 
        })));
      }
      
      return { data: data || [], error: null };
    } catch (err) {
      console.error('❌ Exception fetching examination records:', err);
      return { data: [], error: err };
    }
  };

  // Fetch examination records data
  useEffect(() => {
    const loadExaminationRecords = async () => {
      if (!currentUser?.department) {
        setError('User information not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First check if department results are published
        const { isPublished } = await checkDeptResultStatus();
        setIsResultsPublished(isPublished);

        if (!isPublished) {
          // If results are not published, don't fetch records
          setScholars([]);
          setLoading(false);
          return;
        }

        // If results are published, fetch examination records
        const { data, error: fetchError } = await fetchExaminationRecords();

        if (fetchError) {
          setError(fetchError.message || 'Failed to fetch examination records');
        } else {
          // Set the examination records as scholars data
          setScholars(data || []);
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    loadExaminationRecords();
  }, [currentUser]);

  // Generate exam marks from examination_records data
  const examMarks = scholars.map(record => ({
    scholarId: record.id,
    writtenMarks: record.written_marks ? Math.round(parseFloat(record.written_marks)) : 0, // Convert to integer
    interviewMarks: record.interview_marks ? Math.round(parseFloat(record.interview_marks)) : 0, // Convert to integer
    totalMarks: record.total_marks ? Math.round(parseFloat(record.total_marks)) : 0, // Convert to integer
  }));

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  // Clear search function
  const clearSearch = () => {
    setSearch('');
  };

  // Reset all filters
  const resetFilters = () => {
    setFilter({ type: '' });
    setSearch('');
    setShowFilterModal(false);
  };

  // Check if any filters are active
  const hasActiveFilters = (search && search.trim()) || filter.type;

  // Filter examination records based on search and filters
  const filteredScholars = scholars.filter(record => {
    // Type filter
    if (filter.type) {
      if (filter.type === 'Part Time') {
        // For Part Time filter, include all part time variants
        return record.type && record.type.toLowerCase().includes('part time');
      } else {
        return record.type === filter.type;
      }
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      return (
        record.registered_name?.toLowerCase().includes(searchTerm) ||
        record.application_no?.toLowerCase().includes(searchTerm)
      );
    }

    return true;
  });

  // Get examination records by type with ranking
  const getRankedScholarsByType = (type) => {
    return filteredScholars
      .filter(record => record.type === type)
      .map(record => {
        // Check if written marks or interview marks are absent
        const writtenMarks = record.written_marks;
        const interviewMarks = record.interview_marks;
        const totalMarks = record.total_marks;
        
        // Check for absent variations in any mark field
        const isWrittenAbsent = typeof writtenMarks === 'string' && 
          ['a', 'ab', 'absent'].includes(writtenMarks.toLowerCase().trim());
        const isInterviewAbsent = typeof interviewMarks === 'string' && 
          ['a', 'ab', 'absent'].includes(interviewMarks.toLowerCase().trim());
        const isTotalAbsent = typeof totalMarks === 'string' && 
          ['a', 'ab', 'absent'].includes(totalMarks.toLowerCase().trim());
        
        // If any mark is absent, show as absent
        if (isWrittenAbsent || isInterviewAbsent || isTotalAbsent) {
          return { 
            ...record, 
            written: 'Absent', 
            interview: 'Absent', 
            total: 'Absent', 
            qualified: false,
            isAbsent: true
          };
        }
        
        // Otherwise, process as numeric marks
        const writtenNum = Math.round(parseFloat(writtenMarks)) || 0;
        const interviewNum = Math.round(parseFloat(interviewMarks)) || 0;
        const totalNum = Math.round(parseFloat(totalMarks)) || (writtenNum + interviewNum);
        
        return { 
          ...record, 
          written: writtenNum, 
          interview: interviewNum, 
          total: totalNum, 
          qualified: totalNum >= 60,
          isAbsent: false
        };
      })
      .sort((a, b) => {
        // Sort absent scholars to the bottom
        if (a.isAbsent && !b.isAbsent) return 1;
        if (!a.isAbsent && b.isAbsent) return -1;
        // For non-absent scholars, sort by total marks descending
        if (!a.isAbsent && !b.isAbsent) {
          return b.total - a.total;
        }
        // For absent scholars, sort alphabetically by name
        return a.registered_name.localeCompare(b.registered_name);
      });
  };

  // Get Part Time scholars with all sub-types (Internal, External, Industry)
  const getPartTimeScholars = () => {
    return filteredScholars
      .filter(record => record.type && record.type.toLowerCase().includes('part time'))
      .map(record => {
        // Check if written marks or interview marks are absent
        const writtenMarks = record.written_marks;
        const interviewMarks = record.interview_marks;
        const totalMarks = record.total_marks;
        
        // Check for absent variations in any mark field
        const isWrittenAbsent = typeof writtenMarks === 'string' && 
          ['a', 'ab', 'absent'].includes(writtenMarks.toLowerCase().trim());
        const isInterviewAbsent = typeof interviewMarks === 'string' && 
          ['a', 'ab', 'absent'].includes(interviewMarks.toLowerCase().trim());
        const isTotalAbsent = typeof totalMarks === 'string' && 
          ['a', 'ab', 'absent'].includes(totalMarks.toLowerCase().trim());
        
        // If any mark is absent, show as absent
        if (isWrittenAbsent || isInterviewAbsent || isTotalAbsent) {
          return { 
            ...record, 
            written: 'Absent', 
            interview: 'Absent', 
            total: 'Absent', 
            qualified: false,
            isAbsent: true
          };
        }
        
        // Otherwise, process as numeric marks
        const writtenNum = Math.round(parseFloat(writtenMarks)) || 0;
        const interviewNum = Math.round(parseFloat(interviewMarks)) || 0;
        const totalNum = Math.round(parseFloat(totalMarks)) || (writtenNum + interviewNum);
        
        return { 
          ...record, 
          written: writtenNum, 
          interview: interviewNum, 
          total: totalNum, 
          qualified: totalNum >= 60,
          isAbsent: false
        };
      })
      .sort((a, b) => {
        // Sort absent scholars to the bottom
        if (a.isAbsent && !b.isAbsent) return 1;
        if (!a.isAbsent && b.isAbsent) return -1;
        // For non-absent scholars, sort by total marks descending
        if (!a.isAbsent && !b.isAbsent) {
          return b.total - a.total;
        }
        // For absent scholars, sort alphabetically by name
        return a.registered_name.localeCompare(b.registered_name);
      });
  };

  // Get scholars by type (for counts)
  const getScholarsByType = (type) => {
    return filteredScholars.filter(s => s.type === type);
  };

  // Download logic for examination records
  function downloadRankings(scholarType) {
    try {
      if (scholarType === 'Part Time') {
        // For Part Time, create separate sheets for each sub-type
        const partTimeScholars = getPartTimeScholars();
        
        if (partTimeScholars.length === 0) {
          setDownloadModal({
            show: true,
            message: 'No Part Time scholars found.',
            filename: '',
            isError: true
          });
          return;
        }

        // Group Part Time scholars by their specific types
        const partTimeInternal = partTimeScholars.filter(s => s.type === 'Part Time Internal');
        const partTimeExternalAcademic = partTimeScholars.filter(s => s.type === 'Part Time External');
        const partTimeExternalIndustry = partTimeScholars.filter(s => s.type === 'Part Time External (Industry)');

        // Sort each group by total marks (descending) and assign ranks
        const sortAndRankScholars = (scholars) => {
          return scholars
            .sort((a, b) => {
              // Sort absent scholars to the bottom
              if (a.isAbsent && !b.isAbsent) return 1;
              if (!a.isAbsent && b.isAbsent) return -1;
              // For non-absent scholars, sort by total marks descending
              if (!a.isAbsent && !b.isAbsent) {
                return b.total - a.total;
              }
              // For absent scholars, sort alphabetically by name
              return a.registered_name.localeCompare(b.registered_name);
            })
            .map((record, index) => ({
              'Rank': index + 1,
              'Name': record.registered_name || 'N/A',
              'Application Number': record.application_no || 'N/A',
              'Type': record.type,
              'Written Marks': record.written === 'Absent' ? 'Absent' : (record.written || 0),
              'Interview Marks': record.interview === 'Absent' ? 'Absent' : (record.interview || 0),
              'Total Marks': record.total === 'Absent' ? 'Absent' : (record.total || 0),
              'Status': record.isAbsent ? 'Absent' : ((record.total || 0) >= 60 ? 'Qualified' : 'Not Qualified')
            }));
        };

        const wb = XLSX.utils.book_new();

        // Create separate sheets for each Part Time type
        if (partTimeInternal.length > 0) {
          const internalData = sortAndRankScholars(partTimeInternal);
          const internalWs = XLSX.utils.json_to_sheet(internalData);
          internalWs['!cols'] = [
            { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, 
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(wb, internalWs, 'Part Time Internal');
        }

        if (partTimeExternalAcademic.length > 0) {
          const academicData = sortAndRankScholars(partTimeExternalAcademic);
          const academicWs = XLSX.utils.json_to_sheet(academicData);
          academicWs['!cols'] = [
            { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, 
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(wb, academicWs, 'Part Time External-Academic');
        }

        if (partTimeExternalIndustry.length > 0) {
          const industryData = sortAndRankScholars(partTimeExternalIndustry);
          const industryWs = XLSX.utils.json_to_sheet(industryData);
          industryWs['!cols'] = [
            { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, 
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
          ];
          XLSX.utils.book_append_sheet(wb, industryWs, 'Part Time External-Industry');
        }

        // Create a summary sheet with all Part Time scholars
        const allPartTimeData = sortAndRankScholars(partTimeScholars);
        const summaryWs = XLSX.utils.json_to_sheet(allPartTimeData);
        summaryWs['!cols'] = [
          { wch: 8 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, 
          { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'All Part Time');

        // Create filename
        const currentDate = new Date().toISOString().split('T')[0];
        const departmentName = currentUser?.department?.replace(/ /g, '_') || 'Department';
        const filename = `${departmentName}_Part_Time_Rankings_${currentDate}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ Successfully downloaded Part Time rankings with separate sheets: ${filename}`);
        
        setDownloadModal({
          show: true,
          message: `Successfully downloaded Part Time rankings with separate sheets for each type!`,
          filename: filename,
          isError: false
        });

      } else {
        // For Full Time and other types, use the existing logic
        const getRankingData = (type) => {
          let scholarData = getRankedScholarsByType(type);
          
          return scholarData.map((record, index) => {
              let rowData = {
                'Rank': index + 1,
                'Name': record.registered_name || 'N/A',
                'Application Number': record.application_no || 'N/A',
              };
              rowData = {
                ...rowData,
                'Written Marks': record.written === 'Absent' ? 'Absent' : (record.written || 0),
                'Interview Marks': record.interview === 'Absent' ? 'Absent' : (record.interview || 0),
                'Total Marks': record.total === 'Absent' ? 'Absent' : (record.total || 0),
                'Status': record.isAbsent ? 'Absent' : ((record.total || 0) >= 60 ? 'Qualified' : 'Not Qualified')
              };
              return rowData;
            });
        };

        const data = getRankingData(scholarType);

        if (data.length === 0) {
          if (search && search.trim()) {
            setDownloadModal({
              show: true,
              message: `No ${scholarType} scholars found matching your search criteria.`,
              filename: '',
              isError: true
            });
          } else {
            setDownloadModal({
              show: true,
              message: `No ${scholarType} ranking data available to download.`,
              filename: '',
              isError: true
            });
          }
          return;
        }

        console.log(`📊 Downloading ${scholarType} rankings with ${data.length} scholars`);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Set column widths
        ws['!cols'] = [
          { wch: 8 },  // Rank
          { wch: 25 }, // Name
          { wch: 20 }, // Application Number
          { wch: 15 }, // Written Marks
          { wch: 15 }, // Interview Marks
          { wch: 15 }, // Total Marks
          { wch: 15 }  // Status
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, `${scholarType} Rankings`);

        // Create filename
        const currentDate = new Date().toISOString().split('T')[0];
        const departmentName = currentUser?.department?.replace(/ /g, '_') || 'Department';
        const scholarTypeFormatted = scholarType.replace(/ /g, '_');
        
        const filename = `${departmentName}_${scholarTypeFormatted}_Rankings_${currentDate}.xlsx`;
        
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ Successfully downloaded: ${filename}`);
        
        setDownloadModal({
          show: true,
          message: `Successfully downloaded ${scholarType} rankings!`,
          filename: filename,
          isError: false
        });
      }
      
    } catch (error) {
      console.error('❌ Error downloading rankings:', error);
      setDownloadModal({
        show: true,
        message: 'Failed to download rankings. Please try again.',
        filename: '',
        isError: true
      });
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading results...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error loading results</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  // Show message if results are not published - but still show table structure
  const showTablesAlways = true; // Always show tables regardless of publication status

  const fullTimeScholars = getRankedScholarsByType('Full Time');
  const partTimeScholars = getPartTimeScholars();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            Results - {currentUser?.department}
          </h3>
          <p className="text-gray-600 mt-1 text-sm">
            {isResultsPublished ? 'Published examination results for approved scholars' : 'Department examination results'}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-grow max-w-md pt-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FaSearch className={`w-4 h-4 ${search && search.trim() ? 'text-blue-500' : 'text-gray-400'}`} />
            </span>
            <input
              type="text"
              placeholder="Search by name or application number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`pl-9 pr-9 py-2 w-full h-9 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${search && search.trim() ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
              disabled={!isResultsPublished}
            />
            {search && (
              <button onClick={clearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                <span className="font-bold text-lg">&times;</span>
              </button>
            )}
          </div>
          <button
            className={`flex items-center gap-2 px-3 h-9 border rounded-md text-sm transition-colors ${hasActiveFilters ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'} ${!isResultsPublished ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setShowFilterModal(true)}
            disabled={!isResultsPublished}
          >
            <FaFilter className="w-4 h-4" /> <span>Filter</span>
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {[search && search.trim(), filter.type].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {hasActiveFilters && isResultsPublished && (
          <div className="flex flex-wrap gap-2 items-center mt-3">
            {search && search.trim() && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Search: "{search}" <button onClick={clearSearch} className="text-yellow-600 hover:text-yellow-800">×</button>
              </span>
            )}
            {filter.type && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Type: {filter.type} <button onClick={() => handleFilterChange('type', '')} className="text-purple-600 hover:text-purple-800">×</button>
              </span>
            )}
            <button onClick={resetFilters} className="text-red-600 hover:text-red-800 text-xs font-medium underline">Clear All</button>
          </div>
        )}
      </div>

      {/* Department Results */}
      <div id="resultTablesContainer">
        <div className="space-y-6">
          {/* Full Time Rank List */}
          {(!filter.type || filter.type === 'Full Time') && (
            <div className="bg-white rounded shadow border border-l-[4px] border-l-blue-500">
              <div className="px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-800">Full Time Rank List</h2>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {isResultsPublished ? getRankedScholarsByType('Full Time').length : 0} Scholars
                    </span>
                    {search && search.trim() && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                        Filtered Results
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => downloadRankings('Full Time')}
                    className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isResultsPublished || getRankedScholarsByType('Full Time').length === 0}
                  >
                    <FaDownload className="w-3 h-3" />
                    Download Excel
                  </button>
                </div>
              </div>
              
              <div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Scholar Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Application Number</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Written</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Interview</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {!isResultsPublished ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500 text-sm">
                          Results not published yet.
                        </td>
                      </tr>
                    ) : getRankedScholarsByType('Full Time').length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-gray-500 text-sm">
                          No scholars found.
                        </td>
                      </tr>
                    ) : (
                      getRankedScholarsByType('Full Time').map((scholar, index) => (
                        <tr key={scholar.id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 text-left text-gray-800 text-sm">
                            {index + 1}
                          </td>
                          <td className="px-3 py-3 text-left">
                            <div className="text-gray-800 text-sm" title={scholar.registered_name}>
                              {scholar.registered_name}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-left">
                            <div className="text-gray-800 text-sm" title={scholar.application_no}>
                              {scholar.application_no}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-left text-sm">
                            {scholar.written === 'Absent' ? (
                              <span className="text-red-600 font-semibold">Absent</span>
                            ) : (
                              <span className="text-gray-800">{scholar.written}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-left text-sm">
                            {scholar.interview === 'Absent' ? (
                              <span className="text-red-600 font-semibold">Absent</span>
                            ) : (
                              <span className="text-gray-800">{scholar.interview}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-left text-sm">
                            {scholar.total === 'Absent' ? (
                              <span className="text-red-600 font-semibold">Absent</span>
                            ) : (
                              <span className="text-gray-800">{scholar.total}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {scholar.isAbsent ? (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">Absent</span>
                            ) : scholar.qualified ? (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">Qualified</span>
                            ) : (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">Not Qualified</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Part Time Rank List */}
          {(!filter.type || filter.type === 'Part Time' || (filter.type && filter.type.toLowerCase().includes('part time'))) && (
            <div className="bg-white rounded shadow border border-l-[4px] border-l-purple-500">
              <div className="px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-800">Part Time Rank List</h2>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                      {isResultsPublished ? getPartTimeScholars().length : 0} Scholars
                    </span>
                    {search && search.trim() && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                        Filtered Results
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => downloadRankings('Part Time')}
                    className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isResultsPublished || getPartTimeScholars().length === 0}
                  >
                    <FaDownload className="w-3 h-3" />
                    Download Excel
                  </button>
                </div>
              </div>
              
              <div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Scholar Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Application Number</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Written</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Interview</th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {!isResultsPublished ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-500 text-sm">
                          Results not published yet.
                        </td>
                      </tr>
                    ) : getPartTimeScholars().length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-500 text-sm">
                          No scholars found.
                        </td>
                      </tr>
                    ) : (
                      getPartTimeScholars().map((scholar, index) => (
                        <tr key={scholar.id} className="hover:bg-gray-50">
                          <td className="px-2 py-3 text-left text-gray-800 text-sm">
                            {index + 1}
                          </td>
                          <td className="px-3 py-3 text-left">
                            <div className="text-gray-800 text-sm" title={scholar.registered_name}>
                              {scholar.registered_name}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-left">
                            <div className="text-gray-800 text-sm" title={scholar.application_no}>
                              {scholar.application_no}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-left text-gray-800 text-sm" title={scholar.type}>
                            <div className="text-gray-800">
                              {scholar.type}
                            </div>
                          </td>
                          <td className="px-2 py-3 text-left text-sm">
                            {scholar.written === 'Absent' ? (
                              <span className="text-red-600 font-semibold">Absent</span>
                            ) : (
                              <span className="text-gray-800">{scholar.written}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-left text-sm">
                            {scholar.interview === 'Absent' ? (
                              <span className="text-red-600 font-semibold">Absent</span>
                            ) : (
                              <span className="text-gray-800">{scholar.interview}</span>
                            )}
                          </td>
                          <td className="px-2 py-3 text-left text-sm">
                            {scholar.total === 'Absent' ? (
                              <span className="text-red-600 font-semibold">Absent</span>
                            ) : (
                              <span className="text-gray-800">{scholar.total}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {scholar.isAbsent ? (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">Absent</span>
                            ) : scholar.qualified ? (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">Qualified</span>
                            ) : (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">Not Qualified</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Filter Results</h2>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-600 hover:text-red-400 text-2xl font-bold">&times;</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Scholar Type</label>
                <select 
                  value={filter.type} 
                  onChange={(e) => handleFilterChange('type', e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={resetFilters} className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">Reset All</button>
              <button onClick={() => setShowFilterModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Download Success/Error Modal */}
      {downloadModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-center mb-4">
              {downloadModal.isError ? (
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h3 className={`text-lg font-semibold mb-2 ${downloadModal.isError ? 'text-red-800' : 'text-green-800'}`}>
                {downloadModal.isError ? 'Download Failed' : 'Download Successful'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {downloadModal.message}
              </p>
              
              {!downloadModal.isError && downloadModal.filename && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">File:</span>
                  </p>
                  <p className="text-sm text-blue-600 font-mono break-all">
                    {downloadModal.filename}
                  </p>
                </div>
              )}
              
              <div className="flex justify-center">
                <button
                  onClick={() => setDownloadModal({ show: false, message: '', filename: '', isError: false })}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    downloadModal.isError 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {downloadModal.isError ? 'Try Again' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}