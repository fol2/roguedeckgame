import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const host = "127.0.0.1";

let previewProcess: ChildProcessWithoutNullStreams | undefined;
let browserProcess: ChildProcessWithoutNullStreams | undefined;
let browserUserDataDir: string | undefined;

type CdpMessage = {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: unknown;
};

const findFreePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        const port = address.port;
        server.close(() => resolve(port));
        return;
      }
      server.close(() => reject(new Error("Unable to allocate localhost port.")));
    });
  });

const fetchWithRetry = async (url: string): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

afterEach(() => {
  previewProcess?.kill();
  previewProcess = undefined;
  browserProcess?.kill();
  browserProcess = undefined;
  if (browserUserDataDir) {
    rmSync(browserUserDataDir, { force: true, maxRetries: 5, recursive: true, retryDelay: 100 });
    browserUserDataDir = undefined;
  }
});

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
];

const findChromeExecutable = (): string => {
  const executable = chromeCandidates.find((candidate) => existsSync(candidate));

  if (!executable) {
    throw new Error("No Chrome-compatible browser executable found for localhost smoke.");
  }

  return executable;
};

const launchBrowser = async (url: string): Promise<WebSocket> => {
  browserUserDataDir = mkdtempSync(join(tmpdir(), "roguedeckgame-chrome-"));
  browserProcess = spawn(findChromeExecutable(), [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${browserUserDataDir}`,
    url
  ]);

  const websocketUrl = await new Promise<string>((resolve, reject) => {
    let stderr = "";
    const timeout = setTimeout(() => reject(new Error(`Chrome DevTools endpoint not found. stderr: ${stderr}`)), 10_000);
    browserProcess!.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
    browserProcess!.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  const debugBaseUrl = websocketUrl.replace(/^ws:\/\/([^/]+).*$/, "http://$1");
  const targets = await (await fetchWithRetry(`${debugBaseUrl}/json/list`)).json() as readonly {
    readonly type?: string;
    readonly webSocketDebuggerUrl?: string;
  }[];
  const pageWebsocketUrl = targets.find((target) => target.type === "page")?.webSocketDebuggerUrl;

  if (!pageWebsocketUrl) {
    throw new Error("Chrome page DevTools endpoint not found.");
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(pageWebsocketUrl);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("Unable to open Chrome DevTools websocket.")), { once: true });
  });
};

const createCdpClient = (socket: WebSocket) => {
  let nextId = 0;
  const pending = new Map<number, { resolve: (message: CdpMessage) => void; reject: (error: Error) => void }>();
  const events: CdpMessage[] = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id !== undefined) {
      const callbacks = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        callbacks?.reject(new Error(JSON.stringify(message.error)));
      } else {
        callbacks?.resolve(message);
      }
      return;
    }

    events.push(message);
  });

  const send = (method: string, params: Record<string, unknown> = {}): Promise<CdpMessage> => {
    nextId += 1;
    const id = nextId;
    socket.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  };

  const waitForEvent = async (method: string): Promise<CdpMessage> => {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const eventIndex = events.findIndex((event) => event.method === method);
      if (eventIndex >= 0) {
        return events.splice(eventIndex, 1)[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Timed out waiting for CDP event ${method}.`);
  };

  const evaluateText = async (expression: string): Promise<string> => {
    const response = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    }) as { readonly result?: { readonly result?: { readonly value?: unknown } } };

    return String(response.result?.result?.value ?? "");
  };

  return {
    events,
    send,
    waitForEvent,
    evaluateText
  };
};

const waitForRenderedText = async (
  evaluateText: (expression: string) => Promise<string>,
  expectedText: string
): Promise<string> => {
  let lastText = "";

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastText = await evaluateText("document.body.innerText");
    if (lastText.includes(expectedText)) {
      return lastText;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return lastText;
};

describe("Vite preview localhost smoke", () => {
  it("serves the game app and content workbench routes from the built bundle", async () => {
    const build = spawnSync("npm", ["run", "build", "--silent"], {
      cwd: root,
      encoding: "utf8",
      shell: false
    });
    expect(build.status, build.stderr || build.stdout).toBe(0);

    const port = await findFreePort();
    previewProcess = spawn(
      process.execPath,
      [
        join(root, "node_modules/vite/bin/vite.js"),
        "preview",
        "--host",
        host,
        "--port",
        String(port),
        "--strictPort"
      ],
      { cwd: root }
    );

    const appUrl = `http://${host}:${port}/`;
    const workbenchUrl = `http://${host}:${port}/workbench/content`;
    const appResponse = await fetchWithRetry(appUrl);
    const workbenchResponse = await fetchWithRetry(workbenchUrl);
    const appHtml = await appResponse.text();
    const workbenchHtml = await workbenchResponse.text();
    const appAssetPaths = [...appHtml.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
      .map((match) => match[1]);

    expect(appHtml).toContain("<title>Pet Roguelite Deckbuilder</title>");
    expect(workbenchHtml).toContain("<title>Pet Roguelite Deckbuilder</title>");
    expect(appHtml).toContain("<div id=\"game-root\"></div>");
    expect(workbenchHtml).toContain("<div id=\"game-root\"></div>");
    expect(appAssetPaths.length).toBeGreaterThan(0);

    for (const assetPath of appAssetPaths) {
      const assetResponse = await fetchWithRetry(new URL(assetPath, `http://${host}:${port}/`).toString());
      expect(assetResponse.ok).toBe(true);
    }

    const socket = await launchBrowser(workbenchUrl);
    const browser = createCdpClient(socket);
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    await browser.send("Log.enable");
    await browser.send("Page.navigate", { url: workbenchUrl });
    await browser.waitForEvent("Page.loadEventFired");
    const renderedText = await waitForRenderedText(browser.evaluateText, "Content Workbench");

    expect(renderedText).toContain("Content Workbench");
    await browser.evaluateText("document.querySelector('[data-testid=\"workbench-collection-decks\"]')?.click(); document.body.innerText");
    expect(await browser.evaluateText("document.body.innerText")).toContain("Deck view");
    await browser.evaluateText("document.querySelector('[data-testid=\"workbench-collection-runMapTemplates\"]')?.click(); document.body.innerText");
    const levelText = await browser.evaluateText("document.body.innerText");
    expect(levelText).toContain("Level viewer");
    expect(levelText).toContain("Charred Stag");

    const browserErrors = browser.events.filter((event) =>
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Log.entryAdded" && JSON.stringify(event.params).includes("\"level\":\"error\""))
    );
    expect(browserErrors).toEqual([]);
    socket.close();
  }, 30_000);
});
