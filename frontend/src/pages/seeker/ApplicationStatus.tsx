import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ApplicationStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL;

      let url = id
        ? `${baseUrl}/api/applications/${id}`
        : `${baseUrl}/api/applications/seeker`;

      console.log('Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('Server responded with:', text);
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (id) {
        setApplication(data);
      } else {
        setApplications(data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [id]);

  // 🕒 Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading application details...
      </div>
    );
  }

  // 📄 LIST VIEW — /seeker/applications
  if (!id) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">My Applications</h1>

        {applications.length === 0 ? (
          <p className="text-gray-500">You have not submitted any applications yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Link
                key={app.id}
                to={`/seeker/applications/${app.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <h2 className="text-lg font-semibold text-blue-600">
                  {app.jobPosting.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {app.jobPosting.location} • Applied on{' '}
                  {new Date(app.createdAt).toLocaleDateString()}
                </p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                    app.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : app.status === 'REVIEWING'
                      ? 'bg-blue-100 text-blue-800'
                      : app.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {app.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 📄 SINGLE APPLICATION VIEW — /seeker/applications/:id
  if (!application) {
    return <div className="text-center text-red-500">Application not found</div>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">Application Status</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Job Details</h2>
        <p className="text-gray-700">
          <span className="font-medium">Position:</span>{' '}
          {application?.jobPosting?.title}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Location:</span>{' '}
          {application?.jobPosting?.location}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Status</h2>
        <div className="flex items-center">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              application?.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800'
                : application?.status === 'REVIEWING'
                ? 'bg-blue-100 text-blue-800'
                : application?.status === 'ACCEPTED'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {application?.status}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Application Timeline</h2>
        <div className="border-l-2 border-gray-200 pl-4 space-y-4">
          <div className="relative">
            <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-blue-500"></div>
            <p className="font-medium">Applied</p>
            <p className="text-sm text-gray-500">
              {new Date(application?.createdAt).toLocaleDateString()}
            </p>
          </div>

          {application?.status !== 'PENDING' && (
            <div className="relative">
              <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-blue-500"></div>
              <p className="font-medium">Under Review</p>
              <p className="text-sm text-gray-500">
                {new Date(application?.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {(application?.status === 'ACCEPTED' ||
            application?.status === 'REJECTED') && (
            <div className="relative">
              <div
                className={`absolute -left-6 mt-1 w-4 h-4 rounded-full ${
                  application?.status === 'ACCEPTED'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              ></div>
              <p className="font-medium">
                {application?.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(application?.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {application?.feedback && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Feedback</h2>
          <p className="text-gray-700 bg-gray-50 p-4 rounded">
            {application?.feedback}
          </p>
        </div>
      )}

      <button
  onClick={async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to start a chat.");
        return;
      }

      const applicationId = application.id; // Assuming you're looping through applications

      console.log("Starting chat for application:", applicationId);

      console.log("Creating chat room for applicationId:", application.id);
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat/rooms`,
        { applicationId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Chat room response:", res.data);

      const roomId = res.data.id || res.data.roomId;
      if (roomId) {
        navigate(`/chat/${roomId}`);
      } else {
        alert("Failed to create or find chat room.");
      }
    } catch (err) {
      console.error("Error creating chat room:", err);
      alert("Unable to start chat with employer. Please try again.");
    }
  }}
  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded mt-2"
>
  💬 Chat with Employer
</button> <br></br>

      <Link
        to="/seeker/applications"
        className="text-blue-600 hover:underline text-sm"
      >
        ← Back to My Applications
      </Link>
    </div>
  );
};

export default ApplicationStatus;
