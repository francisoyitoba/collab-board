import { Link } from 'react-router-dom';

const ChatHome = () => {
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <p className="text-gray-700 mb-6">Select a conversation from your dashboard or application details to start chatting.</p>
      <div className="text-sm text-gray-600">
        You can open chat from:
        <ul className="list-disc ml-5 mt-2">
          <li>Job application details</li>
          <li>Employer dashboard applications list</li>
        </ul>
      </div>
      <div className="mt-6">
        <Link to="/" className="text-blue-600 hover:text-blue-800">Go to Dashboard</Link>
      </div>
    </div>
  );
};

export default ChatHome;