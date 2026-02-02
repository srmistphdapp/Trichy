import React, { useState } from 'react';
import { SlidersHorizontal, Send, Maximize2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const ForwardedStudents = () => {
  const { scholarList, toggleFullScreen } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterName, setFilterName] = useState('');

  const handleOpenFilter = () => setFilterModalOpen(true);
  const handleCloseFilter = () => setFilterModalOpen(false);
  const handleApplyFilter = () => {
    setFilterModalOpen(false);
  };

  // Only show scholars with dept_status starting with 'Back_To_' OR dept_status = 'Rejected' (actually forwarded to faculty)
  const students = scholarList.filter(s => {
    // Check if scholar has been forwarded (dept_status starts with 'Back_To_' OR is 'Rejected')
    const deptStatus = s._supabaseData?.deptStatus || s.deptStatus;
    const isForwarded = deptStatus && (deptStatus.startsWith('Back_To_') || deptStatus === 'Rejected');
    
    // Check dept_review for query status
    const deptReview = s.deptReview || s._supabaseData?.deptReview;
    
    // Apply status filter
    let statusMatch = true;
    if (filterStatus === 'Query') {
      statusMatch = deptReview === 'Query';
    } else if (filterStatus !== 'All') {
      statusMatch = s.verificationStatus === filterStatus;
    }
    
    return isForwarded &&
      statusMatch &&
      (filterDepartment === 'All' || (s.program || s.specialization || '').toLowerCase().includes(filterDepartment.toLowerCase())) &&
      (filterType === 'All' || s.type === filterType) &&
      (filterName === '' || s.name.toLowerCase().includes(filterName.toLowerCase())) &&
      (search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.regNo.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div id="panel-forwarded" className="panel-fullscreen w-full">
      <div className="w-full px-6">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="p-4 text-3xl font-bold leading-tight">Forwarded Scholars</h1>
            <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 fullscreen-btn" title="Fullscreen forwarded students" onClick={() => toggleFullScreen && toggleFullScreen('panel-forwarded')}>
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 items-center justify-start">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border">
              <label htmlFor="fwdStatusFilter" className="text-sm font-medium pl-2">Status:</label>
              <select
                id="fwdStatusFilter"
                className="bg-gray-50 border-0 rounded-lg p-2.5 text-sm focus:ring-0"
                value={statusFilter}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Query">Query Sent</option>
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Search in Forwarded..."
                className="pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'gray\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><circle cx=\'11\' cy=\'11\' r=\'8\'/><line x1=\'21\' y1=\'21\' x2=\'16.65\' y2=\'16.65\'/></svg>')] bg-no-repeat bg-[length:20px_20px] bg-[left_8px_center] pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="p-2.5 rounded-lg border bg-white hover:bg-gray-100 text-gray-600" title="Filter" onClick={handleOpenFilter}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="table-responsive overflow-x-auto overflow-y-auto">
            <table className="table w-full min-w-[1400px]">
              <thead>
                <tr>
                  <th className="text-left">S.No</th>
                  <th className="text-left">Registered Name</th>
                  <th className="text-left">Application No.</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Mobile Number</th>
                  <th className="text-left">Email ID</th>
                  <th className="text-left">Gender</th>
                  <th className="text-left">Certificates</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p className="text-lg font-medium text-gray-700">
                          {scholarList.filter(s => {
                            const deptStatus = s._supabaseData?.deptStatus || s.deptStatus;
                            return deptStatus && (deptStatus.startsWith('Back_To_') || deptStatus === 'Rejected');
                          }).length === 0 && !search && filterStatus === 'All'
                            ? 'No forwarded students yet'
                            : 'No forwarded students found'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {scholarList.filter(s => {
                            const deptStatus = s._supabaseData?.deptStatus || s.deptStatus;
                            return deptStatus && (deptStatus.startsWith('Back_To_') || deptStatus === 'Rejected');
                          }).length === 0 && !search && filterStatus === 'All'
                            ? 'Students forwarded to faculty will appear here'
                            : 'Try adjusting your filters or search terms'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  students.map((s, idx) => {
                    const deptStatus = s._supabaseData?.deptStatus || s.deptStatus;
                    const facultyName = deptStatus ? deptStatus.replace('Back_To_', '') : 'Unknown';
                    
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="py-3">{idx + 1}</td>
                        <td className="py-3 font-medium text-gray-900">{s.name}</td>
                        <td className="py-3">{s.regNo}</td>
                        <td className="py-3">{s.type || 'Full Time'}</td>
                        <td className="py-3">{s.mobile || 'N/A'}</td>
                        <td className="py-3">{s.email || 'N/A'}</td>
                        <td className="py-3">{s.gender || 'N/A'}</td>
                        <td className="py-3">
                          {s.certificatesLink && s.certificatesLink !== '#' ? (
                            <a 
                              href={s.certificatesLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="py-3">
                          {(() => {
                            const deptReview = s.deptReview || s._supabaseData?.deptReview;
                            
                            if (deptReview === 'Query') {
                              return (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                  Query Sent
                                </span>
                              );
                            } else if (s.verificationStatus === 'Approved') {
                              return (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Approved
                                </span>
                              );
                            } else if (s.verificationStatus === 'Rejected') {
                              return (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Rejected
                                </span>
                              );
                            } else {
                              return (
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {s.verificationStatus || 'Pending'}
                                </span>
                              );
                            }
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {filterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-modal-in">
              <button onClick={handleCloseFilter} className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
              <h3 className="text-2xl font-bold mb-4">Filter Forwarded Students</h3>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Status</label>
                <select className="w-full border rounded px-3 py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="All">All</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Query">Query Sent</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Department</label>
                <select className="w-full border rounded px-3 py-2" value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
                  <option value="All">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Civil">Civil</option>
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Chemical">Chemical</option>
                  <option value="Aerospace">Aerospace</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Biomedical">Biomedical</option>
                  <option value="English">English</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Management">Management</option>
                  <option value="Commerce">Commerce</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Type</label>
                <select className="w-full border rounded px-3 py-2" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Sponsored">Sponsored</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Name</label>
                <input type="text" className="w-full border rounded px-3 py-2" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Filter by name..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={handleCloseFilter} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={handleApplyFilter} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Apply Filter</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForwardedStudents;
