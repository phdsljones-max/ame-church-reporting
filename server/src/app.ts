import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './lib/errors.js';
import { authRequired } from './middleware/auth.js';
import { licenseGate } from './middleware/license.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import districtsRouter from './routes/districts.js';
import usersRouter from './routes/users.js';
import churchesRouter from './routes/churches.js';
import {
  annualConferencesRouter,
  connectionalProfileRouter,
  peDistrictsRouter,
} from './routes/hierarchy.js';
import monthlyRouter from './routes/monthly.js';
import rollupsRouter from './routes/rollups.js';
import componentsRouter from './routes/components.js';
import componentReportsRouter from './routes/componentReports.js';
import writtenRouter from './routes/written.js';
import compositeRouter from './routes/composite.js';
import calendarRouter from './routes/calendar.js';
import exportsRouter from './routes/exports.js';
import reconciliationRouter from './routes/reconciliation.js';
import {
  churchAnnualSetupRouter,
  componentAnnualSetupRouter,
} from './routes/annualSetup.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Public: no token needed (license never blocks sign-in).
  app.use('/api/v1/auth', authRouter);

  // Everything below requires a valid access token and passes the license gate
  // (writes blocked when the district license is inactive; reads allowed).
  const guarded = [authRequired, licenseGate] as const;
  app.use('/api/v1', ...guarded, meRouter);
  app.use('/api/v1/districts', ...guarded, districtsRouter);
  app.use('/api/v1/users', ...guarded, usersRouter);
  app.use('/api/v1/churches', ...guarded, churchesRouter);
  app.use('/api/v1/churches/:churchId/monthly-reports', ...guarded, monthlyRouter);
  app.use('/api/v1/churches/:churchId/annual-setup', ...guarded, churchAnnualSetupRouter);
  app.use('/api/v1/churches/:churchId', ...guarded, rollupsRouter);
  app.use('/api/v1/pe-districts', ...guarded, peDistrictsRouter);
  app.use('/api/v1/annual-conferences', ...guarded, annualConferencesRouter);
  app.use('/api/v1/connectional-profile', ...guarded, connectionalProfileRouter);
  app.use('/api/v1/components', ...guarded, componentsRouter);
  app.use('/api/v1/component-reports', ...guarded, componentReportsRouter);
  app.use('/api/v1/component-annual-setup', ...guarded, componentAnnualSetupRouter);
  app.use('/api/v1/written-reports', ...guarded, writtenRouter);
  app.use('/api/v1/composite-reports', ...guarded, compositeRouter);
  app.use('/api/v1/calendar-events', ...guarded, calendarRouter);
  app.use('/api/v1/exports', ...guarded, exportsRouter);
  app.use('/api/v1/reconciliation', ...guarded, reconciliationRouter);

  app.use('/api', (_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'We could not find that.' } })
  );
  app.use(errorHandler);

  return app;
}
