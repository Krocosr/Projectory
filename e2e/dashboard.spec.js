import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Deadliner/);
    await expect(page.locator('h1')).toContainText('Projects');
  });

  test('should display empty state when no projects', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Create your first project')).toBeVisible();
  });

  test('should open new project modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /new project/i }).click();
    await expect(page.getByRole('heading', { name: /new project/i })).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/');
    
    // Click New Project button
    await page.getByRole('button', { name: /new project/i }).click();
    
    // Fill form
    await page.getByLabel(/project title/i).fill('Test Project');
    await page.getByLabel(/goal/i).fill('Complete testing');
    await page.getByLabel(/description/i).fill('E2E test project');
    
    // Submit
    await page.getByRole('button', { name: /create project/i }).click();
    
    // Verify project appears
    await expect(page.getByText('Test Project')).toBeVisible();
  });

  test('should filter projects by status', async ({ page }) => {
    await page.goto('/');
    
    // Create a project first
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Active Project');
    await page.getByRole('button', { name: /create project/i }).click();
    
    // Click on Active filter
    await page.getByRole('tab', { name: /active/i }).click();
    await expect(page.getByText('Active Project')).toBeVisible();
    
    // Click on Finished filter
    await page.getByRole('tab', { name: /finished/i }).click();
    await expect(page.getByText(/no finished projects/i)).toBeVisible();
  });

  test('should search projects', async ({ page }) => {
    await page.goto('/');
    
    // Create two projects
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('First Project');
    await page.getByRole('button', { name: /create project/i }).click();
    
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Second Project');
    await page.getByRole('button', { name: /create project/i }).click();
    
    // Search for "First"
    const searchInput = page.getByPlaceholder(/search projects/i);
    await searchInput.fill('First');
    
    await expect(page.getByText('First Project')).toBeVisible();
    await expect(page.getByText('Second Project')).not.toBeVisible();
  });

  test('should open project detail view', async ({ page }) => {
    await page.goto('/');
    
    // Create a project
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Detail Test');
    await page.getByRole('button', { name: /create project/i }).click();
    
    // Click on project card
    await page.getByText('Detail Test').click();
    
    // Verify detail view opened
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /todos/i })).toBeVisible();
  });

  test('should add a todo in detail view', async ({ page }) => {
    await page.goto('/');
    
    // Create and open project
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Todo Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByText('Todo Test').click();
    
    // Add a todo
    await page.getByPlaceholder(/add a new task/i).fill('Test task');
    await page.getByPlaceholder(/add a new task/i).press('Enter');
    
    // Verify todo appears
    await expect(page.getByText('Test task')).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Check initial theme
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('class');
    
    // Toggle dark mode
    await page.getByRole('button', { name: /toggle dark mode/i }).click();
    
    // Verify theme changed
    const newTheme = await html.getAttribute('class');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should use keyboard shortcut for new project', async ({ page }) => {
    await page.goto('/');
    
    // Press 'n' key
    await page.keyboard.press('n');
    
    // Verify modal opened
    await expect(page.getByRole('heading', { name: /new project/i })).toBeVisible();
  });

  test('should export projects', async ({ page }) => {
    await page.goto('/');
    
    // Create a project
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Export Test');
    await page.getByRole('button', { name: /create project/i }).click();
    
    // Listen for download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /export/i }).click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('projectory-backup');
  });

  test('should sort projects', async ({ page }) => {
    await page.goto('/');
    
    // Create multiple projects
    const projects = ['Alpha', 'Zulu', 'Beta'];
    for (const name of projects) {
      await page.getByRole('button', { name: /new project/i }).click();
      await page.getByLabel(/project title/i).fill(name);
      await page.getByRole('button', { name: /create project/i }).click();
      await page.waitForTimeout(100); // Small delay to ensure different lastWorked times
    }
    
    // Change sort to alphabetical
    await page.locator('select[aria-label*="Sort"]').selectOption('title');
    
    // Verify order
    const projectCards = page.locator('[role="button"]').filter({ hasText: /Alpha|Zulu|Beta/ });
    await expect(projectCards.first()).toContainText('Alpha');
  });

  test('should mark todo as done', async ({ page }) => {
    await page.goto('/');
    
    // Create project and todo
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Done Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByText('Done Test').click();
    
    await page.getByPlaceholder(/add a new task/i).fill('Complete me');
    await page.getByPlaceholder(/add a new task/i).press('Enter');
    
    // Click checkbox
    await page.getByRole('checkbox', { name: /complete me/i }).click();
    
    // Verify checked
    await expect(page.getByRole('checkbox', { name: /complete me/i })).toBeChecked();
  });

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/');
    
    // Create and open project
    await page.getByRole('button', { name: /new project/i }).click();
    await page.getByLabel(/project title/i).fill('Tab Test');
    await page.getByRole('button', { name: /create project/i }).click();
    await page.getByText('Tab Test').click();
    
    // Navigate through tabs
    await page.getByRole('tab', { name: /workspace/i }).click();
    await expect(page.getByText(/notes/i)).toBeVisible();
    
    await page.getByRole('tab', { name: /timeline/i }).click();
    await expect(page.getByText(/project created/i)).toBeVisible();
    
    await page.getByRole('tab', { name: /settings/i }).click();
    await expect(page.getByText(/project details/i)).toBeVisible();
  });
});
