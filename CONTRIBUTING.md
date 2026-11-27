# Contributing to QualityLoom

Thank you for your interest in contributing to QualityLoom! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- pnpm, via Corepack (`corepack enable`); the version is pinned in `package.json`
- MySQL 8.0 or higher (or Docker, to run it with `docker-compose up -d db`)
- Git

### Local Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/test-management-tool.git
   cd test-management-tool
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/wernerthiago/test-management-tool.git
   ```

4. **Install dependencies**:
   ```bash
   pnpm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # The defaults match the MySQL service in docker-compose.yml
   ```

6. **Start MySQL**:
   ```bash
   docker-compose up -d db
   ```

7. **Start the development server** (it applies database migrations on start):
   ```bash
   pnpm dev
   ```

8. **Open http://localhost:3000** and sign in as `admin` / `admin`. You are asked to choose a new password at first login.

## Development Workflow

### Creating a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### Making Changes

1. Make your changes in your feature branch
2. Test your changes thoroughly
3. Ensure type checking and the E2E suite pass: `pnpm check` and `pnpm test:e2e` (see [Testing](#testing))
4. Add tests for new functionality
5. Format your changes: `pnpm format`
6. Update documentation as needed

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] All tests pass
- [ ] New code has appropriate test coverage
- [ ] Documentation has been updated
- [ ] Commit messages follow the convention
- [ ] No merge conflicts with main branch

### Submitting a Pull Request

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub from your fork to the main repository

3. **Describe the PR** with:
   - Clear description of changes
   - Related issue numbers (if applicable)
   - Screenshots (for UI changes)
   - Testing steps

4. **Wait for review** - maintainers will review your PR and may request changes

5. **Address feedback** - make requested changes and push updates

6. **Merge** - once approved, a maintainer will merge your PR

### PR Title Format

```
type(scope): brief description

Examples:
feat(test-cases): add bulk delete functionality
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Line length**: 80 characters (enforced by Prettier, `.prettierrc`)
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for components and classes
  - `UPPER_SNAKE_CASE` for constants
  - Prefix interfaces with `I` only when necessary

### React Components

- Use functional components with hooks
- One component per file
- Use TypeScript for props typing
- Keep components focused and small
- Extract reusable logic into custom hooks

Example:
```typescript
interface TestCaseProps {
  id: string;
  title: string;
  onUpdate: (id: string) => void;
}

export function TestCase({ id, title, onUpdate }: TestCaseProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Backend Code

- Use async/await instead of callbacks
- Handle errors properly with try/catch
- Use middleware for common functionality
- Validate all user inputs
- Use parameterized queries (Drizzle ORM handles this)

### Database

- Use Drizzle ORM for all database operations
- Never write raw SQL unless absolutely necessary
- Change the schema in `drizzle/schema.ts`, then run `pnpm db:push` to generate a migration in `drizzle/` and apply it locally. Commit the generated SQL and `drizzle/meta/` files together with the schema change
- Never edit a migration that has already been released; add a new one instead (the app applies pending migrations at startup)
- Add indexes for frequently queried fields

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(analytics): add custom field distribution widget

- Add new widget type for custom field analysis
- Implement data fetching from analytics endpoint
- Add download functionality for widget data

Closes #123
```

```
fix(auth): prevent duplicate email registration

Adds validation to check for existing email before creating user account.

Fixes #456
```

## Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported in [Issues](https://github.com/wernerthiago/test-management-tool/issues)
2. Try to reproduce the bug with the latest version
3. Gather relevant information (browser, OS, error messages, screenshots)

### Bug Report Template

When creating a bug report, include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Numbered steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Screenshots**: If applicable
- **Environment**:
  - OS: [e.g., Ubuntu 22.04]
  - Browser: [e.g., Chrome 120]
  - Node version: [e.g., 22.0.0]
  - Application version: [e.g., 1.2.0]
- **Additional Context**: Any other relevant information

## Suggesting Features

### Before Suggesting

1. Check if the feature has already been suggested
2. Consider if it aligns with the project's goals
3. Think about how it would benefit other users

### Feature Request Template

When suggesting a feature, include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives Considered**: Other approaches you've thought about
- **Additional Context**: Mockups, examples, or references
- **Willingness to Contribute**: Are you willing to implement this?

## Testing

### Running Tests

The test suite is end-to-end (Playwright). It needs MySQL running (`docker-compose up -d db`); it creates and drops its own database and starts the app itself, so stop `pnpm dev` first (or run with `PW_WORKER_INDEX=10` to use port 3010).

```bash
# Type checking
pnpm check

# One-time browser install
npx playwright install --with-deps chromium

# Run the whole E2E suite
pnpm test:e2e

# Run one spec file, or tests matching a name
pnpm test:e2e tests/e2e/admin.spec.ts
pnpm test:e2e -g "should delete a user"
```

See [tests/README.md](tests/README.md) for details.

### Writing Tests

Follow the conventions in [.github/instructions/test.instructions.md](.github/instructions/test.instructions.md):

- One spec file per feature, in `tests/e2e/`
- Page Object Model: locators and page helpers live in `tests/e2e/pages/`, never in spec files
- Tests are independent and atomic (one behavior per test) and create and delete their own data (helpers in `tests/e2e/testUtils.ts`)
- Add `data-testid` attributes to the application when a stable locator is needed
- Document new tests in `tests/e2e/TEST_COVERAGE.md`

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex logic with inline comments
- Keep comments up-to-date with code changes

### User Documentation

- Update README.md for user-facing changes
- Update relevant guides in the `docs/` folder
- Add examples for new features

## Questions?

If you have questions about contributing:

1. Check the [documentation](docs/)
2. Search existing [Issues](https://github.com/wernerthiago/test-management-tool/issues)
3. Open an issue with your question

## Recognition

Contributors are recognized in:
- Release notes for significant contributions
- The GitHub contributors page

Thank you for contributing to QualityLoom! 🎉

