# Husky Git Hooks Configuration

This directory contains Git hooks used to enforce coding standards and Git Flow workflow throughout the project.

## Git Flow Workflow

We use Git Flow for branching and merging. The hooks in this directory help enforce these standards:

### Branch Types

- `main/master` - Production code
- `develop` - Development branch
- `feature/*` - For new features
- `bugfix/*` - For bug fixes
- `hotfix/*` - For urgent fixes to production
- `release/*` - For preparing new releases

### Hook Functions

| Hook                 | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `pre-commit`         | Runs linters and unit tests on staged files                       |
| `commit-msg`         | Validates commit message format                                   |
| `pre-push`           | Runs all tests, checks code coverage, and validates branch naming |
| `post-merge`         | Reminds to run npm install when dependencies change               |
| `post-checkout`      | Provides Git Flow guidance when checking out branches             |
| `prepare-commit-msg` | Auto-prefixes commit messages based on branch type                |

## Commit Message Format

We follow the Conventional Commits specification:

```
<type>(<scope>): <description>
```

- `type`: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
- `scope`: Optional module/component name
- `description`: Concise description of the change

Examples:

- `feat(auth): add login endpoint`
- `fix(users): correct password reset validation`
- `docs(readme): update installation instructions`

## Custom Git Flow Commands

If you have the git-flow extension installed, you can use commands like:

- `git flow feature start feature_name`
- `git flow feature finish feature_name`
- `git flow hotfix start hotfix_name`

If you don't have git-flow installed, our hooks will help guide you through the correct workflow.
