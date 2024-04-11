// Load environment variables from .env file
require('dotenv').config();

/** An optional prefix for the service router: useful if plugging in to an existing Express App */
const ROOT_PREFIX = process.env.ORACLE_ROOT_PREFIX || '';

// Native Node modules
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

// NPM modules
const express = require('express');
const { redirectToHTTPS } = require('express-http-to-https');

// Setup Express
const app = express();
const port = process.env.PORT || 3000;
const sslCertPath = '/etc/letsencrypt/live/' + process.env.DOMAIN + '/';

// Plug in our Router
const router = require('./src/routes');
app.use(router);

// Serve static files from the 'public' directory, along with the root prefix if specified
if (ROOT_PREFIX) {
  // Prefix specified, serve from it
  app.use(ROOT_PREFIX, express.static(path.join(__dirname, 'public')));
} else {
  // No prefix, serve from root
  app.use(express.static(path.join(__dirname, 'public')));
}

// Startup
let server;
if (process.env.DOMAIN) {
  // SSL options
  const sslOptions = {
    cert: fs.readFileSync(sslCertPath + 'fullchain.pem'),
    key: fs.readFileSync(sslCertPath + 'privkey.pem')
  };

  // Start the HTTPS server
  server = https.createServer(sslOptions, app);
  server.listen(443, () => {
    console.log(`HTTPS server running on port 443 --> https://${process.env.DOMAIN}`);
  });

  // Listen for HTTP requests for redirect purposes
  const httpApp = express();
  httpApp.use(redirectToHTTPS());
  httpApp.listen(80);
} else {
  // Start the HTTP server
  server = http.createServer(app);
  server.listen(port, () => {
    console.log(`HTTP server running on port ${port} --> http://localhost:${port}`);
  });
}

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});