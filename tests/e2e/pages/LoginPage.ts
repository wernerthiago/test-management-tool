import { Page, Locator } from '@playwright/test';
import { resolveBaseUrl } from '../testUtils';

export class LoginPage {
  readonly page: Page;
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly invalidCredentialsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.identifierInput = page.getByTestId('login-identifier');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.invalidCredentialsMessage = page.getByText('Invalid email/username or password');
  }

  async goto() {
    await this.page.goto(new URL('/login', await resolveBaseUrl()).toString());
  }

  async login(identifier: string, password: string) {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
