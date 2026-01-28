"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const next_1 = __importDefault(require("next"));
const pos_1 = require("./ipc/pos");
const index_1 = require("./db/index");
let mainWindow = null;
let nextServer = null;
const isDev = !electron_1.app.isPackaged;
const createMainWindow = async (startUrl) => {
    const preloadPath = path_1.default.join(__dirname, "preload.js");
    mainWindow = new electron_1.BrowserWindow({
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
            electron_1.shell.openExternal(url);
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
    const appDir = electron_1.app.getAppPath();
    const nextApp = (0, next_1.default)({ dev: false, dir: appDir });
    await nextApp.prepare();
    const handler = nextApp.getRequestHandler();
    return new Promise((resolve) => {
        const server = (0, http_1.createServer)((req, res) => handler(req, res));
        server.listen(0, "127.0.0.1", () => {
            nextServer = server;
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 3000;
            resolve(`http://localhost:${port}`);
        });
    });
};
const createApp = async () => {
    (0, index_1.initDb)();
    (0, pos_1.registerPosIpc)();
    if (isDev) {
        await createMainWindow("http://localhost:3000");
        return;
    }
    const url = await startNextServer();
    await createMainWindow(url);
};
electron_1.app.setAppUserModelId("com.lukman.smartpos");
electron_1.app.whenReady().then(createApp);
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createApp();
    }
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("before-quit", () => {
    if (nextServer) {
        nextServer.close();
        nextServer = null;
    }
});
