import { Page, Locator } from '@playwright/test';

export class TestCasesPage {
  readonly page: Page;
  readonly newFolderButton: Locator;
  readonly importCsvButton: Locator;
  readonly newTestCaseButton: Locator;
  readonly folderNameInput: Locator;
  readonly folderCreateButton: Locator;
  readonly folderCancelButton: Locator;
  readonly csvInput: Locator;
  readonly csvImportButton: Locator;
  readonly csvCancelButton: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly preconditionsInput: Locator;
  readonly createSubmit: Locator;
  readonly createCancel: Locator;
  
  // Test case detail page locators
  readonly detailBackButton: Locator;
  readonly detailEditButton: Locator;
  readonly detailSaveButton: Locator;
  readonly detailCancelButton: Locator;
  readonly detailTitleInput: Locator;
  readonly detailTitleDisplay: Locator;
  readonly detailDescriptionInput: Locator;
  readonly detailDescriptionDisplay: Locator;
  readonly detailPreconditionsInput: Locator;
  readonly detailPreconditionsDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newFolderButton = page.getByTestId('tc-new-folder-button');
    this.importCsvButton = page.getByTestId('tc-import-csv-button');
    this.newTestCaseButton = page.getByTestId('tc-new-testcase-button');
    this.folderNameInput = page.getByTestId('tc-folder-name-input');
    this.folderCreateButton = page.getByTestId('tc-folder-create');
    this.folderCancelButton = page.getByTestId('tc-folder-cancel');
    this.csvInput = page.getByTestId('tc-csv-input');
    this.csvImportButton = page.getByTestId('tc-csv-import');
    this.csvCancelButton = page.getByTestId('tc-csv-cancel');
    this.titleInput = page.getByTestId('tc-title-input');
    this.descriptionInput = page.getByTestId('tc-description-input');
    this.preconditionsInput = page.getByTestId('tc-preconditions-input');
    this.createSubmit = page.getByTestId('tc-create-submit');
    this.createCancel = page.getByTestId('tc-create-cancel');
    
