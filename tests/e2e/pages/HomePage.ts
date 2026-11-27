import { Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async goto(baseURL: string) {
    await this.page.goto(baseURL);
  }

  async getTitle() {
    return this.page.title();
  }
}
