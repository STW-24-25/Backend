# Configuración de AWS Lambda para el Sistema de Notificaciones (Versión Solo SNS)

Este documento detalla los pasos necesarios para configurar correctamente la función Lambda de notificaciones utilizando solamente Amazon SNS, sin necesidad de SES.

## Requisitos previos

- Cuenta de AWS con permisos de administrador
- Conocimientos básicos de AWS Lambda y SNS

## 1. Configuración de IAM (Identity and Access Management)

### 1.1 Crear un rol para Lambda

1. Accede a la consola AWS y navega a **IAM** > **Roles** > **Create role**
2. Selecciona **AWS service** y luego **Lambda**
3. Añade las siguientes políticas:
   - `AmazonSNSFullAccess` (para enviar notificaciones)
   - `CloudWatchLogsFullAccess` (para logs)
4. Nombre del rol: `AgroAlertNotificationRole`
5. Descripción: "Rol para la función Lambda de notificaciones de AgroAlert"
6. Haz clic en **Create role**

## 2. Configuración de Amazon SNS (Simple Notification Service)

### 2.1 Crear un tema SNS

1. Navega a **Amazon SNS** > **Topics** > **Create topic**
2. Tipo: **Standard**
3. Nombre: `AgroAlertNotifications`
4. Haz clic en **Create topic**
5. Guarda el ARN del tema (lo necesitarás más adelante)

### 2.2 Configurar atributos SMS (opcional)

1. Ve a **Amazon SNS** > **Text messaging (SMS)** > **Mobile text messaging (SMS)**
2. Configura los siguientes valores:
   - Default sender ID: `AgroAlert`
   - Default message type: `Transactional`

## 3. Creación de la función Lambda

### 3.1 Crear la función

1. Navega a **Lambda** > **Functions** > **Create function**
2. Selecciona **Author from scratch**
3. Nombre de la función: `AgroAlertNotificationHandler`
4. Runtime: **Node.js 18.x** (o la versión más reciente disponible)
5. Arquitectura: **x86_64**
6. Permisos: Selecciona **Use an existing role** y elige `AgroAlertNotificationRole`
7. Haz clic en **Create function**

### 3.2 Configurar variables de entorno

1. En la función Lambda, ve a la pestaña **Configuration** > **Environment variables** > **Edit**
2. Añade las siguientes variables:
   - `AWS_REGION`: tu región de AWS (ej. `us-east-1`)
   - `SNS_TOPIC_ARN`: ARN del tema SNS que creaste anteriormente

### 3.3 Configurar tiempo de ejecución

1. Ve a **Configuration** > **General configuration** > **Edit**
2. Establece:
   - Timeout: `30 segundos` (ajusta según sea necesario)
   - Memory: `256 MB` (ajusta según sea necesario)

## 4. Desplegar el código de la función Lambda

### 4.1 Preparar el código

1. Copia el contenido del archivo `notificationHandler.ts` actualizado (versión solo SNS)
2. Transpila el código TypeScript a JavaScript usando alguno de estos métodos:

#### Opción A: Transpilación manual online

