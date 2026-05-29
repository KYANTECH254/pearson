(function () {
  var storageKey = "pearson_cookie_banner_choice";

  function hasChoice() {
    try {
      return Boolean(window.localStorage.getItem(storageKey));
    } catch (error) {
      return false;
    }
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(storageKey, value);
    } catch (error) {}
  }

  function closeBanner(value) {
    var banner = document.getElementById("onetrust-banner-sdk");

    saveChoice(value);
    if (banner) {
      banner.hidden = true;
    }
  }

  function showPreferenceCenter() {
    var sdk = document.getElementById("onetrust-pc-sdk");
    var filter = document.querySelector(".onetrust-pc-dark-filter");

    if (!sdk) {
      window.open("https://www.pearsonpte.com/policy-center/cookies/", "_blank", "noopener");
      return;
    }

    sdk.classList.remove("ot-hide");
    sdk.style.display = "block";
    sdk.setAttribute("aria-hidden", "false");
    if (filter) {
      filter.classList.remove("ot-hide");
      filter.style.display = "block";
    }
  }

  function bannerHtml() {
    return '<div id="onetrust-banner-sdk" class="otFlat bottom vertical-align-content" tabindex="0" style="bottom: 0px;"><div role="dialog" aria-modal="true" aria-label="Privacy and cookies"><div class="ot-sdk-container"><div class="ot-sdk-row"><div id="onetrust-group-container" class="ot-sdk-eight ot-sdk-columns"><div class="banner_logo"></div><div id="onetrust-policy"><h2 id="onetrust-policy-title">Privacy and cookies</h2><div id="onetrust-policy-text">We and our third-party partners use cookies and similar technologies to run the website. Some cookies are strictly necessary. We also use optional cookies to provide a more personalized experience, improve the way our websites work and support our marketing operations. Optional cookies will only be set with your consent. You can manage your cookie preferences through the "Cookie Settings" button. For more information see our<a class="ot-cookie-policy-link" href="https://www.pearsonpte.com/policy-center/privacy-policy" aria-label="More information about your privacy, opens in a new tab" rel="noopener noreferrer" target="_blank">Privacy Notice</a></div></div></div><div id="onetrust-button-group-parent" class="ot-sdk-three ot-sdk-columns has-reject-all-button"><div id="onetrust-button-group"><button id="onetrust-pc-btn-handler" aria-label="Cookie Settings, Opens the preference center dialog">Cookie Settings</button> <button id="onetrust-reject-all-handler">Reject All</button> <button id="onetrust-accept-btn-handler">Accept All</button></div></div></div></div><div id="onetrust-close-btn-container"></div></div></div>';
  }

  function setup() {
    var banner = document.getElementById("onetrust-banner-sdk");
    var closePc = document.getElementById("close-pc-btn-handler");

    if (!banner) {
      document.body.insertAdjacentHTML("beforeend", bannerHtml());
      banner = document.getElementById("onetrust-banner-sdk");
    }

    if (hasChoice()) {
      banner.hidden = true;
    }

    document.getElementById("onetrust-accept-btn-handler")?.addEventListener("click", function () {
      closeBanner("accepted");
    });
    document.getElementById("onetrust-reject-all-handler")?.addEventListener("click", function () {
      closeBanner("rejected");
    });
    document.getElementById("onetrust-pc-btn-handler")?.addEventListener("click", showPreferenceCenter);

    if (closePc) {
      closePc.addEventListener("click", function () {
        var sdk = document.getElementById("onetrust-pc-sdk");
        var filter = document.querySelector(".onetrust-pc-dark-filter");

        if (sdk) {
          sdk.classList.add("ot-hide");
          sdk.style.display = "";
        }
        if (filter) {
          filter.classList.add("ot-hide");
          filter.style.display = "";
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
