# Build the Android APK with GitHub Actions

This project uses Vue and Vite to build its web interface, then Capacitor packages
that build in the existing Android project. GitHub Actions builds a **debug APK**
in the cloud, so Android Studio is not needed on your Windows computer.

## What this build does (and does not do)

- The APK runs the Vue app inside Android's WebView. It is not the Electron
  desktop app; Electron's main process and desktop-only APIs do not run on
  Android.
- App records are stored in that installation's browser storage on that phone.
  This does not synchronize data between devices or provide a guaranteed backup.
  Export or back up important business records before uninstalling or resetting
  the app.
- Check camera access, A5/thermal printing, PDF saving/sharing, and layouts on a
  real phone. Android WebView and desktop printing behave differently, and
  hardware-specific behavior may need a Capacitor plugin and Android permission
  handling.
- `app-debug.apk` is for testing and direct installation. It is not a
  Play-Store-ready signed release.

## 1. Confirm the project setup

The Android Capacitor project is already present in `android/`. The project
configuration uses:

- App ID: `com.alnajaf.hardware.rental`
- Web build directory: `dist`
- Node.js 22, Java 21, and Android SDK platform 36 in cloud builds

The relevant files are `capacitor.config.json`,
`android/app/build.gradle`, and `.github/workflows/build-apk.yml`. Keep the
`package-lock.json` file in the repository; the workflow uses `npm ci` to install
the exact locked dependencies.

If you are starting from a fresh clone on Windows, install Node.js 22 LTS and
Git. Android Studio is not needed for this GitHub Actions build. Open PowerShell
in the project folder:

```powershell
cd C:\Users\Zeshan\my-software
npm ci
npm run android:sync
```

`android:sync` builds the Vite website into `dist` and copies it into
`android/`. You do not need to run `cap add android` because the Android project
is already included. If you intentionally recreate the Android project, first
back it up, then use `npx cap add android`; do not do this on top of the existing
`android/` directory.

## 2. Push the project to GitHub

Create an empty repository on GitHub (do not initialize it with a README or
license if you already have project files). In PowerShell, from the project
folder, initialize Git if needed and review what will be committed:

```powershell
git init
git status --short
```

The generated Windows `release/` directory, `node_modules/`, Vite `dist/`, and
Android build outputs are ignored. Stage and commit the source:

```powershell
git add .
git status
git commit -m "Prepare Android build"
```

Set the remote URL to your GitHub repository and push the `main` branch (replace
the example URL with your own):

```powershell
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

If `git remote add origin` says that `origin` already exists, use
`git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git`
instead, then push.

## 3. Let GitHub Actions build the APK

The workflow at `.github/workflows/build-apk.yml` starts automatically for:

- pushes to `main`;
- pull requests targeting `main`; or
- a manual run from the repository's **Actions** tab using **Build Android
  debug APK** → **Run workflow**.

In GitHub, open the repository's **Actions** tab, select the latest
**Build Android debug APK** run, and wait for it to finish successfully. The
workflow checks out the source, installs Node 22 and Java 21, installs Android
SDK platform 36, runs `npm ci`, builds and syncs the Vue app, then runs Gradle
`assembleDebug`.

## 4. Download and install on an Android phone

1. On the successful Actions run, scroll to **Artifacts**.
2. Download `al-najaf-hardware-rental-debug-apk`. GitHub downloads it as a ZIP
   archive.
3. Extract the ZIP and locate `app-debug.apk`.
4. Transfer `app-debug.apk` to your phone (for example, download it directly
   from GitHub Actions in the phone's browser, or transfer it by USB).
5. Open the APK on the phone. If Android asks, allow the browser or file manager
   to **install unknown apps**, then confirm **Install**.
6. Launch **Al Najaf Hardware Rental** and test the important workflows. Keep
   the APK private because it contains the application itself, and do not treat
   a debug build as suitable for public distribution.

Installing a later debug APK with the same app ID normally updates the existing
app when signed with the same debug key. Android can reject it if the signing
key differs; uninstalling first may resolve that, but will erase that
installation's local app data.

## Troubleshooting

- **Workflow not listed:** ensure `.github/workflows/build-apk.yml` is committed
  on the repository's default branch, then open the **Actions** tab.
- **Build fails after dependencies change:** update and commit both
  `package.json` and `package-lock.json`; `npm ci` deliberately fails if they
  disagree.
- **Blank or old content in the APK:** confirm `npm run build` succeeds and
  that `npm run android:sync` is run before Gradle. The workflow already does
  both in order.
- **APK not found:** open the Actions job logs. The upload step fails rather
  than silently succeeding if Gradle did not produce the expected APK.
- **Need a store/release build:** create a separately signed release build and
  keep its signing key and passwords in protected GitHub Actions secrets. Do
  not put keystores or credentials in the repository.
