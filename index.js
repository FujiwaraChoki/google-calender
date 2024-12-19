const path = require("path");
const {
  app,
  BrowserWindow,
  Menu,
  nativeImage,
  session,
  Tray,
} = require("electron");
const { windowStateKeeper } = require("./stateKeeper");
const isDevelopment = require("electron-is-dev");

const iconPath = path.join(
  isDevelopment ? process.cwd() + "/resources" : process.resourcesPath,
  "icon.ico"
);
console.log(`iconPath: ${iconPath}`);

const CALENDER_HOME = "https://calendar.google.com/calendar/u/0/r/week";

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1100,

    maximizable: false,
    minimizable: false,
    icon: iconPath,

    skipTaskbar: !isDevelopment,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(CALENDER_HOME);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    mainWindow.loadURL(url);
    return { action: "deny" };
  });

  windowStateKeeper("main")
    .then((mwk) => {
      if (mwk) {
        const { x, y, width, height } = mwk;
        if (x !== undefined && y !== undefined && width && height) {
          mainWindow.setBounds({
            // set in middle
            x: (x + width) / 2,
            y: (y + height) / 2,
            width: 1100,
            height: 800,
          });
        }
        mwk.track(mainWindow);
      }
    })
    .catch((e) => {
      console.log(`Error in windowStateKeeper:`, e);
    });

  if (isDevelopment) {
    mainWindow.webContents.openDevTools({ mode: "undocked" });
  } else {
    mainWindow.setMenu(null);
    app.setLoginItemSettings({
      openAtLogin: true,
    });
  }

  const isSingleInstance = app.requestSingleInstanceLock();

  if (!isSingleInstance) {
    app.quit();
    mainWindow.focus();
  } else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }

  createTray(mainWindow);
};

const createTray = (mainWindow) => {
  const trayIcon = nativeImage.createFromPath(iconPath);

  const tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Reload",
      click: () => {
        app.relaunch();
        app.exit();
      },
    },
    {
      label: "Logout",
      click: () => {
        session.defaultSession
          .clearStorageData()
          .then(() => {
            mainWindow.loadURL(CALENDER_HOME);
          })
          .catch((e) => {
            console.log(`clearStorageData`, e);
          });
      },
    },
    {
      label: "Exit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.setToolTip("GCW");
  tray.setTitle("GCW");

  tray.on("click", () => {
    mainWindow.show();
  });

  console.log(`Tray icon added`);
};

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
