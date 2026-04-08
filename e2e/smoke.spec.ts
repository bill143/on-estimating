// NEXUS ON Estimating — Smoke E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Application Smoke Tests', () => {
  test('homepage loads and redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard page renders', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('pipeline page loads', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('body')).toBeVisible();
  });

  test('estimating page loads', async ({ page }) => {
    await page.goto('/estimating');
    await expect(page.locator('body')).toBeVisible();
  });

  test('AI chat opens with Ctrl+K', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+k');
    // Chat sidebar should appear
    await expect(page.getByText('NEXUS AI Assistant')).toBeVisible();
  });
});
