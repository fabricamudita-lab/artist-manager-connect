# E2E Testing Suite

Comprehensive end-to-end testing suite for the Artist Management Platform with role-based testing and regression detection.

## Quick Start

```bash
# Install Playwright browsers
npm run test:install

# Run all tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

## Test Coverage

- **Dashboard**: Load, navigation, role-specific content
- **Projects**: CRUD operations, permissions by role
- **Contacts**: Create, edit, delete, export, share
- **Budgets**: Create, edit, export, templates
- **Bookings**: CRUD, calendar/kanban views, drag & drop
- **EPKs**: Create, edit, media upload, preview, share

## Test Users

- `owner@demo.com` - Full workspace access
- `team_manager@demo.com` - Team and project management
- `artist_manager@demo.com` - Rita Payés management
- `artist_observer@demo.com` - Rita Payés observer
- `booking_editor@demo.com` - Gira 2025 project editor
- `marketing_viewer@demo.com` - Campaña PR project viewer

## Reports

After running tests, find reports at:
- **HTML Report**: `test-results/reports/test-report.html`
- **JSON Report**: `test-results/reports/test-report.json`
- **Failures CSV**: `test-results/reports/failures.csv`
- **Coverage Matrix**: Role × Module × Action coverage
- **Screenshots**: Captured on failures for debugging

## Architecture

- **Page Objects**: Modular page representations
- **Fixtures**: Authentication and user management
- **Coverage Tracker**: Real-time test coverage monitoring
- **Test Data**: Reusable test data with unique generation
- **Multi-role Testing**: Comprehensive permission testing