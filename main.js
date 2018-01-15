const electron = require('electron')
const settings = require('electron-settings')
const mqtt = require('mqtt')
const {ipcMain} = require('electron')
const isDev = require('electron-is-dev')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu

let mc = null // mqttClient
let mqttConnected = false
let settingsWin = null
let welcomeWin = null
let windows = [] // keeps references of all windows
//
// configuration defaults
//
let config = {
  mqtt: {
    enabled: true,
    url: 'tcp://localhost',
    ns: 'your/custom/namespace',
  },
  windows: [],
  reloadTimeout: 5,
}

function initApp() {
  // load persistant configuration
  loadConfiguration()
  // setup app menu
  createMenu()
  // start MQTT listener
  if(config.mqtt.enabled) mqttConnect(config.mqtt)
  // add monitor handler
  initDisplayHandling()
  // open windows
  if(config.windows.length > 0) {
    createWindows()
  }else{
    openWelcome()
  }
}

function initDisplayHandling() {
  electron.screen.on('display-added', (evt, disp) => {
    console.log(disp)
  })
}

function createMenu() {
  const template = [{
      label: app.getName(),
      submenu: [
        {role: 'about'},
        {type: 'separator'},
        {
          label: 'Preferences',
          click () { openSettings() }
        },
        {type: 'separator'},
        {role: 'quit'}
      ]
    }
  ]

  if(isDev) {
    template[0].submenu.push({type: 'separator'})
    template[0].submenu.push({
      label: 'Dev-Tools',
      click () { require('electron-debug')({showDevTools: true}) }
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function openSettings() {
  if(settingsWin) return
  settingsWin = new BrowserWindow({
      frame: false,
      height: 600,
      resizable: true,
      width: 500,
  })
  settingsWin.loadURL('file://' + __dirname + '/app/settings.html')
  settingsWin.on('closed', function () { settingsWin = null })
}

function openWelcome() {
  if(welcomeWin) return
  welcomeWin = new BrowserWindow({
      frame: false,
      height: 300,
      resizable: false,
      width: 600,
  })

  welcomeWin.loadURL('file://' + __dirname + '/app/welcome.html')
  welcomeWin.on('closed', function () { welcomeWin = null })
  // welcomeWin.webContents.openDevTools()
}

function loadConfiguration() {
  console.log('Current settings path: ', settings.file())
  const c = settings.getAll()
  if(Object.keys(c).length > 0) config = c
  else settings.setAll(config) // use defaults
  // add watch handler
  settings.watch('reloadTimeout', (newValue, oldValue) => {
    console.log('reloadTimeout changed from ' + oldValue + ' to ' + newValue)
    config = settings.getAll()
  })
}

function mqttConnect(cfg) {
  mc = mqtt.connect(cfg.url, {rejectUnauthorized: false})

  mc.on('connect', function () {
    console.log('MQTT connected to to: ', cfg.url)
    mc.subscribe(cfg.ns + '/#')
    console.log('MQTT subscription: ', cfg.ns + '/#')
    mc.publish(cfg.ns + '/status', 'connected')
    mqttConnected = true
  })

  mc.on('message', function (topic, message) {
    const action = topic.toString().split('/').pop()
    const payload = message.toString()
    const winNum = parseInt(payload)
    // check action keyword
    switch (action) {
      case 'reload':
        if(winNum > 0) {
          console.log('Reload browser window ' + winNum + '.')
          windows[winNum].reload()
        } else {
          console.log('Reload all browser windows.')
          for (var i = 0; i < windows.length; i++) {
            windows[i].reload()
          }
        }
        break
      case 'open-dev-tools':
        console.log('Open all developer tool windows.')
        for (var i = 0; i < windows.length; i++) {
          windows[i].webContents.openDevTools()
        }
        break
    }
  })
}

function mqttReconnect() {
  if(mc) {
    mc.end(() => {
      console.log('MQTT server connection closed, trying to reconnect.')
      loadConfiguration()
      mqttConnect(config.mqtt)
    })
  }
}

function createWindow(wndId, dsp) {
  // Create the browser window for dsp
  windows[wndId] = new BrowserWindow({
    x: dsp.bounds.x,
    y: dsp.bounds.y,
    width: dsp.size.width,
    height: dsp.size.height,
    frame: false,
  })
  const wnd = windows[wndId]
  wnd.loadURL(config.windows[wndId].url)
  // add window events
  wnd.on('closed', () => windows[wndId] = null)
  wnd.webContents.on('did-fail-load', function(e) {
    const timeout = (config.reloadTimeout) ? parseInt(config.reloadTimeout) * 1000 : false
    console.log('Start reload in ' + timeout + ' milliseconds.')
    if(windows[wndId] && timeout) {
      setTimeout(() => {
        console.log('Reload Window with ID: ' + wndId)
        wnd.reload()
      }, timeout)
    }
  })
  // switch to fullscreen
  // TODO add to monitor settings
  wnd.setFullScreen(true)
}

function createWindows() {
  let displays = electron.screen.getAllDisplays()
  windows = []

  for (var i = 0; i < displays.length; i++) {
    const wndId = i
    if(displays[wndId] && config.windows[wndId]) {
      createWindow(wndId, displays[wndId])
    }
    // if(config.windows[i]) {
    //   const wndId = i
    //   // Create the browser windows
    //   const dsp = displays[wndId]
    //   windows[wndId] = new BrowserWindow({
    //     x: dsp.bounds.x,
    //     y: dsp.bounds.y,
    //     width: dsp.size.width,
    //     height: dsp.size.height,
    //     frame: false,
    //   })
    //   const wnd = windows[wndId]
    //   wnd.loadURL(config.windows[wndId].url)
    //   // add window events
    //   wnd.on('closed', () => windows[wndId] = null)
    //   wnd.webContents.on('did-fail-load', function(e) {
    //     const timeout = (config.reloadTimeout) ? parseInt(config.reloadTimeout) * 1000 : false
    //     console.log('Start reload in ' + timeout + ' milliseconds.')
    //     if(windows[wndId] && timeout) {
    //       setTimeout(() => {
    //         console.log('Reload Window with ID: ' + wndId)
    //         wnd.reload()
    //       }, timeout)
    //     }
    //   })
    // }
  }
}

app.on('ready', initApp)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (windows[0] === null) {
    createWindow()
  }
})

ipcMain.on('close-settings-window', function () {
  if (settingsWin) {
    settingsWin.close()
  }
})

ipcMain.on('save-and-close-settings-window', function (evt, c) {
  if (settingsWin) {
    settings.setAll(c)
    config = settings.getAll()
    settingsWin.close()
  }
})

ipcMain.on('open-settings-window', function () {
  if(settingsWin) return
  openSettings()
})

ipcMain.on('close-welcome-window', function () {
  if (welcomeWin) {
    welcomeWin.close()
  }
})

ipcMain.on('get-mqtt-status', (event, arg) => {
  event.sender.send('mqtt-status', mqttConnected)
})

ipcMain.on('mqtt-reconnect', () => {
  console.log('mqtt-reconnect')
  mqttReconnect()
})

ipcMain.on('reload-window-by-id', function (evt, id) {
  const wndId = parseInt(id)
  console.log('reload-window-by-id', wndId)
  if (windows[wndId]) {
    windows[wndId].loadURL(config.windows[wndId].url)
  }else{
    let displays = electron.screen.getAllDisplays()
    if(displays[wndId] && config.windows[wndId]) {
      createWindow(wndId, displays[wndId])
    }
  }
})
