# Test Management Tool

A modern, full-stack test management platform built with React, TypeScript, Node.js, and MySQL. Designed to help teams organize, execute, and track their test cases and test runs efficiently with powerful analytics and automation capabilities.

## 📚 Documentation

- **[Local Setup Guide](LOCAL_SETUP.md)** - Complete guide for running the application locally
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Comprehensive hosting and production deployment instructions

## ✨ Features

### Core Functionality

**Project Management**
- Create and manage multiple test projects
- Project-based organization with isolated data
- Quick project switching

**Test Case Management**
- Create, read, update, and delete test cases with **TC-#** identifiers
- Hierarchical folder organization (sections/suites)
- Support for manual and automated test types
- Priority levels (low, medium, high, critical)
- Test steps and Gherkin scenario support
- Custom fields with multiple data types
- CSV bulk import for rapid test case creation
- Clickable TC-# links for easy navigation

**Test Run Execution**
- Create test runs with **TR-#** identifiers
- Select specific test cases for each run
- Track execution status (passed, failed, blocked, skipped, not run)
- Real-time status updates
- Execution history and audit logs
- **PDF export** of test run results with professional formatting
- Edit test runs (name, description, test case selection)

**Analytics & Reporting**
- Dedicated Analytics page with customizable widgets
- Widget types: Pie charts, Bar charts
- Metrics: Test execution status, test cases by folder, custom field distribution
- Download widgets as images
- Real-time pass rate calculation
- Dashboard with summary statistics

**Custom Fields System**
- Flexible custom field types:
  - Text, Number, Date, Checkbox
  - Dropdown (single-select)
  - Multi-select
- Project-specific custom fields
- Full CRUD operations for custom fields

**Playwright Integration**
- Automatic test result reporting from Playwright
- **TC-# identifier detection** - Link Playwright tests to existing test cases
- Auto-create test cases for new tests
- Execution tracking with duration and error messages
- RESTful API endpoint for reporter integration

**User Management**
- Password login (email or username) at `/login`; no external identity provider
- Admin panel at `/admin` for admins: add users with a temporary password, change roles, reset passwords, delete users
- Two roles: **Admin** (everything, including the admin panel) and **User** (everything except the admin panel)
- Every signed-in user can see and open every project
- Users must change a temporary password at first login; anyone can change their own password from the landing page

**User Experience**
- Responsive design for desktop and mobile
- Dark mode support
- Modern, intuitive UI with shadcn/ui components
- Real-time updates
- Toast notifications for user actions

## 🛠 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **shadcn/ui** for UI components
- **tRPC** for type-safe API calls
- **Wouter** for client-side routing
- **Recharts** for data visualization
- **React Query** for data fetching and caching

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **tRPC** for end-to-end type safety
- **Drizzle ORM** for database operations
- **Password login** (bcrypt) with JWT session cookies

### Database
- **MySQL 8.0+** (production-ready relational database)
- Drizzle ORM for migrations and queries

### PDF Generation
- **jsPDF** with **jspdf-autotable** for professional PDF exports

