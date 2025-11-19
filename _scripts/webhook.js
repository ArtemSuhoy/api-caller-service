import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const PORT = process.env.WEBHOOK_PORT;
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log all queries
app.use((req, _, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.post('/webhook', (req, res) => {
  try {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    res
      .status(200)
      .json({ status: 'received', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, _, res) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
