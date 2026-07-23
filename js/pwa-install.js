(function () {
  'use strict';
  const button = document.getElementById('installAppButton');
  const buttonText = document.getElementById('installAppText');
  const help = document.getElementById('installHelp');
  const helpTitle = document.getElementById('installHelpTitle');
  const helpBody = document.getElementById('installHelpBody');
  const helpClose = document.getElementById('installHelpClose');
  let deferredPrompt = null;

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const lang = () => localStorage.getItem('nitemap-language') || document.documentElement.lang || 'ja';

  function words() {
    return lang() === 'en' ? {
      install:'Install app', title:'Add this map to your Home Screen', close:'Close',
      ios:'<ol><li>Tap the Share button in Safari.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol>',
      generic:'Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.'
    } : {
      install:'アプリを追加', title:'ホーム画面にアプリを追加', close:'閉じる',
      ios:'<ol><li>Safari下部の共有ボタンをタップします。</li><li><strong>「ホーム画面に追加」</strong>を選びます。</li><li>右上の<strong>「追加」</strong>をタップします。</li></ol>',
      generic:'ブラウザのメニューから<strong>「アプリをインストール」</strong>または<strong>「ホーム画面に追加」</strong>を選択してください。'
    };
  }

  function refreshText() {
    const t = words();
    if (buttonText) buttonText.textContent = t.install;
    if (helpTitle) helpTitle.textContent = t.title;
    if (helpClose) helpClose.textContent = t.close;
    if (helpBody) helpBody.innerHTML = isIOS() ? t.ios : t.generic;
  }

  function showHelp() { refreshText(); help.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeHelp() { help.hidden = true; document.body.style.overflow = ''; }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (!isStandalone()) button.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    button.hidden = true;
    closeHelp();
  });

  button.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.hidden = true;
    } else {
      showHelp();
    }
  });
  helpClose.addEventListener('click', closeHelp);
  help.addEventListener('click', event => { if (event.target === help) closeHelp(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !help.hidden) closeHelp(); });
  const languageToggle = document.getElementById('languageToggle');
  if (languageToggle) languageToggle.addEventListener('click', () => setTimeout(refreshText, 0));

  if (!isStandalone() && isIOS()) button.hidden = false;
  refreshText();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => console.error('Service worker registration failed:', error));
    });
  }
})();
