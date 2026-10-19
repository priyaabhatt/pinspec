# Publish to the Chrome Web Store automatically

Once this is set up, every merge to `main` builds pinspec, gives it a new version, uploads it to the Chrome Web Store and submits it for review. Chrome updates everyone who installed it, you included, after Google approves the update (usually within a day or two). There's nothing to zip or upload by hand.

It takes three one-time steps, about 20 minutes in all.

## 1. Publish the first version by hand

The store's API can only update a listing that already exists.

1. Register as a Chrome Web Store developer at https://chrome.google.com/webstore/devconsole (one-time $5 fee).
2. Download `pinspec-0.1.0.zip` from the [v0.1.0 release](https://github.com/priyaabhatt/pinspec/releases/tag/v0.1.0).
3. In the developer dashboard, click **New item** and upload the zip.
4. Fill in the listing from [`store/README.md`](README.md): text, graphics, and the Privacy tab answers. Then click **Submit for review**.
5. Note two IDs for step 3:
   - **Extension ID:** the 32-letter ID on the item's page, e.g. `abcdefghijklmnopabcdefghijklmnop`.
   - **Publisher ID:** in the dashboard's address bar after `devconsole/`, or under **Account**.

## 2. Create API keys in Google Cloud

These let GitHub upload on your behalf. Google changes these screens often; the names you type don't matter.

1. Open https://console.cloud.google.com/apis/credentials and create a project called `pinspec-upload`.
2. Open https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com and click **Enable**.
3. Open https://console.cloud.google.com/auth/overview, click **Get started**, enter an app name (`pinspec-upload`) and your email.
4. For **Audience**, choose **External** (Internal only exists for Google Workspace accounts). Finish the remaining required fields and click **Create**.
5. Under **Audience**, click **Publish app** and confirm. While the app is in "Testing", Google expires the keys after 7 days and uploads would start failing.
6. Click **Clients → Create client**, choose **Desktop app**, name it `pinspec-upload` and click **Create**.
7. Copy the ✅ **Client ID** and ✅ **Client secret**.
8. On your Mac, run this and paste the two values when asked:
   ```sh
   npx chrome-webstore-upload-keys
   ```
   A browser window opens. Sign in with the Google account that owns the store listing and allow access. If Google warns that the app isn't verified, click **Advanced → Go to pinspec-upload**; it's your own app. The tool then prints a ✅ **Refresh token**.

## 3. Add the keys to GitHub

On https://github.com/priyaabhatt/pinspec/settings/secrets/actions, click **New repository secret** for each:

| Name | Value |
| --- | --- |
| `CWS_EXTENSION_ID` | Extension ID from step 1 |
| `CWS_PUBLISHER_ID` | Publisher ID from step 1 |
| `CWS_CLIENT_ID` | Client ID from step 2 |
| `CWS_CLIENT_SECRET` | Client secret from step 2 |
| `CWS_REFRESH_TOKEN` | Refresh token from step 2 |

That's it. The next merge to `main` uploads a new version.

## How it works

- The **Build extension** workflow runs on every merge to `main`. It builds, stamps the version as `major.minor` from `package.json` plus the run number (e.g. `0.1.27`), publishes to the `extension` branch, and, when the secrets are set, uploads to the store and submits for review.
- If the store is still reviewing an earlier version, the upload is skipped with a warning and the next merge tries again. The rest of the build still succeeds.
- For a bigger version (e.g. `0.2`), change `version` in `package.json` and `public/manifest.json` to `0.2.0`; builds then publish as `0.2.N`.
- The **Release** workflow (Actions → Release → Run workflow) makes a GitHub release with a zip, for archiving or for uploading by hand.
