import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const JobPostingForm = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    descriptionHtml: '',
    requirementsHtml: '',
    salary: '',
    type: 'FULL_TIME',
    deadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const extractRequirements = (html: string): string[] => {
    if (!html) return [];
    // Convert list items to newline-separated text
    let text = html
      .replace(/<li[^>]*>/gi, '\n')
      .replace(/<\/(li|ul|ol)>/gi, '')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<br\s*\/>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r/g, '');
    return text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        title: formData.title,
        description: formData.descriptionHtml,
        location: formData.location,
        // optional fields backend may accept
        requirements: extractRequirements(formData.requirementsHtml),
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate('/employer');
      } else {
        let message = 'Failed to create job posting';
        try {
          const text = await response.text();
          const data = text ? JSON.parse(text) : null;
          if (data?.message) message = data.message;
        } catch (_) {
          // ignore JSON parse errors
        }
        setError(message);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Job Posting</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Job Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Salary Range</label>
            <input
              type="text"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              placeholder="e.g. $50,000 - $70,000"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Job Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="REMOTE">Remote</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2">Application Deadline</label>
            <input
              type="date"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block text-gray-700 font-medium mb-2">Job Description</label>
          <ReactQuill
            theme="snow"
            value={formData.descriptionHtml}
            onChange={(val) => setFormData((p) => ({ ...p, descriptionHtml: val }))}
            className="bg-white"
          />
        </div>
        
        <div className="mt-6">
          <label className="block text-gray-700 font-medium mb-2">Requirements</label>
          <ReactQuill
            theme="snow"
            value={formData.requirementsHtml}
            onChange={(val) => setFormData((p) => ({ ...p, requirementsHtml: val }))}
            className="bg-white"
          />
          <p className="text-sm text-gray-500 mt-2">Tip: Use a bullet list for requirements.</p>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/employer')}
            className="px-6 py-2 mr-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Job Posting'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobPostingForm;