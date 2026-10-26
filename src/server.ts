import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './config/database.js';

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, nodeEnv: env.NODE_ENV },
    `Amrutam Telemedicine Backend listening on http://localhost:${env.PORT}`
  );
  logger.info(`Prometheus Metrics available at http://localhost:${env.PORT}/metrics`);
  logger.info(`Health check available at http://localhost:${env.PORT}/health/ready`);
});

// Graceful Shutdown
function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received termination signal. Shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await pool.end();
      logger.info('Database pool drained.');
    } catch (err) {
      logger.warn({ err }, 'Error closing database pool');
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
