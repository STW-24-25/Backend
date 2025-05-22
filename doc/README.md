<p align="center">
  <img src="../images/favicon.svg" height="150">
</p>

<h1 align="center">AgroNET</h1>

## Estructura de la documentación

Este documento está organizado en secciones que detallan los diferentes aspectos del proyecto AgroNET, desde la introducción y metodología hasta la descripción de los módulos, pruebas y mejoras implementadas. A lo largo del documento, se hacen referencias a otros ficheros de documentación específica (ubicados en este mismo repositorio o en repositorios de la organización) que profundizan en temas concretos como la arquitectura, configuración de servicios o detalles del front-end.

## Introducción

Este documento recoge los detalles técnicos del proyecto desde el acceso al sistema hasta los módulos utilizados durante el desarrollo, así como una valoración final del trabajo realizado.

## Metodología

El trabajo se ha organizado dividiendo al equipo en dos grupos principales: dos personas dedicadas al desarrollo del front-end y dos personas al back-end. Dentro del equipo de back-end, se ha realizado una subdivisión de tareas, donde un miembro se ha centrado en aspectos de infraestructura y la integración de servicios externos (bare-metal), mientras que el otro se ha encargado del diseño de la arquitectura del software y la lógica de negocio.

La gestión de tareas se ha llevado a cabo utilizando la herramienta Kanban de GitHub Projects, lo que ha permitido una visualización clara del progreso y una asignación eficiente de responsabilidades. Además, se han mantenido reuniones periódicas con todo el equipo para sincronizar avances, resolver dudas y planificar las siguientes etapas del proyecto.

## Fuentes de datos

Las principales fuentes de datos utilizadas son:

