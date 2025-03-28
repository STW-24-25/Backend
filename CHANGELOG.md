# Changelog

All notable changes to the AgroNET API project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Continuous Integration setup with GitHub Actions
- Automated testing workflow
- Security scanning workflow
- Automated deployment to staging and production
- Code quality checks in CI pipeline
- Complete implementation of agricultural parcels module:
  - Parcel model with geospatial information
  - Parcel management service with SIGPAC integration
  - AEMET weather API integration for climate data
  - Endpoint to retrieve parcels by geographic coordinates
  - Support for different crop types and parcel sizes
  - Automatic mapping of provinces to Autonomous Communities

### Changed

- Updated internal documentation with CI/CD best practices
- Improved test cleanup to ensure database is cleared between tests
- Refactorizado el controlador de usuario para usar el servicio de usuario en lugar de conectarse directamente a la base de datos
- Documentación completa de los endpoints de usuario siguiendo estándares JSDoc
- Actualizados los tests del controlador de usuario para trabajar con la nueva estructura

### Fixed

- Corregidos los errores de tipado en el controlador de usuario
- Mejorado el manejo de errores en los controladores
- Fixed province to Autonomous Community mapping in parcel service

## [1.0.0] - YYYY-MM-DD

### Added

- Initial release of the AgroNET API
- User authentication and management
- Core functionality for agricultural data management
- RESTful API endpoints for all main features
