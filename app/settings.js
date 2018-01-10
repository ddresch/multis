const electron = require('electron')
const settings = require('electron-settings')
const {ipcRenderer} = require('electron')

let c = null

// Init tabs
window.addEventListener('load', () => {
  tabGroup1 = document.getElementById('tab-group')
  tabGroup1.addEventListener('tabActivate', (event) => {
    const tabs = document.getElementsByClassName('tab-content')
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].style.display = 'none'
      // check if selected tab
      if(tabs[i].className.indexOf(event.detail.tab.id) > -1) {
        tabs[i].style.display = 'block'
      }
    }
  }, false)
  // current state of settings
  c = settings.getAll()
}, false)

//
// General
//
// monitor count
const displays = electron.screen.getAllDisplays()
const mCnt = displays.length
document.getElementById('mCnt').textContent = mCnt
// reloadTimeout
const reloadTimeout = document.getElementById('reloadTimeout')
reloadTimeout.value = c.reloadTimeout
reloadTimeout.oninput = () => {
  settings.set('reloadTimeout', reloadTimeout.value)
}

//
// MQTT
//
const mqttEnabled = document.getElementById('mqttEnabled')

const checkReconnect = () => {
  if(mqttEnabled.checked) ipcRenderer.send('mqtt-reconnect')
}

mqttEnabled.checked = c.mqtt.enabled
mqttEnabled.onclick = () => {
  settings.set('mqtt.enabled', mqttEnabled.checked)
  checkReconnect()
}
const mqttServer = document.getElementById('mqttServer')
mqttServer.value = c.mqtt.url
mqttServer.oninput = () => {
  settings.set('mqtt.url', mqttServer.value)
  checkReconnect()
}
const mqttNamespace = document.getElementById('mqttNamespace')
mqttNamespace.value = c.mqtt.ns
mqttNamespace.oninput = () => {
  settings.set('mqtt.ns', mqttNamespace.value)
  checkReconnect()
}
ipcRenderer.on('mqtt-status', (event, arg) => {
  console.log('mqtt-status', arg)
  const badge = document.getElementById('connStatus')
  badge.textContent = (arg) ? 'connected' : 'disconnected'
  badge.classList.remove('active')
  if(arg) badge.classList.add('active')
})

const checkMqttStatusLoop = setInterval(() => {
  ipcRenderer.send('get-mqtt-status')
}, 5000)

//
// URLs
//
const refreshUrlList = () => {
  const list = document.getElementById('urlList')
  while(list.firstChild) {
    list.removeChild(list.firstChild)
  }
  for (var i = 0; i < c.windows.length; i++) {
    const div = document.createElement('div')
    div.classList.add('media-body')
    const counter = document.createElement('p')
    counter.textContent = (i + 1) + '. Monitor'
    counter.classList.add('list-item-counter')
    const p = document.createElement('p')
    p.textContent = c.windows[i].url
    p.classList.add('list-item-url')
    const icn = document.createElement('span')
    icn.classList.add('icon')
    icn.classList.add('icon-trash')
    const btn = document.createElement('button')
    btn.setAttribute('data-window-id', i.toString())
    btn.classList.add('btn')
    btn.classList.add('btn-mini')
    btn.classList.add('pull-right')
    btn.appendChild(icn)
    btn.onclick = (evt) => {
      // TODO add delete question dialog
      // https://electronjs.org/docs/api/dialog
      c.windows.splice(
        parseInt(evt.currentTarget.getAttribute('data-window-id')),
        1
      )
      settings.setAll(c)
      refreshUrlList()
    }
    const icnReload = document.createElement('span')
    icnReload.classList.add('icon')
    icnReload.classList.add('icon-cw')
    const btn2 = document.createElement('button')
    btn2.setAttribute('data-window-id', i.toString())
    btn2.classList.add('btn')
    btn2.classList.add('btn-mini')
    btn2.classList.add('pull-right')
    btn2.appendChild(icnReload)
    btn2.onclick = (evt) => {
      ipcRenderer.send(
        'reload-window-by-id',
        evt.currentTarget.getAttribute('data-window-id')
      )
    }
    counter.appendChild(btn)
    counter.appendChild(btn2)
    div.appendChild(counter)
    div.appendChild(p)
    const li = document.createElement('li')
    li.classList.add('list-group-item')
    li.appendChild(div)
    list.appendChild(li)
  }
}
refreshUrlList()

//
// button handlers
//
const urlAdd = document.getElementById('urlAdd')
urlAdd.onclick = () => {
  const urlValue = document.getElementById('urlAddValue')
  if(urlValue.value === '') return
  c.windows.push({
    url: urlValue.value
  })
  settings.setAll(c)
  urlValue.value = ''
  refreshUrlList()
}

const saveBtn = document.querySelector('#saveSettingsBtn')
saveBtn.addEventListener('click', function (e) {

  ipcRenderer.sendSync('close-settings-window')
});

const closeBtn = document.querySelector('#closeSettingsBtn')
closeBtn.addEventListener('click', function (e) {
  ipcRenderer.sendSync('close-settings-window')
});
