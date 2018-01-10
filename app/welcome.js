const electron = require('electron')
const settings = require('electron-settings')
const {ipcRenderer} = require('electron')

window.addEventListener('load', () => {
  // show Multis version number
  const v = require('../package.json').version
  document.getElementById('multisVersion').textContent = v
  // add button handlers
  const closeBtn = document.querySelector('#closeWndBtn')
  closeBtn.addEventListener('click', function (e) {
      ipcRenderer.send('close-welcome-window')
  });
  const opnPrefsBtn = document.querySelector('#openPreferencesBtn')
  opnPrefsBtn.addEventListener('click', function (e) {
      ipcRenderer.send('close-welcome-window')
      ipcRenderer.send('open-settings-window')
  });
}, false)
