import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { processCvParsing } from './processors/cvProcessor';
import { processCoverLetterGeneration } from './processors/coverLetterProcessor';
import { processJobMatching } from './processors/jobMatchingProcessor';

const prisma = new PrismaClient();

// Queue names
export const CV_PARSING_QUEUE = 'cv-parsing';
export const COVER_LETTER_QUEUE = 'cover-letter-generation';
export const JOB_MATCHING_QUEUE = 'job-matching';

// Redis connection config
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

// Create queues
export const cvParsingQueue = new Queue(CV_PARSING_QUEUE, {
  connection: redisConnection
});

export const coverLetterQueue = new Queue(COVER_LETTER_QUEUE, {
  connection: redisConnection
});

export const jobMatchingQueue = new Queue(JOB_MATCHING_QUEUE, {
  connection: redisConnection
});

// Setup workers
export const setupQueues = () => {
  // CV Parsing worker
  const cvParsingWorker = new Worker(CV_PARSING_QUEUE, async job => {
    return await processCvParsing(job.data);
  }, { connection: redisConnection });

  cvParsingWorker.on('completed', async (job, result) => {
    console.log(`CV parsing job ${job.id} completed`);
    
    // Update job status in database
    await prisma.jobQueue.update({
      where: { id: job.data.dbJobId },
      data: {
        status: 'COMPLETED',
        result: JSON.stringify(result)
      }
    });

    // Update seeker profile with parsed CV text
    await prisma.seekerProfile.update({
      where: { id: job.data.seekerProfileId },
      data: {
        parsedCvText: result.parsedText
      }
    });
  });

  cvParsingWorker.on('failed', async (job, error) => {
    console.error(`CV parsing job ${job?.id} failed:`, error);
    
    if (job) {
      await prisma.jobQueue.update({
        where: { id: job.data.dbJobId },
        data: {
          status: 'FAILED',
          result: JSON.stringify({ error: error.message })
        }
      });
    }
  });

  // Cover Letter Generation worker
  const coverLetterWorker = new Worker(COVER_LETTER_QUEUE, async job => {
    return await processCoverLetterGeneration(job.data);
  }, { connection: redisConnection });

  coverLetterWorker.on('completed', async (job, result) => {
    console.log(`Cover letter generation job ${job.id} completed`);
    
    // Update job status in database
    await prisma.jobQueue.update({
      where: { id: job.data.dbJobId },
      data: {
        status: 'COMPLETED',
        result: JSON.stringify(result)
      }
    });

    // Update application with generated cover letter
    await prisma.application.update({
      where: { id: job.data.applicationId },
      data: {
        coverLetter: result.coverLetter
      }
    });
  });

  coverLetterWorker.on('failed', async (job, error) => {
    console.error(`Cover letter generation job ${job?.id} failed:`, error);
    
    if (job) {
      await prisma.jobQueue.update({
        where: { id: job.data.dbJobId },
        data: {
          status: 'FAILED',
          result: JSON.stringify({ error: error.message })
        }
      });
    }
  });
  
  // Job Matching worker
  const jobMatchingWorker = new Worker(JOB_MATCHING_QUEUE, async job => {
    return await processJobMatching(job.data);
  }, { connection: redisConnection });

  jobMatchingWorker.on('completed', async (job, result) => {
    console.log(`Job matching job ${job.id} completed`);
    
    // Update job status in database
    if (job.data.dbJobId) {
      await prisma.jobQueue.update({
        where: { id: job.data.dbJobId },
        data: {
          status: 'COMPLETED',
          result: JSON.stringify(result)
        }
      });
    }
  });

  jobMatchingWorker.on('failed', async (job, error) => {
    console.error(`Job matching job ${job?.id} failed:`, error);
    
    if (job && job.data.dbJobId) {
      await prisma.jobQueue.update({
        where: { id: job.data.dbJobId },
        data: {
          status: 'FAILED',
          result: JSON.stringify({ error: error.message })
        }
      });
    }
  });

  console.log('Background job queues and workers set up successfully');
};