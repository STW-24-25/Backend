# Internal guidelines

This document contains guidelines for coding and documentation in the project.

## Project workflow

### General

- Use git flow for branching and merging.
- Use pull requests for code reviews.
- Use github projects for tracking issues and features, keep it updated.
- Use github actions for CI/CD.

## General coding guidelines

### General

- Use `const` or `let`, __no__ `var`.
- Follow the structure already in place in the project (controllers, models, routes, common utils, etc).
- Request validation should be done in the routes file, using the middleware provided.
- Use `async/await` instead of `.then()`.
- Use `import` and `export` instead of `require` and `module.exports`.
- Use arrow functions `() => {}` instead of `function() {}`.
- Use `===` instead of `==`.
- Stick to the types, don't use `any` unless absolutely necessary.
- Use `interface` for defining types, `type` for defining unions and intersections.
- Use the logger from `common/utils/logger` to log messages __only__, no `console.log`.

### Formatting

- Use prettier for formatting.
- Use eslint for linting.
- Use 2 spaces for indentation.
- Use single quotes for strings.
- Use semicolons.
- Use trailing commas.
- Use camelCase for variables and functions.
- Use PascalCase for classes, types and interfaces.
- Use UPPERCASE for constants.
- Keep line lengh under 100 characters when possible.
- Keep 2 likes between top level declarations.

## Documentation guidelines

### General

- Use JSdoc for documenting functions, keep it updated.

### Swagger

- Define data model schema in model file, as well as enums and other types.
- Define request schemas in middleware/validator files, with their corresponding zod object.
- Define endpoints in routes files.
- Follow Swagger OpenAPI 3.0 specification.
