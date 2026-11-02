// Where the end-to-end suite runs the server and the stub Home Assistant
// (playwright.config.ts starts both): not the dev server's 3000 / 4000, nor
// the preview tooling's, so it runs beside either.
export const STUB_PORT = 8310;
export const APP_PORT = 4110;
export const STUB_URL = `http://127.0.0.1:${STUB_PORT}`;
export const APP_URL = `http://127.0.0.1:${APP_PORT}`;
