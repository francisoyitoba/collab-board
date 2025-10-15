import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface FeaturedJob {
  id: string;
  title: string;
  company: string;
  location: string;
}

const placeholderJobs: FeaturedJob[] = [
  { id: 'p1', title: 'Senior Software Engineer', company: 'Acme Corp', location: 'Remote' },
  { id: 'p2', title: 'Product Designer', company: 'Globex', location: 'Berlin, DE' },
  { id: 'p3', title: 'Marketing Manager', company: 'Initech', location: 'Toronto, CA' },
  { id: 'p4', title: 'Financial Analyst', company: 'Umbrella Group', location: 'New York, US' },
];

const categories = [
  { label: 'Tech', tag: 'Tech' },
  { label: 'Design', tag: 'Design' },
  { label: 'Marketing', tag: 'Marketing' },
  { label: 'Product', tag: 'Product' },
  { label: 'Finance', tag: 'Finance' },
  { label: 'HR', tag: 'HR' },
];

const AnimatedCounter = ({ to = 0, duration = 1200 }: { to: number; duration?: number }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (ts: number) => {
      const progress = Math.min(1, (ts - start) / duration);
      setValue(Math.floor(progress * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{value.toLocaleString()}</span>;
};

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [jobs, setJobs] = useState<FeaturedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs`);
        const items: FeaturedJob[] = (res.data || []).slice(0, 4).map((j: any) => ({
          id: j.id,
          title: j.title,
          company: j.employer?.employerProfile?.companyName || 'Company',
          location: j.location || '—',
        }));
        setJobs(items);
      } catch {
        setJobs(placeholderJobs);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    if (!keyword && !location) return jobs;
    return jobs.filter((j) => {
      const kwMatch = keyword ? `${j.title} ${j.company}`.toLowerCase().includes(keyword.toLowerCase()) : true;
      const locMatch = location ? (j.location || '').toLowerCase().includes(location.toLowerCase()) : true;
      return kwMatch && locMatch;
    });
  }, [jobs, keyword, location]);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (location) params.set('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  const onFindJobs = () => navigate('/jobs');
  const onPostJob = () => {
    if (isAuthenticated && user?.role === 'employer') {
      navigate('/employer/jobs/new');
    } else {
      navigate('/auth/register?role=employer');
    }
  };

  const onViewApply = (id: string) => {
    if (isAuthenticated && user?.role === 'seeker') {
      navigate(`/seeker/jobs/${id}`);
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-100 border border-gray-100">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-200 opacity-30 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-100 opacity-30 blur-3xl"></div>

        <div className="px-6 py-14 sm:px-10 sm:py-16 md:px-16 md:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight transition-opacity duration-700 ease-out">
              Find the best jobs or hire top talent — anywhere.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl">
              JobPulse connects global employers with skilled candidates. Discover opportunities or post roles — fast, fair, and streamlined.
            </p>

            <div className="mt-8 bg-white rounded-xl shadow-brand p-4 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title or keyword"
                  className="px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="px-4 py-2.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={onSearch}
                  className="w-full md:w-auto px-5 py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-brand"
                >
                  Search
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={onFindJobs} className="btn btn-primary">Find Jobs</button>
                <button onClick={onPostJob} className="btn btn-secondary">Post a Job</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Jobs</h2>
          <Link to="/jobs" className="text-brand-600 hover:text-brand-700 font-medium">View all</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredJobs.map((job) => (
              <div key={job.id} className="group bg-white rounded-xl shadow-brand border border-gray-100 p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700">{job.location}</p>
                <button onClick={() => onViewApply(job.id)} className="mt-4 w-full btn btn-primary">
                  View / Apply
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white rounded-2xl shadow-brand border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-lg border border-gray-200">
            <div className="h-10 w-10 rounded-lg bg-brand-100 flex items-center justify-center mb-3">
              <span className="text-brand-700 font-bold">1</span>
            </div>
            <p className="font-medium">Create a profile or post a job</p>
            <p className="text-sm text-gray-600">Quick start for seekers and employers.</p>
          </div>
          <div className="p-5 rounded-lg border border-gray-200">
            <div className="h-10 w-10 rounded-lg bg-brand-100 flex items-center justify-center mb-3">
              <span className="text-brand-700 font-bold">2</span>
            </div>
            <p className="font-medium">Get matched instantly with AI</p>
            <p className="text-sm text-gray-600">Smart suggestions tailored to skills.</p>
          </div>
          <div className="p-5 rounded-lg border border-gray-200">
            <div className="h-10 w-10 rounded-lg bg-brand-100 flex items-center justify-center mb-3">
              <span className="text-brand-700 font-bold">3</span>
            </div>
            <p className="font-medium">Chat and hire easily</p>
            <p className="text-sm text-gray-600">Integrated messaging to close faster.</p>
          </div>
        </div>
      </section>

      {/* Top Categories */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Categories</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.tag}
              onClick={() => navigate(`/jobs?tags=${encodeURIComponent(cat.tag)}`)}
              className="px-4 py-2 rounded-full bg-white border border-gray-200 hover:border-brand-400 hover:text-brand-700"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Trusted Companies */}
      <section className="bg-white rounded-2xl shadow-brand border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Trusted by top employers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 items-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Logo {i + 1}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Stats */}
      <section className="rounded-2xl bg-gradient-to-r from-brand-50 to-brand-100 border border-gray-100 p-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4">
            <p className="text-3xl font-extrabold text-gray-900"><AnimatedCounter to={1200} /></p>
            <p className="text-sm text-gray-600">Jobs Posted</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-extrabold text-gray-900"><AnimatedCounter to={380} /></p>
            <p className="text-sm text-gray-600">Employers Registered</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-extrabold text-gray-900"><AnimatedCounter to={5400} /></p>
            <p className="text-sm text-gray-600">Active Candidates</p>
          </div>
          <div className="p-4">
            <p className="text-3xl font-extrabold text-gray-900"><AnimatedCounter to={860} /></p>
            <p className="text-sm text-gray-600">Successful Hires</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">What users say</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-brand border border-gray-100 p-6">
            <p className="text-gray-800">“This platform made hiring faster and simpler!”</p>
            <p className="mt-2 text-sm text-gray-600">— John, HR Manager at Acme Co.</p>
          </div>
          <div className="bg-white rounded-xl shadow-brand border border-gray-100 p-6">
            <p className="text-gray-800">“I found my dream job in a week.”</p>
            <p className="mt-2 text-sm text-gray-600">— Sara, Product Designer</p>
          </div>
          <div className="bg-white rounded-xl shadow-brand border border-gray-100 p-6 sm:col-span-2">
            <p className="text-gray-800">“The AI matches are incredibly accurate — saved us weeks.”</p>
            <p className="mt-2 text-sm text-gray-600">— Priya, Talent Lead at Umbrella Group</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-4 text-sm text-gray-600">
            <Link to="#" className="hover:text-gray-900">About</Link>
            <Link to="#" className="hover:text-gray-900">Contact</Link>
            <Link to="#" className="hover:text-gray-900">Privacy</Link>
            <Link to="#" className="hover:text-gray-900">Terms</Link>
          </div>
          <div className="flex gap-3">
            <a href="#" aria-label="LinkedIn" className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">in</a>
            <a href="#" aria-label="Twitter" className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">t</a>
            <a href="#" aria-label="Facebook" className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">f</a>
          </div>
        </div>
        <div className="mt-6">
          <form className="flex gap-3">
            <input type="email" placeholder="Email for updates" className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <button className="btn btn-secondary">Subscribe</button>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default Home;