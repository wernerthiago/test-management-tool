# Contributing to Test Management Tool

Thank you for your interest in contributing to the Test Management Tool! This document provides guidelines and instructions for contributing to the project.

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
- pnpm 8.x or higher
- MySQL 8.0 or higher
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
   # Edit .env with your local configuration
   ```

6. **Set up the database**:
   ```bash
   pnpm db:push
   ```

7. **Start the development server**:
   ```bash
   pnpm dev
   ```

8. **Access the application** at http://localhost:3000

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
3. Ensure all existing tests pass: `pnpm test` (when tests are added)
4. Add tests for new functionality
5. Update documentation as needed

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

3. **Fill out the PR template** with:
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
- **Line length**: Maximum 100 characters
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
- Use migrations for schema changes
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

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

- Write tests for all new features
- Update tests when modifying existing features
- Aim for high test coverage (>80%)
- Test edge cases and error conditions

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
3. Ask in [GitHub Discussions](https://github.com/wernerthiago/test-management-tool/discussions)
4. Reach out to maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to Test Management Tool! 🎉

