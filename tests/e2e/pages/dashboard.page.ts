import { BasePage } from './base.page';
import { Page, Locator } from '@playwright/test';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;
  readonly recentProjects: Locator;
  readonly upcomingBookings: Locator;
  readonly quickActions: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
    this.statsCards = page.locator('[data-testid="stats-cards"]');
    this.recentProjects = page.locator('[data-testid="recent-projects"]');
    this.upcomingBookings = page.locator('[data-testid="upcoming-bookings"]');
    this.quickActions = page.locator('[data-testid="quick-actions"]');
  }

  async verifyDashboardLoaded() {
    await this.welcomeMessage.waitFor({ state: 'visible' });
    await this.statsCards.waitFor({ state: 'visible' });
  }

  async clickQuickAction(action: string) {
    await this.quickActions.locator(`[data-testid="quick-${action}"]`).click();
  }

  async verifyStatsVisible() {
    const stats = ['projects', 'bookings', 'budgets', 'contacts'];
    for (const stat of stats) {
      await this.page.locator(`[data-testid="stat-${stat}"]`).waitFor({ state: 'visible' });
    }
  }

  async clickRecentProject(projectName: string) {
    await this.recentProjects.locator(`text=${projectName}`).click();
  }

  async clickUpcomingBooking(bookingTitle: string) {
    await this.upcomingBookings.locator(`text=${bookingTitle}`).click();
  }
}