// 휴대폰에서 카톡·네이버 같은 앱 안 브라우저나 크롬이 아닌 브라우저로 열었을 때 → "크롬으로 열기"
(function () {
  var ua = navigator.userAgent || '';
  var url = location.href;
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (!isAndroid && !isIOS) return;                       // 컴퓨터는 그대로
  var standalone = window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches);
  if (standalone || navigator.standalone) return;         // 이미 홈 화면 앱으로 실행 중
  var inApp = /KAKAOTALK|NAVER\(inapp|NAVER|Instagram|FBAN|FBAV|Line\/|everytimeApp|DaumApps|BAND\//i.test(ua);
  var isChrome = /CriOS/i.test(ua) || (/Chrome\//.test(ua) && !inApp && !/SamsungBrowser|Whale|EdgA|OPR|; wv\)/i.test(ua));
  if (isChrome) return;
  // 아이폰은 크롬도 전체화면이 안 돼서, 사파리(홈 화면에 추가)가 더 나음 → 앱 안 브라우저일 때만 안내
  if (isIOS && !inApp) return;

  // 카카오톡 앱 안 브라우저 → 기본 브라우저로 바로 내보내기 (한 번만)
  if (/KAKAOTALK/i.test(ua) && !sessionStorage.getItem('cm_kakao_out')) {
    try { sessionStorage.setItem('cm_kakao_out', '1'); } catch (e) { /* ignore */ }
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  }

  function openChrome() {
    if (isAndroid) {
      var noScheme = url.replace(/^https?:\/\//, '');
      location.href = 'intent://' + noScheme + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
    } else {
      location.href = url.replace(/^https:\/\//, 'googlechromes://').replace(/^http:\/\//, 'googlechrome://');
      // 크롬이 없으면 잠시 뒤 안내
      setTimeout(function () { alert('크롬이 없으면 사파리에서 열어도 돼요!\n(공유 → 홈 화면에 추가 하면 주소창 없이 할 수 있어요)'); }, 1500);
    }
  }

  function showBanner() {
    if (document.getElementById('chromeBanner')) return;
    var b = document.createElement('div');
    b.id = 'chromeBanner';
    b.innerHTML = '<span>📱 <b>크롬</b>에서 열면 주소창 없이 크게 할 수 있어요!</span>'
      + '<button type="button" id="cbOpen">크롬으로 열기</button><button type="button" id="cbClose" aria-label="닫기">✕</button>';
    document.body.appendChild(b);
    document.getElementById('cbOpen').onclick = openChrome;
    document.getElementById('cbClose').onclick = function () { b.remove(); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showBanner); else showBanner();
})();
