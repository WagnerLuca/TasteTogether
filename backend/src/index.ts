import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { eventsRouter } from './routes/events';
import './types';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/events', eventsRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`TasteTogether API running on port ${PORT}`);
});
