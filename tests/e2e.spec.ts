import { test, expect } from '@playwright/test';

test.describe('E2E Validation for Auth and State Persistence', () => {
  
  test('1. Persistencia del estado tras refresh completo del navegador', async ({ page }) => {
    await page.goto('/login');
    
    // Fill credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button:has-text("Ingresar")');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');

    // Reload the page
    await page.reload();
    
    // Verify we are still in dashboard (state persisted)
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
    
    // Check if some UI element indicating logged-in state exists (like a menu or title)
    // Assuming the title says Dashboard
    const title = page.locator('ion-title');
    await expect(title).toHaveText(/Dashboard/i);
  });

  test('2. Comportamiento en múltiples sesiones independientes reales', async ({ browser }) => {
    // Session 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto('/login');
    await page1.fill('input[name="username"]', 'admin');
    await page1.fill('input[name="password"]', 'admin123');
    await page1.click('button:has-text("Ingresar")');
    await page1.waitForURL('**/dashboard');
    expect(page1.url()).toContain('/dashboard');

    // Session 2 (Independent)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Try to access protected route in session 2 without logging in
    await page2.goto('/dashboard');
    
    // Should be redirected to login
    await page2.waitForURL('**/login');
    expect(page2.url()).toContain('/login');
    
    await context1.close();
    await context2.close();
  });

  test('3. Ausencia de desincronización y consistencia de BehaviorSubject', async ({ page }) => {
    await page.goto('/login');
    
    // Login as driver to go to trazabilidad
    await page.fill('input[name="username"]', 'driver');
    await page.fill('input[name="password"]', 'driver123');
    await page.click('button:has-text("Ingresar")');

    await page.waitForURL('**/trazabilidad');
    expect(page.url()).toContain('/trazabilidad');

    // Navigate back or to another tab using Ionic routing
    // Let's assume there's a menu or we can navigate via URL
    // We will navigate to /mas or another route, then back to check state
    await page.goto('/mas');
    await page.waitForURL('**/mas');

    // Go back to trazabilidad
    await page.goto('/trazabilidad');
    await page.waitForURL('**/trazabilidad');
    
    // Ensure the state hasn't desynced. The BehaviorSubject should still contain 'driver'
    // Let's verify the UI still works and user is still 'driver'
    // We can evaluate localStorage to confirm the session or evaluate window object if exposed.
    const session = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('vitalflow_auth_session') || '{}');
    });

    expect(session.username).toBe('driver');
    expect(session.role).toBe('transportista');
  });
});
