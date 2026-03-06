# Adobe Cloud Manager Electron App

A desktop app to interact with the [Adobe Cloud Manager API](https://developer.adobe.com/experience-cloud/cloud-manager/reference/api/) — list and manage programs, pipelines, and pipeline executions across multiple organizations.

## Features

- **Multi-organization support** — Add and switch between different Adobe organizations
- **Programs** — List and view program details
- **Pipelines** — List pipelines per program, view details, start pipelines
- **Executions** — List execution history, view current execution, advance/cancel steps

## Quick Start

```bash
npm install
npm start
```

## Adobe Admin Console & Developer Console Setup

To use this app, you need to set up API credentials in Adobe. Here’s what to configure.

### 1. Permissions in Adobe Admin Console

**Who can create integrations**

You need either:

- **System Administrator** for your organization, OR  
- **API Developer** role for Cloud Manager product profiles

**Assign API Developer access**

1. Go to [Adobe Admin Console](https://adminconsole.adobe.com/)
2. Open **Users** → **Developers**
3. Click **Add Developer**
4. Enter the user’s email
5. Under **Assign Products**, add **Cloud Manager** and the desired product profile(s):
   - **Cloud Manager - Developer** — read-only (GET)
   - **Cloud Manager - Deployment Manager** — pipeline start, advance, cancel, edit pipelines, etc.
   - **Cloud Manager - Program Manager** — pipeline start, advance, cancel
   - **Cloud Manager - Business Owner** — full access including `deleteProgram`
6. Save

### 2. Create an API integration in Adobe Developer Console

1. Go to [Adobe Developer Console](https://developer.adobe.com/console)
2. **Create new project** (or open an existing one)
3. **Add to Project** → **API**
4. Under **Experience Cloud**, select **Cloud Manager** → **Next**
5. Choose **OAuth Server-to-Server** (not JWT)
6. Select the **Product Profile(s)** that match the permissions you need:
   - Developer: read (programs, pipelines, executions)
   - Deployment Manager or higher: start pipeline, advance/cancel steps
7. Click **Save configured API**

### 3. Get credentials for the app

From your Cloud Manager API integration:

1. **Client ID** — used in the app as “Client ID (API Key)”
2. **Client Secret** — used as “Client Secret”
3. **Organization ID** — shown in the credential details (format like `xxxxxxxx@AdobeOrg`)

**Optional:** If your integration uses custom scopes, copy the **Scopes** value. Otherwise leave the app’s Scope field blank; it will use the default Cloud Manager scope.

### 4. Add an organization in the app

1. Run the app: `npm start`
2. Click **+ Add Org**
3. Enter:
   - **Display Name** — e.g. “Production Org”
   - **Organization ID** — from Developer Console
   - **Client ID** — from Developer Console
   - **Client Secret** — from Developer Console
4. Click **Save**

### Permission overview (summary)

| Action                    | Product profile(s)            |
|---------------------------|-------------------------------|
| Read programs, pipelines  | Developer                     |
| Start pipeline            | Deployment Manager, Program Manager, Business Owner |
| Advance/cancel steps      | Deployment Manager, Program Manager, Business Owner |
| Edit pipeline             | Deployment Manager            |
| Delete program            | Business Owner                 |

### Useful links

- [Cloud Manager API – Create API integration](https://developer.adobe.com/experience-cloud/cloud-manager/guides/getting-started/create-api-integration/)
- [Cloud Manager API – Authentication](https://developer.adobe.com/experience-cloud/cloud-manager/guides/getting-started/authentication/authentication)
- [Cloud Manager API – Permissions](https://developer.adobe.com/experience-cloud/cloud-manager/guides/getting-started/permissions)
- [Cloud Manager users and roles](https://experienceleague.adobe.com/docs/experience-manager-cloud-manager/content/requirements/users-and-roles.html)

## Testing

### Unit tests (Jest)

```bash
npm test
```

Runs tests for the API layer and store. Use `npm run test:watch` for watch mode or `npm run test:coverage` for coverage.

### E2E tests (Cypress)

First install the Cypress binary (one-time):

```bash
npx cypress install
```

Then run the UI tests:

```bash
npm run test:e2e
```

Or open the Cypress UI for interactive testing:

```bash
npm run test:serve    # In one terminal - serves app at http://localhost:8080
npm run cypress:open  # In another - opens Cypress
```

The E2E tests use a mock `electronAPI` so they run in a browser without Electron. Tests verify navigation, modals, and data loading flows.

## Security notes

- Credentials are stored locally via `electron-store`.
- Client Secret is stored in plain text in the app config. Use this only on trusted machines.
- Tokens are cached in memory and refreshed automatically (tokens are valid ~24 hours).