    // Test case detail page locators
    this.detailBackButton = page.getByTestId('tc-detail-back-button');
    this.detailEditButton = page.getByTestId('tc-detail-edit-button');
    this.detailSaveButton = page.getByTestId('tc-detail-save-changes');
    this.detailCancelButton = page.getByTestId('tc-detail-cancel-edit');
    this.detailTitleInput = page.getByTestId('tc-detail-title-input');
    this.detailTitleDisplay = page.getByTestId('tc-detail-title-display');
    this.detailDescriptionInput = page.getByTestId('tc-detail-description-input');
    this.detailDescriptionDisplay = page.getByTestId('tc-detail-description-display');
    this.detailPreconditionsInput = page.getByTestId('tc-detail-preconditions-input');
    this.detailPreconditionsDisplay = page.getByTestId('tc-detail-preconditions-display');
  }

  async goto() {
    // Resolve base URL: prefer environment variable set by globalSetup, else read global-state.json
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

    await this.page.goto(new URL('/test-cases', baseUrl).toString());
    await this.page.waitForLoadState('networkidle');
  }

  async createFolder(name: string) {
    await this.newFolderButton.click();
    await this.folderNameInput.fill(name);
    await this.folderCreateButton.click();
    // wait for folder to appear in UI
    await this.page.waitForSelector(`text=${name}`);
  }

  async openCreateTestCase() {
    await this.newTestCaseButton.click();
  }

  async fillCreateForm({ title, description, preconditions }: { title: string; description?: string; preconditions?: string; }) {
    await this.titleInput.fill(title);
    if (description) await this.descriptionInput.fill(description);
    if (preconditions) await this.preconditionsInput.fill(preconditions);
  }

  async submitCreate() {
    await this.createSubmit.click();
    // wait for toast or the new test case row
    await this.page.waitForSelector(`text=${await this.titleInput.inputValue()}`);
  }

  async hasTestCase(title: string) {
    return await this.page.locator(`text=${title}`).count() > 0;
  }
  
  // ==================== Test Case Detail & Editing Methods ====================
  
  /**
   * Navigate to a test case detail page by clicking its TC-# link
   */
  async navigateToTestCase(title: string) {
    // First, find the row with the test case
    const row = this.page.locator(`tr:has-text("${title}")`);
    
    // Find and click the TC-# button in that row
    const tcButton = row.locator('button:has-text("TC-")').first();
    await tcButton.click();
    
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle');
  }
  
  /**
   * Click the Edit button on test case detail page
   */
  async clickEditButton() {
    await this.detailEditButton.waitFor({ state: 'visible' });
    await this.detailEditButton.click();
    await this.page.waitForTimeout(300);
  }
  
  /**
   * Edit the title field in edit mode
   */
  async editTitle(newTitle: string) {
    await this.detailTitleInput.waitFor({ state: 'visible' });
    await this.detailTitleInput.clear();
    await this.detailTitleInput.fill(newTitle);
  }
  
  /**
   * Edit the description field in edit mode
   */
  async editDescription(newDescription: string) {
    await this.detailDescriptionInput.waitFor({ state: 'visible' });
    await this.detailDescriptionInput.clear();
    await this.detailDescriptionInput.fill(newDescription);
  }
  
  /**
   * Edit the preconditions field in edit mode
   */
  async editPreconditions(newPreconditions: string) {
    await this.detailPreconditionsInput.waitFor({ state: 'visible' });
    await this.detailPreconditionsInput.clear();
    await this.detailPreconditionsInput.fill(newPreconditions);
  }
  
  /**
   * Click Save Changes button
   */
  async saveChanges() {
    await this.detailSaveButton.waitFor({ state: 'visible' });
    await this.detailSaveButton.click();
    await this.page.waitForTimeout(1000); // Wait for save to complete
  }
  
  /**
   * Click Cancel button to exit edit mode
   */
  async cancelEdit() {
    await this.detailCancelButton.waitFor({ state: 'visible' });
    await this.detailCancelButton.click();
    await this.page.waitForTimeout(300);
  }
  
  /**
   * Get the current displayed title
   */
  async getTestCaseTitle(): Promise<string> {
    await this.detailTitleDisplay.waitFor({ state: 'visible' });
    return await this.detailTitleDisplay.textContent() || '';
  }
  
  /**
   * Get the current displayed description
   */
  async getTestCaseDescription(): Promise<string> {
    await this.detailDescriptionDisplay.waitFor({ state: 'visible' });
    const text = await this.detailDescriptionDisplay.textContent() || '';
    // Filter out "No description" placeholder
    return text.includes('No description') ? '' : text;
  }
  
  /**
   * Get the current displayed preconditions
   */
  async getTestCasePreconditions(): Promise<string> {
    await this.detailPreconditionsDisplay.waitFor({ state: 'visible' });
    const text = await this.detailPreconditionsDisplay.textContent() || '';
    // Filter out "No preconditions" placeholder
    return text.includes('No preconditions') ? '' : text;
  }
  
  /**
   * Go back to the test cases list page
   */
  async goBackToList() {
    await this.detailBackButton.click();
    await this.page.waitForLoadState('networkidle');
    // Wait for table to be visible to ensure list is loaded
    await this.page.waitForTimeout(500);
  }
  
  /**
   * Wait for a toast message to appear
   */
  async waitForToast(message: string, timeout: number = 5000): Promise<boolean> {
    try {
      const toast = this.page.locator(`text=/${message}/i`);
      await toast.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }
  
  // ==================== Custom Fields Methods ====================
  
  /**
   * Set a dropdown custom field value by field name
   */
  async setCustomFieldDropdown(fieldName: string, value: string) {
    const fieldKey = fieldName.toLowerCase().replace(/\s+/g, "-");
    const trigger = this.page.getByTestId(`tc-detail-custom-field-dropdown-${fieldKey}`);
    await trigger.click();
    await this.page.waitForTimeout(300);
    
    // Click the option in the dropdown
    await this.page.locator(`[role="option"]`).filter({ hasText: value }).click();
    await this.page.waitForTimeout(300);
  }
  
  /**
   * Set a text/number custom field value by field name
   */
  async setCustomFieldInput(fieldName: string, value: string) {
    const fieldKey = fieldName.toLowerCase().replace(/\s+/g, "-");
    const input = this.page.getByTestId(`tc-detail-custom-field-input-${fieldKey}`);
    await input.waitFor({ state: 'visible' });
    await input.clear();
    await input.fill(value);
  }
  
  /**
   * Toggle a checkbox custom field by field name
   */
  async setCustomFieldCheckbox(fieldName: string, checked: boolean) {
    const fieldKey = fieldName.toLowerCase().replace(/\s+/g, "-");
    const checkbox = this.page.getByTestId(`tc-detail-custom-field-checkbox-${fieldKey}`);
    await checkbox.waitFor({ state: 'visible' });
    
    const isChecked = await checkbox.isChecked();
    if (isChecked !== checked) {
      await checkbox.click();
    }
  }
  
  /**
   * Toggle a multiselect option by field name and option value
   */
  async toggleCustomFieldMultiselectOption(fieldName: string, optionValue: string) {
    const fieldKey = fieldName.toLowerCase().replace(/\s+/g, "-");
    const optionKey = optionValue.toLowerCase().replace(/\s+/g, "-");
    const checkbox = this.page.getByTestId(`tc-detail-custom-field-multiselect-option-${fieldKey}-${optionKey}`);
    await checkbox.waitFor({ state: 'visible' });
    await checkbox.click();
    await this.page.waitForTimeout(200);
  }
  
  /**
   * Get the displayed value of a custom field by field name
   */
  async getCustomFieldValue(fieldName: string): Promise<string | boolean> {
    const fieldKey = fieldName.toLowerCase().replace(/\s+/g, "-");
    const display = this.page.getByTestId(`tc-detail-custom-field-display-${fieldKey}`);
    await display.waitFor({ state: 'visible' });
    
    const text = (await display.textContent() || '').trim();
    
    // Filter out "Not set" placeholder
    if (text.includes('Not set')) {
      return '';
    }
    
    // Handle checkbox boolean values
    if (text === 'true') {
      return true;
    }
    if (text === 'false') {
      return false;
    }
    
    return text;
  }
  
  /**
   * Check if custom fields card is visible
   */
  async hasCustomFieldsCard(): Promise<boolean> {
    const card = this.page.getByTestId('tc-detail-custom-fields-card');
    return await card.isVisible().catch(() => false);
  }
}
