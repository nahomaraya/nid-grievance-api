const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { loggerMiddleware, errorLoggerMiddleware, logger } = require('./middleware/logger');
const apiRoutes = require('./routes/apiRoute');
const authRoutes = require('./routes/authRoute');

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

app.use(loggerMiddleware);

app.use('/api', apiRoutes);
app.use('/api', authRoutes);

app.use(errorLoggerMiddleware);

const port = process.env.PORT || 3002;
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
