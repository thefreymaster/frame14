// Where the end-to-end suite runs the server and the stub Home Assistant
// (playwright.config.ts starts them): not the dev server's 3000 / 4000, nor
// the preview tooling's (8311 / 4111), so it runs beside either.
//
// **A pair for every worker** (since 0.178.1): the specs steer the house — a light
// turned off, a game kicked off, the frames sent to a view — so two of them
// can't share one stub and one server, and until then the suite ran one test
// at a time, 18 minutes of it. Each worker has its own stub and its own
// server now, ten ports apart, and spec files run side by side.
//
// Playwright numbers its workers 0…n-1 (`TEST_PARALLEL_INDEX`; a worker
// restarted after a failure keeps its number), and this module is evaluated
// in each worker's own process, the config with it: STUB_URL, APP_URL and
// everything made of them — the config's baseURL, the suite's storage — are
// that worker's. Where there is no worker (the process that starts the
// servers), they are the first pair's.
const FIRST_STUB_PORT = 8310;
const FIRST_APP_PORT = 4110;

/** The stub's and the server's ports for worker `slot`. */
export const stubPort = (slot: number) => FIRST_STUB_PORT + slot * 10;
export const appPort = (slot: number) => FIRST_APP_PORT + slot * 10;
export const stubUrl = (slot: number) => `http://127.0.0.1:${stubPort(slot)}`;
export const appUrl = (slot: number) => `http://127.0.0.1:${appPort(slot)}`;

/** This process's worker. */
export const SLOT = Number(process.env.TEST_PARALLEL_INDEX ?? 0);
export const STUB_PORT = stubPort(SLOT);
export const APP_PORT = appPort(SLOT);
export const STUB_URL = stubUrl(SLOT);
export const APP_URL = appUrl(SLOT);
