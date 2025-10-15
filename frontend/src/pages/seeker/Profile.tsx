import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface SeekerProfileData {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  location?: string;
  availability?: string;
  cvUrl?: string;
  skills: { name: string }[];
}

const SeekerProfile = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState<SeekerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    availability: '',
    skillsInput: ''
  });
  // CV upload states
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cvMessage, setCvMessage] = useState('');
  // AI analysis states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ parsedText?: string; extractedSkills?: string[] } | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const seeker = res.data?.seekerProfile;
        if (seeker) {
          setProfile({
            id: seeker.id,
            firstName: seeker.firstName,
            lastName: seeker.lastName,
            bio: seeker.bio || '',
            location: seeker.location || '',
            availability: seeker.availability || '',
            cvUrl: seeker.cvUrl || '',
            skills: Array.isArray(seeker.skills)
              ? seeker.skills.map((s: any) =>
                typeof s === 'string' ? { name: s } : s
              )
            : []
          });
          setFormData({
            firstName: seeker.firstName || '',
            lastName: seeker.lastName || '',
            bio: seeker.bio || '',
            location: seeker.location || '',
            availability: seeker.availability || '',
            skillsInput: Array.isArray(seeker.skills)
              ? seeker.skills
                .map((s: any) => (typeof s === 'string' ? s : s.name))
                .join(', ')
              : ''
          });
        }
      } catch (e) {
        console.error('Failed to load profile', e);
        setError('Failed to load profile.');
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
      const skills = formData.skillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/seeker/profile`,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          bio: formData.bio,
          location: formData.location,
          availability: formData.availability,
          skills
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data;
      setProfile({
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        bio: updated.bio || '',
        location: updated.location || '',
        availability: updated.availability || '',
        cvUrl: updated.cvUrl || '',
        skills: Array.isArray(updated.skills)
          ? updated.skills.map((s: any) =>
            typeof s === 'string' ? { name: s } : s
          )
          : []
      });
      setEditMode(false);
    } catch (e) {
      console.error('Failed to save profile', e);
      alert('Failed to save profile');
    }
  };

  // Handlers: CV select and drag-drop
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCvMessage('');
    setUploadProgress(0);
    setCvFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setCvFile(file);
      setCvMessage('');
      setUploadProgress(0);
    }
  };

  const uploadCv = async () => {
    try {
      if (!cvFile) {
        setCvMessage('Please select a CV file first.');
        return;
      }
      setUploading(true);
      setCvMessage('');
      const formDataUpload = new FormData();
      formDataUpload.append('file', cvFile);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/seeker/cv/upload`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Let axios set multipart boundaries automatically
          },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || 0;
            const current = progressEvent.loaded || 0;
            if (total > 0) setUploadProgress(Math.round((current / total) * 100));
          }
        }
      );
      const { cvUrl, seeker } = res.data || {};
      setCvMessage('CV uploaded successfully.');
      setProfile((prev) => prev ? { ...prev, cvUrl: cvUrl || prev.cvUrl } : prev);
    } catch (err: any) {
      console.error('CV upload failed', err);
      setCvMessage(err?.response?.data?.message || 'Failed to upload CV.');
    } finally {
      setUploading(false);
    }
  };

  const analyzeCv = async () => {
    try {
      if (!profile?.cvUrl) {
        setAnalysisError('Upload a CV first.');
        return;
      }
      setAnalyzing(true);
      setAnalysisError('');
      setAnalysisResult(null);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/seeker/cv/analyze`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = res.data || {};
      setAnalysisResult({ parsedText: data.parsedText, extractedSkills: data.extractedSkills || [] });
      
    } catch (err: any) {
      console.error('Analyze CV failed', err);
      setAnalysisError(err?.response?.data?.message || 'Failed to analyze CV.');
    } finally {
      setAnalyzing(false);
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
        <h1 className="text-2xl font-bold">My Profile</h1>
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
            <h2 className="text-lg font-semibold">Basic Info</h2>
            <p className="text-gray-700">{profile.firstName} {profile.lastName}</p>
            {profile.location && <p className="text-gray-500">Location: {profile.location}</p>}
            {profile.availability && <p className="text-gray-500">Availability: {profile.availability}</p>}
          </div>
          {profile.bio && (
            <div>
              <h2 className="text-lg font-semibold">Bio</h2>
              <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.map((s, i) => (
                <span key={i} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">{s.name}</span>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Resume</h2>
            {profile.cvUrl ? (
              <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View CV</a>
            ) : (
              <p className="text-gray-500 text-sm">No CV in profile.</p>
            )}
          </div>
        </div>
      )}

      {editMode && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">First Name</label>
              <input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Last Name</label>
              <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full px-3 py-2 border rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Location</label>
              <input name="location" value={formData.location} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Availability</label>
              <input name="availability" value={formData.availability} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Skills (comma-separated)</label>
            <input name="skillsInput" value={formData.skillsInput} onChange={handleChange} className="w-full px-3 py-2 border rounded" />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Resume (CV)</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded p-6 text-center ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            >
              <p className="text-gray-600 mb-3">Drag and drop your CV here, or select a file.</p>
              <input
                type="file"
                accept="application/pdf,.pdf,.doc,.docx"
                onChange={handleFileChange}
                className="block mx-auto mb-3"
              />
              {cvFile && (
                <p className="text-sm text-gray-500">Selected: {cvFile.name}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={uploadCv}
                  disabled={uploading}
                  className={`px-4 py-2 rounded text-white ${uploading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Upload CV'}
                </button>
                <button
                  type="button"
                  onClick={analyzeCv}
                  disabled={analyzing || !profile?.cvUrl}
                  className={`px-4 py-2 rounded text-white ${analyzing || !profile?.cvUrl ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {analyzing ? 'Analyzing...' : 'Analyze CV with AI'}
                </button>
              </div>
              {cvMessage && (
                <p className="mt-2 text-sm text-gray-700">{cvMessage}</p>
              )}
              {analysisError && (
                <p className="mt-2 text-sm text-red-600">{analysisError}</p>
              )}
              {analysisResult && (
                <div className="mt-4 text-left">
                  {analysisResult.parsedText && (
                    <div className="mb-3">
                      <h3 className="font-semibold">Parsed Summary</h3>
                      <p className="text-gray-700 whitespace-pre-line text-sm">{analysisResult.parsedText}</p>
                    </div>
                  )}
                  {(analysisResult.extractedSkills || []).length > 0 && (
                    <div>
                      <h3 className="font-semibold">Extracted Skills</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {analysisResult.extractedSkills!.map((s, i) => (
                          <span key={i} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {profile?.cvUrl && (
              <div className="mt-3">
                <a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View current CV</a>
              </div>
            )}
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

export default SeekerProfile;