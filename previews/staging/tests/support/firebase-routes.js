import { fileURLToPath } from "node:url";

const firebaseCdnBase = "https://www.gstatic.com/firebasejs/10.12.5/";

const moduleFiles = {
  "firebase-app.js": "firebase-app.js",
  "firebase-auth.js": "firebase-auth.js",
  "firebase-firestore.js": "firebase-firestore.js",
  "firebase-test-runtime.js": "firebase-test-runtime.js",
};

export async function installFirebaseRoutes(page) {
  for (const [urlPath, fileName] of Object.entries(moduleFiles)) {
    await page.route(`${firebaseCdnBase}${urlPath}`, (route) =>
      route.fulfill({
        path: fileURLToPath(new URL(`./${fileName}`, import.meta.url)),
        contentType: "text/javascript",
      }),
    );
  }
}
