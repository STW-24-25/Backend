import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import app from './app'; // Your Express app
import logger from './utils/logger';
import fs from 'fs';
import setupForumSockets from './sockets/forumSocket';
import connectDB from './utils/db';
import alertService from './services/alert.service';

const PORT = process.env.PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

connectDB().then(() => {
  let server: http.Server | https.Server = http.createServer(app);

  // Servidor HTTPS (si se proporcionan certificados)
  if (SSL_KEY_PATH && SSL_CERT_PATH) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH),
      };

      server = https.createServer(httpsOptions, app);
      server.listen(HTTPS_PORT, () => {
        logger.info(`HTTPS server running on port ${HTTPS_PORT}`);
      });
    } catch (error: any) {
      logger.error(`Error in HTTPS configuration: ${error.message}`);
    }
  } else {
    server.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
      logger.info(`HTTP server runing on port ${PORT}`);
    });
    logger.warn(
      'No se ha configurado HTTPS. Definir SSL_KEY_PATH y SSL_CERT_PATH en las variables de entorno.',
    );
  }

  const io: Server = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  setupForumSockets(io);

  // Populate the alerts cache on server startup
  alertService
    .refreshAlertsCache()
    .then(() => {
      logger.info('Initial weather alerts cache populated successfully');
    })
    .catch(error => {
      logger.warn('Failed to populate initial weather alerts cache:', error);
      logger.info('Will retry on first request or scheduled job');
    });
});
