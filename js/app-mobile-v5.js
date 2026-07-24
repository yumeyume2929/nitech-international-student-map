(function () {
  'use strict';

  const data = (typeof json_facilities !== 'undefined' && json_facilities.features) ? json_facilities.features : [];
  const categoryOrder = ['食事', '食料品', '日用品', '商業施設', '医療', '行政・手続き', '郵便局', '生活支援・相談', '図書館・学習', '防災', '観光', 'その他'];
  const categoryConfig = {
    '食事': { color: '#e85d04', icon: 'fa-utensils', ja: '食事', en: 'Food' },
    '食料品': { color: '#218c74', icon: 'fa-shopping-basket', ja: '食料品', en: 'Groceries' },
    '日用品': { color: '#3677a8', icon: 'fa-shopping-bag', ja: '日用品', en: 'Daily goods' },
    '商業施設': { color: '#008c95', icon: 'fa-store', ja: '商業施設', en: 'Shopping centers' },
    '医療': { color: '#d62828', icon: 'fa-hospital', ja: '医療', en: 'Medical' },
    '行政・手続き': { color: '#264653', icon: 'fa-building', ja: '行政・手続き', en: 'Government & procedures' },
    '郵便局': { color: '#8d5524', icon: 'fa-envelope', ja: '郵便局', en: 'Post offices' },
    '生活支援・相談': { color: '#00a6a6', icon: 'fa-hands-helping', ja: '生活支援・相談', en: 'Life support & consultation' },
    '図書館・学習': { color: '#6a4c93', icon: 'fa-book', ja: '図書館・学習', en: 'Libraries & study' },
    '防災': { color: '#d49b00', icon: 'fa-shield-alt', ja: '防災', en: 'Disaster preparedness' },
    '観光': { color: '#d63384', icon: 'fa-camera', ja: '観光', en: 'Sightseeing' },
    'その他': { color: '#65747a', icon: 'fa-map-marker-alt', ja: 'その他', en: 'Other' }
  };
  const scopeOrder = ['all', '名工大周辺', '名古屋市生活支援', '名古屋市代表'];
  const scopeConfig = {
    'all': { color: '#0b5d55', icon: 'fa-globe-asia', ja: 'すべて', en: 'All' },
    '名工大周辺': { color: '#147d70', icon: 'fa-university', ja: '名工大周辺', en: 'Near NITech' },
    '名古屋市生活支援': { color: '#b23a48', icon: 'fa-hands-helping', ja: '生活支援', en: 'Life support' },
    '名古屋市代表': { color: '#7a4fb5', icon: 'fa-city', ja: '市内代表', en: 'Nagoya highlights' }
  };

  const uiText = {
    ja: {
      title: '留学生向け生活支援マップ',
      subtitle: '食事・買い物・医療・行政・観光をまとめた生活情報',
      language: 'English',
      search: '店名・エリア・駅名で検索',
      scope: '表示範囲',
      category: 'カテゴリ',
      reset: 'すべて解除',
      unit: '件の施設',
      sort: 'おすすめ順',
      notice: '営業時間・対応状況は変更される場合があります。利用前に公式情報をご確認ください。',
      fitAll: '表示中の全施設',
      distance: '名工大から',
      km: 'km',
      price: '価格帯',
      hours: '営業時間',
      address: '住所',
      station: '最寄駅',
      area: 'エリア',
      ward: '区',
      recommended: 'おすすめ',
      vegetarian: 'ベジタリアン',
      halal: 'ハラール',
      note: '備考',
      official: '公式情報',
      route: '徒歩ルート',
      noResults: '条件に一致する施設がありません。',
      allShown: 'すべての絞り込みを解除しました。',
      locationTitle: '現在地',
      locationError: '現在地を取得できませんでした。HTTPSで公開すると利用しやすくなります。',
      scopeNear: '名工大周辺',
      scopeCity: '名古屋市内代表',
      scopeSupport: '名古屋市生活支援'
    },
    en: {
      title: 'International Student Life Map',
      subtitle: 'Food, shopping, medical, government and sightseeing information in Nagoya',
      language: '日本語',
      search: 'Search by name, area or station',
      scope: 'Map area',
      category: 'Categories',
      reset: 'Clear filters',
      unit: ' places',
      sort: 'Recommended order',
      notice: 'Opening hours and services may change. Please check official information before visiting.',
      fitAll: 'All visible places',
      distance: 'From NITech',
      km: 'km',
      price: 'Price',
      hours: 'Hours',
      address: 'Address',
      station: 'Nearest station',
      area: 'Area',
      ward: 'Ward',
      recommended: 'Recommended',
      vegetarian: 'Vegetarian',
      halal: 'Halal',
      note: 'Note',
      official: 'Official site',
      route: 'Walking route',
      noResults: 'No places match the current filters.',
      allShown: 'All filters have been cleared.',
      locationTitle: 'Your location',
      locationError: 'Your location could not be obtained. This feature works best over HTTPS.',
      scopeNear: 'Near NITech',
      scopeCity: 'Nagoya highlights',
      scopeSupport: 'Life support in Nagoya'
    }
  };

  let language = localStorage.getItem('nitemap-language') || 'ja';
  let selectedCategory = 'all';
  let selectedScope = 'all';
  let query = '';
  let selectedUid = null;
  let visibleFeatures = [];
  const markerByUid = new Map();

  const map = L.map('map', { zoomControl: true, minZoom: 9, maxZoom: 19 }).setView([35.1709, 136.9066], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: 46,
    disableClusteringAtZoom: 18,
    zoomToBoundsOnClick: false,
    spiderfyOnMaxZoom: false
  }).addTo(map);

  // On phones, tapping a cluster should spread its markers in place instead
  // of changing the map center or zoom level.
  cluster.on('clusterclick', function (event) {
    if (event.layer && typeof event.layer.spiderfy === 'function') {
      event.layer.spiderfy();
    }
  });

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
    scopeHeading: document.getElementById('scopeHeading'),
    scopes: document.getElementById('scopeFilters'),
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

  function uidOf(feature) { return String(feature.properties.uid || feature.properties.id || feature.properties.fid); }
  function categoryOf(feature) {
    const c = feature.properties.major_category || 'その他';
    return categoryConfig[c] ? c : 'その他';
  }
  function configFor(feature) { return categoryConfig[categoryOf(feature)]; }
  function scopeOf(feature) { return feature.properties.scope || '名古屋市代表'; }
  function scopeLabel(feature) {
    const cfg = scopeConfig[scopeOf(feature)] || scopeConfig['名古屋市代表'];
    return language === 'en' ? cfg.en : cfg.ja;
  }
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
      '未確認': 'Not confirmed', '一部対応': 'Some options', '対応': 'Available', '未対応': 'Not available',
      'あり': 'Available', 'なし': 'None', '無休': 'Open daily', '要確認': 'Please check',
      '名工大周辺': 'Near NITech', '名古屋市生活支援': 'Life support', '名古屋市代表': 'Nagoya highlights'
    };
    return dict[value] || value;
  }
  function walkingRouteUrl(feature) {
    const c = feature.geometry.coordinates;
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(c[1] + ',' + c[0]) + '&travelmode=walking';
  }
  function createIcon(feature) {
    const cfg = configFor(feature);
    const scope = scopeOf(feature);
    const markerClass = scope === '名古屋市生活支援' ? ' support-marker' : (scope === '名古屋市代表' ? ' city-marker' : '');
    const size = scope === '名古屋市生活支援' ? [38, 45] : (scope === '名古屋市代表' ? [34, 41] : [32, 39]);
    const anchor = scope === '名古屋市生活支援' ? [19, 42] : (scope === '名古屋市代表' ? [17, 38] : [16, 36]);
    return L.divIcon({
      className: 'facility-div-icon',
      html: '<div class="facility-marker' + markerClass + '" style="--marker-color:' + cfg.color + '"><i class="fas ' + cfg.icon + '"></i></div>',
      iconSize: size,
      iconAnchor: anchor,
      popupAnchor: [0, -36]
    });
  }

  function popupHtml(feature) {
    const p = feature.properties;
    const cfg = configFor(feature);
    const t = uiText[language];
    const details = [];
    if (p.area) details.push(['fa-map', t.area, p.area]);
    if (p.ward) details.push(['fa-city', t.ward, p.ward]);
    if (p.address_ja) details.push(['fa-map-marker-alt', t.address, p.address_ja]);
    if (p.nearest_station) details.push(['fa-subway', t.station, p.nearest_station]);
    if (p.opening_hours) details.push(['fa-clock', t.hours, p.opening_hours]);
    if (p.recommended_item) details.push(['fa-star', t.recommended, p.recommended_item]);
    if (p.vegetarian_status && p.vegetarian_status !== '未確認') details.push(['fa-leaf', t.vegetarian, translatedValue(p.vegetarian_status)]);
    if (p.halal_status && p.halal_status !== '未確認') details.push(['fa-moon', t.halal, translatedValue(p.halal_status)]);
    if (p.notes) details.push(['fa-info-circle', t.note, p.notes]);

    const badges = [];
    if (p.distance_from_nitech_km !== null && p.distance_from_nitech_km !== undefined && p.distance_from_nitech_km !== '') {
      badges.push('<span class="popup-badge"><i class="fas fa-route"></i> ' + t.distance + ' ' + safe(p.distance_from_nitech_km) + ' ' + t.km + '</span>');
    }
    if (p.price_range) badges.push('<span class="popup-badge"><i class="fas fa-yen-sign"></i> ' + safe(p.price_range) + '</span>');
    if (p.minor_category) badges.push('<span class="popup-badge">' + safe(p.minor_category) + '</span>');
    badges.push('<span class="popup-badge scope-badge">' + safe(scopeLabel(feature)) + '</span>');

    const officialClass = p.official_url ? '' : ' disabled';
    const officialHref = p.official_url ? safe(p.official_url) : '#';

    return '<article class="popup-card">' +
      '<div class="popup-header" style="background:' + cfg.color + '">' +
        '<div class="popup-category">' + safe(language === 'en' ? cfg.en : cfg.ja) + ' · ' + safe(scopeLabel(feature)) + '</div>' +
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

  function isMobileLayout() {
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  }

  let mobileSheet;
  let mobileSheetContent;
  function ensureMobileSheet() {
    if (mobileSheet) return;
    mobileSheet = document.createElement('div');
    mobileSheet.className = 'mobile-detail-backdrop';
    mobileSheet.hidden = true;
    mobileSheet.innerHTML = '<section class="mobile-detail-sheet" role="dialog" aria-modal="true" aria-label="施設詳細">' +
      '<button class="mobile-detail-close" type="button" aria-label="閉じる"><i class="fas fa-times"></i></button>' +
      '<div class="mobile-detail-content"></div></section>';
    document.body.appendChild(mobileSheet);
    mobileSheetContent = mobileSheet.querySelector('.mobile-detail-content');
    mobileSheet.querySelector('.mobile-detail-close').addEventListener('click', closeMobileSheet);
    mobileSheet.addEventListener('click', function (event) {
      if (event.target === mobileSheet) closeMobileSheet();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !mobileSheet.hidden) closeMobileSheet();
    });
  }
  function closeMobileSheet() {
    if (!mobileSheet) return;
    mobileSheet.hidden = true;
    document.body.classList.remove('mobile-detail-open');
  }
  function showMobileDetails(feature) {
    ensureMobileSheet();
    mobileSheetContent.innerHTML = popupHtml(feature);
    mobileSheet.hidden = false;
    document.body.classList.add('mobile-detail-open');
  }

  function buildMarkers() {
    data.forEach(function (feature) {
      if (!feature.geometry || !Array.isArray(feature.geometry.coordinates)) return;
      const c = feature.geometry.coordinates;
      const marker = L.marker([c[1], c[0]], { icon: createIcon(feature), title: displayName(feature) });
      marker.feature = feature;
      marker.bindPopup(function () { return popupHtml(feature); }, { maxWidth: 380, autoPan: false, keepInView: false });
      marker.on('click', function () {
        selectedUid = uidOf(feature);
        highlightCard();
        if (isMobileLayout()) {
          // A bottom sheet is used on phones so Leaflet never pans the map
          // to make room for a large popup.
          window.setTimeout(function () { map.closePopup(); }, 0);
          showMobileDetails(feature);
        }
      });
      markerByUid.set(uidOf(feature), marker);
    });
  }

  function renderScopeControls() {
    const counts = { all: data.length };
    data.forEach(function (f) { const s = scopeOf(f); counts[s] = (counts[s] || 0) + 1; });
    els.scopes.innerHTML = '';
    scopeOrder.forEach(function (scope) {
      const cfg = scopeConfig[scope];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scope-chip' + (selectedScope === scope ? ' active' : '');
      button.style.setProperty('--scope-color', cfg.color);
      button.dataset.scope = scope;
      button.innerHTML = '<i class="fas ' + cfg.icon + '"></i><span>' + safe(language === 'en' ? cfg.en : cfg.ja) + '</span><span class="count">' + (counts[scope] || 0) + '</span>';
      button.addEventListener('click', function () {
        selectedScope = scope;
        applyFilters(false);
      });
      els.scopes.appendChild(button);
    });
  }

  function renderCategoryControls() {
    const source = selectedScope === 'all' ? data : data.filter(function (f) { return scopeOf(f) === selectedScope; });
    const counts = {};
    source.forEach(function (f) { const c = categoryOf(f); counts[c] = (counts[c] || 0) + 1; });
    if (selectedCategory !== 'all' && !counts[selectedCategory]) selectedCategory = 'all';
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
        applyFilters(false);
      });
      els.categories.appendChild(button);
    });
  }

  function matches(feature) {
    if (selectedScope !== 'all' && scopeOf(feature) !== selectedScope) return false;
    if (selectedCategory !== 'all' && categoryOf(feature) !== selectedCategory) return false;
    if (!query) return true;
    const p = feature.properties;
    const haystack = [p.name_ja, p.name_en, p.address_ja, p.area, p.ward, p.nearest_station, p.major_category, p.minor_category, p.description_ja, p.description_en, p.recommended_item]
      .filter(Boolean).join(' ').toLocaleLowerCase();
    return haystack.includes(query.toLocaleLowerCase());
  }

  function sortedFeatures(features) {
    return features.slice().sort(function (a, b) {
      const ap = Number(a.properties.app_priority); const bp = Number(b.properties.app_priority);
      if (Number.isFinite(ap) && Number.isFinite(bp) && ap !== bp) return ap - bp;
      const ad = Number(a.properties.distance_from_nitech_km); const bd = Number(b.properties.distance_from_nitech_km);
      if (Number.isFinite(ad) && Number.isFinite(bd) && ad !== bd) return ad - bd;
      if (Number.isFinite(ad) && !Number.isFinite(bd)) return -1;
      if (!Number.isFinite(ad) && Number.isFinite(bd)) return 1;
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
      const uid = uidOf(feature);
      const card = document.createElement('article');
      card.className = 'facility-card' + (selectedUid === uid ? ' selected' : '');
      card.dataset.uid = uid;
      card.tabIndex = 0;
      const pills = [];
      const featureScope = scopeOf(feature);
      const scopeClass = featureScope === '名工大周辺' ? 'near' : (featureScope === '名古屋市生活支援' ? 'support' : 'city');
      const scopeIcon = featureScope === '名工大周辺' ? 'fa-university' : (featureScope === '名古屋市生活支援' ? 'fa-hands-helping' : 'fa-city');
      pills.push('<span class="meta-pill scope-' + scopeClass + '"><i class="fas ' + scopeIcon + '"></i>' + safe(scopeLabel(feature)) + '</span>');
      if (p.distance_from_nitech_km !== null && p.distance_from_nitech_km !== undefined && p.distance_from_nitech_km !== '') pills.push('<span class="meta-pill"><i class="fas fa-route"></i>' + t.distance + ' ' + safe(p.distance_from_nitech_km) + ' ' + t.km + '</span>');
      if (p.area) pills.push('<span class="meta-pill">' + safe(p.area) + '</span>');
      if (p.minor_category) pills.push('<span class="meta-pill">' + safe(p.minor_category) + '</span>');
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
    document.querySelectorAll('.facility-card').forEach(function (el) { el.classList.toggle('selected', el.dataset.uid === selectedUid); });
  }
  function focusFeature(feature) {
    const uid = uidOf(feature);
    selectedUid = uid;
    const marker = markerByUid.get(uid);
    if (!marker) return;

    if (isMobileLayout()) {
      // On mobile, selecting a card opens a bottom sheet and deliberately
      // leaves the map center and zoom unchanged.
      showMobileDetails(feature);
      highlightCard();
      return;
    }

    // Desktop behavior may reveal a clustered marker, where map movement is
    // expected and easier to follow on a larger screen.
    cluster.zoomToShowLayer(marker, function () {
      marker.openPopup();
    });
    highlightCard();
  }
  function updateMapLayers() {
    cluster.clearLayers();
    visibleFeatures.forEach(function (f) {
      const marker = markerByUid.get(uidOf(f));
      if (marker) {
        marker.setIcon(createIcon(f));
        marker.options.title = displayName(f);
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
    els.scopeHeading.textContent = t.scope;
    els.categoryHeading.textContent = t.category;
    els.resetFilters.textContent = t.reset;
    els.resultUnit.textContent = t.unit;
    els.sortHint.textContent = t.sort;
    els.notice.textContent = t.notice;
    els.fitAllLabel.textContent = t.fitAll;
    if (locate && locate.options && locate.options.strings) locate.options.strings.title = t.locationTitle;
  }
  function renderLegend() {
    const present = new Set(visibleFeatures.map(categoryOf));
    els.legend.innerHTML = categoryOrder.filter(function (cat) { return present.has(cat); }).map(function (cat) {
      const cfg = categoryConfig[cat];
      return '<span class="legend-item"><span class="legend-dot" style="background:' + cfg.color + '"></span>' + safe(language === 'en' ? cfg.en : cfg.ja) + '</span>';
    }).join('');
  }
  function applyFilters(fit) {
    visibleFeatures = sortedFeatures(data.filter(matches));
    els.resultCount.textContent = visibleFeatures.length;
    els.clearSearch.classList.toggle('visible', !!query);
    renderScopeControls();
    renderCategoryControls();
    updateMapLayers();
    renderList();
    renderLegend();
    if (fit && visibleFeatures.length) fitVisible();
  }
  function fitVisible() {
    const layers = visibleFeatures.map(function (f) { return markerByUid.get(uidOf(f)); }).filter(Boolean);
    if (!layers.length) return;
    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds().pad(.10), { maxZoom: selectedScope === '名工大周辺' ? 15 : 13 });
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
    selectedScope = 'all'; selectedCategory = 'all'; query = ''; els.search.value = ''; applyFilters(true); showToast(uiText[language].allShown);
  });
  els.fitAll.addEventListener('click', fitVisible);
  els.languageToggle.addEventListener('click', function () {
    language = language === 'ja' ? 'en' : 'ja';
    localStorage.setItem('nitemap-language', language);
    updateText();
    applyFilters(false);
    markerByUid.forEach(function (marker) {
      if (marker.feature && marker.getPopup && marker.getPopup()) marker.setPopupContent(popupHtml(marker.feature));
    });
  });

  buildMarkers();
  updateText();
  applyFilters(false);
  fitVisible();
})();
