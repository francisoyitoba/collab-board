import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  matchingSkills: string[];
  postedAt: string;
}

const SeekerDashboard = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    const fetchMatchedJobs = async () => {
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
        
        if (!profileResponse.data || !profileResponse.data.seekerProfile || !profileResponse.data.seekerProfile.firstName) {
          setProfileComplete(false);
          setLoading(false);
          return;
        }
        
        // Fetch matched jobs
        const jobsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/jobs/matching/seeker`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        setJobs(jobsResponse.data);
      } catch (error) {
        console.error('Error fetching matched jobs:', error);
        setError('Failed to load job matches. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchedJobs();
  }, [token]);

  if (!profileComplete) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
        <p className="mb-6">Please complete your profile and upload your CV to see matched jobs.</p>
        <Link
          to="/seeker/profile"
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded"
        >
          Complete Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Job Matches</h1>
      
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
          <p>No job matches found. Try updating your profile with more skills.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold mb-2">{job.title}</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {job.matchScore}% Match
                  </span>
                </div>
                <h3 className="text-gray-700 font-medium mb-2">{job.company}</h3>
                <p className="text-gray-600 mb-2">{job.location}</p>
                {job.salary && <p className="text-gray-600 mb-4">{job.salary}</p>}
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Matching Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.matchingSkills.map((skill, index) => (
                      <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Posted {new Date(job.postedAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/seeker/jobs/${job.id}`}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-1.5 px-4 rounded"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeekerDashboard;