// Auth gate. Runs before everything else.
// - If no token in localStorage: shows a login overlay.
// - On wrong password: redirects to https://www.eloruga.com.
// - On valid password: stores token and reloads.
// - Patches window.fetch so every /api/* call carries the Bearer token,
//   and any 401 response forces a logout + redirect.
(function () {
  var KEY = "qe.auth.v1";
  var REDIRECT = "https://www.eloruga.com";

  window.qeAuthHeader = function () {
    var t;
    try { t = localStorage.getItem(KEY); } catch (e) { t = null; }
    return t ? { Authorization: "Bearer " + t } : {};
  };

  function fail() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    window.location.href = REDIRECT;
  }
  window.qeRedirectFail = fail;

  // Patch fetch to attach auth header on /api/* and react to 401.
  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    init = init || {};
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var isApi = url.indexOf("/api/") === 0;
    var isLogin = url.indexOf("/api/login") === 0;
    if (isApi && !isLogin) {
      init.headers = Object.assign({}, init.headers || {}, window.qeAuthHeader());
    }
    return origFetch(input, init).then(function (res) {
      if (res.status === 401 && isApi && !isLogin) {
        fail();
      }
      return res;
    });
  };

  function showLogin() {
    if (document.getElementById("qe-auth-overlay")) return;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.id !== "qe-auth-overlay" && el.tagName !== "SCRIPT") {
        el.style.display = "none";
      }
    });
    var overlay = document.createElement("div");
    overlay.id = "qe-auth-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#f4ede0;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'Inter Tight',system-ui,sans-serif;color:#2a1a10;";
    overlay.innerHTML =
      '<form id="qe-auth-form" style="display:flex;flex-direction:column;gap:14px;padding:28px 24px;background:#faf3e6;border:1px solid #e6d8be;border-radius:14px;min-width:280px;box-shadow:0 24px 60px -20px rgba(20,18,10,0.35);">' +
        '<div style="font-size:22px;font-weight:600;font-family:Instrument Serif,serif;font-style:italic;color:#2a1a10;">Queens-eye</div>' +
        '<div style="font-size:11px;color:#9a7e62;text-transform:uppercase;letter-spacing:0.6px;">password</div>' +
        '<input id="qe-pwd" type="password" autocomplete="current-password" autofocus style="padding:10px 12px;border-radius:8px;border:1px solid #e6d8be;background:#f4ede0;font-size:14px;outline:none;color:#2a1a10;" />' +
        '<button type="submit" style="padding:10px 12px;border-radius:8px;background:#b8332a;color:#faf3e6;border:0;font-size:13px;font-weight:600;cursor:pointer;">Enter</button>' +
        '<div id="qe-auth-err" style="font-size:11px;color:#b8332a;display:none;">Wrong password.</div>' +
      '</form>';
    document.body.appendChild(overlay);

    var form = document.getElementById("qe-auth-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pwd = document.getElementById("qe-pwd").value;
      origFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: pwd }),
      })
        .then(function (res) {
          if (res.ok) {
            try { localStorage.setItem(KEY, pwd); } catch (err) {}
            location.reload();
          } else {
            fail();
          }
        })
        .catch(function () { fail(); });
    });
  }

  function start() {
    var token;
    try { token = localStorage.getItem(KEY); } catch (e) { token = null; }
    if (!token) showLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
