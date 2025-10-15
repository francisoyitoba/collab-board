import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface JobPosting {
  id: string;
  title: string;
  location: string;
  postedAt: string;
  applicationsCount: number;
  status: 'active' | 'closed';
}

const EmployerDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [error, setError] = useState('');
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    const fetchJobPostings = async () => {
      try {
        setLoading(true);
        
        // Check if profile is complete
        const profileResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/users/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (!profileResponse.data || !profileResponse.data.employerProfile || !profileResponse.data.employerProfile.companyName) {
          setProfileComplete(false);
          setLoading(false);
          return;
        }
        
        // Fetch job postings
        const jobsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/jobs/employer/posted`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        const normalized = (jobsResponse.data || []).map((j: any) => ({
          id: j.id,
          title: j.title,
          location: j.location,
          postedAt: j.createdAt || j.postedAt,
          applicationsCount: j._count?.applications ?? j.applicationsCount ?? 0,
          status: (j.status || '').toString().toLowerCase() === 'active' ? 'active' : 'closed'
        }));
        setJobs(normalized);
      } catch (error) {
        console.error('Error fetching job postings:', error);
        setError('Failed to load job postings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobPostings();
  }, [token]);

  if (!profileComplete) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Complete Your Company Profile</h2>
        <p className="mb-6">Please complete your company profile to start posting jobs.</p>
        <Link
          to="/employer/profile"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded"
        >
          Complete Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Job Postings</h1>
        <Link
          to="/employer/jobs/new"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Post New Job
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>You haven't posted any jobs yet. Create your first job posting to start receiving applications.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Job Title</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Location</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Posted Date</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Applications</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/employer/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {job.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{job.location}</td>
                  <td className="py-3 px-4 text-gray-700">{new Date(job.postedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <Link to={`/employer/jobs/${job.id}/applications`} className="text-blue-600 hover:text-blue-800">
                      {job.applicationsCount} {job.applicationsCount === 1 ? 'application' : 'applications'}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'active' ? 'Active' : 'Closed'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Link
                        to={`/employer/jobs/${job.id}/edit`}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </Link>
                      <Link
                        to={`/employer/jobs/${job.id}/applications`}
                        className="text-brand-600 hover:text-brand-800"
                        title="View Applications"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;