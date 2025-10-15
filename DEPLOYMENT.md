# JobPulse Deployment Guide

This guide provides instructions for deploying the JobPulse application using Render for the backend, Vercel for the frontend, and Supabase for the database.

## Prerequisites

- GitHub account
- Render account (https://render.com)
- Vercel account (https://vercel.com)
- Supabase account (https://supabase.com)

## Database Setup with Supabase

1. Create a new project in Supabase
2. Go to the SQL Editor and run the Prisma schema migration:
   - Copy the SQL from the Prisma migration file
   - Execute the SQL in the Supabase SQL Editor
3. Get your database connection string from the Settings > Database section
4. Format your connection string as: `postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres`

## Backend Deployment (Render)

1. Push your code to a GitHub repository
2. Log in to Render and create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: jobpulse-api
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install && npx prisma generate && npm run build`
   - **Start Command**: `cd backend && npm start`
   - **Root Directory**: `/`
   - **Persistent Disk**: Enable a persistent disk (or configure S3) for CV uploads

5. Add the following environment variables:
   ```
   DATABASE_URL=your_supabase_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=8080
   NODE_ENV=production
   REDIS_URL=your_redis_url (Render provides Redis as an add-on)
   FRONTEND_URL=your_vercel_frontend_url

    # Optional AI service for CV analysis
    # If set, backend calls `${AI_API_URL}/analyze-cv` with `AI_API_KEY`
    AI_API_URL=
    AI_API_KEY=
   ```

6. Create a Redis add-on in Render and link it to your service
7. Deploy the service

## Frontend Deployment (Vercel)

1. Log in to Vercel and create a new project
2. Connect your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add the following environment variables:
   ```
   VITE_API_URL=your_render_backend_url
   ```

5. Deploy the project

## Continuous Deployment

Both Render and Vercel support automatic deployments when you push changes to your GitHub repository. Make sure to:

1. Set up the main branch for production deployments
2. Configure preview deployments for pull requests (optional)

## Post-Deployment Steps

1. Update the CORS settings in the backend to allow requests from your Vercel frontend domain
2. Test the complete flow from registration to chat
3. Monitor logs in both Render and Vercel for any issues
4. Validate CV uploads and static serving:
   - Upload a CV from the seeker profile page
   - Confirm the file exists under `backend/uploads/cv`
   - Open the public URL (e.g., `https://your-backend/uploads/cv/<filename>`) and verify it loads
5. If using the optional AI service, verify `/api/users/seeker/cv/analyze` returns parsed text and skills

## Scaling Considerations

- Render: Upgrade to paid plans for better performance and uptime
- Supabase: Monitor database usage and upgrade as needed
- Redis: Consider dedicated Redis instance for production workloads
- Socket.IO: For high traffic, consider implementing sticky sessions or using Redis adapter
- File uploads: Prefer an object storage (e.g., S3) for durability over local disk

## Troubleshooting

- **Database Connection Issues**: Verify IP allowlist in Supabase
- **CORS Errors**: Ensure backend CORS settings include frontend URL
- **Socket.IO Connection Problems**: Check transport settings and CORS
- **Redis Connection Failures**: Verify Redis URL and connection settings
- **Uploads not accessible**: Ensure persistent disk is enabled or object storage is configured; verify Express static path `/uploads` is reachable

## Monitoring

- Set up Render and Vercel integrations with monitoring tools
- Configure alerts for service downtime
- Monitor database performance in Supabase dashboard