import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface JobItem {
  id: string;
  title: string;
  company: string;
  location: string;
}

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const Jobs = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const query = useQuery();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState(query.get('keyword') || '');
  const [location, setLocation] = useState(query.get('location') || '');
  const [activeTag, setActiveTag] = useState(query.get('tags') || '');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      setError('');
      try {
        const params: Record<string, string> = {};
        if (location) params.location = location;
        if (activeTag) params.tags = activeTag;
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs`, { params });
        const items: JobItem[] = (res.data || []).map((j: any) => ({
          id: j.id,
          title: j.title,
          company: j.employer?.employerProfile?.companyName || 'Company',
          location: j.location || '—',
        }));
        setJobs(items);
      } catch (e) {
        console.error('Failed to load jobs', e);
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [location, activeTag]);

  const filtered = useMemo(() => {
    if (!keyword) return jobs;
    return jobs.filter((j) => `${j.title} ${j.company}`.toLowerCase().includes(keyword.toLowerCase()));
  }, [jobs, keyword]);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (location) params.set('location', location);
    if (activeTag) params.set('tags', activeTag);
    navigate(`/jobs?${params.toString()}`);
  };

  const onApply = (id: string) => {
    if (isAuthenticated && user?.role === 'seeker') {
      navigate(`/seeker/jobs/${id}`);
    } else {
      navigate('/auth/login');
    }
  };

  const categories = ['Tech', 'Design', 'Marketing', 'Product', 'Finance', 'HR'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-brand border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword"
            className="px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={activeTag}
            onChange={(e) => setActiveTag(e.target.value)}
            className="px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={onSearch} className="w-full md:w-auto btn btn-primary">Search</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          No jobs found. Try different filters.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow-brand border border-gray-100 p-5">
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.company}</p>
              <p className="mt-3 text-sm text-gray-700">{job.location}</p>
              <button onClick={() => onApply(job.id)} className="mt-4 w-full btn btn-primary">View / Apply</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;