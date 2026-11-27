require('dotenv').config();
const express = require('express');
require('express-async-errors'); // lets async controllers throw into the error handler

const cors = require('cors');
const publicRoute = require('./Routes/publicRoute');

const { connectAll } = require('./Connector/dbConnector');
const userRoute = require('./Routes/userRoute');
const codeRoute = require('./Routes/codeRoute');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/V1/user', userRoute); // POST /register, POST /login
app.use('/api/V1/code', codeRoute); // experiments (JWT protected)

app.use('/api/V1/public', cors(), publicRoute); // no auth: used by the snippet

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectAll();
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
