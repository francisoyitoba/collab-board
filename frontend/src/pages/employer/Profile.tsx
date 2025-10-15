import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface EmployerProfileData {
  id: string;
  companyName: string;
  website?: string;
  description?: string;
  logoUrl?: string;
}

const EmployerProfile = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState<EmployerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    description: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const employer = res.data?.employerProfile;
        if (employer) {
          setProfile({
            id: employer.id,
            companyName: employer.companyName,
            website: employer.website || '',
            description: employer.description || '',
            logoUrl: employer.logoUrl || ''
          });
          setFormData({
            companyName: employer.companyName || '',
            website: employer.website || '',
            description: employer.description || ''
          });
        }
      } catch (e) {
        console.error('Failed to load employer profile', e);
        setError('Failed to load employer profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/employer/profile`,
        {
          companyName: formData.companyName,
          website: formData.website,
          description: formData.description
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data;
      setProfile({
        id: updated.id,
        companyName: updated.companyName,
        website: updated.website || '',
        description: updated.description || '',
        logoUrl: updated.logoUrl || ''
      });
      setEditMode(false);
    } catch (e) {
      console.error('Failed to save employer profile', e);
      alert('Failed to save employer profile');
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
    return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Company Profile</h1>
        <button
          onClick={() => setEditMode((m) => !m)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {editMode ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {!editMode && profile && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Company</h2>
            <p className="text-gray-700">{profile.companyName}</p>
            {profile.website && (
              <p className="text-gray-500">
                Website: <a href={profile.website} target="_blank" className="text-blue-600 underline" rel="noopener noreferrer">{profile.website}</a>
              </p>
            )}
          </div>
          {profile.description && (
            <div>
              <h2 className="text-lg font-semibold">About</h2>
              <p className="text-gray-700 whitespace-pre-line">{profile.description}</p>
            </div>
          )}
        </div>
      )}

      {editMode && (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Company Name</label>
            <input name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Website</label>
            <input name="website" value={formData.website} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-3 py-2 border rounded" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save Changes</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EmployerProfile;