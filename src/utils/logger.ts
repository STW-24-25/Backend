import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Función para obtener el directorio con timestamp para esta ejecución
function getExecutionLogDirectory(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  // Crear un directorio con formato: YYYY-MM-DD/HH-mm-ss
  const dailyDirectory = path.join(__dirname, '../../logs', `${year}-${month}-${day}`);
  const executionDirectory = path.join(dailyDirectory, `${hour}-${minute}-${second}`);

  // Crear el directorio si no existe
  if (!fs.existsSync(executionDirectory)) {
    fs.mkdirSync(executionDirectory, { recursive: true });
  }

  return executionDirectory;
}

// Obtener el directorio una vez al inicio de la ejecución
const executionLogDirectory = getExecutionLogDirectory();

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    // Consola con formato coloreado
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    // Archivo de logs generales
    new winston.transports.File({
      filename: path.join(executionLogDirectory, 'execution.log'),
      level: 'debug',
    }),
    // Archivo específico para errores
    new winston.transports.File({
      filename: path.join(executionLogDirectory, 'error.log'),
      level: 'error',
    }),
  ],
});

export default logger;
