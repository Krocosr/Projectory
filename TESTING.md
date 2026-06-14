# Testing Guide

## Overview

Deadliner now has a comprehensive testing setup with:
- **Vitest** for unit and component tests
- **React Testing Library** for component testing
- **Playwright** for E2E tests

## Running Tests

```bash
# Unit and component tests
npm test                  # Run once
npm run test:watch        # Watch mode
npm run test:ui           # Interactive UI
npm run test:coverage     # With coverage report

# E2E tests
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:headed   # See browser
```

## Test Coverage

### Unit Tests (38 tests)

**src/__tests__/storage.test.js** (13 tests)
- `recalculateProject()` - progress calculation, todo counts, focus/next step
- `createTodo()` - todo creation with defaults and validation
- `createTimelineEntry()` - timeline entry generation

**src/__tests__/dateUtils.test.js** (14 tests)
- `formatDeadlineForDisplay()` - date formatting for display
- `formatRelativeTime()` - relative time strings (e.g., "2h ago")
- `formatDeadlineRemaining()` - deadline countdown with tiered units

**src/__tests__/Button.test.jsx** (11 tests)
- Rendering and click handlers
- Disabled state
- Variant styles (gradient, secondary, icon, ghost)
- Forward refs and custom props

### E2E Tests (dashboard.spec.js)

- Dashboard loading and empty state
- Project creation workflow
- Filtering by status (Active, Finished, etc.)
- Search functionality
- Project detail view navigation
- Todo management (add, toggle done)
- Dark mode toggle
- Keyboard shortcuts (n for new, / for search)
- Export/import
- Project sorting
- Tab navigation (Overview, Todos, Workspace, Timeline, Settings)

## Writing New Tests

### Unit Test Template

```javascript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '@/lib/yourModule';

describe('yourModule.js', () => {
  describe('yourFunction', () => {
    it('should do something', () => {
      const result = yourFunction('input');
      expect(result).toBe('expected');
    });
  });
});
```

### Component Test Template

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourComponent from '@/components/YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<YourComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### E2E Test Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await page.getByRole('button', { name: /click me/i }).click();
    await expect(page.getByText('Result')).toBeVisible();
  });
});
```

## Test Utilities

### Mocks (vitest.setup.js)

Pre-configured mocks for:
- `next/navigation` (useRouter, useSearchParams)
- `next/dynamic`
- `localStorage`
- `IndexedDB`
- `window.matchMedia` (for dark mode)
- `IntersectionObserver`
- `ResizeObserver`

### Path Alias

Use `@/` to import from `src/`:
```javascript
import { loadProjects } from '@/lib/storage';
import Button from '@/components/ui/Button';
```

## CI Integration

Tests run automatically on push/PR via GitHub Actions:
1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. (TODO: Add `npm test` to CI workflow)

## Next Steps

**High Priority:**
- Add tests for remaining components (Toast, ConfirmModal, ProjectCard, etc.)
- Add tests for API routes
- Add integration tests for storage sync flow
- Add accessibility tests with @axe-core/playwright
- Add visual regression tests with Playwright
- Integrate test step into CI workflow

**Coverage Goals:**
- Unit: 80%+ coverage for lib/ utilities
- Component: All UI components in components/ui/
- Integration: Critical user flows (create → edit → archive)
- E2E: Happy paths for all major features

## Troubleshooting

**"Playwright Test did not expect test.describe()"**
- Use `npx vitest run` for unit tests
- Use `npx playwright test` for E2E tests
- Or use the npm scripts which set the correct runner

**Tests timing out**
- Increase timeout in playwright.config.js
- Check if dev server is running for E2E tests

**localStorage/IndexedDB errors**
- Mocks are set up in vitest.setup.js
- Make sure setupFiles is loaded in vitest.config.js
