import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Application {
  id: string;
  status: 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  coverLetter: string;
  matchScore?: number;
  notes?: string;
  seeker: {
    id: string;
    email: string;
    seekerProfile: {
      firstName: string;
      lastName: string;
      location?: string;
      availability?: string;
      cvUrl?: string;
      skills: { name: string }[];
    };
  };
  jobPosting: {
    title: string;
    tags?: { name: string }[];
  };
}

interface JobDetails {
  id: string;
  title: string;
  company: string;
}

const ApplicationReview = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { token } = useAuth();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [activities, setActivities] = useState<Array<{ id: string; type: string; detail?: string; createdAt: string; actor: { id: string; email: string } }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Application['status']>('ALL');
  const [sortBy, setSortBy] = useState<'DATE' | 'MATCH'>('DATE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: 'REVIEWING' | 'ACCEPTED' | 'REJECTED' } | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ id: string; prevStatus: Application['status']; timeout: any } | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        
        // Fetch job details
        const jobResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        setJob(jobResponse.data);
        
        // Fetch applications for this job
        const applicationsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/applications/job/${jobId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        setApplications(applicationsResponse.data);
      } catch (error) {
        console.error('Error fetching applications:', error);
        setError('Failed to load applications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplications();
  }, [jobId, token]);

  const updateApplicationStatus = async (applicationId: string, status: 'REVIEWING' | 'ACCEPTED' | 'REJECTED') => {
    try {
      const prev = applications.find(a => a.id === applicationId)?.status || 'PENDING';
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/applications/${applicationId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status } : app
      ));
      
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication({ ...selectedApplication, status });
      }
      // Show undo option
      if (undoInfo?.timeout) clearTimeout(undoInfo.timeout);
      const to = setTimeout(() => setUndoInfo(null), 5000);
      setUndoInfo({ id: applicationId, prevStatus: prev as Application['status'], timeout: to });
      
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Failed to update application status. Please try again.');
    }
  };

  const undoStatus = async () => {
    if (!undoInfo) return;
    const { id, prevStatus } = undoInfo;
    setUndoInfo(null);
    await updateApplicationStatus(id, prevStatus as any);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkUpdate = async (status: 'REVIEWING' | 'ACCEPTED' | 'REJECTED') => {
    try {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/applications/bulk/status`,
        { applicationIds: ids, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplications(applications.map(app => selectedIds.has(app.id) ? { ...app, status } : app));
      if (selectedApplication && selectedIds.has(selectedApplication.id)) {
        setSelectedApplication({ ...selectedApplication, status });
      }
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error applying bulk update:', error);
      alert('Failed bulk update.');
    }
  };

  const saveNotes = async (applicationId: string, notes: string) => {
    try {
      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/applications/${applicationId}/notes`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplications(applications.map(app => app.id === applicationId ? { ...app, notes: res.data.notes } : app));
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication({ ...selectedApplication, notes: res.data.notes });
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    }
  };

  const startChat = async (applicationId: string) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat/rooms`,
        { applicationId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const roomId = response.data.id || response.data.roomId;
      window.location.href = `/chat/${roomId}`;
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };

  // Fetch activities when selecting an application
  useEffect(() => {
    const fetchActivities = async () => {
      if (!selectedApplication) return;
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/applications/${selectedApplication.id}/activities`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setActivities(res.data || []);
      } catch (e) {
        console.error('Error loading activities', e);
        setActivities([]);
      }
    };
    fetchActivities();
  }, [selectedApplication, token]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto">
      <div className="mb-6">
        <Link to="/employer/dashboard" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          Applications for {job?.title}
        </h1>
      </div>
      
      {applications.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          No applications received yet for this job posting.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="font-semibold text-gray-800">
                  {applications.length} {applications.length === 1 ? 'Application' : 'Applications'}
                </h2>
              </div>
              <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                {applications
                  .filter((a) => statusFilter === 'ALL' ? true : a.status === statusFilter)
                  .filter((a) => {
                    const fullName = `${a.seeker.seekerProfile?.firstName || ''} ${a.seeker.seekerProfile?.lastName || ''}`.toLowerCase();
                    const location = (a.seeker.seekerProfile?.location || '').toLowerCase();
                    const skills = (a.seeker.seekerProfile?.skills || []).map(s => s.name.toLowerCase());
                    const q = searchQuery.toLowerCase();
                    return (
                      fullName.includes(q) ||
                      location.includes(q) ||
                      skills.some(s => s.includes(q))
                    );
                  })
                  .sort((a,b) => {
                    if (sortBy === 'MATCH') {
                      return (b.matchScore || 0) - (a.matchScore || 0);
                    }
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })
                  .map((application) => (
                  <div 
                    key={application.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedApplication?.id === application.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedApplication(application)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selectedIds.has(application.id)} onChange={() => toggleSelect(application.id)} />
                        <h3 className="font-medium text-gray-900">
                          {application.seeker.seekerProfile?.firstName} {application.seeker.seekerProfile?.lastName}
                        </h3>
                        <span className="ml-2 text-xs text-gray-500">{application.seeker.seekerProfile?.location}</span>
                        <p className="text-sm text-gray-600">
                          Applied on {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                        {typeof application.matchScore === 'number' && (
                          <span className="ml-auto text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">Match {Math.round(application.matchScore)}%</span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        application.status === 'REVIEWING' ? 'bg-blue-100 text-blue-800' :
                        application.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateApplicationStatus(application.id, 'REVIEWING'); }}
                        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                      >Review</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateApplicationStatus(application.id, 'ACCEPTED'); }}
                        className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 hover:bg-green-200"
                      >Shortlist</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateApplicationStatus(application.id, 'REJECTED'); }}
                        className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 hover:bg-red-200"
                      >Reject</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startChat(application.id); }}
                        className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                      >Message</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, skill, location"
                  className="flex-1 px-3 py-2 border rounded"
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 border rounded">
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="REVIEWING">Reviewing</option>
                  <option value="ACCEPTED">Shortlisted</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 border rounded">
                  <option value="DATE">Sort by Applied Date</option>
                  <option value="MATCH">Sort by Match Score</option>
                </select>
              </div>
              {undoInfo && (
                <div className="p-3 border-t bg-yellow-50 text-yellow-800 flex items-center justify-between">
                  <span>Status updated. You can undo within 5 seconds.</span>
                  <button onClick={undoStatus} className="px-3 py-1 bg-yellow-600 text-white rounded">Undo</button>
                </div>
              )}
              <div className="p-3 border-t flex items-center gap-2">
                <button onClick={() => bulkUpdate('ACCEPTED')} className="px-3 py-2 text-sm rounded bg-green-600 text-white disabled:opacity-50" disabled={selectedIds.size === 0}>Bulk Shortlist</button>
                <button onClick={() => bulkUpdate('REJECTED')} className="px-3 py-2 text-sm rounded bg-red-600 text-white disabled:opacity-50" disabled={selectedIds.size === 0}>Bulk Reject</button>
                <button onClick={() => {
                  const rows = applications.filter(a => selectedIds.has(a.id)).map(a => ({
                    id: a.id,
                    name: `${a.seeker.seekerProfile?.firstName || ''} ${a.seeker.seekerProfile?.lastName || ''}`.trim(),
                    email: a.seeker.email,
                    location: a.seeker.seekerProfile?.location || '',
                    status: a.status,
                    matchScore: a.matchScore ?? '',
                  }));
                  const csv = ['id,name,email,location,status,matchScore', ...rows.map(r => `${r.id},"${r.name}",${r.email},${r.location},${r.status},${r.matchScore}`)].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url; link.download = 'applications.csv'; link.click();
                  URL.revokeObjectURL(url);
                }} className="px-3 py-2 text-sm rounded bg-gray-200">Export CSV</button>
              </div>
            </div>
          </div>
          
          <div className="md:w-2/3">
            {selectedApplication ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedApplication.seeker.seekerProfile?.firstName} {selectedApplication.seeker.seekerProfile?.lastName}
                      </h2>
                      <p className="text-gray-600">{selectedApplication.seeker.email}</p>
                      <p className="text-sm text-gray-500">{selectedApplication.seeker.seekerProfile?.location} • {selectedApplication.seeker.seekerProfile?.availability}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setConfirmAction({ id: selectedApplication.id, status: 'REVIEWING' })}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedApplication.status === 'REVIEWING' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                        disabled={selectedApplication.status === 'REVIEWING'}
                      >
                        Mark as Reviewing
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: selectedApplication.id, status: 'ACCEPTED' })}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedApplication.status === 'ACCEPTED' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                        disabled={selectedApplication.status === 'ACCEPTED'}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: selectedApplication.id, status: 'REJECTED' })}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedApplication.status === 'REJECTED' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        disabled={selectedApplication.status === 'REJECTED'}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {(selectedApplication.seeker.seekerProfile?.skills || []).map((skill, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Cover Letter</h3>
                    <div className="bg-gray-50 p-4 rounded-md whitespace-pre-line">
                      {selectedApplication.coverLetter}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Resume</h3>
                    {(() => {
                      const url = selectedApplication.seeker.seekerProfile?.cvUrl || '';
                      if (!url) {
                        return (
                          <p className="text-gray-500 text-sm">No CV in profile.</p>
                        );
                      }
                      const ext = url.split('.').pop()?.toLowerCase();
                      if (ext === 'pdf') {
                        return (
                          <iframe src={url} className="w-full h-96 border" title="CV Preview"></iframe>
                        );
                      }
                      return (
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded inline-flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Download Resume
                        </a>
                      );
                    })()}
                  </div>

                  {selectedApplication.jobPosting?.tags && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">AI Match Reasoning</h3>
                      <div className="text-sm text-gray-700">
                        {(() => {
                          const seekerSkills = (selectedApplication.seeker.seekerProfile?.skills || []).map(s => s.name.toLowerCase());
                          const jobTags = (selectedApplication.jobPosting?.tags || []).map(t => t.name.toLowerCase());
                          const matched = jobTags.filter(t => seekerSkills.includes(t));
                          return (
                            <div>
                              <p>Matched tags: {matched.length ? matched.join(', ') : 'None'}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Activity</h3>
                    {activities.length === 0 ? (
                      <p className="text-gray-500 text-sm">No recent activity.</p>
                    ) : (
                      <ul className="space-y-2">
                        {activities.map(act => (
                          <li key={act.id} className="text-sm text-gray-700">
                            <span className="font-medium">{act.type}</span>
                            <span className="ml-2">by {act.actor.email}</span>
                            <span className="ml-2 text-gray-500">{new Date(act.createdAt).toLocaleString()}</span>
                            {act.detail && (<div className="text-gray-600">{act.detail}</div>)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startChat(selectedApplication.id)}
                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded inline-flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Chat with Candidate
                      </button>
                      <form onSubmit={(e) => { e.preventDefault(); const notes = (e.currentTarget.elements.namedItem('notes') as HTMLInputElement).value; saveNotes(selectedApplication.id, notes); }} className="flex items-center gap-2">
                        <input name="notes" defaultValue={selectedApplication.notes || ''} placeholder="Private notes" className="px-3 py-2 border rounded" />
                        <button type="submit" className="px-3 py-2 bg-gray-800 text-white rounded">Save Note</button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
                Select an application to view details
              </div>
            )}
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmAction && (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
        <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-2">Confirm status change</h3>
          <p className="text-sm text-gray-700 mb-4">Are you sure you want to set this application to <span className="font-medium">{confirmAction.status}</span>?</p>
          <div className="flex gap-2 justify-end">
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { updateApplicationStatus(confirmAction.id, confirmAction.status); setConfirmAction(null); }}>Confirm</button>
          </div>
        </div>
      </div>
    )}
    </div>
    </>
  );
};

export default ApplicationReview;