- **[AEMET Open Data](https://opendata.aemet.es/centrodedescargas/inicio)**
- **[Servicios SIGPAC](https://sigpac-hubcloud.es/)**
- **[MAPA: Precios Medios Nacionales](https://www.mapa.gob.es/es/estadistica/temas/estadisticas-agrarias/economia/precios-medios-nacionales/)**
- **[Servicios WMS del Catastro de España](https://www.catastro.hacienda.gob.es/esp/wms.asp)**

## Arquitectura

Los detalles de arquitectura y despliegue se pueden encontrar en los ficheros de documentación específicos de **[arquitectura](https://github.com/STW-24-25/Backend/blob/main/doc/ARQ_doc.md)**, **[infraestructura](https://github.com/STW-24-25/Backend/blob/main/doc/INFRA_doc.md)** y **[servicios externos](https://github.com/STW-24-25/Backend/blob/main/doc/SNS_doc.md)** en este mismo directorio. Estos ficheros incluyen tanto la arquitectura del sistema como los pasos a seguir para replicarla.

## URLs de Acceso

El sistema está accesible en la dirección **[https://agronet.are-dev.es](https://agronet.are-dev.es)**, con la documentación de la API REST en **[https://agronet.are-dev.es/swagger](https://agronet.are-dev.es/swagger)**

## Credenciales de Acceso

### Usuario

- Email: 816787@unizar.es
- Contraseña: Welcome123

### Administrador

- Email: 850068@unizar.es
- Contraseña: Welcome123

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

El frontend se ha construido utilizando **[Astro](https://astro.build)** como framework base, aprovechando su capacidad para crear sitios web rápidos y optimizados e integrar otros frameworks. Para los componentes interactivos se ha utilizado **[React](https://react.dev)** en la creación de interfaces de usuario reactivas. El diseño y la personalización de la interfaz se han realizado con **[Tailwind CSS](https://tailwindcss.com)**, que permite desarrollar con rapidez y consistencia.

### Módulos externos

- **[Leaflet](https://leafletjs.com)**: Librería JavaScript de código abierto para mapas interactivos, utilizada para mostrar información geoespacial sobre parcelas agrícolas.

- **[Axios](https://github.com/axios/axios)**: Cliente HTTP basado en promesas para realizar llamadas a APIs externas (por ejemplo, para precios de mercado o datos meteorológicos).

- **[Socket.IO Client](https://github.com/socketio/socket.io)**: Cliente WebSocket utilizado para implementar comunicación en tiempo real (por ejemplo, notificaciones o actualizaciones climáticas en vivo).

- **[Dotenv](https://github.com/motdotla/dotenv)**: Herramienta para gestionar variables de entorno de forma segura.

- **[Auth-Astro](https://github.com/nowaythatworked/auth-astro?tab=readme-ov-file#auth-astro)**: En nuestro proyecto Astro, implementamos la autenticación utilizando el paquete auth-astro, una integración comunitaria que facilita la incorporación de **[Auth.js](https://authjs.dev/)** en aplicaciones Astro. Este paquete actúa como un adaptador que envuelve el núcleo de Auth.js, permitiendo una configuración sencilla y la gestión de proveedores de autenticación como Google y GitHub.

- **[GeoJSON](https://www.npmjs.com/package/geojson)** y **@types/geojson**: Formato estándar para codificar estructuras geográficas que permite manipular y visualizar datos de parcelas.
- **[Heroicons](https://heroicons.com)**: Colección de iconos SVG personalizables usados en la interfaz.

- **@headlessui/react**: Componentes accesibles y sin estilos predefinidos que ayudan a construir menús, modales y otros elementos interactivos.

- **@tailwindcss/typography**: Plugin para mejorar la presentación de textos y contenido enriquecido.

* **[ApexChart](https://apexcharts.com)**: Para la visualización de estadísticas en nuestra aplicación, hemos utilizado **[ApexCharts](https://apexcharts.com)**, una biblioteca moderna y de código abierto que permite crear gráficos interactivos y atractivos para aplicaciones web. Específicamente, implementamos la integración con React mediante el paquete **[react-apexcharts](https://www.npmjs.com/package/react-apexcharts)**, que actúa como un contenedor para ApexCharts.js, facilitando su uso en componentes de React.Esta combinación nos permite incorporar diversos tipos de gráficos, como líneas, áreas, barras, y más, de manera sencilla y eficiente en nuestra interfaz de usuario.

- **[Cypress](https://www.cypress.io)**: Framework de testing end-to-end usado para probar la aplicación en tiempo real y asegurar su correcto funcionamiento.

## Validación y Pruebas

### Back-end

Todos los controladores, servicios, configuraciones y demás componentes críticos del servidor se han validado con tests unitarios. El informe de cobertura está disponible en formato html, se puede encontrar en **[coverage/lcov-report](../coverage/lcov-report/index.html)** si se genera localmente, o accesible desde GitHub Actions.

Como ya se ha comentado en la parte de metodología, se han desarrollado scripts de configuración para pre-commit hooks y despliegue continuo mediante GitHub Actions en la infraestructura.

### Front-end

En cuanto al frontend, se han realizado pruebas End-to-End (E2E) utilizando **[Cypress](https://www.cypress.io/)**. Cypress es una herramienta moderna para pruebas automatizadas que permite simular la interacción real del usuario con la aplicación en un entorno controlado. Además, estos tests sirven como tests de integración al hacer uso del API expuesto por el back-end.

Los tests E2E se localizan en el directorio **[cypress/e2e](https://github.com/STW-24-25/Frontend/tree/main/cypress/e2e)**, separando los escenarios por funcionalidades principales (autenticación, foros, etc.).

**Escenarios cubiertos**:

- **Autenticación**: Verificación de los flujos de login y logout, comprobando la gestión de sesiones, mensajes de error y prueba de acceso a rutas protegidas.

- **Mercado**: Simulación de la búsqueda de productos, visualización de información detallada de cada producto, consulta de precios y uso del comparador de productos.

- **Foros**: Se valida la creación, edición y eliminación de mensajes por parte de los usuarios

- **Usuarios**: Se valida la creación de cuentas de usuario y la edición de información del perfil.

- **Administrador**: Se valida la navegación de las pantallas del dashboard del administrador, la creación, edición y eliminación de foros, la gestión de los últimos mensajes y las estadísticas del sistema.

Este enfoque garantiza que las funcionalidades críticas del frontend funcionan correctamente desde la perspectiva del usuario final, mejorando la robustez y fiabilidad de la aplicación.

## Mejoras implementadas

Respecto a los extras posibles propuestos en los criterios de evaluación del proyecto, se han implementado los siguientes:

- **Captcha**: El formulario de registro en el Front-end cuenta con validación de **[reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3?hl=es-419)**. Las principales razones para utilizar esta implementación en concreto son la facilidad de uso, modernidad y usabilidad para el usuario.

- **Login con sistemas externos**: Se ha implementado login con **[Google](https://developers.google.com/identity/protocols/oauth2?hl=es-419)** y **[GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)** mediante OAuth 2. El protocolo de comunicación implementado se puede encontrar, así como otros detalles del Front-end, en el **[README](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)** del repositorio Frontend.

- **Sistema de notificaciones**: Se han desarrollado alertas por SMS y correo electrónico mediante el servicio SNS de AWS. Los detalles de configuración se pueden encontrar en el **[fichero de documentación de SNS](https://github.com/STW-24-25/Backend/blob/main/doc/SNS_doc.md)**.

- **Validación E2E**: Como se ha comentado en la sección anterior, se han desarrollado tests para el fron-end mediante **[Cypress](https://www.cypress.io/)**.

- **Despliegue del sistema sobre infraestructura en cloud**: El sistema ha sido desplegado en AWS mediante grupos de autoescalado, balanceadores de carga y otros elementos de la infraestructura. Los detalles de la arquitectura así como su configuración se pueden encontrar en el **[fichero de documentación de infraestructura](https://github.com/STW-24-25/Backend/blob/main/doc/INFRA_doc.md)**.

- **Cobertura de código superior al 75% en back-end**: Como se ha comentado previamente, se han desarrollado un total de 378 tests en el backend, que alcanzan una cobertura del 98% en las secciones más relevantes del servidor (modelos, controladores, servicios, configuraciones, etc). El informe de cobertura está disponible en formato html, se puede encontrar en **[coverage/lcov-report](../coverage/lcov-report/index.html)** si se genera localmente, o accesible desde GitHub Actions.

- **Analizadores estáticos de código**: Tanto en el front-end como en el back-end se han integrado mediante GitHub Actions. Se utiliza **Prettier** como formateador y **ESLint** como linter. Estas herramientas se ejecutan automáticamente mediante **hooks pre-commit** (configurados con Husky) y como parte de los flujos de trabajo de **GitHub Actions**. Adicionalmente, **Dependabot** está configurado para la gestión automática de actualizaciones de dependencias.

- **Herramientas de CI/CD**: Como se ha comentado en diversos puntos anteriormente, se han configurado flujos de trabajo mediante GitHub Actions que, en el caso del backend, automatizan la ejecución de tests, análisis de código en la ramas `develop` y `main`. Además la rama `main` cuenta con un flujo de trabajo para despliegue automático a la infraestructura de AWS. Para el frontend, se intentó integrar Cypress para la automatización de tests E2E en el flujo de CI/CD, aunque esta integración no se completó con éxito.

## Valoración Global del Proyecto

- **Organización del trabajo:** La planificación y distribución de tareas dentro del equipo ha sido eficiente, con una asignación clara de responsabilidades. Las reuniones periódicas han facilitado una comunicación fluida y han permitido detectar y resolver problemas de forma temprana, favoreciendo así el avance constante del proyecto.

- **Elección de Astro:** Consideramos que Astro ha sido una elección acertada para este proyecto. Aunque presenta ciertas limitaciones respecto a la integración con React, como la complejidad en algunos componentes dinámicos, también ha simplificado aspectos importantes como el rendimiento inicial y la estructura del proyecto. Si hubiéramos optado por React puro, probablemente nos habríamos enfrentado a mayores desafíos técnicos, como la configuración del router, el manejo de sesiones o la optimización inicial del rendimiento.

- **Despliegue continuo del frontend:** Mientras que el backend ha contado con un proceso de despliegue continuo eficiente, el frontend no ha alcanzado el mismo nivel de automatización. Esto ha dificultado en algunos momentos la integración fluida de cambios y la validación continua de la interfaz. Establecer un flujo de CI/CD para el frontend hubiera mejorado significativamente la agilidad del desarrollo y la detección temprana de errores visuales o de usabilidad.

## Mejoras Propuestas

### Front-end

- **Optimización de rendimiento**: Analizar y optimizar el rendimiento del frontend. Aplicar técnicas como lazy loading de componentes y optimización de imágenes para mejorar los tiempos de carga.

- **Mejoras en la experiencia de usuario (UX)**: Refinar los flujos de interacción, añadir animaciones suaves y retroalimentación visual en acciones clave (por ejemplo, notificaciones de éxito/error, loaders durante peticiones asíncronas) para una experiencia más fluida.

- **Internacionalización (i18n)**: Implementar soporte multilenguaje en la interfaz, permitiendo a los usuarios seleccionar su idioma preferido. Esto se puede lograr integrando librerías como `react-i18next` y gestionando archivos de traducción para los diferentes idiomas objetivo.

- **Accesibilidad mejorada**: Mejorar la accesibilidad de la aplicación siguiendo las pautas WCAG. Incluir navegación por teclado y contraste adecuado para asegurar que la plataforma sea usable por personas con discapacidad.

- **Aumentar el numero de test**: Ampliar la cobertura de pruebas E2E para incluir más escenarios y casos de uso, asegurando que todas las funcionalidades críticas estén debidamente probadas. Esto incluye la validación de flujos alternativos y errores comunes que los usuarios puedan encontrar. El número de test realizado actualmente es correct, pero consideramos que se pueden añadir más pruebas para cubrir todos los casos de uso.

- **Medir la coberura de los tests**: Hemos intentado implementar la medición de la cobertura de los tests E2E, pero no hemos conseguido que funcione correctamente. La idea era utilizar la herramienta `cypress-io/code-coverage` para medir la cobertura de código de los tests E2E y generar informes que muestren qué partes del código están cubiertas por las pruebas. Esto ayudaría a identificar áreas que necesitan más atención y asegurará que el código crítico esté debidamente probado.

- **CI**: Configurar integración continua (CI) con GitHub Actions para el frontend, ejecutando automáticamente los tests E2E de Cypress en cada push o pull request. Esto asegura que las funcionalidades críticas se validan antes de integrar cambios, mejorando la calidad y robustez del código. Esta funcionalidad ha sido intentada durante mucho tiempo, pero no hemos conseguido que funcione correctamente. Se puede revisar el trabajo realizado en las Pull Requests de GitHub ( #76, #98 & #102).

- **Componentes reutilizables y diseño consistente**: Refactorizar componentes UI reutilizables, asegurando consistencia en toda la aplicación mediante un sistema de diseño unificado.

- **Integración de analítica**: Añadir herramientas de analítica (por ejemplo, Google Analytics) para monitorizar el uso de la aplicación y obtener métricas que permitan tomar decisiones informadas sobre futuras mejoras.
- **Mejoras en SEO (Search Engine Optimization)**: Implementar buenas prácticas de SEO para mejorar la visibilidad de la aplicación en motores de búsqueda. Esto incluye el uso adecuado de etiquetas HTML semánticas (<main>, <article>, <header>, etc.), la generación de metadatos dinámicos (títulos, descripciones, Open Graph), la creación de un sitemap XML, y la optimización de rutas amigables (URLs limpias y descriptivas). Además, aprovechar las capacidades de Astro para el renderizado estático puede contribuir significativamente al rendimiento y posicionamiento en buscadores. Este es un aspecto que nunca hemos trabajado en los proyectos prácticos de la universidad ni se nos ha enseñado en profundidad, pero que nos habría gustado explorar e implementar por su gran relevancia en aplicaciones reales.

### Back-end

- **Optimización de Consultas y Base de Datos**:

  - Revisar y optimizar las consultas a MongoDB, especialmente en los agregados y búsquedas complejas, para mejorar el rendimiento.
  - Analizar y añadir índices adicionales en la base de datos según los patrones de consulta más frecuentes para acelerar las lecturas.
  - Evaluar el uso de proyecciones en las consultas para devolver solo los campos necesarios, reduciendo la carga de datos transferida.

- **Mejoras en la Gestión de Errores y Logging**:

  - Implementar un sistema de manejo de errores más robusto y centralizado, con códigos de error estandarizados para facilitar la depuración y el monitoreo.
  - Enriquecer los logs con más contexto (por ejemplo, IDs de correlación) y considerar la integración con plataformas de gestión de logs centralizadas para un análisis más eficiente.

- **Refuerzo de la Seguridad**:

  - Implementar rate limiting en los endpoints de la API para prevenir abusos y ataques de denegación de servicio.
  - Revisar y fortalecer la validación y sanitización de todas las entradas del usuario para prevenir vulnerabilidades como XSS o NoSQL injection, complementando el uso actual de Zod.
  - Implementar cabeceras de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.) para mejorar la protección contra ataques comunes.

- **Mejoras en el Procesamiento Asíncrono**:

  - Para tareas de larga duración o que no requieren una respuesta inmediata (por ejemplo, generación de informes complejos o sincronizaciones masivas de datos), considerar el uso de colas de mensajes (como RabbitMQ o AWS SQS) en lugar de depender únicamente de `node-cron` para una mayor resiliencia y escalabilidad.

- **Ampliación de Pruebas**:
  - Incrementar la cobertura de las pruebas de integración para validar las interacciones entre diferentes módulos y servicios del backend.
  - Introducir pruebas de carga y estrés para identificar cuellos de botella y asegurar que la API puede manejar picos de demanda.

### Arquitectura cloud

- **Optimización de la infraestructura Multi-AZ**: La arquitectura actual implementa un modelo de alta disponibilidad con tres zonas de disponibilidad, lo cual constituye una base sólida. No obstante, podemos implementar mejoras significativas en la configuración de recuperación ante desastres. Proponemos la implementación de una estrategia de DR (Disaster Recovery) con un RTO (Recovery Time Objective) y RPO (Recovery Point Objective) claramente definidos. Estableceremos mecanismos de failover automatizados entre regiones mediante Route 53 con políticas de enrutamiento de conmutación por error, lo que permitirá mantener la continuidad operativa incluso ante la caída completa de una región.

- **Refinamiento de la estrategia de seguridad**: Observamos que los grupos de seguridad actuales permiten acceso SSH desde cualquier dirección IP (0.0.0.0/0), lo cual representa una vulnerabilidad significativa. Implementaremos un modelo de acceso basado en bastiones a través de VPN con autenticación multi-factor, restringiendo el acceso SSH únicamente a rangos de IP corporativos específicos. Adicionalmente, incorporaremos AWS Config y Security Hub para monitorización continua de cumplimiento y detección de configuraciones incorrectas en tiempo real.

- **Modernización de la arquitectura de aplicaciones**: La solución actual utiliza instancias EC2 tradicionales. Proponemos una evolución hacia una arquitectura de microservicios basada en contenedores mediante Amazon ECS o EKS, lo que facilitará la implementación de principios DevOps avanzados. Esta transición permitirá despliegues más granulares, escalado independiente de componentes y una utilización más eficiente de recursos computacionales. Complementaremos esta evolución con una estrategia de CI/CD robusta utilizando AWS CodePipeline para automatizar completamente el ciclo de vida de desarrollo.

- **Optimización de costes y recursos**: Identificamos oportunidades significativas para optimizar la eficiencia económica de la infraestructura. Implementaremos Savings Plans e instancias reservadas para los componentes con carga predecible, junto con instancias spot para cargas de trabajo tolerantes a fallos. Adicionalmente, estableceremos políticas de escalado predictivo basadas en patrones históricos de uso mediante AWS Auto Scaling, complementadas con AWS Compute Optimizer para recibir recomendaciones continuas sobre dimensionamiento óptimo de recursos.

- **Mejora en la gestión de datos y persistencia**: Aunque se utiliza MongoDB Atlas como servicio externo, podemos optimizar significativamente la arquitectura de datos. Implementaremos una capa de caché con Amazon ElastiCache para reducir la latencia en operaciones de lectura frecuentes. Adicionalmente, configuraremos mecanismos de replicación cross-region para los datos críticos, asegurando la disponibilidad incluso en escenarios de interrupción regional. Complementaremos estas mejoras con un diseño de particionamiento de datos optimizado para los patrones de acceso específicos de AgroNet.

- **Fortalecimiento del monitoreo y observabilidad**: Aunque la infraestructura actual incluye configuración básica de CloudWatch, implementaremos una estrategia integral de observabilidad utilizando AWS X-Ray para análisis distribuido de trazas, complementado con Amazon Managed Grafana para visualización avanzada de métricas. Configuraremos alarmas predictivas basadas en detección de anomalías y estableceremos dashboards operativos que proporcionen visibilidad completa sobre el estado del sistema. Esta mejora permitirá identificar proactivamente cuellos de botella y resolver problemas antes de que impacten a los usuarios.

- **Mejoras en escalabilidad y elasticidad**: Si bien la arquitectura actual implementa Auto Scaling Groups (ASG) con políticas básicas de escalado, refinaremos este aspecto con políticas de escalado predictivo, permitiendo que la infraestructura se prepare automáticamente para picos de demanda anticipados. Implementaremos también escalado basado en métricas personalizadas relevantes para el dominio de AgroNet, superando las limitaciones del escalado basado únicamente en uso de CPU. Esta aproximación permitirá una respuesta más precisa a las variaciones reales de carga de trabajo.

- **Optimización de networking y latencia**: La configuración de red actual puede optimizarse implementando AWS Global Accelerator para reducir la latencia de acceso desde ubicaciones geográficamente dispersas. Adicionalmente, implementaremos una estrategia de CDN mediante Amazon CloudFront para contenido estático, reduciendo la carga en los servidores de aplicación y mejorando los tiempos de respuesta para los usuarios finales. Estas mejoras tendrán un impacto significativo en la experiencia de usuario, especialmente en regiones con conectividad limitada.

- **Implementación de DevSecOps avanzado**: Integraremos prácticas avanzadas de DevSecOps implementando escaneo de vulnerabilidades automatizado mediante Amazon Inspector y revisión de configuraciones con AWS Config. Adicionalmente, estableceremos un pipeline de CI/CD que incluya análisis estático de código, pruebas de penetración automatizadas y validación de cumplimiento normativo antes de cada despliegue. Esta aproximación garantizará que la seguridad sea un componente integral del proceso de desarrollo, no una consideración posterior.

- **Evolución hacia un modelo Infrastructure-as-Code avanzado**: Aunque la infraestructura actual se define mediante CloudFormation, evolucionaremos hacia un modelo más avanzado utilizando herramientas como AWS CDK (Cloud Development Kit), que permitirá definir la infraestructura usando lenguajes de programación tipados. Esta actualización facilitará la implementación de patrones de infraestructura complejos, mejorará la reutilización de componentes y simplificará el testing de la infraestructura mediante pruebas unitarias, incrementando la calidad y confiabilidad de los despliegues.

- **Utilizar Amazon SES para Notificaciones por Email**: Implementar Amazon SES (Simple Email Service) para el envío de notificaciones por correo electrónico en lugar de Amazon SNS. Esto habilitará el uso de contenido HTML en los correos, mejorando la personalización, la presentación y la experiencia del usuario.
