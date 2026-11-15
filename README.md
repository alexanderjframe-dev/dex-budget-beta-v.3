# Dex Budget — Guided Beta v1.2: Original Colorway + Refined Navigation

This is the next version of the Dex Budget static iPhone/web beta, based on the Guided Beta v1.1 onboarding release.

## What's new

- Restores the original **midnight navy + mint** look from the first DoorDash version (`#0b1220` background, `#152136` cards, `#54d7b0` mint accents).
- Five primary destinations, each with a clear purpose:
  - **Home** — safe-to-spend estimate, status, recommendations, and expandable funding breakdown.
  - **Add** — a single, simple form to enter income or expenses.
  - **Plan** — three smaller setup screens: Pay & cash, Bills, Everyday.
  - **History** — transactions, approved adjustments, and data/backup in separate views.
  - **Help** — walkthrough and plain-language explanations.
- Subtle screen-entry animations, active navigation feedback, smoother buttons/inputs, and brief save confirmations.
- Keeps the four-screen first-launch tour and in-context `?` help from v1.1.
- New PNG home-screen icons, with an Apple touch icon for iPhone.
- Supports reduced-motion accessibility preferences.

## How to upgrade the existing GitHub Pages app

**Important: Back up your data first.** In your old Dex app, select **Activity → Export backup** (v1.1) and save the JSON file in Files. If you changed Safari storage or installed a separate home-screen app, check that version too.

1. Download and extract the ZIP.
2. Open the GitHub repository used for the existing Dex Budget site.
3. Choose **Code → Add file → Upload files**.
4. Drag **all nine files inside the extracted folder** into the repository root. Do **not** upload the ZIP or enclosing folder.
5. If GitHub shows duplicate filenames, use the new versions to replace the originals. Then **Commit changes**.
6. Keep **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
7. Open the same GitHub Pages URL and refresh. The brand should read **GUIDED BETA v1.2**. The home-screen app may need to be closed and reopened before the updated service worker activates.

If you are making a fresh GitHub repository, upload those nine files to the repository root, enable Pages, and visit the GitHub Pages URL in iPhone Safari. Use **Share → Add to Home Screen**.

## What stays the same

- The existing financial calculation and recommendation rules from Guided Beta v1.1.
- The local-storage key: `dex_budget_guided_beta_v1`.
- The stored backup schema (`version: 1`) so the app should retain data on the same origin/browser.
- Guided approval for reallocating flexible spending and optional savings.
- On-device-only storage; no account sync, bank connection or money transfers.

**Do not delete your installed home-screen app or clear website data before exporting your backup.** Safari and home-screen apps may use separate website storage. Updates do not synchronize data between browsers/devices.

## Suggested tester walkthrough

1. Open Home. For first-time users, review the walkthrough and the Start Here card.
2. Open Plan → Pay & cash; enter current cash and income mode. Add a bill from Plan → Bills. Save everyday essentials under Plan → Everyday.
3. Open Add and record actual received income; check Home for updated estimates.
4. Record an actual expense from Add; verify History → Transactions and Home update.
5. Change a bill or essential estimate and review the suggested plan on Home.
6. Use History → Data & backup to export a JSON backup; refresh and check that entries remain.
7. Try keyboard navigation and reduced-motion settings if possible.

## Beta limitations / responsible-use notice

This version has not been financially validated for production. The safe-to-spend figure is a **planning estimate**, not a bank balance or a guarantee of affordability. The user should verify actual account balances and bill dates before spending. Tax reserves are configurable estimates, not a tax determination. Bills do not automatically advance or match recorded bill payments, and pay schedule choices do not yet produce paycheck forecasts. After recording a bill payment, edit or remove the bill manually. This beta tracks allocations, not real bank transfers. Use caution with sensitive financial data on a shared phone; data stays in the browser's local storage unless exported.

## Files

- `index.html` — app layout and CSS
- `app.js` — existing guided budget engine, with updated navigation interactions
- `manifest.webmanifest` — install configuration
- `sw.js` — offline service-worker cache version `dex-guided-v1-2`
- `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — app icons
- `README.md` — release notes and instructions

## Verification

- JavaScript syntax passed Node `--check`.
- App logic passed a DOM-simulated smoke test covering initial rendering, setup, bill entry, income entry, tax reserve, persistence, and navigation function calls.
- Automated full-browser screenshot testing was unavailable in the current runtime, so test the installed version on your iPhone before sharing broadly.
