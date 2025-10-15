import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface Job {
  id: string;
  title: string;
  description: string; // HTML string
  requirements?: string; // HTML string
  location: string;
  salary?: string;
  employer?: {
    employerProfile?: {
      companyName?: string;
    }
  };
  tags?: { name: string }[];
  postedAt?: string;
  createdAt?: string;
}

const EmployerJobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { token } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJob(res.data);
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job details.');
      } finally {
        setLoading(false);
      }
    };

    if (jobId && token) fetchJob();
  }, [jobId, token]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
    );
  }

  if (!job) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">Job not found.</div>
    );
  }

  const companyName = job.employer?.employerProfile?.companyName || 'Your Company';
  const postedDate = job.postedAt || job.createdAt;

  // Helper function to convert plain text to HTML
const textToHtml = (text: string) => {
  if (!text) return '';

  // Convert numbered lines starting with "1. ", "2. ", etc. to <ol><li>...</li></ol>
  const olRegex = /^(?:\d+\.\s.+\n?)+/gm;
  if (olRegex.test(text)) {
    const olItems = text
      .trim()
      .split('\n')
      .map(line => line.replace(/^\d+\.\s/, '')) // remove leading number
      .map(line => `<li>${line}</li>`)
      .join('');
    return `<ol>${olItems}</ol>`;
  }

  // Convert lines starting with "-" or "*" to <ul><li>...</li></ul>
  const ulRegex = /^[-*]\s.+(\n|$)/gm;
  if (ulRegex.test(text)) {
    const ulItems = text
      .trim()
      .split('\n')
      .map(line => line.replace(/^[-*]\s/, ''))
      .map(line => `<li>${line}</li>`)
      .join('');
    return `<ul>${ulItems}</ul>`;
  }

  // Replace line breaks with <br> for plain paragraphs
  return text.replace(/\n/g, '<br>');
};

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <Link to="/employer" className="text-blue-600 hover:text-blue-800">&larr; Back to Dashboard</Link>
      </div>

      <h1 className="text-2xl font-bold">{job.title}</h1>
      <p className="text-gray-600">{companyName} • {job.location}</p>
      {postedDate && (
        <p className="text-sm text-gray-500 mt-1">Posted {new Date(postedDate).toLocaleDateString()}</p>
      )}

      {/* Job Description */}
      {job.description && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Description</h2>
          <div
            className="prose prose-blue max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: textToHtml(job.description) }}
          />
        </div>
      )}

      {/* Job Requirements */}
      {job.requirements && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Requirements</h3>
          <div
            className="prose prose-blue max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: textToHtml(job.requirements) }}
          />
        </div>
      )}

      {/* Tags */}
      {job.tags && job.tags.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {job.tags.map((t, idx) => (
              <span
                key={idx}
                className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Link
          to={`/employer/jobs/${job.id}/edit`}
          className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
        >
          Edit Job
        </Link>
        <Link
          to={`/employer/jobs/${job.id}/applications`}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Applications
        </Link>
      </div>
    </div>
  );
};

export default EmployerJobDetails;
