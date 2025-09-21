import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly userMenu: Locator;
  readonly notifications: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.notifications = page.locator('[data-testid="notifications"]');
  }

  async navigateTo(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async clickSidebarItem(item: string) {
    await this.sidebar.locator(`[data-testid="nav-${item.toLowerCase()}"]`).click();
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    return await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async waitForToast(message?: string) {
    const toast = this.page.locator('[data-testid="toast"]');
    await toast.waitFor({ state: 'visible' });
    
    if (message) {
      await this.page.locator('[data-testid="toast"]', { hasText: message }).waitFor();
    }
    
    // Wait for toast to disappear
    await toast.waitFor({ state: 'hidden', timeout: 10000 });
  }

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`[data-testid="${field}-input"]`);
      await input.fill(value);
    }
  }

  async submitForm() {
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async confirmDialog() {
    await this.page.locator('[data-testid="confirm-button"]').click();
  }

  async cancelDialog() {
    await this.page.locator('[data-testid="cancel-button"]').click();
  }
}