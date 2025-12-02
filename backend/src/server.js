const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const passport = require('./config/passport');

// Initialize Express app
const path = require('path');

const app = express();

// Serve static files
app.use('/api/public', express.static(path.join(__dirname, '../public')));

// Middlewareust proxy (required for Nginx/Load Balancer)
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
app.listen(PORT, () => {
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
