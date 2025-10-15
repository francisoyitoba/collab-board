import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary: string;
  employerId: string;
  postedAt: string;
  matchScore?: number;
}

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'submitted'>('none');
  const [coverLetterStatus, setCoverLetterStatus] = useState<'generating' | 'ready' | 'failed' | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [customCoverLetter, setCustomCoverLetter] = useState('');
  const [useAiCoverLetter, setUseAiCoverLetter] = useState(true);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setJob(response.data);
        console.log('Job details response:', response.data);
        
        // Check if user has already applied
        const applicationResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/applications/job/${jobId}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (applicationResponse.data.hasApplied) {
          setApplicationStatus('submitted');
        }
        
      } catch (error) {
        console.error('Error fetching job details:', error);
        setError('Failed to load job details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [jobId, token]);

  const handleApply = async () => {
    try {
      setApplying(true);
      setApplicationStatus('pending');
      
      if (useAiCoverLetter) {
        // Generate AI cover letter
        setCoverLetterStatus('generating');
        const coverLetterResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/applications/generate-cover-letter`,
          { jobId },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        setCoverLetter(coverLetterResponse.data.coverLetter);
        setCoverLetterStatus('ready');
      }
      
      // Submit application
      const finalCoverLetter = useAiCoverLetter ? coverLetter : customCoverLetter;
      
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/applications`,
        {
          jobId,
          coverLetter: finalCoverLetter
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setApplicationStatus('submitted');
      
      // Navigate to application status page
      navigate('/seeker/applications');
      
    } catch (error) {
      console.error('Error applying to job:', error);
      setError('Failed to submit application. Please try again later.');
      setCoverLetterStatus('failed');
      setApplicationStatus('none');
    } finally {
      setApplying(false);
    }
  };

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

  if (!job) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        Job not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            {job.matchScore && (
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {job.matchScore}% Match
              </span>
            )}
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">{job.company}</h2>
            <p className="text-gray-600">{job.location}</p>
            {job.salary && <p className="text-gray-600 mt-1">{job.salary}</p>}
            <p className="text-gray-500 text-sm mt-1">
              Posted on {new Date(job.postedAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Job Description</h3>
            <div
            className="prose prose-blue max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>
          
          {job.requirements && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Requirements</h3>
              <div
              className="prose prose-blue max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: job.requirements }}
              />
            </div>
          )}
          
          {applicationStatus === 'none' && (
            <div className="mt-8">
              <button
                onClick={() => setApplicationStatus('pending')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded"
              >
                Apply Now
              </button>
            </div>
          )}
          
          {applicationStatus === 'pending' && (
            <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Submit Your Application</h3>
              
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <input
                    id="ai-cover-letter"
                    type="checkbox"
                    checked={useAiCoverLetter}
                    onChange={() => setUseAiCoverLetter(!useAiCoverLetter)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="ai-cover-letter" className="ml-2 text-gray-700">
                    Generate AI-assisted cover letter
                  </label>
                </div>
              </div>
              
              {useAiCoverLetter ? (
                <div className="mb-4">
                  {coverLetterStatus === 'generating' && (
                    <div className="flex items-center text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                      Generating your personalized cover letter...
                    </div>
                  )}
                  
                  {coverLetterStatus === 'ready' && (
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        AI-Generated Cover Letter
                      </label>
                      <div className="bg-white p-3 border border-gray-300 rounded-md h-60 overflow-y-auto whitespace-pre-line">
                        {coverLetter}
                      </div>
                    </div>
                  )}
                  
                  {coverLetterStatus === 'failed' && (
                    <div className="text-red-600 mb-4">
                      Failed to generate cover letter. You can write your own or try again.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Your Cover Letter
                  </label>
                  <textarea
                    value={customCoverLetter}
                    onChange={(e) => setCustomCoverLetter(e.target.value)}
                    className="w-full h-60 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write your cover letter here..."
                  />
                </div>
              )}
              
              <div className="flex justify-between">
                <button
                  onClick={() => setApplicationStatus('none')}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || (useAiCoverLetter && coverLetterStatus !== 'ready')}
                  className={`bg-blue-500 text-white font-bold py-2 px-6 rounded ${
                    applying || (useAiCoverLetter && coverLetterStatus !== 'ready')
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-600'
                  }`}
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
          
          {applicationStatus === 'submitted' && (
            <div className="mt-6 bg-green-50 p-4 rounded-lg border border-green-200 text-green-800">
              <p className="font-medium">You have already applied to this job.</p>
              
              <div className="flex flex-wrap gap-3 mt-3">
                <button
                onClick={() => navigate('/seeker/applications')}
                className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View your applications
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;