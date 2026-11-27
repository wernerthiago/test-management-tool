import { Page, Locator } from '@playwright/test';

export class TestRunsPage {
  readonly page: Page;
  readonly newTestRunButton: Locator;
  readonly emptyStateMessage: Locator;
  readonly emptyStateCreateButton: Locator;
  
  // Create dialog locators
  readonly createDialogTitle: Locator;
  readonly runNameInput: Locator;
  readonly runDescriptionInput: Locator;
  readonly selectTestCasesButton: Locator;
  readonly createSubmitButton: Locator;
  readonly createCancelButton: Locator;
  
  // Test case selection modal locators
  readonly selectionModalTitle: Locator;
  readonly searchInput: Locator;
  readonly addTestCasesButton: Locator;
  readonly selectionCancelButton: Locator;
  readonly selectedCountDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // List page elements
    this.newTestRunButton = page.getByRole('button', { name: 'New Test Run' });
    this.emptyStateMessage = page.getByText('No test runs yet');
    this.emptyStateCreateButton = page.getByRole('button', { name: 'Create Test Run' });
    
    // Create dialog elements
    this.createDialogTitle = page.getByRole('heading', { name: 'Create New Test Run' });
    this.runNameInput = page.getByRole('textbox', { name: 'Run Name *' });
    this.runDescriptionInput = page.getByRole('textbox', { name: 'Description' });
    this.selectTestCasesButton = page.getByRole('button', { name: /select test cases|test case\(s\) selected/i });
    this.createSubmitButton = page.getByRole('button', { name: 'Create Test Run' });
    this.createCancelButton = page.getByRole('button', { name: 'Cancel' }).first();
    
    // Test case selection modal elements
    this.selectionModalTitle = page.getByRole('heading', { name: 'Select Test Cases' });
    this.searchInput = page.getByPlaceholder('Search...');
    this.addTestCasesButton = page.getByRole('button', { name: /Add \d+ Test Case\(s\)/i });
    this.selectionCancelButton = page.getByRole('dialog', { name: 'Select Test Cases' }).getByRole('button', { name: 'Cancel' });
    this.selectedCountDisplay = page.getByText(/\d+ test case\(s\) selected/);
  }

  async goto() {
    const baseUrl = process.env.BASE_URL || await (async () => {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const content = fs.readFileSync(path.resolve(__dirname, '../global-state.json'), 'utf-8');
        const parsed = JSON.parse(content);
        return parsed.baseUrl || 'http://localhost:3000';
      } catch (e) {
        return 'http://localhost:3000';
      }
    })();

    await this.page.goto(new URL('/test-runs', baseUrl).toString());
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateDialog() {
    await this.newTestRunButton.click();
    await this.createDialogTitle.waitFor({ state: 'visible' });
  }

  async fillCreateForm({ name, description }: { name: string; description?: string }) {
    await this.runNameInput.fill(name);
    if (description) {
      await this.runDescriptionInput.fill(description);
    }
  }

  async openTestCaseSelectionModal() {
    await this.selectTestCasesButton.click();
    await this.selectionModalTitle.waitFor({ state: 'visible' });
  }

  async selectAllTestCasesInFolder() {
    // Click the first checkbox (folder checkbox for Root)
    const folderCheckbox = this.page.getByRole('dialog', { name: 'Select Test Cases' })
      .getByRole('checkbox').first();
    await folderCheckbox.click();
  }

  async selectTestCaseByTitle(title: string) {
    const testCaseRow = this.page.getByRole('dialog', { name: 'Select Test Cases' })
      .getByText(title)
      .locator('..')
      .getByRole('checkbox');
    await testCaseRow.click();
  }

  async confirmTestCaseSelection() {
    await this.addTestCasesButton.click();
    await this.selectionModalTitle.waitFor({ state: 'hidden' });
  }

  async submitCreate() {
    await this.createSubmitButton.click();
    await this.page.waitForTimeout(1000); // Wait for creation
  }

  async cancelCreate() {
    await this.createCancelButton.click();
    await this.createDialogTitle.waitFor({ state: 'hidden' });
  }

  async hasTestRun(name: string): Promise<boolean> {
    try {
      await this.page.getByText(name).waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async getTestRunCard(name: string) {
    // Find the card by locating the test run name button first, then going to the card
    return this.page.getByRole('button', { name: new RegExp(name) }).locator('../../../..');
  }

  async clickTestRun(name: string) {
    const testRunButton = this.page.getByRole('button', { name: new RegExp(name) });
    await testRunButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async deleteTestRun(name: string) {
    const card = await this.getTestRunCard(name);
    const deleteButton = card.getByRole('button').last(); // Trash icon button
    
    // Wait for the button to be visible and clickable
    await deleteButton.waitFor({ state: 'visible' });
    
    // Setup dialog handler before clicking and wait for it
    const dialogPromise = this.page.waitForEvent('dialog');
    await deleteButton.click();
    const dialog = await dialogPromise;
    await dialog.accept();
    await this.page.waitForTimeout(1000); // Wait for deletion
  }

  async searchTestCasesInModal(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for filter
  }

  async getSelectedTestCaseCount(): Promise<number> {
    const text = await this.selectedCountDisplay.textContent();
    const match = text?.match(/(\d+) test case\(s\) selected/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
