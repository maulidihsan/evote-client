const {app, ipcMain, dialog, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const config = require('./config');
const request = require('request');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow(
    {
      width: 1366, 
      height: 800,
      minWidth:1080,
      minHeight: 768,
      fullscreen: true
    })

  win.setMenu(null);
  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
  if (win === null) {
    createWindow()
  }
})

// Listen for sync message from renderer process
ipcMain.on('login', (event, data) => {  
  let postData = {
    nim: data.nim,
    password: data.password
  }
  let options = {
    method: 'post',
    body: postData,
    json: true,
    url: config.BASE_URL+"/vote/login"
  }
  try{
    request(options, function (err, res, body) {
      if (err) {
        console.error('error posting json: ', err)
      }
      if(body.success){
        global.sharedObj = {token: body.token, nim: postData.nim};
        win.loadURL(url.format({
          pathname: path.join(__dirname, 'vote.html'),
          protocol: 'file:',
          slashes: true
        }))
      }
      else{
        if(body.pernahMemilih){
          win.loadURL(url.format({
            pathname: path.join(__dirname, 'sorry.html'),
            protocol: 'file:',
            slashes: true
          }))
        }
        else{
          event.sender.send('login-reply', body.message);
        }
      }
    });
  }
  catch(error){
    event.sender.send('login-reply', 'Gagal. Cek Koneksi Internet.');
  }
});

ipcMain.on('vote', (event, data) => {
  dialog.showMessageBox({
    type: 'question',
    buttons: ['Ya', 'Tidak'],
    title: 'Konfirmasi',
    cancelId: 1,
    message: 'Sudah yakin dengan pilihan Anda?'
  }, function (response) {
    if (response === 0) { // Runs the following if 'Yes' is clicked
      let options = {
        method: 'post',
        body: data,
        json: true,
        url: config.BASE_URL+"/vote/submit"
      }
      try{
        request(options, function (err, res, body) {
          if (err) {
            console.error('error posting json: ', err)
          }
          if(body.success){
            global.sharedObj = {token: null, nim: null};
            win.loadURL(url.format({
              pathname: path.join(__dirname, 'thanks.html'),
              protocol: 'file:',
              slashes: true
            }))
          }
          else{
            event.sender.send('vote-reply', body.message);
          }
        });
      }
      catch(error){
        event.sender.send('login-reply', 'Gagal. Cek Koneksi Internet.');
      }
    }
  });
});

ipcMain.on('logout', (event, data) => {
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
});

process.on('uncaughtException', function (error) {
  win.webContents.send('error', 'Gagal. Cek Koneksi Internet.');
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.