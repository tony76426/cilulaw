/* 慈律律師事務所 - GTM 全站追蹤（GTM-PXLWG8DP）
 * 僅傳送事件種類與公開頁面類別；不收集姓名、電話、Email、諮詢內容或預約日期。
 * GTM 容器仍須於管理介面設定 GA4/Google Ads 標籤及觸發條件，方能傳至分析平台。
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  var file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var sections = {
    'index.html': 'home',
    'appointment.html': 'appointment',
    'contact.html': 'contact',
    'articles.html': 'articles',
    'about.html': 'about',
    'services.html': 'services',
    'team.html': 'team',
    'privacy.html': 'privacy',
    'civil.html': 'civil',
    'criminal.html': 'criminal',
    'family.html': 'family',
    'debt.html': 'debt',
    'inheritance.html': 'inheritance',
    'real-estate.html': 'real_estate'
  };
  var section = sections[file] || 'legal_article';

  function track(eventName, attributes) {
    var details = {
      event: eventName,
      site_section: section
    };
    if (attributes) {
      Object.keys(attributes).forEach(function (key) {
        details[key] = attributes[key];
      });
    }
    window.dataLayer.push(details);
  }

  // 網站內的可辨識轉換入口：通話、LINE、電子郵件、預約與聯絡 CTA。
  // 使用事件委派，不改變連結原本開啟方式；同一次點擊只發送一個對應事件。
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var link = target.closest('a[href]');
    if (!link) return;
    var href = (link.getAttribute('href') || '').trim();
    if (!href) return;

    if (/^tel:/i.test(href)) {
      track('click_phone', { contact_method: 'phone' });
      return;
    }
    if (/^mailto:/i.test(href)) {
      track('click_email', { contact_method: 'email' });
      return;
    }

    var dest;
    try { dest = new URL(href, window.location.href); }
    catch (e) { return; }
    var host = dest.hostname.toLowerCase();
    if (host === 'line.me' || host === 'lin.ee' || host === 'line.naver.jp') {
      track('click_line', { contact_method: 'line' });
      return;
    }
    if (host === 'maps.app.goo.gl' || host === 'maps.google.com' ||
        (host === 'www.google.com' && /^\/maps(?:\/|$)/.test(dest.pathname))) {
      track('click_map_directions');
      return;
    }

    // 只將同網站導覽點擊當作預約 / 聯絡入口（不包含外部站點連結）。
    if (dest.origin !== window.location.origin) return;
    var destination = dest.pathname.split('/').pop().toLowerCase();
    if (destination === 'appointment.html') {
      track('click_appointment_cta');
    } else if (destination === 'contact.html') {
      track('click_contact_cta');
    }
  }, false);

  if (section === 'appointment') {
    track('view_appointment');
    var started = false;
    var noteFormStart = function (event) {
      var target = event.target;
      if (started || !target || !target.closest || !target.closest('#appointment-form')) return;
      started = true;
      track('appointment_form_start');
    };
    document.addEventListener('focusin', noteFormStart, false);
    document.addEventListener('input', noteFormStart, false);
  } else if (section === 'contact') {
    track('view_contact');
  }
})();
