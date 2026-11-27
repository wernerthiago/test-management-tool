import { Page, Locator } from '@playwright/test';
import { resolveBaseUrl } from '../testUtils';

/** Settings > Playwright Reporter tab: API tokens. */
export class ReporterSettingsPage {
  readonly page: Page;
  readonly tab: Locator;
  readonly createTokenButton: Locator;
  readonly tokenNameInput: Locator;
  readonly tokenSubmit: Locator;
  readonly tokenValue: Locator;
  readonly tokenDone: Locator;
  readonly tokensTable: Locator;
  readonly emptyState: Locator;
  readonly revokeConfirm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tab = page.getByRole('tab', { name: 'Playwright Reporter' });
    this.createTokenButton = page.getByTestId('api-token-create');
    this.tokenNameInput = page.getByTestId('api-token-name');
    this.tokenSubmit = page.getByTestId('api-token-submit');
    this.tokenValue = page.getByTestId('api-token-value');
    this.tokenDone = page.getByTestId('api-token-done');
    this.tokensTable = page.getByTestId('api-tokens-table');
    this.emptyState = page.getByTestId('api-tokens-empty');
    this.revokeConfirm = page.getByTestId('api-token-revoke-confirm');
  }

  async goto() {
    await this.page.goto(new URL('/settings', await resolveBaseUrl()).toString());
    await this.tab.click();
  }

  tokenRow(name: string): Locator {
    return this.page.getByTestId(`api-token-row-${name}`);
  }

  /** Creates a token and returns its value from the one-time dialog. */
  async createToken(name: string): Promise<string> {
    await this.createTokenButton.click();
    await this.tokenNameInput.fill(name);
    await this.tokenSubmit.click();
    await this.tokenValue.waitFor({ state: 'visible' });
    const value = await this.tokenValue.inputValue();
    await this.tokenDone.click();
    return value;
  }

  async revokeToken(name: string) {
    await this.tokenRow(name).getByTestId('api-token-revoke').click();
    await this.revokeConfirm.click();
  }
}
