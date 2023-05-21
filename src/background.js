'use strict'
import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import nodeChildProcess from 'child_process';
import si from 'systeminformation';
import 'isomorphic-fetch';
import config from '../assistant_config.mjs'

const isDevelopment = process.env.NODE_ENV !== 'production'

let win;

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: false
    },
    show: false,
    fullscreen: true
  })

  win.show();
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}


function handleNotification(data) {
  try {
    const events = JSON.parse(data);
    events.forEach(event => {
      console.log(`${event.name}: ${event.value}`);
      win.webContents.send(event.name, event.value);
    });
  } catch (error) {
    console.log(`ERR: parsing failed: ${data}`);
  } 
}

const speechToTextService = config.useLocalSpeechToText ? 'vosk' : 'google';

const startVoskChildProcess = true;
if (startVoskChildProcess) {
  let script = nodeChildProcess.spawn('node', [`src/voice_assistant_${speechToTextService}.mjs`]);
  script.stdout.on('data', handleNotification);
  
  process.on('exit', function() {
    console.log('Killing child process onexit!');
    script.kill();
  });
}
const tempratureCheckIntervall = 5000

function checkCpuTemprature() {
    si.cpuTemperature().then((result) => {
        if (result) {
            const mainTemp = result.main;
            if (win && win.webContents) {
              win.webContents.send('cpu', mainTemp);
            }
        }
    })
}

checkCpuTemprature();
setInterval(checkCpuTemprature, tempratureCheckIntervall);