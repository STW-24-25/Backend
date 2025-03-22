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

- Use `const` or `let` no `var`.
- Follow the structure already in place in the project (controllers, models, routes, common utils, etc).
- Use `async/await` instead of `.then()`.
- Use `import` and `export` instead of `require` and `module.exports`.
- Use arrow functions `() => {}` instead of `function() {}`.

### Typescript

- Use typescript __everywhere__, including tests and types in external libraries.
- Stick to the types, don't use `any` unless absolutely necessary.
- Use `interface` for defining types, `type` for defining unions and intersections.
- Use the logger from `common/utils/logger` to log messages __only__, no `console.log`.

### Formatting

- Use prettier for formatting.
- Use eslint for linting.
- Use 2 spaces for indentation.

## Documentation guidelines

### General

- Use JSdoc for documenting functions, keep it updated.

### Swagger

- Define schema in model file.
- Add endpoint documentation in routes file.
