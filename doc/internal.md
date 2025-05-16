# Internal Guidelines

This document contains guidelines for coding, documentation, and continuous integration in the project.

## Project Workflow

### General

- Use git flow for branching and merging.
- Use pull requests for code reviews.
- Use GitHub projects for tracking issues and features, keep it updated.
- Use GitHub Actions for CI/CD.

### CI/CD Best Practices

- All pull requests must pass automated tests before merging.
- Each feature branch should include appropriate unit and integration tests.
- Code coverage should not decrease with new changes.
- Static code analysis tools must be run before merging.
- Deployments to production should only happen from the main branch.
- Use proper versioning with semantic versioning (semver).
- Maintain a detailed changelog for all releases.

### Testing Strategy

- Unit tests should cover at least 80% of the codebase.
- Integration tests must be run in an isolated environment.
- Mock external dependencies in tests.
- Test database interactions using MongoDB Memory Server.
- Tests should not depend on each other and must clean up after themselves.

## General Coding Guidelines

### General

- Use `const` or `let`, **no** `var`.
- Follow the structure already in place in the project (controllers, models, routes, common utils, etc).
- Request validation should be done in the routes file, using the middleware provided.
- Use `async/await` instead of `.then()`.
- Use `import` and `export` instead of `require` and `module.exports`.
- Use arrow functions `() => {}` instead of `function() {}`.
- Use `===` instead of `==`.
- Stick to the types, don't use `any` unless absolutely necessary.
- Use `interface` for defining types, `type` for defining unions and intersections.
- Use the logger from `common/utils/logger` to log messages **only**, no `console.log`.

### Commit Conventions

- Use conventional commits format: `<type>(<scope>): <description>`
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
- Scope is optional and should be the module or area affected (e.g. users, products, db)
- Descriptions should be concise and in present tense
- Begin descriptions with lowercase
- No period at the end of the description
- Keep commits atomic and focused on a single change
- Include issue number in description if applicable (e.g. `fix(auth): resolve login error #123`)
- Examples:
  - `feat(products): add price history endpoint`
  - `fix(users): correct password reset validation`
  - `docs(readme): update installation instructions`
  - `test(auth): add tests for token refresh`

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
- Keep line length under 100 characters when possible.
- Keep 2 lines between top level declarations.

## Documentation Guidelines

### General

- Use JSdoc for documenting functions, keep it updated.

### Swagger

- Define data model schema in model file, as well as enums and other types.
- Define request schemas in middleware/validator files, with their corresponding zod object.
- Define endpoints in routes files.
- Follow Swagger OpenAPI 3.0 specification.

## Continuous Integration Workflows

- _PR Validation_: All PRs must go through automated code validation.
- _Main Protection_: The main branch is protected and requires passing CI checks before merging.
- _Automated Testing_: Tests run automatically on pull requests and merges to main.
- _Code Quality_: Static code analysis runs on all PRs to ensure code quality.
- _Deployment_: Automatic deployment to staging environments on merges to development branch.
- _Security Scanning_: Dependency and security scanning is performed on a schedule.

## Release Process

1. Update version number in package.json according to semver.
2. Update changelog with details of the release.
3. Create a release PR from development to main.
4. Once approved and merged, tag the release in Git.
5. The CI/CD pipeline will automatically deploy to production.
