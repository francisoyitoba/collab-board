import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { Express } from 'express';
import { cvParsingQueue, coverLetterQueue, jobMatchingQueue } from './index';

export const setupBullBoard = (app: Express) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullAdapter(cvParsingQueue),
      new BullAdapter(coverLetterQueue),
      new BullAdapter(jobMatchingQueue)
    ],
    serverAdapter,
  });

  // Secure the Bull Dashboard with basic auth in production
  if (process.env.NODE_ENV === 'production') {
    app.use('/admin/queues', (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic');
        return res.status(401).send('Authentication required');
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');
      
      if (
        username === process.env.ADMIN_USERNAME && 
        password === process.env.ADMIN_PASSWORD
      ) {
        return next();
      }
      
      res.setHeader('WWW-Authenticate', 'Basic');
      return res.status(401).send('Invalid credentials');
    });
  }

  app.use('/admin/queues', serverAdapter.getRouter());
};