### Development Tools
- **Vite** for fast development and building
- **pnpm** for efficient package management
- **ESBuild** for production builds
- **Drizzle Kit** for generating database migrations

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22.x or higher
- **pnpm** package manager
- **MySQL** 8.0 or higher (or Docker, to run it with `docker-compose up -d db`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/wernerthiago/test-management-tool.git
   cd test-management-tool
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start MySQL** (skip if you already have a MySQL 8 server):
   ```bash
   docker-compose up -d db
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   The defaults match the `db` service from `docker-compose.yml`. If you use your own MySQL server, edit `DATABASE_URL`. `JWT_SECRET` must be at least 32 characters.

5. **Start the development server:**
   ```bash
   pnpm dev
   ```

   Database migrations are applied automatically at startup.

6. **Log in:**
   - Open http://localhost:3000
   - On first start the app creates an admin account: username `admin`, password `admin`
   - You will be asked to choose a new password (at least 8 characters, with uppercase, lowercase, a number and a special character)

For detailed local setup instructions, see **[LOCAL_SETUP.md](LOCAL_SETUP.md)**.

## 📖 Usage Guide

### Creating a Project

1. On the landing page, click **Create New Project**
2. Enter project name and optional description
3. Click **Create Project**
4. Click **Open** to start working with your project

### Managing Test Cases

#### Creating Test Cases Manually

1. Navigate to **Test Cases** page
2. Click **New Test Case**
3. Fill in the details:
   - **Title**: Test case name
   - **Folder**: Optional folder for organization
   - **Description**: Detailed description
   - **Test Type**: Manual or Automated
   - **Priority**: Low, Medium, High, or Critical
   - **Custom Fields**: Any project-specific fields
4. Click **Create Test Case**
5. The test case will be assigned a unique **TC-#** identifier

#### Bulk Import via CSV

1. Go to **Test Cases** page
2. Click **Import CSV**
3. Download the CSV template
4. Fill in your test cases following the template format:
   ```csv
   title,description,preconditions,testtype,priority
   Login Test,Test user login,User account exists,manual,high
   API Test,Test API endpoint,Server running,automated,medium
   ```
5. Upload the CSV file
6. Click **Import**

### Creating and Running Test Runs

1. Navigate to **Test Runs** page
2. Click **New Test Run**
3. Enter run name and description
4. Select test cases to include
5. Click **Create Test Run**
6. Click on the test run (e.g., **TR-1 Regression**) to open detail page
7. Update execution status for each test case:
   - Click the status dropdown in the Actions column
   - Select: Passed, Failed, Blocked, or Not Run
8. **Export results** by clicking the **Export PDF** button

### Using Analytics

1. Navigate to **Analytics** page
2. View default widgets (Test Execution Status, Test Cases by Folder)
3. Click **Add Widget** to create custom widgets:
   - Enter widget name
   - Select graph type (Pie Chart or Bar Chart)
   - Choose metric type (Custom Fields, Test Cases, or Test Runs)
   - Select specific metric option
4. Click **Download** button on any widget to export as image
5. Click **Delete** (X) button to remove widgets

### Managing Custom Fields

1. Go to **Settings** page
2. Navigate to **Custom Fields** tab
3. Click **Add Field**
4. Configure:
   - **Field Name**: Display name
   - **Field Type**: Text, Number, Date, Checkbox, Dropdown, or Multi-select
   - **Options**: For dropdown and multi-select types
5. Click **Create Field**
6. Custom fields will appear when creating/editing test cases

### Organizing with Folders

1. Go to **Settings** page
2. Navigate to **Folders** tab
3. Click **Add Folder**
4. Enter folder name (e.g., "Suite A", "Login Tests")
5. Click **Create Folder**
6. When creating test cases, assign them to folders for better organization

## 🔌 Playwright Reporter Integration

Automatically send test results from Playwright to the Test Management Tool.

### Setup Instructions

1. **Get Project ID:**
   - Go to **Settings** > **Playwright Reporter** tab
   - Copy your Project ID

2. **Create Custom Reporter:**

   Create `custom-reporter.ts` in your Playwright project:

   ```typescript
   import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

   class TestManagementReporter implements Reporter {
     private results: any[] = [];

     onTestEnd(test: TestCase, result: TestResult) {
       this.results.push({
         testCaseTitle: test.title,
         status: result.status === 'passed' ? 'passed' : 
                 result.status === 'failed' ? 'failed' : 
                 result.status === 'skipped' ? 'skipped' : 'not_run',
         duration: result.duration,
         errorMessage: result.error?.message,
       });
     }

     async onEnd() {
       const response = await fetch('YOUR_APP_URL/api/playwright/report', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           projectId: 'YOUR_PROJECT_ID',
           runName: `Automated Run - ${new Date().toISOString()}`,
           results: this.results,
         }),
       });
       
       const data = await response.json();
       console.log('Test results uploaded:', data);
     }
   }

   export default TestManagementReporter;
   ```

3. **Configure Playwright:**

   Add the reporter to `playwright.config.ts`:

   ```typescript
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     reporter: [
       ['list'],
       ['./custom-reporter.ts']
     ],
   });
   ```

4. **Link to Existing Test Cases (Optional):**

   Include **TC-#** identifier in test names to link to existing test cases:

   ```typescript
   test('TC-5 should login successfully', async ({ page }) => {
     // This will link to existing TC-5 in the system
   });

   test('New feature test', async ({ page }) => {
     // This will create a new test case automatically
   });
   ```

5. **Run Tests:**
   ```bash
   npx playwright test
   ```

   Results will be automatically uploaded to the Test Management Tool!

## 🗄 Database Schema

The application uses the following main tables:

- **users**: Accounts, roles and password hashes
- **projects**: Test projects
- **folders**: Test case organization (suites/sections)
- **testCases**: Test case definitions with TC-# identifiers
- **testSteps**: Manual test steps
- **gherkinScenarios**: BDD scenarios
- **customFields**: Custom field definitions
- **customFieldValues**: Custom field values for test cases
- **testRuns**: Test execution runs with TR-# identifiers
- **testExecutions**: Individual test executions within runs

## 🏗 Development

### Database Migrations

Migrations in `drizzle/` are applied automatically when the app starts, so nobody needs to run them by hand to start or upgrade the app.

When you change `drizzle/schema.ts`, generate and apply a new migration:

```bash
pnpm db:push   # drizzle-kit generate + drizzle-kit migrate
```

### Running Tests

```bash
pnpm test
```

### Code Quality

```bash
# Type checking
pnpm check

