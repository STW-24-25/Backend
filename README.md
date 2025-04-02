# Backend

REST API documentation is in `/api/docs`.

## Primary dependencies

- NodeJS v22.14.0
- npm v11.1.0

## Some homemade libraries used

- **agro-precios** = https://github.com/carloss4dv/agro-precios
- **nasa-power-for-agriculture-spain** = https://github.com/carloss4dv/nasa-power-for-agriculture-spain
- **aemet_api_wrapper_unofficial** = https://github.com/carloss4dv/aemet_api_wrapper_unofficial
- **sigpac-client** = https://github.com/dan96ct/sigpac-client

## Testing

Los tests utilizan MongoDB Memory Server para crear una base de datos en memoria durante la ejecución de pruebas. Esto permite que los tests se ejecuten de forma aislada sin afectar a la base de datos de producción.

Para ejecutar los tests:

```bash
npm test
```

Para ejecutar los tests con cobertura:

```bash
npm run test:coverage
```

### Nota para CI/CD

Los tests en entornos de CI/CD (GitHub Actions) pueden requerir la instalación de `libssl1.1` para que MongoDB Memory Server funcione correctamente. Esto ya está configurado en los archivos de workflow.
