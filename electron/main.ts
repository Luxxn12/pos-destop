import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { createServer, Server } from "http";
import next from "next";
import { registerPosIpc } from "./ipc/pos";
import { initDb } from "./db/index";

let mainWindow: BrowserWindow | null = null;
let nextServer: Server | null = null;

const isDev = !app.isPackaged;

const createMainWindow = async (startUrl: string) => {
  const preloadPath = path.join(__dirname, "preload.js");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#0c0b10",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(startUrl)) {
      event.preventDefault();
    }
  });

  await mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
};

const startNextServer = async () => {
  const appDir = app.getAppPath();
  const nextApp = next({ dev: false, dir: appDir });
  await nextApp.prepare();
  const handler = nextApp.getRequestHandler();

  return new Promise<string>((resolve) => {
    const server = createServer((req, res) => handler(req, res));
    server.listen(0, "127.0.0.1", () => {
      nextServer = server;
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 3000;
      resolve(`http://localhost:${port}`);
    });
  });
};

const createApp = async () => {
  initDb();
  registerPosIpc();

  if (isDev) {
    await createMainWindow("http://localhost:3000");
    return;
  }

  const url = await startNextServer();
  await createMainWindow(url);
};

app.setAppUserModelId("com.lukman.smartpos");

app.whenReady().then(createApp);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createApp();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextServer) {
    nextServer.close();
    nextServer = null;
  }
});