# Format code
pnpm format
```

### Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory.

### Starting Production Server

```bash
pnpm start
```

## 🚀 Deployment

For production deployment, see the comprehensive **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** which covers:

- Infrastructure requirements
- Hosting options (Cloud platforms, VPS, On-premises)
- Database setup (Managed and self-hosted)
- Domain and SSL configuration
- Authentication and user management
- Security best practices
- Cost estimation
- Monitoring and maintenance

**Quick Deployment Options:**

- **Docker**: production image from the `Dockerfile` (`docker-compose up -d` runs app + MySQL)
- **Cloud Platforms**: Railway, Render (easiest)
- **VPS**: DigitalOcean, AWS EC2, Linode (more control)
- **On-Premises**: Your own infrastructure (complete control)

## 🔒 Security

- Password login with bcrypt hashing; sessions are signed JWTs in an httpOnly cookie
- Default `admin`/`admin` account must change its password at first login
- Login rate limiting (10 failed attempts per IP per 15 minutes)
- SQL injection prevention (Drizzle ORM)
- Input validation with Zod

## 📊 API Documentation

### tRPC Routers

The application uses tRPC for type-safe API communication. Main routers:

- **auth**: Current user, logout, change own password
- **admin**: User management (admins only)
- **projects**: Project CRUD operations
- **testCases**: Test case management
- **testRuns**: Test run management and execution
- **folders**: Folder organization
- **customFields**: Custom field configuration
- **testSteps**: Test step management
- **gherkinScenarios**: Gherkin scenario support
- **analytics**: Analytics data endpoints

Login itself is a REST endpoint: `POST /api/auth/login`.

### Playwright Reporter Endpoint

```
POST /api/playwright/report
Content-Type: application/json

{
  "projectId": "string",
  "runName": "string",
  "description": "string (optional)",
  "results": [
    {
      "testCaseTitle": "string (can include TC-# identifier)",
      "status": "passed" | "failed" | "blocked" | "skipped" | "not_run",
      "duration": "number (optional, in ms)",
      "errorMessage": "string (optional)"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "runId": "string",
  "executionCount": "number"
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

For issues, questions, or contributions:

- **GitHub Issues**: [Report bugs or request features](https://github.com/wernerthiago/test-management-tool/issues)
- **GitHub Repository**: [View source code](https://github.com/wernerthiago/test-management-tool)
- **Documentation**: See `docs/` folder for detailed guides

## 🗺 Roadmap

### Completed Features ✅
- ✅ Test case and test run management with TC-# and TR-# identifiers
- ✅ Custom fields system
- ✅ CSV bulk import
- ✅ Playwright reporter integration with TC-# detection
- ✅ Analytics page with customizable widgets
- ✅ PDF export for test runs
- ✅ Folder organization
- ✅ Dashboard with statistics
- ✅ Password login with admin panel and Admin/User roles

### Future Enhancements 🚀
- Excel export for test results
- Email notifications for test run completion
- Test case versioning and history
- Test case templates
- Advanced reporting with custom date ranges
- Enhanced CI/CD pipeline integration
- Finer-grained roles (e.g. viewer, tester) and per-project access
- Test case cloning functionality
- Bulk edit for test cases
- Attachments support
- Comments and collaboration features
- Real-time collaboration
- Test case dependencies
- Scheduled test runs

---

**Built with ❤️ using modern web technologies**

React • TypeScript • Node.js • MySQL • Tailwind CSS • tRPC • Drizzle ORM

