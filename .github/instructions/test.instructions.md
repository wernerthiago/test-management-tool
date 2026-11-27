---
applyTo: 'tests/e2e/**'
---
# Test Case Maintenance and Creation Guidelines

- Every feature must have its spec file. No multiple spec files.
- The tests must follow DRY principle.
- IF the test needs test data, it needs to create and delete it at teardown.
- All tests must be independent.
- All tests must be atomic.
- On behavior per test.
- IF the test needs a better locator, feel free to add data-testid in the application layer.
- The tests use Page Object Model design pattern. All auxiliary methods of a page must be located in the page. All locators of a page must be located in the page.
- All relevant best practices for Playwright must be followed.

# Documentation

- The test coverage must be maintained in the TEST_COVERAGE.md file.
- All new features must be documented in the TEST_COVERAGE.md file.
- NEVER create a new documentation file without user's consent.
- IF something changes in the test execution process, it must be updated in the README.md file.