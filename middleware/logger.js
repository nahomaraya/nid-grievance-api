const expressWinston = require("express-winston");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const loggerMiddleware = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
});

const errorLoggerMiddleware = expressWinston.errorLogger({
  winstonInstance: logger,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
});

module.exports = { loggerMiddleware, errorLoggerMiddleware, logger };
