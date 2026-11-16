const { app, BrowserWindow } = require('electron')
const path = require('path')

const devServerUrl = process.env.VITE_DEV_SERVER_URL ||
  (process.env.VITE_HOST || process.env.VITE_PORT
    ? `http://${process.env.VITE_HOST || '127.0.0.1'}:${process.env.VITE_PORT || '5175'}`
    : null)

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  const pageLoad = devServerUrl
    ? win.loadURL(devServerUrl)
    : win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  pageLoad.catch((error) => {
    console.error('Failed to load the application window:', error)
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})