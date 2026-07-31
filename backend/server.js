import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './firebaseAdmin.js';
import profilesRouter from './routes/profiles.js';
import projectsRouter from './routes/projects.js';
import matchingRouter from './routes/matching.js';
import workspaceRouter from './routes/workspace.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/profiles', profilesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api', matchingRouter);
app.use('/api', workspaceRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'creatoros-backend' });
});

app.get('/health/firebase', async (req, res) => {
  try {
    await db.listCollections();
    res.json({ status: 'ok', firestore: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`CreatorOS backend listening on port ${PORT}`);
});