1. Visita [TypeScript Playground](https://www.typescriptlang.org/play)
2. Pega el código TypeScript
3. Copia el JavaScript generado en el panel derecho

#### Opción B: Transpilación con tsc

1. Asegúrate de tener Node.js instalado
2. Instala TypeScript: `npm install -g typescript`
3. Crea un archivo `tsconfig.json` básico:

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["*.ts"]
}
```

4. Guarda `notificationHandler.ts` en un directorio
5. Ejecuta: `tsc notificationHandler.ts`
6. Usa el archivo JavaScript resultante en `dist/notificationHandler.js`

### 4.2 Subir el código

1. En la función Lambda, ve a la pestaña **Code**
2. Borra el código existente en `index.js`
3. Pega el código JavaScript transpilado
4. Asegúrate de que la función exportada sea `handler`
5. Haz clic en **Deploy**

### 4.3 Alternativa: Subir un archivo ZIP

#### Preparación del archivo ZIP con dependencias

Para crear un archivo ZIP que incluya todas las dependencias necesarias:

1. Crea un directorio para el proyecto: `mkdir lambda-notification`
2. Entra al directorio: `cd lambda-notification`
3. Inicializa un proyecto npm: `npm init -y`
4. Instala las dependencias necesarias:
   ```bash
   npm install @aws-sdk/client-sns
   ```
5. Crea un archivo `index.js` con el código JavaScript transpilado
6. Crea el archivo ZIP:

   ```bash
   # En Linux/Mac
   zip -r function.zip index.js node_modules/

   # En Windows (PowerShell)
   Compress-Archive -Path index.js, node_modules -DestinationPath function.zip
   ```

#### Subir el archivo ZIP

1. En la función Lambda, selecciona **Upload from** > **.zip file**
2. Sube tu archivo ZIP
3. En **Runtime settings** > **Edit**, asegúrate de que el handler sea `index.handler`

## 5. Configurar suscripciones al tema SNS

### 5.1 Suscribir emails al tema SNS

1. En la consola AWS, navega a **SNS** > **Topics** > selecciona tu tema
2. Haz clic en **Create subscription**
3. Protocolo: **Email**
4. Endpoint: dirección de email a suscribir
5. Haz clic en **Create subscription**
6. El destinatario recibirá un email de confirmación y debe hacer clic en "Confirm subscription"

### 5.2 Suscribir números de teléfono al tema SNS (opcional)

1. En la consola AWS, navega a **SNS** > **Topics** > selecciona tu tema
2. Haz clic en **Create subscription**
3. Protocolo: **SMS**
4. Endpoint: número de teléfono en formato E.164 (ej. +34612345678)
5. Haz clic en **Create subscription**

## 6. Probar la función Lambda

### 6.1 Crear un evento de prueba

1. Haz clic en **Test** > **Create new event**
2. Nombre del evento: `TestNotification`
3. Contenido del evento:

```json
{
  "userId": "test-user-id",
  "notificationType": "WEATHER_ALERT",
  "phoneNumber": "+34612345678",
  "data": {
    "nivel": "Importante",
    "fenomeno": "Lluvia intensa",
    "areaDesc": "Zona de prueba",
    "descripcion": "Esto es una notificación de prueba",
    "urgency": "Expected",
    "instruction": "No se requiere acción, esto es una prueba"
  }
}
```

4. Haz clic en **Create**
5. Haz clic en **Test** para ejecutar la prueba

## 7. Integración con tu aplicación backend

### 7.1 Configurar variables de entorno en tu backend

Asegúrate de que tu aplicación backend tenga las siguientes variables de entorno:

```
AWS_REGION=tu-region
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
NOTIFICATION_LAMBDA_FUNCTION_NAME=AgroAlertNotificationHandler
SNS_TOPIC_ARN=arn:aws:sns:region:account-id:AgroAlertNotifications
```

### 7.2 Permisos IAM para tu backend

Crea un usuario IAM con las siguientes políticas:

- `AmazonSNSFullAccess`
- `AmazonLambda-FullAccess`

## 8. Solución de problemas comunes

### 8.1 Errores de permisos

- Verifica que el rol IAM tenga todos los permisos necesarios
- Asegúrate de que las credenciales IAM utilizadas por tu backend sean correctas

### 8.2 Errores de envío de SMS

- Verifica que el número de teléfono tenga el formato E.164 (ej. +34612345678)
- Comprueba los límites de gasto de SMS en tu cuenta AWS

### 8.3 Errores de suscripción

- Para las suscripciones de email, asegúrate de que hayan sido confirmadas
- Verifica que el tema SNS exista y esté correctamente configurado

## 9. Consideraciones adicionales

### 9.1 Costos

- Lambda: Primeros 1 millón de solicitudes gratuitas al mes
- SNS: SMS tiene costo por mensaje

### 9.2 Monitoreo

- Configura alarmas en CloudWatch para monitorear errores
- Revisa los logs de la función Lambda para detectar problemas

### 9.3 Producción

- Considera implementar una cola (SQS) entre tu backend y Lambda para mayor resiliencia
- Implementa reintentos para mensajes fallidos
- Configura métricas y alertas para supervisar el rendimiento

## 10. Referencia de dependencias

### 10.1 Dependencias npm

La función Lambda requiere únicamente la siguiente dependencia:

```json
{
  "dependencies": {
    "@aws-sdk/client-sns": "^3.x.x"
  }
}
```

### 10.2 Variables de entorno requeridas

| Variable      | Descripción                               | Ejemplo                                                   |
| ------------- | ----------------------------------------- | --------------------------------------------------------- |
| AWS_REGION    | Región de AWS donde se ejecuta la función | us-east-1                                                 |
| SNS_TOPIC_ARN | ARN del tema SNS para notificaciones      | arn:aws:sns:us-east-1:123456789012:AgroAlertNotifications |

---

Para más información, consulta la documentación oficial de AWS:

- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon SNS](https://docs.aws.amazon.com/sns/)
