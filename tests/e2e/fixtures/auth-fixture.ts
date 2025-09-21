import { test as base, expect } from '@playwright/test';
import { testUsers, TestUserKey } from './test-users';

interface AuthFixture {
  authenticatedPage: any;
  loginAs: (userKey: TestUserKey) => Promise<void>;
  logout: () => Promise<void>;
}

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    const loginAs = async (userKey: TestUserKey) => {
      const user = testUsers[userKey];
      
      console.log(`🔐 Logging in as ${user.email} (${user.role})`);
      
      // Navigate to login page
      await page.goto('/auth');
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', user.email);
      await page.fill('[data-testid="password-input"]', user.password);
      
      // Submit form
      await page.click('[data-testid="login-button"]');
      
      // Wait for successful login - look for dashboard or main content
      await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 });
      
      // Verify we're logged in
      const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
      expect(isLoggedIn).toBe(true);
      
      console.log(`✅ Successfully logged in as ${user.email}`);
    };
    
    await use(loginAs);
  },

  logout: async ({ page }, use) => {
    const logout = async () => {
      console.log('🚪 Logging out');
      
      // Click user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('[data-testid="logout-button"]');
      
      // Wait for redirect to auth page
      await page.waitForURL('/auth');
      
      console.log('✅ Successfully logged out');
    };
    
    await use(logout);
  }
});

export { expect } from '@playwright/test';