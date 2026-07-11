const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const APP_URL = 'https://www.digitalreceipt.ng'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.ico').replace(/\\/g, '/'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
    title: 'DigitalReceipt',
  })

  // Inject custom header on every request so Next.js knows this is the desktop app
  win.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: [APP_URL + '/*'] },
    (details, callback) => {
      details.requestHeaders['x-electron-desktop'] = '1'
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  // Load local hero/country-picker page first
  win.loadFile(path.join(__dirname, 'index.html'))

  const GO_HOME_SIGNAL = APP_URL + '/?__drhome=1'

  // Catch the special home signal URL — fires for full navigations triggered by our JS injection
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return
    if (url.includes('__drhome=1') || url === APP_URL || url === APP_URL + '/') {
      event.preventDefault()
      win.loadFile(path.join(__dirname, 'index.html'))
      return
    }
    if (url.startsWith(APP_URL)) return
    event.preventDefault()
    shell.openExternal(url)
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    // The receipts export opens a blank popup that HTML is written into — allow it
    // as an in-app window so "View & Print" / "Download as PDF" work in the desktop app.
    if (url === 'about:blank' || url.startsWith(APP_URL)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: { width: 1100, height: 800, autoHideMenuBar: true },
      }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const CLEAN_PAGES = ['/free-invoice', '/auth/login', '/auth/register', '/auth/staff-login']

  function injectDesktopUI() {
    const url = win.webContents.getURL()
    if (!url.startsWith(APP_URL)) return

    const pathname = new URL(url).pathname
    const isClean = CLEAN_PAGES.some(p => pathname.startsWith(p))

    const cleanScript = isClean ? `
      (function() {
        var style = document.createElement('style');
        style.textContent = 'header { display: none !important; } footer { display: none !important; }';
        document.head.appendChild(style);

        function hideSections() {
          document.querySelectorAll('section').forEach(function(s) {
            if (s.innerText && (s.innerText.includes('Get the App') || s.innerText.includes('Android app'))) {
              s.style.display = 'none';
            }
          });
        }
        hideSections();
        var obs = new MutationObserver(hideSections);
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(hideSections, 1000);
        setTimeout(hideSections, 2500);
      })();
    ` : ''

    win.webContents.executeJavaScript(`
      ${cleanScript}
      (function() {
        if (window.__drHomePatched) return;
        window.__drHomePatched = true;
        document.addEventListener('click', function(e) {
          var a = e.target.closest('a');
          if (!a) return;
          var href = a.getAttribute('href');
          if (href === '/' || a.href === '${APP_URL}/' || a.href === '${APP_URL}') {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.location.replace('${GO_HOME_SIGNAL}');
          }
        }, true);
      })();
    `)
  }

  win.webContents.on('did-finish-load', injectDesktopUI)

  // Remove default menu bar
  Menu.setApplicationMenu(null)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
