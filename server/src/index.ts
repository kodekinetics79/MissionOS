import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT || 4100);
app.use(helmet());
const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || ['http://localhost:9911'];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'missionos-api', utc: new Date().toISOString() }));
app.use('/api', routes);
app.use(errorHandler);
app.listen(port, () => console.log(`MissionOS API listening on http://localhost:${port}`));
