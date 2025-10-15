# JobPulse - AI-Powered Job Matching Platform

JobPulse is a comprehensive job matching platform that uses AI to connect job seekers with employers based on skills and qualifications. The platform features CV parsing, job matching algorithms, AI-assisted cover letter generation, and real-time chat between employers and candidates.

## Features

### For Job Seekers
- **Profile Setup**: Upload CV for automatic skill extraction
- **Job Matching**: Get personalized job recommendations based on your skills
- **AI Cover Letters**: Generate customized cover letters for job applications
- **Application Tracking**: Monitor the status of your job applications
- **Real-time Chat**: Communicate directly with potential employers

### For Employers
- **Job Posting**: Create and manage job listings with required skills
- **Candidate Matching**: Find qualified candidates based on job requirements
- **Application Review**: Evaluate applications and update their status
- **Real-time Chat**: Connect with promising candidates directly

## Tech Stack

### Backend
- **Node.js** with **Express** and **TypeScript**
- **Prisma ORM** with **PostgreSQL** database
- **BullMQ** for job queue management
- **Socket.IO** for real-time communication
- **JWT** for authentication

### Frontend
- **React** with **TypeScript**
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API requests
- **Socket.IO Client** for real-time communication

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Redis (for BullMQ)

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` (local defaults shown):
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/jobpulse?schema=public"
   JWT_SECRET="your-secret-key"
   JWT_EXPIRES_IN="7d"
   PORT=5000
   NODE_ENV="development"
   REDIS_URL="redis://localhost:6379"
   FRONTEND_URL="http://localhost:5173"

   # Optional AI integration for CV analysis
   # If set, backend will call `${AI_API_URL}/analyze-cv` with `AI_API_KEY`
   AI_API_URL=""
   AI_API_KEY=""
   ```

4. Run Prisma migrations:
   ```
   npx prisma migrate dev
   ```

5. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file:
   ```
   VITE_API_URL="http://localhost:5000"
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions using Render, Vercel, and Supabase.

## Environment & Features

- `Uploads` are served from `backend/uploads` at the public path `/uploads`.
- CV upload supports `PDF`, `DOC`, `DOCX` with a size limit of ~10MB.
- CV analysis can call an external AI service via `AI_API_URL` + `AI_API_KEY`.
  - When not configured, the backend falls back to local heuristic skill extraction.
- Auth endpoints are mounted under `/api/auth`; user profile and CV endpoints under `/api/users`.

## Author

- Name: Francis Oyitoba
- Website: https://francisoyitoba.com/
- GitHub: https://github.com/francisoyitoba
- LinkedIn: https://www.linkedin.com/in/francis-oyitoba-85a89bb9/

## Project Structure

```
jobpulse/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   ├── queue/
│   │   ├── routes/
│   │   ├── services/
│   │   └── socket/
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   ├── context/
    │   └── pages/
    └── package.json
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.