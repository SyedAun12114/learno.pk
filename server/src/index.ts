import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import compression from 'compression';
import path from 'path';
import { config } from './config';
import { testConnection } from './db';
import { MySQLSessionStore } from './db/sessionStore';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import dashboardRouter from './routes/dashboard';
import tasksRouter from './routes/tasks';
import studyRouter from './routes/study';
import aiRouter from './routes/ai';
import testsRouter from './routes/tests';
import skillsRouter from './routes/skills';
import opportunitiesRouter from './routes/opportunities';
import adminRouter from './routes/admin';
import streakRouter from './routes/streak';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: config.isProduction ? undefined : false }));
app.use(cors({
  origin: config.isProduction
    ? config.appUrl
    : ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(session({
  name: 'learno.sid',
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  store: new MySQLSessionStore(),
  cookie: {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: config.session.maxAge,
  },
}));

app.use('/api', generalLimiter);
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/study', studyRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tests', testsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/streak', streakRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env, ts: new Date().toISOString() });
});

if (config.isProduction) {
  const staticPath = path.join(__dirname, '../../dist/public');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await testConnection();
    app.listen(config.port, () => {
      logger.info('Learno running on port ' + config.port + ' [' + config.env + ']');
    });
  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
