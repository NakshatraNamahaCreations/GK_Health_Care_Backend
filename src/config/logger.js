const { createLogger, format, transports } = require('winston');
const env = require('./env');

const logger = createLogger({
  level: env.logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    env.isProd
      ? format.json()
      : format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
        })
  ),
  transports: [new transports.Console()],
});

// morgan stream adapter
logger.stream = {
  write: (msg) => logger.http ? logger.http(msg.trim()) : logger.info(msg.trim()),
};

module.exports = logger;
