import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test('should adapt layout to mobile viewport without horizontal scroll', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Check for horizontal scrollbar (overflow)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.viewportSize()?.width || 0;

    // This assertion expects the content to fit within the viewport
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('should have clickable navigation elements', async ({ page }) => {
    await page.goto('/');
    
    // Check if main navigation is visible or accessible via hamburger menu
    // Assuming standard responsive patterns, either nav links are visible or a toggle exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // If there are buttons, check they are large enough (min 44x44px for touch targets)
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box) {
            // This is a strict check for touch target size, might fail if not optimized
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
        }
    }
  });
});
