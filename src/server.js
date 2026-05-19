// Entry point. Loads env, connects to Mongo, then starts the HTTP server.
const env = require('./config/env');
const logger = require('./config/logger');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

let server;

async function start() {
  try {
    await connectDB();

    server = app.listen(env.port, () => {
      logger.info(`Server listening on http://localhost:${env.port} [${env.nodeEnv}]`);
      logger.info(`Health: http://localhost:${env.port}${env.apiPrefix}/health`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason && reason.stack ? reason.stack : reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err.message}`);
  shutdown('uncaughtException');
});

start();
