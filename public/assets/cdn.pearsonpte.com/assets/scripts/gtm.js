var origCreateElement = document.createElement;
document.createElement = function (tag) {
  var e = origCreateElement.call(document, tag);
  if (tag == "script") {
    e.nonce = window.gtmNonce;
    e.setAttribute("nonce", window.gtmNonce);
  }
  return e;
};

(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var f = d.getElementsByTagName(s)[0],
    j = d.createElement(s),
    dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
  j.nonce = window.gtmNonce;
  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", window.gtmId);

function setGTagUserId() {
  curUser = window.sessionStorage.getItem("currentUser");
  if (curUser && curUser != "undefined") {
    curUser = JSON.parse(curUser).currentUser;
    if (curUser.id) {
      window.dataLayer.push({
        event: "set_user_id",
        user_id: curUser.id,
        pte_id: curUser.displayId,
        email: curUser.person.email,
        light_account: curUser.hasFullProfile ? 0 : 1,
      });
      window.clearInterval(window.getCurrUserInterval);
    }
  }
}

window.getCurrUserInterval = window.setInterval(setGTagUserId, 100);
