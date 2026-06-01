# U.S. Minimum Wage Dashboard

This project builds a public, static U.S. minimum-wage dashboard from the HR minimum-wage workbook data.

The app includes:

- an interactive U.S. state map;
- state and local minimum-wage views;
- hover tooltips and click-through state details;
- local/county/city exception markers;
- federal, average, selected-state, and threshold comparison modes;
- summary cards, ranked lists, data-quality signals, change tracking, CSV export, and map PNG export.

The dashboard is static after it is built. Anyone with the deployed `https://` link can open it without signing in.

Important: Do not share localhost or 127.0.0.1 links. Share the deployed https URL.

## Why Localhost Links Do Not Work for Other People

`http://127.0.0.1:4173` and `http://localhost:4173` only point to the computer opening the link. They are useful for local testing, but your boss cannot open them unless the dashboard is also running on their own machine.

Use a deployed URL such as:

`https://<project-name>.vercel.app/?view=local&state=WA`

## Project Structure

This is a dependency-light static dashboard, not a Vite/React app.

- `src/`: dashboard HTML, CSS, and browser JavaScript
- `public/data/`: generated JSON data and map topology copied into the production build
- `scripts/import_min_wage.py`: Excel-to-dashboard data importer
- `scripts/build_static.mjs`: production build script
- `dist/`: deploy-ready static site output
- `vercel.json`: Vercel build/output/rewrite config
- `netlify.toml`: Netlify build/publish/fallback config

Build command:

```powershell
npm run build
```

Preview command:

```powershell
npm run preview
```

Production output directory:

```text
dist
```

## Source of Truth

The dashboard data is generated from:

`data\source\Min Wage - latest.xlsx`

The local refresh script can also copy from the HR shared-drive workbook when it is available on your machine.

Do not edit `public\data\minimum-wage.json` by hand. Update the workbook, then run the refresh script.

## Excel Update Rules

The importer reads the `Source Snapshot` sheet.

Required columns:

- `State`
- `Projected Rate`

Optional columns preserved in the dashboard:

- `Locality`
- `Previous Rate`
- `Effective Date`
- `Upcoming`
- `Indexing`
- `Notes`
- `Source`
- `Source Updated`
- `Authority`

State rows should leave `Locality` blank. City, county, municipality, or special-jurisdiction rows should put the local name in `Locality`.

## Run Locally

From this folder in PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Run-MinimumWageDashboard.ps1"
```

That refreshes the generated data, builds `dist`, starts a local server, and opens a local-only link.

To test the exact stakeholder view locally:

```powershell
npm run build
npm run preview
```

Then open:

```text
http://127.0.0.1:4173/?view=local&state=WA
```

Reminder: this local URL is only for your machine.

## Refresh Data

Refresh dashboard data from the latest workbook:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Update-MinimumWageDashboard.ps1"
```

Refresh the workbook first, then rebuild the dashboard:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Update-MinimumWageDashboard.ps1" -RefreshWorkbook
```

The refresh writes:

- `public\data\minimum-wage.json`
- `public\data\minimum-wage.previous.json` after the second refresh
- `dist\` when build is enabled

## Deploy to Vercel

Vercel is the preferred deployment target for stakeholder sharing.

1. Push this project to a GitHub repository.
2. Go to [Vercel](https://vercel.com/) and choose **Add New Project**.
3. Import the GitHub repository.
4. Use these project settings:
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: leave default
5. Deploy.
6. Share the production URL with the query string:

```text
https://<project-name>.vercel.app/?view=local&state=WA
```

`vercel.json` already sets the build command, output directory, and fallback rewrite so query-string links and direct refreshes load the dashboard.

## Deploy to Netlify

1. Push this project to a GitHub repository.
2. Go to [Netlify](https://www.netlify.com/) and choose **Add new site**.
3. Import the GitHub repository.
4. Use these build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Deploy.
6. Share the production URL with the query string:

```text
https://<site-name>.netlify.app/?view=local&state=WA
```

`netlify.toml` already sets the build command, publish directory, headers, and dashboard fallback rewrite.

## Deploy to GitHub Pages

This repo also includes a no-secrets GitHub Pages workflow at `.github/workflows/pages.yml`.

After the project is pushed to a GitHub repository named `minimum-wage-dashboard` under `wmoncayo`, the workflow can publish the dashboard to:

```text
https://wmoncayo.github.io/minimum-wage-dashboard/?view=local&state=WA
```

If Pages is not already enabled, open the repo in GitHub, go to **Settings > Pages**, and choose **GitHub Actions** as the source. Then run the **Deploy Dashboard to GitHub Pages** workflow.

## Sharing the Final Link

Send stakeholders the deployed HTTPS link only:

```text
https://<project-name>.vercel.app/?view=local&state=WA
```

GitHub Pages format:

```text
https://wmoncayo.github.io/<repo-name>/?view=local&state=WA
```

Do not share:

```text
http://127.0.0.1:4173/?view=local&state=WA
```

## Quality Checks

On a machine with Node.js 20+ and Python 3.11+:

```powershell
npm run validate-data
npm run lint
npm run typecheck
npm run test
npm run build
```

This project has no npm package dependencies. The importer uses only Python's standard library.

## Automation

Install or repair the scheduled dashboard refresh:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Install-DashboardRefreshTask.ps1"
```

Default schedule: Monday at 6:30 AM, after the workbook updater's normal Monday 6:00 AM run.

## Troubleshooting

If the dashboard says data could not be loaded, run `Update-MinimumWageDashboard.ps1`, rebuild, and redeploy.

If the deployed site loads but data looks old, refresh the workbook, run the dashboard update script, commit the updated `public\data\minimum-wage.json`, and deploy again.

If the importer says a required column is missing, check the `Source Snapshot` sheet headers or update `config\minimum-wage-columns.json` if the workbook changed intentionally.

If PowerShell says Python or Node.js was not found, install Python 3.11+ and Node.js 20+ on the machine that runs the dashboard refresh.

If data-quality signals appear in the dashboard, review the listed missing fields, duplicate-source choices, or suspicious values in the workbook before treating the rate as final.

## Security and Sharing Notes

- The deployed site is static HTML, CSS, JavaScript, and JSON.
- No private credentials are required.
- No `.env` file is required.
- The Excel workbook is not copied into `dist`.
- `.vercelignore` and `.netlifyignore` exclude the local Excel workbook from hosted build uploads.
