import { Page, Locator } from '@playwright/test';

export class TestRunDetailPage {
  readonly page: Page;
  readonly backButton: Locator;
  readonly exportPdfButton: Locator;
  readonly viewGraphButton: Locator;
  readonly editTestRunButton: Locator;
  
  // Statistics cards
  readonly totalCount: Locator;
  readonly passedCount: Locator;
  readonly failedCount: Locator;
  readonly notRunCount: Locator;
  
  // Test executions table
  readonly executionsTable: Locator;
  readonly selectAllCheckbox: Locator;
  readonly bulkPassedButton: Locator;
  readonly bulkFailedButton: Locator;
  readonly bulkBlockedButton: Locator;
  readonly bulkSkippedButton: Locator;
  readonly clearSelectionButton: Locator;
  readonly selectedCountText: Locator;
  
  // Edit dialog
  readonly editDialogTitle: Locator;
  readonly editNameInput: Locator;
  readonly editDescriptionInput: Locator;
  readonly editSelectTestCasesButton: Locator;
  readonly saveChangesButton: Locator;
  readonly editCancelButton: Locator;
  
  // Graph modal
  readonly graphModalTitle: Locator;
  readonly downloadChartButton: Locator;
  readonly closeGraphButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Header buttons
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.exportPdfButton = page.getByRole('button', { name: 'Export PDF' });
    this.viewGraphButton = page.getByRole('button', { name: 'View Graph' });
    this.editTestRunButton = page.getByRole('button', { name: 'Edit Test Run' });
    
    // Statistics cards - locate by finding the card grid container first, then find each stat
    const statsContainer = page.locator('div.grid').filter({ has: page.getByText('Total') });
    this.totalCount = statsContainer.locator('div:has-text("Total")').locator('div.text-2xl').first();
    this.passedCount = statsContainer.locator('div:has-text("Passed")').locator('div.text-2xl').first();
    this.failedCount = statsContainer.locator('div:has-text("Failed")').locator('div.text-2xl').first();
    this.notRunCount = statsContainer.locator('div:has-text("Not Run")').locator('div.text-2xl').first();
    
    // Executions table
    this.executionsTable = page.getByRole('table');
    this.selectAllCheckbox = page.getByRole('row', { name: /Test Case ID Title Status/ }).getByRole('checkbox');
    this.bulkPassedButton = page.getByRole('button', { name: 'Passed' }).first();
    this.bulkFailedButton = page.getByRole('button', { name: 'Failed' }).first();
    this.bulkBlockedButton = page.getByRole('button', { name: 'Blocked' });
    this.bulkSkippedButton = page.getByRole('button', { name: 'Skipped' });
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear' });
    this.selectedCountText = page.getByText(/\d+ selected/);
    
    // Edit dialog
    this.editDialogTitle = page.getByRole('heading', { name: 'Edit Test Run' });
    this.editNameInput = page.getByRole('textbox', { name: 'Name *' });
    this.editDescriptionInput = page.getByRole('textbox', { name: 'Description' });
    this.editSelectTestCasesButton = page.getByRole('dialog', { name: 'Edit Test Run' })
      .getByRole('button', { name: /test case\(s\) selected/i });
    this.saveChangesButton = page.getByRole('button', { name: 'Save Changes' });
    this.editCancelButton = page.getByRole('dialog', { name: 'Edit Test Run' }).getByRole('button', { name: 'Cancel' });
    
