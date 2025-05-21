# AgroNET

## Introducción

Este documento recoge los detalles técnicos del proyecto desde el acceso al sistema hasta los módulos utilizados durante el desarrollo, así como una valoración final del trabajo realizado.

## Estructura de la documentación

## Metodología

## Arquitectura

Los detalles de arquitectura y despliegue se pueden encontrar en los ficheros _readmes_arq_ en este mismo directorio. Estos ficheros incluyen tanto la arquitectura del sistema como los pasos a seguir para replicarla.

## URLs de Acceso

El sistema está accesible en la dirección _url_frontend_, con la documentación de la API REST en _url_frontend/api/docs_

## Credenciales de Acceso

### Usuario

- Email: _email_de_usuario_
- Contraseña: _contraseña_de_usuario_

### Administrador

- Email: _email_de_admin_
- Contraseña: _contraseña_de_admin_

## Módulos del Back-end

### Módulos propios

- **[AEMET API Unofficial](https://github.com/carloss4dv/aemet_api_wrapper_unofficial)**: Proporciona un cliente TypeScript/JavaScript para interactuar con la API de AEMET (Agencia Estatal de Meteorología) en España. Permite obtener datos meteorológicos, predicciones y valores climatológicos de manera sencilla y eficiente. Disponible en npm como **[aemet-api](https://www.npmjs.com/package/aemet-api)**.

- **[Agro Precios](https://github.com/carloss4dv/agro-precios)**: Paquete Node.js/TypeScript para procesar datos agrícolas del MAPA. Disponible en npm como **[apro-precios](https://www.npmjs.com/package/agro-precios)**.

- **[NASA POWER for Agriculture Spain](https://github.com/carloss4dv/nasa-power-for-agriculture-spain)**: Este cliente proporciona una interfaz sencilla para acceder a los datos meteorológicos y agroclimáticos de la API NASA POWER, especialmente adaptado para su uso en aplicaciones agrícolas en España. La biblioteca facilita la obtención de datos meteorológicos, el cálculo de índices agroclimáticos y la generación de recomendaciones personalizadas para la gestión de cultivos. Disponible en npm como **[nasa-power-api-client](https://www.npmjs.com/package/nasa-power-api-client)**.

Finalmente este paquete no fue utilizado por no considerarse de relevancia la información obtenida al no ser en tiempo real. Toda la información climática se obtiene de AEMET.

### Módulos externos generales

La elección de paquetes externos ha seguido la filosofía del proyecto de utilizar Typescript como lenguaje de programación, añadiendo además las dependencias de tipos de aquellos módulos que lo ofrecen.

- **[Express](https://github.com/expressjs/express)**: Fast, unopinionated, minimalist web framework for Node.js. Disponible en npm como **[express](https://www.npmjs.com/package/express)**.

- **[Zod](https://zod.dev/)**: TypeScript-first schema validation with static type inference. Disponible en npm como **[zod](https://www.npmjs.com/package/zod)**.

- **[Axios](https://axios-http.com/es/docs/intro)**: Cliente HTTP simple basado en promesas para el navegador y node.js. Disponible en npm como **[axios](https://www.npmjs.com/package/axios)**.

- **[node.bcrypt.js](https://github.com/kelektiv/node.bcrypt.js#readme)**: A library to help you hash passwords. Disponible en npm como **[bcrypt](https://www.npmjs.com/package/bcrypt)**.

- **[Turf](https://turfjs.org/)**: Advanced geospatial analysis for browsers and Node.js. Disponible en npm de forma modular, el módulo principal como **[@turf/turf](https://www.npmjs.com/package/@turf/turf)**.

- **[Cheerio](https://cheerio.js.org/)**: The fast, flexible, and elegant library for parsing and manipulating HTML and XML. Disponible en npm como **[cheerio](https://www.npmjs.com/package/cheerio)**.

- **[express-jwt](https://github.com/auth0/express-jwt#readme)**: This module provides Express middleware for validating JWTs (JSON Web Tokens) through the jsonwebtoken module. The decoded JWT payload is available on the request object. Disponible en npm como **[express-jwt](https://www.npmjs.com/package/express-jwt)**.

- **[mongoose](https://mongoosejs.com/)**: Elegant MongoDB object modeling for Node.js. Disponible en npm como **[mongoose](https://www.npmjs.com/package/mongoose)**.

- **[multer](https://github.com/expressjs/multer#readme)**: Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files. It is written on top of busboy for maximum efficiency. Disponible en npm como **[multer](https://www.npmjs.com/package/multer)**.

- **[Node Cron](https://github.com/node-cron/node-cron)**: The node-cron module is tiny task scheduler in pure JavaScript for node.js based on GNU crontab. This module allows you to schedule task in node.js using full crontab syntax. Disponible en npm como **[node-cron](https://www.npmjs.com/package/node-cron)**.

- **[Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)**: This module allows you to serve auto-generated swagger-ui generated API docs from express, based on a swagger.json file. Disponible en npm como **[swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)**.

- **[ts-node](https://typestrong.org/ts-node/)**: TypeScript execution and REPL for node.js. Disponible en npm como **[ts-node](https://www.npmjs.com/package/ts-node)**.

- **[TypeScript](https://www.typescriptlang.org/)**: TypeScript is a language for application-scale JavaScript. TypeScript adds optional types to JavaScript that support tools for large-scale JavaScript applications for any browser, for any host, on any OS. TypeScript compiles to readable, standards-based JavaScript. Disponible en npm como **[typescript](https://www.npmjs.com/package/typescript)**.

- **[Winston](https://github.com/winstonjs/winston#readme)**: A logger for just about everything. Disponible en npm como **[winston](https://www.npmjs.com/package/winston)**.

- **[Google Auth Library: Node.js Client](https://github.com/googleapis/google-auth-library-nodejs#readme)**: Google's officially supported node.js client library for using OAuth 2.0 authorization and authentication with Google APIs. Disponible en npm como **[google-auth-library](https://www.npmjs.com/package/google-auth-library)**.

- **[Sharp](https://sharp.pixelplumbing.com/)**: High performance Node.js image processing. Disponible en npm como **[sharp](https://www.npmjs.com/package/sharp)**.

- **[AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js)**: Disponible en npm como **[aws-sdk](https://www.npmjs.com/package/aws-sdk)**.

- **[AWS Lambda](https://github.com/awspilot/cli-lambda-deploy)**: Command line tool deploy code to AWS Lambda. Disponible en npm como **[aws-lambda](https://www.npmjs.com/package/aws-lambda)**.

- **[cors](https://github.com/expressjs/cors#readme)**: CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options. Disponible en npm como **[cors](https://www.npmjs.com/package/cors)**.

- **[dotenv](https://github.com/motdotla/dotenv#readme)**: Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env. Storing configuration in the environment separate from code is based on The Twelve-Factor App methodology. Disponible en npm como **[dotenv](https://www.npmjs.com/package/dotenv)**.

- **[geojson](https://github.com/caseycesari/geojson.js)**: Turn your geo data into GeoJSON. Disponible en npm como **[geojson](https://www.npmjs.com/package/geojson)**.

- **[socket.io](https://github.com/socketio/socket.io/tree/main/packages/socket.io#readme)**: Socket.IO enables real-time bidirectional event-based communication. Disponible en npm como **[socket.io](https://www.npmjs.com/package/socket.io)**.

### Módulos externos específicos de desarrollo

- **[ESLint](https://eslint.org/)**: ESLint statically analyzes your code to quickly find problems. It is built into most text editors and you can run ESLint as part of your continuous integration pipeline. Disponible en npm como **[eslint](https://www.npmjs.com/package/eslint)**.

- **[Prettier](https://prettier.io/)**: Prettier is an opinionated code formatter. It enforces a consistent style by parsing your code and re-printing it with its own rules that take the maximum line length into account, wrapping code when necessary. Disponible en npm como **[prettier](https://www.npmjs.com/package/prettier)**.

- **[Husky](https://typicode.github.io/husky/)**: Husky enhances your commits and more 🐶 woof! Automatically lint your commit messages, code, and run tests upon committing or pushing. Disponible en npm como **[husky](https://www.npmjs.com/package/husky)**.

- **[Jest](https://jestjs.io/)**: Jest is a delightful JavaScript Testing Framework with a focus on simplicity. Disponible en npm como **[jest](https://www.npmjs.com/package/jest)**.

- **[nodemon](https://nodemon.io/)**: Nodemon is a utility depended on by over 3 million projects, that will monitor for any changes in your source and automatically restart your server. Perfect for development. Disponible en npm como **[nodemon](https://www.npmjs.com/package/nodemon)**.

- **[mongodb-memory-server](https://typegoose.github.io/mongodb-memory-server/)**: Manage & spin up mongodb server binaries with zero(or slight) configuration for tests. Disponible en npm como **[mongodb-memory-server](https://www.npmjs.com/package/mongodb-memory-server)**.

## Tecnología y Módulos del Front-end

### Tecnología Utilizada

El frontend se ha construido utilizando \***\*[Astro](https://astro.build)\*\*** como framework base, aprovechando su capacidad para crear sitios web rápidos y optimizados e integrar otros frameworks. Para los componentes interactivos se ha utilizado **[React](https://react.dev)** en la creación de interfaces de usuario reactivas. El diseño y la personalización de la interfaz se han realizado con **[Tailwind CSS](https://tailwindcss.com)**, que permite desarrollar con rapidez y consistencia.

### Módulos externos

- **[Leaflet](https://leafletjs.com)**: Librería JavaScript de código abierto para mapas interactivos, utilizada para mostrar información geoespacial sobre parcelas agrícolas.

- **[Axios](https://github.com/axios/axios)**: Cliente HTTP basado en promesas para realizar llamadas a APIs externas (por ejemplo, para precios de mercado o datos meteorológicos).

- **[Socket.IO Client](https://github.com/socketio/socket.io)**: Cliente WebSocket utilizado para implementar comunicación en tiempo real (por ejemplo, notificaciones o actualizaciones climáticas en vivo).

## Validación y Pruebas

### Backend

Todos los controladores, servicios, configuraciones y demás componentes del servidor se han validado con tests unitarios. Un informe con la covertura de estos tests está disponible en **[este fichero](../coverage/lcov-report/index.html)**, alcanzando una covertura del 98%.

Como ya se ha comentado en la parte de metodología, se han desarrollado scripts de configuración para pre-commit hooks y despliegue continuo mediante GitHub Actions en la infraestructura.

### Frontend

## Mejoras Implementadas

## Valoración Global del Proyecto

## Mejoras Propuestas
