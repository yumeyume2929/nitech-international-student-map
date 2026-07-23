
(function () {
  'use strict';

  const data = (typeof json__1 !== 'undefined' && json__1.features) ? json__1.features : [];
  const initialBounds = [[35.14745325407118, 136.90293875830787], [35.16759260768199, 136.9370799185673]];
  const categoryOrder = ['食事', '食料品', '日用品', '生活サービス', '交流・学習'];
  const categoryConfig = {
    '食事': { color: '#e85d04', icon: 'fa-utensils', ja: '食事', en: 'Food' },
    '食料品': { color: '#218c74', icon: 'fa-shopping-basket', ja: '食料品', en: 'Groceries' },
    '日用品': { color: '#3677a8', icon: 'fa-shopping-bag', ja: '日用品', en: 'Daily goods' },
    '生活サービス': { color: '#7a4fb5', icon: 'fa-concierge-bell', ja: '生活サービス', en: 'Life services' },
    '交流・学習': { color: '#c28a05', icon: 'fa-users', ja: '交流・学習', en: 'Community' },
    'その他': { color: '#65747a', icon: 'fa-map-marker-alt', ja: 'その他', en: 'Other' }
  };

  const uiText = {
    ja: {
      title: '留学生向け生活支援マップ',
      subtitle: '名古屋工業大学周辺の食事・買い物情報',
      language: 'English',
      search: '店名・住所で検索',
      category: 'カテゴリ',
      reset: 'すべて表示',
      unit: '件の施設',
      sort: '名工大からの徒歩時間順',
      notice: '営業時間・対応状況は変更される場合があります。利用前に公式情報をご確認ください。',
      fitAll: '全施設',
      walk: '徒歩',
      min: '分',
      price: '価格帯',
      hours: '営業時間',
      closed: '定休日',
      payment: '支払方法',
      address: '住所',
      english: '英語対応',
      vegetarian: 'ベジタリアン',
      halal: 'ハラール',
      official: '公式情報',
      route: '徒歩ルート',
      noResults: '条件に一致する施設がありません。',
      allShown: 'すべての施設を表示しました。',
      locationTitle: '現在地',
      locationError: '現在地を取得できませんでした。HTTPSで公開すると利用しやすくなります。'
    },
    en: {
      title: 'International Student Life Map',
      subtitle: 'Food, shopping and useful services near NITech',
      language: '日本語',
      search: 'Search by name or address',
      category: 'Categories',
      reset: 'Show all',
      unit: ' places',
      sort: 'Sorted by walking time from NITech',
      notice: 'Opening hours and services may change. Please check the official information before visiting.',
      fitAll: 'All places',
      walk: 'Walk',
      min: 'min',
      price: 'Price',
      hours: 'Hours',
      closed: 'Closed',
      payment: 'Payment',
      address: 'Address',
      english: 'English support',
      vegetarian: 'Vegetarian',
      halal: 'Halal',
      official: 'Official site',
      route: 'Walking route',
      noResults: 'No places match the current filters.',
      allShown: 'All places are shown.',
      locationTitle: 'Your location',
      locationError: 'Your location could not be obtained. This feature works best when the map is published over HTTPS.'
    }
  };

  let language = localStorage.getItem('nitemap-language') || 'ja';
  let selectedCategory = 'all';
  let query = '';
  let selectedFid = null;
  let visibleFeatures = [];
  const markerByFid = new Map();

  const map = L.map('map', { zoomControl: true, minZoom: 11, maxZoom: 19 }).fitBounds(initialBounds);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: 45,
    disableClusteringAtZoom: 18
  }).addTo(map);

  const locate = L.control.locate({
    position: 'topleft',
    strings: { title: uiText[language].locationTitle },
    locateOptions: { maxZoom: 17, enableHighAccuracy: true },
    flyTo: true,
    keepCurrentZoomLevel: false,
    showPopup: false
  }).addTo(map);

  map.on('locationerror', function () { showToast(uiText[language].locationError); });

  const els = {
    title: document.getElementById('appTitle'),
    subtitle: document.getElementById('appSubtitle'),
    languageToggle: document.getElementById('languageToggle'),
    languageText: document.querySelector('#languageToggle span'),
    search: document.getElementById('facilitySearch'),
    clearSearch: document.getElementById('clearSearch'),
    categoryHeading: document.getElementById('categoryHeading'),
    resetFilters: document.getElementById('resetFilters'),
    categories: document.getElementById('categoryFilters'),
    resultCount: document.getElementById('resultCount'),
    resultUnit: document.getElementById('resultUnit'),
    sortHint: document.getElementById('sortHint'),
    list: document.getElementById('facilityList'),
    notice: document.getElementById('dataNotice'),
    fitAll: document.getElementById('fitAll'),
    fitAllLabel: document.getElementById('fitAllLabel'),
    legend: document.getElementById('mapLegend'),
    toast: document.getElementById('toast')
  };

  function safe(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function categoryOf(feature) {
    const c = feature.properties.major_category || 'その他';
    return categoryConfig[c] ? c : 'その他';
  }

  function configFor(feature) { return categoryConfig[categoryOf(feature)]; }

  function displayName(feature) {
    const p = feature.properties;
    return language === 'en' ? (p.name_en || p.name_ja || '') : (p.name_ja || p.name_en || '');
  }

  function secondaryName(feature) {
    const p = feature.properties;
    return language === 'en' ? (p.name_ja || '') : (p.name_en || '');
  }

  function description(feature) {
    const p = feature.properties;
    return language === 'en' ? (p.description_en || p.description_ja || '') : (p.description_ja || p.description_en || '');
  }

  function translatedValue(value) {
    if (language === 'ja' || !value) return value || '';
    const dict = {
      '未確認': 'Not confirmed', '一部対応': 'Some options', '対応': 'Available',
      '簡単な英語対応可': 'Basic English may be available', '英語メニューあり': 'English menu available',
      '日本語のみ': 'Japanese only', 'あり': 'Available', '無休': 'Open daily', '口頭確認': 'Ask staff'
    };
    return dict[value] || value;
  }

  function walkingRouteUrl(feature) {
    const c = feature.geometry.coordinates;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(c[1] + ',' + c[0]) + '&travelmode=walking';
  }

  function createIcon(feature) {
    const cfg = configFor(feature);
    return L.divIcon({
      className: 'facility-div-icon',
      html: '<div class="facility-marker" style="--marker-color:' + cfg.color + '"><i class="fas ' + cfg.icon + '"></i></div>',
      iconSize: [32, 39], iconAnchor: [16, 36], popupAnchor: [0, -35]
    });
  }

  function popupHtml(feature) {
    const p = feature.properties;
    const cfg = configFor(feature);
    const t = uiText[language];
    const details = [];
    if (p.address_ja) details.push(['fa-map-marker-alt', t.address, p.address_ja]);
    if (p.opening_hours) details.push(['fa-clock', t.hours, p.opening_hours]);
    if (p.closed_days) details.push(['fa-calendar-times', t.closed, p.closed_days]);
    if (p.payment) details.push(['fa-credit-card', t.payment, p.payment]);
    if (p.english_support) details.push(['fa-language', t.english, translatedValue(p.english_support)]);
    if (p.vegetarian && p.vegetarian !== '未確認') details.push(['fa-leaf', t.vegetarian, translatedValue(p.vegetarian)]);
    if (p.halal && p.halal !== '未確認') details.push(['fa-moon', t.halal, translatedValue(p.halal)]);

    const badges = [];
    if (p.walk_min !== null && p.walk_min !== undefined && p.walk_min !== '') badges.push('<span class="popup-badge"><i class="fas fa-walking"></i> ' + t.walk + ' ' + safe(p.walk_min) + ' ' + t.min + '</span>');
    if (p.price_range) badges.push('<span class="popup-badge"><i class="fas fa-yen-sign"></i> ' + safe(p.price_range) + '</span>');
    if (p.minor_category) badges.push('<span class="popup-badge">' + safe(p.minor_category) + '</span>');

    const officialClass = p.official_url ? '' : ' disabled';
    const officialHref = p.official_url ? safe(p.official_url) : '#';

    return '<article class="popup-card">' +
      '<div class="popup-header" style="background:' + cfg.color + '">' +
        '<div class="popup-category">' + safe(language === 'en' ? cfg.en : cfg.ja) + '</div>' +
        '<h3>' + safe(displayName(feature)) + '</h3>' +
        (secondaryName(feature) ? '<div class="popup-en-name">' + safe(secondaryName(feature)) + '</div>' : '') +
      '</div>' +
      '<div class="popup-body">' +
        '<div class="popup-badges">' + badges.join('') + '</div>' +
        (description(feature) ? '<p class="popup-description">' + safe(description(feature)) + '</p>' : '') +
        '<div class="popup-details">' + details.map(function (row) {
          return '<div class="popup-row"><i class="fas ' + row[0] + '"></i><div><strong>' + safe(row[1]) + ':</strong> ' + safe(row[2]) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="popup-actions">' +
          '<a class="popup-btn' + officialClass + '" href="' + officialHref + '" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> ' + t.official + '</a>' +
          '<a class="popup-btn primary" href="' + walkingRouteUrl(feature) + '" target="_blank" rel="noopener"><i class="fas fa-route"></i> ' + t.route + '</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function buildMarkers() {
    data.forEach(function (feature) {
      const c = feature.geometry.coordinates;
      const marker = L.marker([c[1], c[0]], { icon: createIcon(feature), title: displayName(feature) });
      marker.feature = feature;
      marker.bindPopup(function () { return popupHtml(feature); }, { maxWidth: 360 });
      marker.on('click', function () {
        selectedFid = String(feature.properties.fid);
        highlightCard();
      });
      markerByFid.set(String(feature.properties.fid), marker);
    });
  }

  function renderCategoryControls() {
    const counts = {};
    data.forEach(function (f) { const c = categoryOf(f); counts[c] = (counts[c] || 0) + 1; });
    els.categories.innerHTML = '';
    categoryOrder.forEach(function (cat) {
      if (!counts[cat]) return;
      const cfg = categoryConfig[cat];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'category-chip' + (selectedCategory === cat ? ' active' : '');
      button.style.setProperty('--chip-color', cfg.color);
      button.dataset.category = cat;
      button.innerHTML = '<span class="dot"></span><span>' + safe(language === 'en' ? cfg.en : cfg.ja) + '</span><span class="count">' + counts[cat] + '</span>';
      button.addEventListener('click', function () {
        selectedCategory = selectedCategory === cat ? 'all' : cat;
        applyFilters(true);
      });
      els.categories.appendChild(button);
    });
  }

  function matches(feature) {
    if (selectedCategory !== 'all' && categoryOf(feature) !== selectedCategory) return false;
    if (!query) return true;
    const p = feature.properties;
    const haystack = [p.name_ja, p.name_en, p.address_ja, p.major_category, p.minor_category, p.description_ja, p.description_en]
      .filter(Boolean).join(' ').toLocaleLowerCase();
    return haystack.includes(query.toLocaleLowerCase());
  }

  function sortedFeatures(features) {
    return features.slice().sort(function (a, b) {
      const av = Number(a.properties.walk_min); const bv = Number(b.properties.walk_min);
      if (Number.isFinite(av) && Number.isFinite(bv)) return av - bv;
      if (Number.isFinite(av)) return -1;
      if (Number.isFinite(bv)) return 1;
      return displayName(a).localeCompare(displayName(b), language === 'ja' ? 'ja' : 'en');
    });
  }

  function renderList() {
    const t = uiText[language];
    els.list.innerHTML = '';
    if (!visibleFeatures.length) {
      els.list.innerHTML = '<div class="empty-state"><i class="fas fa-search-location"></i>' + t.noResults + '</div>';
      return;
    }
    visibleFeatures.forEach(function (feature) {
      const p = feature.properties;
      const cfg = configFor(feature);
      const card = document.createElement('article');
      card.className = 'facility-card' + (selectedFid === String(p.fid) ? ' selected' : '');
      card.dataset.fid = String(p.fid);
      card.tabIndex = 0;
      const pills = [];
      if (p.walk_min !== null && p.walk_min !== undefined && p.walk_min !== '') pills.push('<span class="meta-pill"><i class="fas fa-walking"></i>' + t.walk + ' ' + safe(p.walk_min) + ' ' + t.min + '</span>');
      if (p.minor_category) pills.push('<span class="meta-pill">' + safe(p.minor_category) + '</span>');
      if (p.price_range) pills.push('<span class="meta-pill">' + safe(p.price_range) + '</span>');
      card.innerHTML = '<div class="card-top">' +
        '<div class="category-icon" style="--marker-color:' + cfg.color + '"><i class="fas ' + cfg.icon + '"></i></div>' +
        '<div class="card-copy"><h2>' + safe(displayName(feature)) + '</h2>' +
          (secondaryName(feature) ? '<div class="en-name">' + safe(secondaryName(feature)) + '</div>' : '') +
        '</div></div>' +
        '<div class="card-meta">' + pills.join('') + '</div>' +
        (description(feature) ? '<p class="card-description">' + safe(description(feature)) + '</p>' : '');
      function activate() { focusFeature(feature); }
      card.addEventListener('click', activate);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
      els.list.appendChild(card);
    });
  }

  function highlightCard() {
    document.querySelectorAll('.facility-card').forEach(function (el) { el.classList.toggle('selected', el.dataset.fid === selectedFid); });
  }

  function focusFeature(feature) {
    const fid = String(feature.properties.fid);
    selectedFid = fid;
    const marker = markerByFid.get(fid);
    if (!marker) return;
    const latlng = marker.getLatLng();
    map.flyTo(latlng, Math.max(map.getZoom(), 17), { duration: .55 });
    cluster.zoomToShowLayer(marker, function () { marker.openPopup(); });
    highlightCard();
  }

  function updateMapLayers() {
    cluster.clearLayers();
    visibleFeatures.forEach(function (f) {
      const marker = markerByFid.get(String(f.properties.fid));
      if (marker) {
        marker.setIcon(createIcon(f));
        marker.setTooltipContent && marker.setTooltipContent(displayName(f));
        cluster.addLayer(marker);
      }
    });
  }

  function updateText() {
    const t = uiText[language];
    document.documentElement.lang = language;
    els.title.textContent = t.title;
    els.subtitle.textContent = t.subtitle;
    els.languageText.textContent = t.language;
    els.search.placeholder = t.search;
    els.categoryHeading.textContent = t.category;
    els.resetFilters.textContent = t.reset;
    els.resultUnit.textContent = t.unit;
    els.sortHint.textContent = t.sort;
    els.notice.textContent = t.notice;
    els.fitAllLabel.textContent = t.fitAll;
    if (locate && locate.options && locate.options.strings) locate.options.strings.title = t.locationTitle;
  }

  function renderLegend() {
    els.legend.innerHTML = categoryOrder.map(function (cat) {
      const cfg = categoryConfig[cat];
      return '<span class="legend-item"><span class="legend-dot" style="background:' + cfg.color + '"></span>' + safe(language === 'en' ? cfg.en : cfg.ja) + '</span>';
    }).join('');
  }

  function applyFilters(fit) {
    visibleFeatures = sortedFeatures(data.filter(matches));
    els.resultCount.textContent = visibleFeatures.length;
    els.clearSearch.classList.toggle('visible', !!query);
    renderCategoryControls();
    updateMapLayers();
    renderList();
    renderLegend();
    if (fit && visibleFeatures.length) fitVisible();
  }

  function fitVisible() {
    const layers = visibleFeatures.map(function (f) { return markerByFid.get(String(f.properties.fid)); }).filter(Boolean);
    if (!layers.length) return;
    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds().pad(.18), { maxZoom: 16 });
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2600);
  }

  els.search.addEventListener('input', function () { query = els.search.value.trim(); applyFilters(false); });
  els.clearSearch.addEventListener('click', function () { els.search.value = ''; query = ''; els.search.focus(); applyFilters(false); });
  els.resetFilters.addEventListener('click', function () {
    selectedCategory = 'all'; query = ''; els.search.value = ''; applyFilters(true); showToast(uiText[language].allShown);
  });
  els.fitAll.addEventListener('click', fitVisible);
  els.languageToggle.addEventListener('click', function () {
    language = language === 'ja' ? 'en' : 'ja';
    localStorage.setItem('nitemap-language', language);
    updateText();
    applyFilters(false);
    map.eachLayer(function (layer) {
      if (layer.feature && layer.getPopup && layer.getPopup()) layer.setPopupContent(popupHtml(layer.feature));
    });
  });

  buildMarkers();
  updateText();
  applyFilters(false);
})();
