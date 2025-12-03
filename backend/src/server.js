const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const passport = require('./config/passport');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Initialize Express app
const path = require('path');

const app = express();
const server = http.createServer(app);

// Helper to normalize and get allowed origins
const getAllowedOrigins = () => {
  const origins = [];

  // Only allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8081'
    );
  }

  if (process.env.FRONTEND_URL) {
    const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''));
    origins.push(...envOrigins);
  }

  return [...new Set(origins)]; // Remove duplicates
};

const allowedOrigins = getAllowedOrigins();
console.log('Allowed Origins:', allowedOrigins);

// Initialize Socket.io
// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  }
});

// Socket.io Middleware for Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.userId})`);

  // Join user to their own room for personal notifications/updates
  socket.join(`user:${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Initialize NotificationService with io
const NotificationService = require('./modules/notification/notification.service');
NotificationService.setIo(io);

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve static files
app.use('/api/public', express.static(path.join(__dirname, '../public')));

// Middlewareust proxy (required for Nginx/Load Balancer)
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Allow cross-origin resource embedding (for Gmail image proxy)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Body parser
app.use(express.json());
app.use(passport.initialize());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Synapse Backend API'
  });
});

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const agendaRoutes = require('./modules/agenda/agenda.routes');
const eventRoutes = require('./modules/event/event.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const linkRoutes = require('./modules/link/link.routes');
const integrationsRoutes = require('./modules/integrations/integrations.routes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/agendas', agendaRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/integrations', integrationsRoutes);

// ============================================
// TEST ROUTES
// ============================================

const { sendEmail } = require('./utils/mailer');

app.get('/api/test-email-config', async (req, res) => {
  try {
    // Send test email
    await sendEmail(
      'test@example.com', // Placeholder, or maybe use a real one if user provided? No, user said "pon un placeholder console.log o un email de prueba"
      'Test Email Config',
      '<p>This is a test email to verify SMTP configuration.</p>'
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;

// Test database connection
async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⏳ Server will keep trying to connect...');
    return false;
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Synapse Backend API running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Try to connect to database (non-blocking)
  testDatabaseConnection().then((connected) => {
    if (!connected) {
      // Retry connection every 5 seconds
      const retryConnection = setInterval(async () => {
        const connected = await testDatabaseConnection();
        if (connected) {
          clearInterval(retryConnection);
        }
      }, 5000);
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
