import app from './app';
import connectDB from './utils/db';
import logger from './utils/logger';
import https from 'https';
import fs from 'fs';

const PORT = process.env.PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

connectDB().then(() => {
  // Servidor HTTP
  app.listen(PORT, () => {
    logger.info(`Servidor HTTP ejecutándose en puerto ${PORT}`);
  });

  // Servidor HTTPS (si se proporcionan certificados)
  if (SSL_KEY_PATH && SSL_CERT_PATH) {
    try {
      const httpsOptions = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH),
      };

      https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
        logger.info(`Servidor HTTPS ejecutándose en puerto ${HTTPS_PORT}`);
      });
    } catch (error: any) {
      logger.error(`Error al configurar HTTPS: ${error.message}`);
    }
  } else {
    logger.warn(
      'No se ha configurado HTTPS. Definir SSL_KEY_PATH y SSL_CERT_PATH en las variables de entorno.',
    );
  }
});