    // Graph modal
    this.graphModalTitle = page.getByText('Test Run Results');
    this.downloadChartButton = page.getByRole('button').filter({ hasText: '' }).nth(1); // Download icon button
    this.closeGraphButton = page.getByRole('button').filter({ hasText: '' }).last(); // Close X button
  }

  async goto(testRunId: string) {
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

    await this.page.goto(new URL(`/test-runs/${testRunId}`, baseUrl).toString());
    await this.page.waitForLoadState('networkidle');
  }

  async clickBack() {
    await this.backButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getExecutionRow(testCaseNumber: string) {
    return this.page.getByRole('row', { name: new RegExp(`TC-${testCaseNumber}`) });
  }

  async updateExecutionStatus(testCaseNumber: string, status: 'Passed' | 'Failed' | 'Blocked' | 'Not Run') {
    const row = await this.getExecutionRow(testCaseNumber);
    const statusDropdown = row.getByRole('combobox');
    await statusDropdown.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.page.waitForTimeout(500); // Wait for update
  }

  async selectExecution(testCaseNumber: string) {
    const row = await this.getExecutionRow(testCaseNumber);
    const checkbox = row.getByRole('checkbox');
    await checkbox.click();
  }

  async selectAllExecutions() {
    await this.selectAllCheckbox.click();
  }

  async clearSelection() {
    await this.clearSelectionButton.click();
  }

  async clickBulkAction(action: 'passed' | 'failed' | 'blocked' | 'skipped') {
    switch (action) {
      case 'passed':
        await this.bulkPassedButton.click();
        break;
      case 'failed':
        await this.bulkFailedButton.click();
        break;
      case 'blocked':
        await this.bulkBlockedButton.click();
        break;
      case 'skipped':
        await this.bulkSkippedButton.click();
        break;
    }
    await this.page.waitForTimeout(1000); // Wait for bulk update
  }

  async getStatistic(type: 'total' | 'passed' | 'failed' | 'notRun'): Promise<string> {
    let locator: Locator;
    switch (type) {
      case 'total':
        locator = this.totalCount;
        break;
      case 'passed':
        locator = this.passedCount;
        break;
      case 'failed':
        locator = this.failedCount;
        break;
      case 'notRun':
        locator = this.notRunCount;
        break;
    }
    return (await locator.textContent()) || '0';
  }

  async getExecutionStatus(testCaseNumber: string): Promise<string> {
    const row = await this.getExecutionRow(testCaseNumber);
    const statusBadge = row.locator('td').nth(3); // Status column
    return (await statusBadge.textContent()) || '';
  }

  async openEditDialog() {
    await this.editTestRunButton.click();
    await this.editDialogTitle.waitFor({ state: 'visible' });
  }

  async fillEditForm({ name, description }: { name?: string; description?: string }) {
    if (name !== undefined) {
      await this.editNameInput.clear();
      await this.editNameInput.fill(name);
    }
    if (description !== undefined) {
      await this.editDescriptionInput.clear();
      await this.editDescriptionInput.fill(description);
    }
  }

  async saveEdit() {
    await this.saveChangesButton.click();
    await this.page.waitForTimeout(1000); // Wait for save
  }

  async cancelEdit() {
    await this.editCancelButton.click();
    await this.editDialogTitle.waitFor({ state: 'hidden' });
  }

  async exportPdf() {
    await this.exportPdfButton.click();
    await this.page.waitForTimeout(500); // Wait for download trigger
  }

  async openGraphModal() {
    await this.viewGraphButton.click();
    await this.graphModalTitle.waitFor({ state: 'visible' });
  }

  async closeGraphModal() {
    await this.closeGraphButton.click();
    await this.graphModalTitle.waitFor({ state: 'hidden' });
  }

  async downloadChart() {
    await this.downloadChartButton.click();
    await this.page.waitForTimeout(500); // Wait for download
  }

  async clickTestCaseLink(testCaseNumber: string) {
    const row = await this.getExecutionRow(testCaseNumber);
    const testCaseButton = row.getByRole('button', { name: `TC-${testCaseNumber}` });
    await testCaseButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async isExecutionSelected(testCaseNumber: string): Promise<boolean> {
    const row = await this.getExecutionRow(testCaseNumber);
    const checkbox = row.getByRole('checkbox');
    return await checkbox.isChecked();
  }

  async getSelectedCount(): Promise<number> {
    try {
      const text = await this.selectedCountText.textContent();
      const match = text?.match(/(\d+) selected/);
      return match ? parseInt(match[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  async hasExecution(testCaseNumber: string): Promise<boolean> {
    try {
      const row = await this.getExecutionRow(testCaseNumber);
      await row.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  async getExecutionCount(): Promise<number> {
    const rows = await this.executionsTable.locator('tbody tr').count();
    return rows;
  }
}
