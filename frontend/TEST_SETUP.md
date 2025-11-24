# Frontend Test Setup Instructions

This document describes the test infrastructure needed to run the dashboard statistics bug detection test.

## Bug Description

The dashboard component (`src/routes/_authenticated.dashboard.tsx`) currently displays hardcoded statistics instead of fetching real-time data from the backend API. The test file `src/routes/_authenticated.dashboard.test.tsx` is designed to detect this bug.

## Required Dependencies

To run the tests, you need to install the following npm packages:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

## Test Execution

Once dependencies are installed, run the tests with:

```bash
# run all tests
npm test

# run tests in watch mode
npm test -- --watch

# run specific test file
npm test -- dashboard.test.tsx
```

## Configuration Files

The following files have been created for test infrastructure:

1. **vitest.config.ts** - Vitest configuration with jsdom environment and path aliases
2. **src/test/setup.ts** - Test setup file that configures jest-dom matchers and cleanup
3. **src/routes/_authenticated.dashboard.test.tsx** - The actual test file detecting the bug

## Expected Test Results

### Current Behavior (Bug Present)

With the current implementation where statistics are hardcoded, the tests will **FAIL** with errors like:

```
✗ should fetch and display real-time statistics from API instead of hardcoded values
  Expected axios.get to have been called, but it was not called

✗ should NOT display hardcoded statistics when component mounts
  Expected element with text '24' not to be in the document, but it was found
```

### After Bug Fix

Once the dashboard is fixed to fetch statistics from the API, the tests should **PASS**, confirming:
- API calls are made to `/api/jobs` endpoint
- Statistics display values from API response
- Hardcoded values are no longer present
- Component updates when API returns new data
- Errors are handled gracefully without falling back to hardcoded values

## Test Coverage

The test suite covers:

1. **API Integration**: Verifies that the component makes HTTP requests to the backend API
2. **Dynamic Data Display**: Ensures displayed statistics match API response data
3. **No Hardcoded Values**: Confirms that hardcoded values (24, 156, 2.4h, 8.2K) are not rendered
4. **Data Updates**: Tests that statistics update when API returns different values
5. **Error Handling**: Validates graceful handling of API failures without showing hardcoded fallbacks

## Package.json Changes Needed

Add to the `scripts` section:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Notes

- The test uses mocked axios calls to simulate backend API responses
- Tests are isolated and do not require a running backend server
- The test file is co-located with the component being tested for easy maintenance
