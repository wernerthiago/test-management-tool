import { Page, Locator } from '@playwright/test';
import { resolveBaseUrl } from '../testUtils';

export class ProjectSelectionPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly signedInUser: Locator;
  readonly adminPanelButton: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText('Select a project to get started or create a new one');
    this.signedInUser = page.getByTestId('signed-in-user');
    this.adminPanelButton = page.getByTestId('open-admin-panel');
    this.signOutButton = page.getByTestId('sign-out');
  }

  async goto() {
    await this.page.goto(new URL('/', await resolveBaseUrl()).toString());
  }
}
