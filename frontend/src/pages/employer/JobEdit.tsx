import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const EmployerJobEdit = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    salary: '',
    tagsText: ''
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const j = res.data || {};
        setForm({
          title: j.title || '',
          description: j.description || '',
          location: j.location || '',
          salary: j.salary || '',
          tagsText: (Array.isArray(j.tags) ? j.tags.map((t: any) => t.name).join(', ') : '')
        });
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job.');
      } finally {
        setLoading(false);
      }
    };
    if (jobId && token) fetchJob();
  }, [jobId, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const tags = form.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`,
        {
          title: form.title,
          description: form.description,
          location: form.location,
          salary: form.salary,
          tags
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/employer/jobs/${jobId}`);
    } catch (err) {
      console.error('Error updating job:', err);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <Link to={`/employer/jobs/${jobId}`} className="text-blue-600 hover:text-blue-800">&larr; Back to Job</Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Edit Job</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Location</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Salary</label>
          <input
            type="text"
            name="salary"
            value={form.salary}
            onChange={handleChange}
            placeholder="e.g. $50,000 - $70,000"
            className="w-full px-4 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={6}
            className="w-full px-4 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Tags (comma separated)</label>
          <input
            type="text"
            name="tagsText"
            value={form.tagsText}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={() => navigate(`/employer/jobs/${jobId}`)}>Cancel</button>
          <button type="submit" disabled={saving} className={`px-4 py-2 bg-blue-600 text-white rounded ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};

export default EmployerJobEdit;