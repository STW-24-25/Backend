<p align="center">
  <img src="../images/favicon.svg" height="150">
</p>

<h1 align="center">Arquitectura AgroNet en AWS (2025)</h1>

La arquitectura implementada para AgroNet 2025 se basa en un enfoque multicapa con alta disponibilidad distribuida en tres zonas de disponibilidad en la región eu-north-1 de Europa Norte, siguiendo las directrices detalladas en nuestro README de Infraestructura.

Optamos por utilizar instancias EC2 en lugar de contenedores principalmente porque son compatibles con el plan gratuito de AWS, lo que reduce significativamente los costos operativos. Además, durante las pruebas identificamos problemas persistentes con Docker Proxy en NLB donde los destinos se marcaban incorrectamente como unhealthy a pesar de tener una configuración correcta de healthcheck en el Dockerfile, como se documenta en el README de Solución de Problemas.

La infraestructura de computación se estructura en tres Auto Scaling Groups independientes, uno por cada zona de disponibilidad. Estos grupos se configuran con métricas basadas en CPU, estableciendo un umbral del 70% para escalar hacia fuera y del 30% para reducir la capacidad, siguiendo las recomendaciones del README de Escalabilidad. Se implementaron períodos de enfriamiento de 300 segundos para evitar fluctuaciones rápidas y mantener una capacidad deseada de 2 instancias por zona.

Para la distribución de carga utilizamos Network Load Balancers con Target Groups específicos, configurando health checks adaptados a la aplicación frontend, como se explica en el README de Balanceo de Carga. El sistema implementa una referencia dinámica al NLB correspondiente según la zona de disponibilidad donde se despliega cada instancia.

Para las notificaciones y alertas del sistema, implementamos Amazon SNS (Simple Notification Service) que permite enviar mensajes de alerta cuando ocurren eventos críticos en la infraestructura, como se detalla en el README de Notificaciones. Estas alertas se integran con las alarmas de CloudWatch para notificar automáticamente sobre problemas de rendimiento, fallos en los health checks o cambios en el estado de las instancias.

En cuanto a seguridad, aplicamos roles IAM con privilegio mínimo que solo otorgan acceso específico a los servicios necesarios como S3 (solo lectura), CloudWatch Logs, Systems Manager y Secrets Manage. Las credenciales sensibles como tokens de GitHub se gestionan a través de Secrets Manager y se almacenan temporalmente en archivos con permisos restrictivos en /etc/frontend-secure. Además, creamos un usuario específico frontend-app con privilegios limitados para ejecutar la aplicación.

Para el almacenamiento de imágenes, configuramos un bucket S3 dedicado "agronet-images" con endpoints VPC específicos que optimizan la conectividad, como se detalla en el README de Almacenamiento. La implementación incluye una configuración personalizada del AWS SDK para utilizar estos endpoints eficientemente mediante variables de entorno como AWS_SDK_LOAD_CONFIG=1.

El proceso de despliegue de la aplicación sigue un flujo bien definido que incluye la instalación de dependencias, clonación segura desde GitHub utilizando tokens, configuración dinámica según la zona de disponibilidad, y finalmente la construcción y despliegue como un servicio systemd, todo documentado en el README de Despliegue. Este servicio se configura con límites de recursos y parámetros de seguridad como NoNewPrivileges y ProtectSystem para garantizar la integridad del sistema.

La monitorización se realiza mediante alarmas de CloudWatch para métricas de CPU, logs centralizados con Journald y un script de diagnóstico check-astro para facilitar la revisión del estado del servicio, como se explica en el README de Monitorización. Las políticas de ajuste automático responden a los umbrales configurables para mantener el rendimiento óptimo, enviando notificaciones a través de SNS cuando se activan.

Esta arquitectura logra un equilibrio efectivo entre costes operativos, escalabilidad y alta disponibilidad para el frontend de AgroNet 2025, evitando los problemas identificados con contenedores mientras optimiza el acceso a servicios esenciales como S3 para el almacenamiento de imágenes de la aplicación, tal como se resume en nuestro README principal.
