(function () {
  var defaultScoreReportPath = "/my-activity";
  var loginRoute = "/Account/Login";
  var loginRedirectUrl = window.location.origin + loginRoute;
  var cartRoute = "/orders/shoppingcart";
  var internalRoutes = new Set([
    "/",
    "/activity",
    "/my-activity",
    "/learn",
    "/account",
    "/admin",
    "/users/edit-user-account",
    "/users/edit-user-account/collapse",
    cartRoute,
    loginRoute,
    "/logout",
    "/users/profile/quick-registration",
    "/myPTE",
    "/dashboard",
    "/help",
  ]);
  var internalRoutePatterns = [/^\/my-activity\/test-score\/[^/]+$/];
  var protectedRoutes = new Set([
    "/",
    "/activity",
    "/my-activity",
    "/learn",
    "/account",
    "/admin",
    "/users/edit-user-account",
    "/users/edit-user-account/collapse",
    cartRoute,
    "/myPTE",
    "/mypte",
    "/dashboard",
  ]);
  var routeToMenuItem = {
    "/": "menu_item_myPTE",
    "/dashboard": "menu_item_myPTE",
    "/myPTE": "menu_item_myPTE",
    "/activity": "menu_item_activity",
    "/my-activity": "menu_item_activity",
    "/learn": "menu_item_learning",
    "/help": "menu_item_faq",
  };
  var preloaderVisibleFrom = 0;
  var authStorageKey = "pearson_session_token";
  var cartStorageKey = "pearson_cart_items";
  var cookieConsentStorageKey = "pearson_cookie_consent";
  var ownsScoreReport = /^\/my-activity\/test-score\/[^/]+$/.test(window.location.pathname.replace(/\/+$/, "") || "/");

  window.__localHeaderOwnsScoreReport = ownsScoreReport;

  function closeAll(exceptMenu) {
    document.querySelectorAll("ignite-profile-menu").forEach(function (menu) {
      if (menu === exceptMenu) {
        return;
      }

      var popup = menu.querySelector(".ignite-profile-menu-popup");
      var trigger = menu.querySelector(".ignite-profile-menu");

      if (popup) {
        popup.classList.remove("opened");
      }

      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  function cookieBannerHtml() {
    return [
      '<div role="dialog" aria-modal="true" aria-label="Privacy and cookies">',
      '<div class="ot-sdk-container"><div class="ot-sdk-row">',
      '<div id="onetrust-group-container" class="ot-sdk-eight ot-sdk-columns">',
      '<div class="banner_logo"></div>',
      '<div id="onetrust-policy">',
      '<h2 id="onetrust-policy-title">Privacy and cookies</h2>',
      '<div id="onetrust-policy-text">We and our third-party partners use cookies and similar technologies to run the website. Some cookies are strictly necessary. We also use optional cookies to provide a more personalized experience, improve the way our websites work and support our marketing operations. Optional cookies will only be set with your consent. You can manage your cookie preferences through the "Cookie Settings" button. For more information see our<a class="ot-cookie-policy-link" href="https://www.pearsonpte.com/policy-center/privacy-policy" aria-label="More information about your privacy, opens in a new tab" rel="noopener noreferrer" target="_blank">Privacy Notice</a></div>',
      '</div>',
      '</div>',
      '<div id="onetrust-button-group-parent" class="ot-sdk-three ot-sdk-columns has-reject-all-button">',
      '<div id="onetrust-button-group">',
      '<button id="onetrust-pc-btn-handler" aria-label="Cookie Settings, Opens the preference center dialog">Cookie Settings</button> ',
      '<button id="onetrust-reject-all-handler">Reject All</button> ',
      '<button id="onetrust-accept-btn-handler">Accept All</button>',
      '</div>',
      '</div>',
      '</div></div>',
      '<div id="onetrust-close-btn-container"></div>',
      '</div>',
    ].join("");
  }

  function hideCookieBanner(choice) {
    var banner = document.querySelector("#onetrust-banner-sdk");

    if (choice) {
      try {
        window.localStorage.setItem(cookieConsentStorageKey, choice);
      } catch (error) {}
    }

    if (banner) {
      banner.remove();
    }
  }

  function setupCookieBanner(forceShow) {
    var banner = document.querySelector("#onetrust-banner-sdk");
    var accepted;

    try {
      accepted = window.localStorage.getItem(cookieConsentStorageKey);
    } catch (error) {
      accepted = "";
    }

    if (!forceShow && accepted && !banner) {
      return;
    }

    if (!banner) {
      banner = document.createElement("div");
      banner.id = "onetrust-banner-sdk";
      document.body.appendChild(banner);
    }

    banner.className = "otFlat bottom vertical-align-content";
    banner.setAttribute("tabindex", "0");
    banner.setAttribute("style", "bottom: 0px;");
    banner.innerHTML = cookieBannerHtml();

    banner.querySelector("#onetrust-accept-btn-handler")?.addEventListener("click", function () {
      hideCookieBanner("accepted");
    });
    banner.querySelector("#onetrust-reject-all-handler")?.addEventListener("click", function () {
      hideCookieBanner("rejected");
    });
    banner.querySelector("#onetrust-pc-btn-handler")?.addEventListener("click", function () {
      banner.focus();
    });

    document.querySelectorAll(".ot-sdk-show-settings, #ot-sdk-btn").forEach(function (link) {
      if (link.dataset.localCookieSettingsReady === "true") {
        return;
      }

      link.dataset.localCookieSettingsReady = "true";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        try {
          window.localStorage.removeItem(cookieConsentStorageKey);
        } catch (error) {}
        setupCookieBanner(true);
      });
    });
  }

  function setOpen(menu, shouldOpen) {
    var popup = menu.querySelector(".ignite-profile-menu-popup");
    var trigger = menu.querySelector(".ignite-profile-menu");

    if (!popup) {
      return;
    }

    popup.classList.toggle("opened", shouldOpen);

    if (trigger) {
      trigger.setAttribute("aria-expanded", String(shouldOpen));
    }
  }

  function setupProfileMenu(menu) {
    var trigger = menu.querySelector(".ignite-profile-menu");
    var popup = menu.querySelector(".ignite-profile-menu-popup");

    if (!trigger || !popup || trigger.dataset.localToggleReady === "true") {
      return;
    }

    // Add mobile navigation items if they don't exist
    if (!popup.querySelector(".mobile-only")) {
      var accountItem = popup.querySelector('[id*="edit-user-account"], [id*="account-profile-item"]');
      var mobileItems = [
        { label: "myPTE", icon: "fa-home", route: "/" },
        { label: "My Activity", icon: "fa-history", route: "/my-activity" },
        { label: "Smart Prep", icon: "fa-graduation-cap", route: "/learn" },
        { label: "Help", icon: "fa-question-circle", url: "https://www.pearsonpte.com/help-center/" },
      ];

      mobileItems.forEach(function (item) {
        var div = document.createElement("div");
        div.className = "ignite-profile-menu-option mobile-only";
        div.setAttribute("role", "link");
        div.setAttribute("tabindex", "0");
        div.innerHTML = '<i class="fal ' + item.icon + '"></i><div>' + item.label + "</div>";
        if (item.route) {
          div.onclick = function () {
            return window.localNavigate(item.route);
          };
        } else {
          div.onclick = function () {
            window.open(item.url, "_blank");
          };
        }
        if (accountItem) {
          popup.insertBefore(div, accountItem);
        } else {
          popup.appendChild(div);
        }
      });
    }

    // Handle logout click
    var logoutItem = popup.querySelector("#logout-profile-item");
    if (logoutItem && logoutItem.dataset.localLogoutReady !== "true") {
      logoutItem.dataset.localLogoutReady = "true";
      logoutItem.onclick = function (event) {
        event.preventDefault();
        fetch("/api/auth/logout", {
          method: "POST",
          headers: authHeaders(),
        }).finally(function () {
          clearStoredAuthToken();
          window.location.href = loginRedirectUrl;
        });
      };
    }

    trigger.dataset.localToggleReady = "true";
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", popup.classList.contains("opened") ? "true" : "false");

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      var shouldOpen = !popup.classList.contains("opened");
      closeAll(menu);
      setOpen(menu, shouldOpen);
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      trigger.click();
    });

    popup.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  function setupAccountProfilePanels() {
    if (!["/account", "/users/edit-user-account", "/users/edit-user-account/collapse"].includes(getRoute(new URL(window.location.href)))) {
      return;
    }

    function getAccountPanels() {
      return Array.from(document.querySelectorAll("ignite-panel")).filter(function (panel) {
        var title = panel.querySelector("#ignite-panel-title-text span");
        var titleText = title ? title.textContent.trim().toLowerCase() : "";

        return ["profile", "password", "privacy and sharing"].includes(titleText);
      });
    }

    function setPanelOpen(panel, open) {
      var header = panel.querySelector(".ignite-panel-header");
      var content = panel.querySelector(".ignite-panel > .isHidden, .ignite-panel > [data-panel-content]");
      var arrow = panel.querySelector(".fa-arrow-circle-right, .fa-arrow-circle-down");

      if (!content) {
        return;
      }

      content.dataset.panelContent = "true";
      content.classList.toggle("isHidden", !open);

      if (header) {
        header.classList.toggle("expanded", open);
        header.setAttribute("aria-expanded", open ? "true" : "false");
      }

      if (arrow) {
        arrow.classList.toggle("fa-arrow-circle-right", !open);
        arrow.classList.toggle("fa-arrow-circle-down", open);
      }

      // Clear messages when closing
      if (!open) {
          setAccountMessage(panel, "");
      }
    }

    function openOnly(panelToOpen) {
      getAccountPanels().forEach(function (panel) {
        setPanelOpen(panel, panel === panelToOpen);
      });
    }

    getAccountPanels().forEach(function (panel) {
      var title = panel.querySelector("#ignite-panel-title-text span");
      var header = panel.querySelector(".ignite-panel-header");
      var cancelButtons = Array.from(panel.querySelectorAll("button")).filter(function (button) {
        return button.textContent.trim().toLowerCase() === "cancel";
      });
      var titleText = title ? title.textContent.trim().toLowerCase() : "";

      if (!header || !titleText || !["profile", "password", "privacy and sharing"].includes(titleText)) {
        return;
      }

      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");
      setPanelOpen(panel, false);

      if (header.dataset.accountPanelReady === "true") {
        return;
      }

      header.dataset.accountPanelReady = "true";
      header.addEventListener("click", function () {
        if (header.getAttribute("aria-expanded") === "true") {
          setPanelOpen(panel, false);
          return;
        }

        openOnly(panel);
      });
      header.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        header.click();
      });

      cancelButtons.forEach(function (button) {
        if (button.dataset.accountPanelCancelReady === "true") {
          return;
        }

        button.dataset.accountPanelCancelReady = "true";
        button.addEventListener("click", function (event) {
          event.preventDefault();
          if (isAccountPanelDirty(panel)) {
            showDiscardChangesDialog(function () {
              restoreAccountPanel(panel);
              markAccountPanelClean(panel);
              setPanelOpen(panel, false);
            });
            return;
          }

          setPanelOpen(panel, false);
        });
      });

      markAccountPanelClean(panel);
    });
  }

  function setAccountMessage(panel, text, isError) {
    if (!panel) return;
    var message = panel.querySelector(".local-account-message");

    if (!message) {
      message = document.createElement("div");
      message.className = "local-account-message";
      message.style.marginTop = "16px";
      message.style.marginBottom = "16px";
      message.style.minHeight = "22px";
      message.style.fontFamily = "var(--ignite-regular-font, Arial, sans-serif)";
      message.style.textAlign = "center";
      message.style.fontWeight = "bold";

      var buttonsContainer = panel.querySelector(".ignite-buttons-container");
      if (buttonsContainer) {
          buttonsContainer.parentNode.insertBefore(message, buttonsContainer);
      } else {
          panel.querySelector(".ignite-panel")?.appendChild(message);
      }
    }

    message.textContent = text || "";
    message.style.color = isError ? "#b00020" : "#206b31";

    if (text) {
        message.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function serializeAccountPanel(panel) {
    if (!panel) {
      return "";
    }

    return JSON.stringify(Array.from(panel.querySelectorAll("input, textarea, select, mat-select, [role='switch']")).map(function (control, index) {
      var key = control.id || control.getAttribute("name") || control.getAttribute("formcontrolname") || control.getAttribute("aria-label") || String(index);
      var value = control.value || "";

      if (control.matches("input[type='checkbox'], input[type='radio']")) {
        value = control.checked ? "checked" : "";
      } else if (control.matches("mat-select")) {
        value = control.getAttribute("data-value") || control.textContent.trim();
      } else if (control.getAttribute("role") === "switch") {
        value = control.getAttribute("aria-checked") || "";
      }

      return [key, value];
    }));
  }

  function markAccountPanelClean(panel) {
    if (panel) {
      panel.dataset.cleanSnapshot = serializeAccountPanel(panel);
    }
  }

  function isAccountPanelDirty(panel) {
    return Boolean(panel && panel.dataset.cleanSnapshot && panel.dataset.cleanSnapshot !== serializeAccountPanel(panel));
  }

  function restoreAccountPanel(panel) {
    if (!panel || !panel.dataset.cleanSnapshot) {
      return;
    }

    JSON.parse(panel.dataset.cleanSnapshot).forEach(function (entry) {
      var selector = entry[0] ? "#" + CSS.escape(entry[0]) : "";
      var value = entry[1];
      var control = selector ? panel.querySelector(selector) : null;

      if (!control) {
        return;
      }

      if (control.matches("input[type='checkbox'], input[type='radio']")) {
        control.checked = value === "checked";
        control.toggleAttribute("checked", control.checked);
      } else if (control.matches("mat-select")) {
        setSelectValue(selector, value);
      } else if (control.getAttribute("role") === "switch") {
        setSwitch(selector, value === "true");
      } else {
        setInputNodeValue(control, value);
      }
    });
  }

  function closeDiscardChangesDialog() {
    var dialog = document.querySelector(".local-discard-dialog");

    if (dialog) {
      dialog.remove();
      document.body.classList.remove("local-dialog-open");
    }
  }

  function showDiscardChangesDialog(onDiscard) {
    closeDiscardChangesDialog();

    var wrapper = document.createElement("div");
    wrapper.className = "local-discard-dialog cdk-overlay-container";
    wrapper.innerHTML = [
      '<div class="cdk-overlay-backdrop cdk-overlay-dark-backdrop cdk-overlay-backdrop-showing"></div>',
      '<div class="cdk-global-overlay-wrapper">',
      '<mat-dialog-container tabindex="-1" class="mat-mdc-dialog-container mdc-dialog cdk-dialog-container mdc-dialog--open" id="mat-mdc-dialog-0" role="dialog" aria-modal="false" style="--mat-dialog-transition-duration: 150ms;">',
      '<div class="mat-mdc-dialog-inner-container mdc-dialog__container"><div class="mat-mdc-dialog-surface mdc-dialog__surface">',
      '<confirm-dialog class="mat-mdc-dialog-component-host ng-star-inserted"><div class="dialog-confirm" id="dialog_confirm">',
      '<div class="dialog-close-icon"><i class="fal fa-times-circle"></i></div>',
      '<ignite-card><div class="ignite-card simple" id="ignite-card-2">',
      '<div class="ignite-card-title"><div card-title="">Discard changes?</div></div>',
      '<div class="ignite-card-subtitle"></div>',
      '<div class="ignite-card-content"><div card-content="">Changes you made have not been saved.</div></div>',
      '</div></ignite-card>',
      '<div class="ignite-dialog-buttons-container"><div class="ignite-buttons">',
      '<div class="ignite-button-wrapper"><button id="button_ok" mat-button="" color="primary" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-primary"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label">Discard changes</span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span><span class="mat-ripple mat-mdc-button-ripple"></span></button></div>',
      '<a mat-flat-button="" class="mdc-button mat-mdc-button-base ignite-link mdc-button--unelevated mat-mdc-unelevated-button mat-unthemed"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label">Cancel</span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></a>',
      '</div></div><hr class="ng-star-inserted"></div></confirm-dialog>',
      '</div></div></mat-dialog-container></div>',
    ].join("");

    document.body.appendChild(wrapper);
    document.body.classList.add("local-dialog-open");
    wrapper.querySelector("#button_ok").addEventListener("click", function () {
      closeDiscardChangesDialog();
      onDiscard();
    });
    wrapper.querySelector(".ignite-link").addEventListener("click", closeDiscardChangesDialog);
    wrapper.querySelector(".dialog-close-icon").addEventListener("click", closeDiscardChangesDialog);
    wrapper.querySelector(".cdk-overlay-backdrop").addEventListener("click", closeDiscardChangesDialog);
    wrapper.querySelector("mat-dialog-container").focus();
  }

  function updateUserChrome(user) {
    if (!user) {
      return;
    }

    var firstName = String(user.firstName || "").trim();
    var lastName = String(user.lastName || "").trim();
    var fullName = (firstName + " " + lastName).trim() || user.username || "";
    var initials = ((firstName.charAt(0) || "") + (lastName.charAt(0) || "")).toUpperCase();
    var pteId = user.pteId ? "PTE ID: " + user.pteId : "";

    document.querySelectorAll(".ignite-profile-user-name, #profile-user-name").forEach(function (node) {
      node.textContent = fullName;
    });

    document.querySelectorAll(".ignite-profile-user-initials").forEach(function (node) {
      node.textContent = initials;
    });

    document.querySelectorAll("#profile-display-id").forEach(function (node) {
      node.textContent = pteId;
    });
  }

  function getStoredAuthToken() {
    try {
      return window.localStorage.getItem(authStorageKey) || "";
    } catch (error) {
      return "";
    }
  }

  function clearStoredAuthToken() {
    try {
      window.localStorage.removeItem(authStorageKey);
    } catch (error) {}
  }

  function storeAuthToken(token) {
    try {
      window.localStorage.setItem(authStorageKey, token);
    } catch (error) {}
  }

  function takeTokenFromUrl() {
    var url = new URL(window.location.href);
    var token = url.searchParams.get("token");

    if (!token) {
      return;
    }

    storeAuthToken(token);
    url.searchParams.delete("token");
    window.history.replaceState({ localRoute: getRoute(url) }, "", url.pathname + url.search + url.hash);
  }

  function authHeaders(extraHeaders) {
    var token = getStoredAuthToken();
    var headers = {
      ...(extraHeaders || {}),
    };

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    return headers;
  }

  function readCart() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(cartStorageKey) || "[]");

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
    } catch (error) {}

    updateCartBadge();
  }

  function normalizeQuantity(value, fallback) {
    var quantity = parseInt(value, 10);

    if (!Number.isFinite(quantity) || quantity < 1) {
      return fallback || 1;
    }

    return quantity;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  function parsePrice(priceText) {
    var normalized = String(priceText || "").replace(/\s+/g, "");
    var match = normalized.match(/^([^0-9.-]*)([0-9,]+(?:\.[0-9]+)?)/);

    return {
      currency: match ? match[1] || "AU$" : "AU$",
      price: match ? Number(match[2].replace(/,/g, "")) || 0 : 0,
    };
  }

  function formatMoney(currency, price) {
    return (currency || "AU$") + Number(price || 0).toFixed(2);
  }

  function makeCartId(item) {
    return [item.title, item.variant || ""].join("|").toLowerCase().replace(/[^a-z0-9|]+/g, "-");
  }

  function updateCartBadge() {
    var total = readCart().reduce(function (sum, item) {
      return sum + normalizeQuantity(item.quantity, 1);
    }, 0);

    document.querySelectorAll("#shoppingcart-icon").forEach(function (icon) {
      var badge = icon.querySelector(".total-items");

      if (!badge && total > 0) {
        badge = document.createElement("span");
        badge.className = "total-items";
        badge.setAttribute("_ngcontent-ng-c955525872", "");
        icon.appendChild(badge);
      }

      if (badge) {
        badge.textContent = String(total);
        badge.hidden = total < 1;
      }
    });
  }

  function playCartAddedAnimation() {
    document.querySelectorAll("#shoppingcart-icon").forEach(function (icon) {
      icon.classList.remove("local-cart-added");
      void icon.offsetWidth;
      icon.classList.add("local-cart-added");
      window.setTimeout(function () {
        icon.classList.remove("local-cart-added");
      }, 520);
    });
  }

  function addCartItem(item) {
    var items = readCart();
    var id = item.id || makeCartId(item);
    var existing = items.find(function (cartItem) {
      return cartItem.id === id;
    });
    var quantity = normalizeQuantity(item.quantity, 1);

    if (existing) {
      existing.quantity = normalizeQuantity(existing.quantity, 1) + quantity;
    } else {
      items.push(Object.assign({}, item, {
        id: id,
        quantity: quantity,
      }));
    }

    writeCart(items);
  }

  function getText(root, selector) {
    var element = root ? root.querySelector(selector) : null;

    return element ? element.textContent.trim().replace(/\s+/g, " ") : "";
  }

  function productFromLearnButton(button) {
    var product = button.closest("recommended-product");
    var bundle = button.closest("recommended-bundle");
    var root = product || bundle;
    var title = product ? getText(root, ".product-title") : getText(root, ".product-name");
    var description = getText(root, ".product-description");
    var priceInfo = parsePrice(getText(root, ".product-price, .product-info-container span:last-child"));
    var quantityInput = product ? root.querySelector(".cart-product-input") : null;
    var image = root ? root.querySelector("img") : null;
    var variant = getText(root, ".mat-mdc-select-value-text, .variant-dropdown option:checked");

    if (!title) {
      return null;
    }

    return {
      title: title,
      description: description,
      currency: priceInfo.currency,
      price: priceInfo.price,
      imageUrl: image ? image.getAttribute("src") : "",
      quantity: product ? normalizeQuantity(quantityInput && quantityInput.value, 1) : 1,
      variant: /^version:?$/i.test(variant) ? "" : variant,
      type: product ? "Individual" : "Package",
    };
  }

  var fallbackAdditionalProducts = [
    { title: "Scored Practice Test", category: "PTE Academic", type: "Individual", description: "Just like the real test, with a complete score report. The best way to check you are ready for PTE Academic.", price: 59.99, currency: "AU$", imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/137/images/407/A103000356113_Std__44175.1752120318.386.513__c_1.jpg" },
    { title: "The Official Guide to PTE Academic 3e", category: "PTE Academic", type: "Individual", description: "Tips from experts and lots of extra digital practice resources in a convenient eBook.", price: 33.99, currency: "AU$", imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/142/images/412/A103000356132_Std__46948.1752120324.386.513__c_1.jpg" },
    { title: "PTE Academic Question Bank", category: "PTE Academic", type: "Individual", description: "300 practice questions with model answers, plus samples for speaking and writing.", price: 33.99, currency: "AU$", imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/126/images/392/1732090791.386.513__c_1.jpg" },
    { title: "PTE Expert – Self Study Guide B1", category: "PTE Academic", type: "Individual", description: "Target 43-59 with this 170+ page eBook which includes online test practice.", price: 80.99, currency: "AU$", imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/144/images/416/A103000356132_Std__08406.1758866958.386.513__c_1.jpg" },
  ];
  var pteCoreShop = {
    products: [
      { title: "PTE Core Question Bank", description: "294 practice questions with model answers, plus samples for speaking and writing.", price: 33.99, currency: "AU$", imageUrl: "https://cdn11.bigcommerce.com/s-kymzzd0jes/products/149/images/421/A103000356132_Std__06694.1774857398.386.513.jpg?c=1" },
      { title: "Official Guide to PTE Core", description: "The Official Guide to PTE Core provides authentic practice, step by step guidance, and proven strategies to help test takers confidently approach every task in the exam.", price: 33.99, currency: "AU$", imageUrl: "https://cdn11.bigcommerce.com/s-kymzzd0jes/products/150/images/422/A103000356132_Std__90923.1774857399.386.513.jpg?c=1" },
      { title: "PTE Core Preparation Course", description: "Master every PTE Core task type with this structured eBook, featuring 20 step by step lessons that build the skills and strategies you need to succeed.", price: 29.99, currency: "AU$", imageUrl: "https://cdn11.bigcommerce.com/s-kymzzd0jes/products/148/images/420/A103000356132_Std__03788.1774857397.386.513.jpg?c=1" },
      { title: "PTE Core Scored Practice Test Version 1", description: "Just like the real test, with a complete score report. The best way to check you are ready for PTE Core.", price: 59.99, currency: "AU$", imageUrl: "https://cdn11.bigcommerce.com/s-kymzzd0jes/products/143/images/415/A103000356113_Std__77163.1758866958.386.513.jpg?c=1" },
    ],
    bundles: [
      { title: "PTE Core Essential Package", description: "1 Scored Practice Test · PTE Core Question Bank", price: 74.99, currency: "AU$", imageUrl: "https://cdn11.bigcommerce.com/s-kymzzd0jes/products/151/images/423/A103000356119_Std__49927.1774857399.386.513.jpg?c=1" },
      { title: "PTE Core Premium Package", description: "1 Scored Practice Test · PTE Core Question Bank · Official Guide to PTE Core · PTE Core Preparation Course", price: 104.99, currency: "AU$", imageUrl: "https://cdn11.bigcommerce.com/s-kymzzd0jes/products/152/images/424/A103000356119_Std__79121.1774857400.386.513.jpg?c=1" },
    ],
  };

  function productToCartItem(product) {
    return {
      title: product.title,
      description: product.description,
      currency: product.currency || "AU$",
      price: Number(product.price || 0),
      imageUrl: product.imageUrl || "",
      quantity: 1,
      type: product.type || "Individual",
    };
  }

  async function getAdditionalProducts(items) {
    var products = await fetch("/api/products", {
      credentials: "same-origin",
      headers: authHeaders(),
    }).then(function (response) {
      return response.ok ? response.json() : fallbackAdditionalProducts;
    }).catch(function () {
      return fallbackAdditionalProducts;
    });
    var existing = new Set(items.map(makeCartId));

    return products.filter(function (product) {
      return product && product.isAvailable !== false && product.type === "Individual" && !existing.has(makeCartId(product));
    }).slice(0, 4);
  }

  function renderCartProduct(item) {
    return [
      '<cart-product class="local-cart-product" data-cart-id="' + escapeHtml(item.id) + '">',
      '<div class="local-cart-product__card">',
      '<img class="local-cart-product__image" src="' + escapeHtml(item.imageUrl || "assets/no-image.png") + '" alt="">',
      '<div class="local-cart-product__content">',
      '<div class="local-cart-product__title">' + escapeHtml(item.title) + '</div>',
      item.variant ? '<div class="local-cart-product__meta">' + escapeHtml(item.variant) + '</div>' : '',
      item.description ? '<div class="local-cart-product__description">' + escapeHtml(item.description) + '</div>' : '',
      '<button class="local-cart-product__remove ignite-link" type="button">Remove</button>',
      '</div>',
      '<div class="local-cart-product__side">',
      '<div class="local-cart-product__price">' + escapeHtml(formatMoney(item.currency, item.price)) + '</div>',
      '<input class="local-cart-product__quantity" type="number" min="1" max="10" value="' + normalizeQuantity(item.quantity, 1) + '" aria-label="Quantity">',
      '</div>',
      '</div>',
      '</cart-product>',
    ].join("");
  }

  function renderAdditionalProduct(product) {
    return [
      '<recommended-product class="local-cart-additional-product">',
      '<div class="recommended-product-container">',
      '<div class="inner-container">',
      '<div class="left-flex-box"><img role="presentation" alt="" src="' + escapeHtml(product.imageUrl || "assets/no-image.png") + '"></div>',
      '<div class="right-flex-box"><div class="product-info">',
      '<div class="product-name-container"><div class="product-name">',
      '<p class="product-title">' + escapeHtml(product.title) + '</p>',
      '<div class="product-description">' + escapeHtml(product.description || "") + '</div>',
      '</div></div>',
      '<div class="product-price-container">',
      '<p class="product-price">' + escapeHtml(formatMoney(product.currency || "AU$", product.price)) + '</p>',
      '<div class="add-button-container ignite-dialog-buttons-container"><button id="add-button" type="button" color="secondary" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-secondary"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Add to cart </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></button></div>',
      '</div>',
      '</div></div>',
      '</div>',
      '</div>',
      '</recommended-product>',
    ].join("");
  }

  function renderLearnProduct(product) {
    return [
      '<recommended-product _ngcontent-ng-c4095635256="" _nghost-ng-c2976340318="" class="ng-star-inserted">',
      '<div _ngcontent-ng-c2976340318="" class="recommended-product-container">',
      '<div _ngcontent-ng-c2976340318="" class="inner-container ng-star-inserted">',
      '<div _ngcontent-ng-c2976340318="" class="left-flex-box"><img _ngcontent-ng-c2976340318="" role="presentation" alt="" src="' + escapeHtml(product.imageUrl) + '"></div>',
      '<div _ngcontent-ng-c2976340318="" class="right-flex-box">',
      '<div _ngcontent-ng-c2976340318="" class="product-info">',
      '<div _ngcontent-ng-c2976340318="" class="product-name-container">',
      '<div _ngcontent-ng-c2976340318="" class="product-name">',
      '<p _ngcontent-ng-c2976340318="" class="product-title"> ' + escapeHtml(product.title) + ' </p>',
      '<div _ngcontent-ng-c2976340318="" class="product-description ng-star-inserted">' + escapeHtml(product.description) + '</div>',
      '<div _ngcontent-ng-c2976340318="" class="show-more-less ng-star-inserted"><div _ngcontent-ng-c2976340318="" class="show-label"><span _ngcontent-ng-c2976340318="">Show more</span><i _ngcontent-ng-c2976340318="" class="fas fa-chevron-down"></i></div><hr _ngcontent-ng-c2976340318=""></div>',
      '</div>',
      '<div _ngcontent-ng-c2976340318=""><quantity-input _ngcontent-ng-c2976340318="" _nghost-ng-c641270213=""><div _ngcontent-ng-c641270213="" class="quantity-input-container"><form _ngcontent-ng-c641270213="" novalidate="" class="ng-untouched ng-pristine ng-valid"><input _ngcontent-ng-c641270213="" id="quantity-input" matinput="" formcontrolname="quantity" type="number" step="1" class="mat-mdc-input-element cart-product-input ng-untouched ng-pristine ng-valid cdk-text-field-autofill-monitored" required="" aria-invalid="false" aria-required="true" min="1" max="7"></form></div></quantity-input></div>',
      '</div>',
      '<div _ngcontent-ng-c2976340318="" class="product-price-container">',
      '<p _ngcontent-ng-c2976340318="" class="product-price"> ' + escapeHtml(formatMoney(product.currency, product.price)) + ' </p>',
      '<div _ngcontent-ng-c2976340318="" class="add-button-container ignite-dialog-buttons-container"><button _ngcontent-ng-c2976340318="" id="add-button" mat-button="" color="secondary" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-secondary" mat-ripple-loader-uninitialized="" mat-ripple-loader-class-name="mat-mdc-button-ripple"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label"> Add to cart </span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></button></div>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
      '</recommended-product>',
    ].join("");
  }

  function renderLearnBundle(bundle) {
    return [
      '<div _ngcontent-ng-c3288173268="" class="bundle-container ng-star-inserted">',
      '<recommended-bundle _ngcontent-ng-c3288173268="" _nghost-ng-c1649838406="">',
      '<div _ngcontent-ng-c1649838406="" class="recommended-bundle-container">',
      '<div _ngcontent-ng-c1649838406="" class="recommended-bundle-header ng-star-inserted"><div _ngcontent-ng-c1649838406="" class="image-container"><img _ngcontent-ng-c1649838406="" src="' + escapeHtml(bundle.imageUrl) + '" alt="imageAlt" class="ng-star-inserted"></div></div>',
      '<div _ngcontent-ng-c1649838406="" class="product-info-container ng-star-inserted"><span _ngcontent-ng-c1649838406="" class="product-name">' + escapeHtml(bundle.title) + '</span><span _ngcontent-ng-c1649838406="">' + escapeHtml(formatMoney(bundle.currency, bundle.price)) + '</span></div>',
      '<div _ngcontent-ng-c1649838406="" class="product-description ng-star-inserted">' + escapeHtml(bundle.description) + '</div>',
      '<div _ngcontent-ng-c1649838406="" class="add-button-container ignite-dialog-buttons-container ng-star-inserted"><button _ngcontent-ng-c1649838406="" id="add-button" mat-button="" color="secondary" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-secondary" mat-ripple-loader-uninitialized="" mat-ripple-loader-class-name="mat-mdc-button-ripple"><span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span><span class="mdc-button__label">Add to cart</span><span class="mat-focus-indicator"></span><span class="mat-mdc-button-touch-target"></span></button></div>',
      '</div>',
      '</recommended-bundle>',
      '</div>',
    ].join("");
  }

  function renderPteCoreShop() {
    return [
      '<div _ngcontent-ng-c2781065312="" class="exam-wrapper ng-star-inserted">',
      '<learn-products-component _ngcontent-ng-c2781065312="" _nghost-ng-c4095635256="">',
      '<div _ngcontent-ng-c4095635256="" class="learn-products-container">',
      '<div _ngcontent-ng-c4095635256="" class="product-type-title ng-star-inserted">PTE Core Products</div>',
      '<div _ngcontent-ng-c4095635256="" class="recommended-products-container ng-star-inserted">',
      '<div _ngcontent-ng-c4095635256="" class="title-bold spacer-bottom"> Shop individual products </div>',
      '<div _ngcontent-ng-c4095635256="">' + pteCoreShop.products.map(renderLearnProduct).join("") + '</div>',
      '</div>',
      '<div _ngcontent-ng-c4095635256="" class="recommended-bundles-container ng-star-inserted">',
      '<div _ngcontent-ng-c4095635256="" class="title-bold">PTE Core Packages</div>',
      '<div _ngcontent-ng-c4095635256="" class="notes"><b _ngcontent-ng-c4095635256="">Save up to 32% and get plenty of practice for PTE Core</b></div>',
      '<div _ngcontent-ng-c4095635256="" class="spacer">',
      '<recommended-bundles-component _ngcontent-ng-c4095635256="" _nghost-ng-c3288173268="">',
      '<div _ngcontent-ng-c3288173268="" class="recommended-bundles">' + pteCoreShop.bundles.map(renderLearnBundle).join("") + '</div>',
      '<div _ngcontent-ng-c3288173268="" class="scrollers"><i _ngcontent-ng-c3288173268="" class="fas fa-chevron-left"></i><i _ngcontent-ng-c3288173268="" class="fas fa-chevron-right"></i></div>',
      '</recommended-bundles-component>',
      '</div>',
      '</div>',
      '</div>',
      '</learn-products-component>',
      '</div>',
    ].join("");
  }

  function setupLearnCartButtons() {
    if (getRoute(new URL(window.location.href)) !== "/learn") {
      return;
    }

    Array.from(document.querySelectorAll("recommended-product #add-button, recommended-bundle #add-button")).forEach(function (button) {
      if (button.dataset.localCartReady === "true") {
        return;
      }

      button.dataset.localCartReady = "true";
      button.addEventListener("click", function (event) {
        var item;

        if (button.disabled || button.getAttribute("disabled") === "true") {
          return;
        }

        event.preventDefault();
        item = productFromLearnButton(button);

        if (!item) {
          return;
        }

        addCartItem(item);
        playCartAddedAnimation();
      });
    });
  }

  async function setupCartPage() {
    if (getRoute(new URL(window.location.href)) !== cartRoute) {
      return;
    }

    var wrapper = document.querySelector(".shoppingcart-wrapper");
    var items = readCart();
    var additionalProducts;

    if (!wrapper) {
      return;
    }

    if (!items.length) {
      wrapper.innerHTML = [
        '<empty-cart>',
        '<div class="empty-cart-container">',
        '<img src="assets/empty-cart.svg" classname="cart-image" alt="EmptyCart">',
        '<p class="text">Your cart is empty. Discover products to add to your cart.</p>',
        '<div class="ignite-buttons-container">',
        '<button id="empty-cart-browse-button" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-primary" type="button">',
        '<span class="mdc-button__label"><span>Browse products</span></span>',
        '</button>',
        '</div>',
        '</div>',
        '</empty-cart>',
      ].join("");

      var browseButton = wrapper.querySelector("#empty-cart-browse-button");

      if (browseButton && browseButton.dataset.localBrowseReady !== "true") {
        browseButton.dataset.localBrowseReady = "true";
        browseButton.addEventListener("click", function (event) {
          event.preventDefault();
          navigateTo("/learn");
        });
      }

      return;
    }

    additionalProducts = await getAdditionalProducts(items);

    var subtotal = items.reduce(function (sum, item) {
      return sum + Number(item.price || 0) * normalizeQuantity(item.quantity, 1);
    }, 0);
    var currency = items[0].currency || "AU$";
    var itemCount = items.reduce(function (sum, item) {
      return sum + normalizeQuantity(item.quantity, 1);
    }, 0);

    wrapper.innerHTML = [
      '<div class="overall-container local-cart-overall">',
      '<div class="shoppingcart-container">',
      '<div class="cart-quantity"><span>Shopping cart</span><span>(' + itemCount + (itemCount === 1 ? ' item' : ' items') + ')</span></div>',
      '<div class="cart-items-container"><div class="cart-items">' + items.map(renderCartProduct).join("") + '</div></div>',
      additionalProducts.length ? '<div class="recommended-products-container local-cart-recommended-products"><div class="title">Additional products</div>' + additionalProducts.map(renderAdditionalProduct).join("") + '</div>' : '',
      '</div>',
      '<div class="cart-summary-container">',
      '<cart-order-summary class="local-cart-order-summary">',
      '<div class="local-cart-summary-card">',
      '<div class="local-cart-summary-card__title">Order summary</div>',
      '<div class="local-cart-summary-card__row"><span>Subtotal</span><span>' + escapeHtml(formatMoney(currency, subtotal)) + '</span></div>',
      '<div class="local-cart-summary-card__row"><span>Discount</span><span>' + escapeHtml(formatMoney(currency, 0)) + '</span></div>',
      '<div class="local-cart-summary-card__total"><span>Total</span><span>' + escapeHtml(formatMoney(currency, subtotal)) + '</span></div>',
      '<label class="agreement-wrapper local-cart-agreement"><input type="checkbox"><span>I have read and agree to the ID Policy, Sharing of Data, and Terms and Conditions.</span></label>',
      '<div class="ignite-dialog-buttons-container"><button class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-primary" type="button"><span class="mdc-button__label">Checkout</span></button></div>',
      '</div>',
      '</cart-order-summary>',
      '</div>',
      '</div>',
    ].join("");

    wrapper.querySelectorAll(".local-cart-product").forEach(function (row) {
      var id = row.dataset.cartId;
      var input = row.querySelector(".local-cart-product__quantity");
      var remove = row.querySelector(".local-cart-product__remove");

      input.addEventListener("change", function () {
        var nextItems = readCart().map(function (item) {
          if (item.id === id) {
            item.quantity = normalizeQuantity(input.value, 1);
          }

          return item;
        });

        writeCart(nextItems);
        setupCartPage();
      });

      remove.addEventListener("click", function () {
        writeCart(readCart().filter(function (item) {
          return item.id !== id;
        }));
        setupCartPage();
      });
    });

    wrapper.querySelectorAll(".local-cart-additional-product").forEach(function (node, index) {
      var button = node.querySelector("#add-button");
      var product = additionalProducts[index];

      if (!button || !product) {
        return;
      }

      button.addEventListener("click", function (event) {
        event.preventDefault();
        addCartItem(productToCartItem(product));
        playCartAddedAnimation();
        setupCartPage();
      });
    });
  }

  async function apiJson(path) {
    var response = await fetch(path, {
      credentials: "same-origin",
      headers: authHeaders(),
    });
    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function formatDate(value) {
    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatShortDate(value) {
    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatReportDate(value) {
    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function addYears(value, years) {
    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    date.setFullYear(date.getFullYear() + years);
    return date;
  }

  function testTime(test) {
    var report = test.scoreReport || {};
    var metadata = report.metadata || test.metadata || {};
    return String(metadata.testTime || "1:30 PM");
  }

  function testTimezone(test) {
    return String((test.scoreReport && test.scoreReport.timezone) || "AEST");
  }

  function registrationId(test) {
    return String((test.scoreReport && test.scoreReport.registrationId) || "");
  }

  function reportScore(test, key) {
    var report = test.scoreReport || {};
    var fallback = key === "overallScore" ? test.score : null;
    var value = report[key] == null ? fallback : report[key];

    return value == null || value === "" ? "" : String(Math.round(Number(value)));
  }

  function isAccountRoute() {
    return ["/account", "/users/edit-user-account", "/users/edit-user-account/collapse"].includes(getRoute(new URL(window.location.href)));
  }

  function isScoreReportRoute(route) {
    return /^\/my-activity\/test-score\/[^/]+$/.test(route || getRoute(new URL(window.location.href)));
  }

  function isProtectedRoute(route) {
    return protectedRoutes.has(route) || internalRoutePatterns.some(function (pattern) {
      return pattern.test(route);
    });
  }

  function findFirst(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var element = document.querySelector(selectors[i]);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function normalizePhoneCountryCode(value) {
    var raw = value == null ? "" : String(value).trim();
    var plusMatch;
    var digits;

    if (!raw) {
      return "";
    }

    plusMatch = raw.match(/\+\s*(\d{1,4})/);
    if (plusMatch) {
      return "+" + plusMatch[1];
    }

    digits = raw.replace(/\D/g, "");
    return digits ? "+" + digits.slice(0, 4) : raw;
  }

  function setInputNodeValue(input, value) {
    var field;
    var label;
    var outline;
    var textField;
    var stringValue;

    if (!input) {
      return;
    }

    stringValue = value == null ? "" : String(value);
    input.value = stringValue;
    input.setAttribute("value", input.value);
    input.setAttribute("aria-invalid", "false");
    if (input.getAttribute("role") === "combobox") {
      input.setAttribute("aria-expanded", "false");
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    field = input.closest("mat-form-field");
    if (!field) {
      return;
    }

    field.classList.toggle("is-empty", !input.value);
    field.classList.toggle("mat-form-field-empty", !input.value);
    field.classList.toggle("mat-form-field-should-float", Boolean(input.value));
    textField = field.querySelector(".mdc-text-field");
    label = field.querySelector(".mdc-floating-label");
    outline = field.querySelector(".mdc-notched-outline");

    if (textField) {
      textField.classList.toggle("mdc-text-field--label-floating", Boolean(input.value));
    }

    if (label) {
      label.classList.toggle("mdc-floating-label--float-above", Boolean(input.value));
    }

    if (outline) {
      outline.classList.toggle("mdc-notched-outline--notched", Boolean(input.value));
    }
  }

  function setInputValue(selector, value) {
    setInputNodeValue(document.querySelector(selector), value);
  }

  function setFirstInputValue(selectors, value) {
    setInputNodeValue(findFirst(selectors), value);
  }

  function setSelectValue(selector, value) {
    var select = document.querySelector(selector);
    var text = select ? select.querySelector(".mat-mdc-select-min-line") : null;
    var displayValue = value;

    if (!select) {
      return;
    }

    if (value == null || value === "") {
      if (text) {
        text.textContent = "";
      }

      select.removeAttribute("data-value");
      return;
    }

    if (selector === "#mat-select-1") {
      displayValue = [
        "",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ][Number(value)] || value;
    }

    if (text) {
      text.textContent = String(displayValue);
    }

    select.setAttribute("data-value", String(value));
    select.setAttribute("aria-expanded", "false");
    select.setAttribute("aria-invalid", "false");
    select.classList.toggle("mat-mdc-select-empty", !String(value));
  }

  function setCheckbox(selector, checked) {
    var input = document.querySelector(selector);
    var checkbox = input ? input.closest("mat-checkbox") : null;

    if (!input) {
      return;
    }

    input.checked = Boolean(checked);
    input.setAttribute("aria-checked", checked ? "true" : "false");
    input.toggleAttribute("checked", Boolean(checked));

    if (checkbox) {
      checkbox.classList.toggle("mat-mdc-checkbox-checked", Boolean(checked));
    }
  }

  function setSwitch(selector, checked) {
    var button = document.querySelector(selector);
    var toggle = button ? button.closest("mat-slide-toggle") : null;

    if (!button) {
      return;
    }

    button.setAttribute("aria-checked", checked ? "true" : "false");
    button.classList.toggle("mdc-switch--selected", Boolean(checked));
    button.classList.toggle("mdc-switch--unselected", !checked);

    if (toggle) {
      toggle.classList.toggle("mat-mdc-slide-toggle-checked", Boolean(checked));
    }
  }

  function setRadio(inputSelector, checked) {
    var input = document.querySelector(inputSelector);
    var radio = input ? input.closest("mat-radio-button") : null;

    if (!input) {
      return;
    }

    input.checked = Boolean(checked);
    input.setAttribute("aria-checked", checked ? "true" : "false");
    input.toggleAttribute("checked", Boolean(checked));

    if (radio) {
      radio.classList.toggle("mat-mdc-radio-checked", Boolean(checked));
    }
  }

  function setRadioByValue(value, values) {
    var normalizedValue = String(value || "").toLowerCase();

    Object.keys(values).forEach(function (key) {
      setRadio(values[key], normalizedValue === key);
    });
  }

  function getInputValue(selector) {
    var input = document.querySelector(selector);
    return input ? input.value : undefined;
  }

  function getFirstInputValue(selectors) {
    var input = findFirst(selectors);
    return input ? input.value : undefined;
  }

  function getSelectValue(selector) {
    var select = document.querySelector(selector);
    return select ? select.getAttribute("data-value") || "" : undefined;
  }

  function getChecked(selector) {
    var input = document.querySelector(selector);
    return input ? input.checked : undefined;
  }

  function getSwitchChecked(selector) {
    var button = document.querySelector(selector);
    return button ? button.getAttribute("aria-checked") === "true" : undefined;
  }

  function getRadioValue(values) {
    var selected = Object.keys(values).find(function (value) {
      var input = document.querySelector(values[value]);
      return input && input.checked;
    });

    return selected;
  }

  function populateAccountProfile(user) {
    var birthDay = user.birthDay;
    var birthMonth = user.birthMonth;
    var birthYear = user.birthYear;

    if (!isAccountRoute() || !user) {
      return;
    }

    if ((!birthDay || !birthMonth || !birthYear) && user.dateOfBirth) {
      var date = new Date(user.dateOfBirth);

      if (!Number.isNaN(date.getTime())) {
        birthDay = birthDay || date.getUTCDate();
        birthMonth = birthMonth || date.getUTCMonth() + 1;
        birthYear = birthYear || date.getUTCFullYear();
      }
    }

    setInputValue("#tt-email-input", user.email);
    setInputValue("#username-input", user.username);
    setFirstInputValue(["#tt-given-names input", "#mat-input-4", "#mat-input-6"], user.firstName);
    setFirstInputValue(["#tt-last-name input", "#mat-input-5", "#mat-input-7"], user.lastName);
    setInputValue("#mat-input-1", user.cityOfBirth);
    setInputValue("#mat-input-8", user.countryOfBirth);
    setInputValue("#mat-input-9", user.countryOfCitizenship);
    setFirstInputValue(["#tt-country input", "#mat-input-10"], user.countryOfResidence);
    setInputValue("#mat-input-2", user.streetAddress);
    setInputValue("#mat-input-3", user.city);
    setInputValue("#ignite_telephone_input_0_country_code", normalizePhoneCountryCode(user.phoneCountryCode));
    setInputValue("#ignite_telephone_input_0_telephone", user.primaryPhone);

    setSelectValue("#mat-select-0", birthDay);
    setSelectValue("#mat-select-1", birthMonth);
    setSelectValue("#mat-select-2", birthYear);

    setRadioByValue(user.gender, {
      m: "#mat-radio-0-input",
      male: "#mat-radio-0-input",
      f: "#mat-radio-1-input",
      female: "#mat-radio-1-input",
      x: "#mat-radio-2-input",
      "x/other": "#mat-radio-2-input",
      other: "#mat-radio-2-input",
    });

    setRadioByValue(user.deliveredBy, {
      email: "#delivered-by-email-input",
      sms: "#delivered-by-sms-input",
      pdf: "#delivered-by-pdf-input",
    });

    setRadio("#mat-radio-3-input", user.accommodationsNeeded === false);
    setRadio("#mat-radio-4-input", user.accommodationsNeeded === true);
    setCheckbox("#tt-sms-consent-input", user.smsConsent);
    setCheckbox("#tt-communication-consent-input", user.communicationConsent);
    setCheckbox("#tt-research-consent-input", user.researchConsent);
    setCheckbox("#mat-mdc-checkbox-1-input", user.noGivenNames);
    setCheckbox("#mat-mdc-checkbox-2-input", user.noLastName);
    setSwitch("#ff-in-simplified-chinese-button", user.inSimplifiedChinese);
  }

  function setupAuthChrome() {
    var route = getRoute(new URL(window.location.href));
    var shouldBlockForUser = isProtectedRoute(route);
    var userRequest;

    if (shouldBlockForUser) {
      showPreloader();
    }

    if (shouldBlockForUser && !getStoredAuthToken()) {
      window.location.href = loginRedirectUrl;
      return Promise.resolve(null);
    }

    userRequest = fetch("/api/auth/me", {
      credentials: "same-origin",
      headers: authHeaders(),
    }).then(function (response) {
      if (response.status === 401 && shouldBlockForUser) {
        clearStoredAuthToken();
        window.location.href = loginRedirectUrl;
        return null;
      }

      return response.ok ? response.json() : null;
    }).then(function (data) {
      if (data && data.user) {
        updateUserChrome(data.user);
        populateAccountProfile(data.user);
      }
    }).catch(function () {}).finally(function () {
      if (shouldBlockForUser && !isScoreReportRoute(route)) {
        hidePreloader();
      }
    });

    document.querySelectorAll('a[href="/logout"]').forEach(function (link) {
      if (link.dataset.localLogoutReady === "true") {
        return;
      }

      link.dataset.localLogoutReady = "true";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: authHeaders(),
        }).finally(function () {
          clearStoredAuthToken();
          window.location.href = loginRedirectUrl;
        });
      });
    });

    return userRequest;
  }

  function getRoute(url) {
    return url.pathname.replace(/\/+$/, "") || "/";
  }

  function isInternalRoute(route) {
    return internalRoutes.has(route) || internalRoutePatterns.some(function (pattern) {
      return pattern.test(route);
    });
  }

  function getActiveMenuItem(route) {
    if (internalRoutePatterns[0].test(route)) {
      return "menu_item_activity";
    }

    return routeToMenuItem[route];
  }

  function sameOriginInternalLink(link) {
    if (!link.href) {
      return null;
    }

    var url = new URL(link.href, window.location.href);
    var route = getRoute(url);

    if (url.origin !== window.location.origin || !isInternalRoute(route)) {
      return null;
    }

    return url;
  }

  function setActiveMenu(route) {
    var activeId = getActiveMenuItem(route) || getActiveMenuItem(getRoute(new URL(window.location.href)));

    document.querySelectorAll(".menu-buttons .ignite-menu-button").forEach(function (link) {
      link.classList.toggle("selected", Boolean(activeId && link.id === activeId));
    });

    updateAllMenuStrikes();
  }

  function syncRouteSpecificState() {
    setActiveMenu(getRoute(new URL(window.location.href)));
    closeAll();
    setupScoreReportInfoDialogs();
    setupCookieBanner();
  }

  function closeScoreReportInfoDialog() {
    document.querySelectorAll(".local-score-info-dialog, .local-score-info-backdrop").forEach(function (node) {
      node.remove();
    });
  }

  function scoreReportInfoContent(icon) {
    var container = icon.closest(".score-overview-cont, .communication-skils-cont, .further-info-cont, .applicant-info-cont");

    if (container && container.classList.contains("applicant-info-cont")) {
      return {
        title: "Candidate information",
        content: "Candidate information shows the details held for the test taker at the time the score report was issued. These details should match the identification used for the test.",
      };
    }

    if (container && container.classList.contains("score-overview-cont")) {
      return {
        title: "Overall score",
        content: 'The overall score reflects the candidate\'s English language ability. The score is based on performance on all questions in the test. The range for the overall score is 10-90 points on Pearson\'s Global Scale of English (GSE). <a class="hand-cursor"> More information. </a>',
      };
    }

    return {
      title: "Communicative skills",
      content: 'Scores for communicative skills (listening, reading, speaking and writing) are based on all test questions that assess these skills, either as a single skill or together with other skills. <a class="hand-cursor"> More information. </a>',
    };
  }

  function showScoreReportInfoDialog(title, contentHtml) {
    var backdrop = document.createElement("div");
    var container = document.createElement("div");
    var dialogId = "mat-mdc-dialog-1";
    var titleId = "mat-mdc-dialog-title-1";

    closeScoreReportInfoDialog();

    backdrop.className = "mat-mdc-dialog-backdrop local-score-info-backdrop";
    container.className = "mat-mdc-dialog-container mdc-dialog cdk-dialog-container mat-mdc-dialog-container-with-actions mdc-dialog--open local-score-info-dialog";
    container.id = dialogId;
    container.setAttribute("role", "dialog");
    container.setAttribute("aria-modal", "false");
    container.setAttribute("aria-labelledby", titleId);
    container.setAttribute("tabindex", "-1");
    container.setAttribute("style", "--mat-dialog-transition-duration: 150ms;");
    container.innerHTML = [
      '<div class="mat-mdc-dialog-inner-container mdc-dialog__container">',
      '<div class="mat-mdc-dialog-surface mdc-dialog__surface">',
      '<srw-dialog-content _nghost-ng-c2590269337="" class="mat-mdc-dialog-component-host ng-star-inserted">',
      '<h1 _ngcontent-ng-c2590269337="" mat-dialog-title="" class="mat-mdc-dialog-title mdc-dialog__title title" id="' + titleId + '"></h1>',
      '<div _ngcontent-ng-c2590269337="" mat-dialog-content="" class="mat-mdc-dialog-content mdc-dialog__content content ng-star-inserted"></div>',
      '<div _ngcontent-ng-c2590269337="" mat-dialog-actions="" class="mat-mdc-dialog-actions mdc-dialog__actions actions ng-star-inserted">',
      '<button _ngcontent-ng-c2590269337="" mat-button="" cdkfocusinitial="" type="button" class="mdc-button mat-mdc-button-base mat-mdc-button mat-unthemed btn-ok" mat-ripple-loader-class-name="mat-mdc-button-ripple">',
      '<span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span>',
      '<span class="mdc-button__label"> OK </span>',
      '<span class="mat-focus-indicator"></span>',
      '<span class="mat-mdc-button-touch-target"></span>',
      '<span class="mat-ripple mat-mdc-button-ripple"></span>',
      '</button>',
      '</div>',
      '</srw-dialog-content>',
      '</div>',
      '</div>',
    ].join("");

    container.querySelector(".mat-mdc-dialog-title").textContent = title;
    container.querySelector(".mat-mdc-dialog-content").innerHTML = contentHtml;
    container.querySelector(".btn-ok").addEventListener("click", closeScoreReportInfoDialog);
    backdrop.addEventListener("click", closeScoreReportInfoDialog);

    document.body.appendChild(backdrop);
    document.body.appendChild(container);
    container.focus();
  }

  function setupScoreReportInfoDialogs() {
    if (!isScoreReportRoute()) {
      closeScoreReportInfoDialog();
      return;
    }

    document.querySelectorAll(".adjust-right mat-icon, .adjust-right .mat-icon").forEach(function (icon) {
      if (icon.textContent.trim() !== "info_outline" || icon.dataset.localScoreInfoReady === "true") {
        return;
      }

      icon.dataset.localScoreInfoReady = "true";
      icon.classList.add("handcursor");
      icon.setAttribute("role", "button");
      icon.setAttribute("tabindex", "0");
      icon.setAttribute("aria-label", "Show score report information");
      icon.addEventListener("click", function (event) {
        var info = scoreReportInfoContent(icon);

        event.preventDefault();
        event.stopPropagation();
        showScoreReportInfoDialog(info.title, info.content);
      });
      icon.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        icon.click();
        event.preventDefault();
      });
    });
  }

  function ensurePreloader() {
    var preloader = document.querySelector(".local-route-loader");

    if (preloader) {
      return preloader;
    }

    preloader = document.createElement("div");
    preloader.className = "local-route-loader";
    preloader.setAttribute("aria-live", "polite");
    preloader.setAttribute("aria-label", "Loading");
    preloader.setAttribute("role", "status");
    preloader.innerHTML = '<div class="local-route-loader__spinner"></div>';
    document.body.appendChild(preloader);
    return preloader;
  }

  function showPreloader() {
    preloaderVisibleFrom = Date.now();
    var preloader = ensurePreloader();
    preloader.classList.add("local-route-loader--visible");
    document.body.classList.add("is-loading");
    document.querySelectorAll("app-root, main, .admin-shell").forEach(function(el) {
      el.style.visibility = "hidden";
    });
  }

  function hidePreloader() {
    var elapsed = Date.now() - preloaderVisibleFrom;
    var delay = Math.max(0, 180 - elapsed);

    window.setTimeout(function () {
      ensurePreloader().classList.remove("local-route-loader--visible");
      document.body.classList.remove("is-loading");
      document.body.classList.remove("local-score-report-loading");
      document.querySelectorAll("app-root, main, .admin-shell").forEach(function(el) {
        el.style.visibility = "visible";
      });
    }, delay);
  }

  function moveMenuStrike(container, link) {
    var strike = container.querySelector(".menu-strike");

    if (!strike) {
      return;
    }

    if (!link) {
      strike.style.visibility = "hidden";
      strike.style.width = "0px";
      return;
    }

    var containerRect = container.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();

    strike.style.left = linkRect.left - containerRect.left + "px";
    strike.style.width = linkRect.width + "px";
    strike.style.visibility = "visible";
  }

  function updateMenuStrike(container) {
    moveMenuStrike(container, container.querySelector(".ignite-menu-button.selected"));
  }

  function updateAllMenuStrikes() {
    document.querySelectorAll(".menu-buttons-container").forEach(updateMenuStrike);
  }

  function updatePasswordFieldState(input) {
    var field = input.closest(".ignite-password-field, .mat-mdc-form-field");
    var label = field ? field.querySelector(".mdc-floating-label") : null;
    var outline = field ? field.querySelector(".mdc-notched-outline") : null;
    var hasValue = Boolean(input.value);

    if (!field) {
      return;
    }

    field.classList.toggle("is-empty", !hasValue);
    field.classList.toggle("ng-pristine", !hasValue);
    field.classList.toggle("ng-dirty", hasValue);

    if (label) {
      label.classList.toggle("mdc-floating-label--float-above", hasValue || document.activeElement === input);
    }

    if (outline) {
      outline.classList.toggle("mdc-notched-outline--notched", hasValue || document.activeElement === input);
    }
  }

  function setPasswordStrength(wrapper, className, state) {
    var item = wrapper.querySelector("." + className);

    if (!item) {
      return;
    }

    item.classList.remove("unchecked", "valid", "invalid");
    item.classList.add(state);
  }

  function updatePasswordStrength(input) {
    var field = input.closest(".ignite-password-field, mat-form-field");
    var wrapper = field ? field.querySelector(".password-strength-wrapper") : null;
    var value = input.value || "";

    if (!wrapper) {
      return;
    }

    if (!value) {
      ["size-strength", "number-strength", "cap-strength", "lower-strength", "schar-strength"].forEach(function (className) {
        setPasswordStrength(wrapper, className, "unchecked");
      });
      return;
    }

    setPasswordStrength(wrapper, "size-strength", value.length >= 12 && value.length <= 120 ? "valid" : "invalid");
    setPasswordStrength(wrapper, "number-strength", /[0-9]/.test(value) ? "valid" : "invalid");
    setPasswordStrength(wrapper, "cap-strength", /[A-Z]/.test(value) ? "valid" : "invalid");
    setPasswordStrength(wrapper, "lower-strength", /[a-z]/.test(value) ? "valid" : "invalid");
    setPasswordStrength(wrapper, "schar-strength", /[~`! @#$%^&*()_\-+={[\]}|\\:;"'<,>.?/]/.test(value) ? "valid" : "invalid");
  }

  function setPasswordVisible(toggle, input, visible) {
    window.clearTimeout(Number(toggle.dataset.hideTimer || 0));
    input.type = visible ? "text" : "password";
    toggle.classList.toggle("show", visible);
    toggle.classList.toggle("hide", !visible);
    toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
    toggle.setAttribute("aria-pressed", visible ? "true" : "false");

    if (visible) {
      toggle.dataset.hideTimer = String(window.setTimeout(function () {
        setPasswordVisible(toggle, input, false);
      }, 30000));
    }
  }

  function setupPasswordFields() {
    document.querySelectorAll(".ignite-password-field").forEach(function (field) {
      var input = field.querySelector('input[type="password"], input[type="text"]');
      var toggle = field.querySelector(".show-hide-password");

      if (!input) {
        return;
      }

      updatePasswordFieldState(input);
      updatePasswordStrength(input);

      if (input.dataset.localPasswordInputReady !== "true") {
        input.dataset.localPasswordInputReady = "true";
        input.addEventListener("input", function () {
          updatePasswordFieldState(input);
          updatePasswordStrength(input);
        });
        input.addEventListener("focus", function () {
          updatePasswordFieldState(input);
        });
        input.addEventListener("blur", function () {
          updatePasswordFieldState(input);
        });
      }

      if (!toggle || toggle.dataset.localPasswordToggleReady === "true") {
        return;
      }

      toggle.dataset.localPasswordToggleReady = "true";
      toggle.setAttribute("role", "button");
      toggle.setAttribute("tabindex", "0");
      setPasswordVisible(toggle, input, input.type === "text");

      toggle.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        setPasswordVisible(toggle, input, input.type === "password");
        input.focus();
      });
      toggle.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        toggle.click();
      });

      field.addEventListener("focusout", function (event) {
        var nextFocus = event.relatedTarget;
        if (nextFocus && field.contains(nextFocus)) {
          return;
        }
        setPasswordVisible(toggle, input, false);
      });
    });
  }

  function setupMenuStrike(container) {
    if (container.dataset.localMenuStrikeReady === "true") {
      updateMenuStrike(container);
      return;
    }

    container.dataset.localMenuStrikeReady = "true";

    container.addEventListener("mouseover", function (event) {
      var link = event.target.closest(".ignite-menu-button");

      if (link && container.contains(link)) {
        moveMenuStrike(container, link);
      }
    });

    container.addEventListener("focusin", function (event) {
      var link = event.target.closest(".ignite-menu-button");

      if (link && container.contains(link)) {
        moveMenuStrike(container, link);
      }
    });

    container.addEventListener("mouseleave", function () {
      updateMenuStrike(container);
    });

    container.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!container.contains(document.activeElement)) {
          updateMenuStrike(container);
        }
      }, 0);
    });

    updateMenuStrike(container);
  }

  function setActivityTabLabel(tab, active) {
    if (!tab) {
      return;
    }

    tab.classList.toggle("mdc-tab--active", active);
    tab.classList.toggle("mdc-tab-indicator--active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.setAttribute("tabindex", active ? "0" : "-1");
  }

  function setActivityTabBody(body, active, directionClass) {
    var content;

    if (!body) {
      return;
    }

    body.classList.toggle("mat-mdc-tab-body-active", active);
    body.setAttribute("aria-hidden", active ? "false" : "true");

    if (active) {
      body.removeAttribute("inert");
    } else {
      body.setAttribute("inert", "");
    }

    content = body.querySelector(".mat-mdc-tab-body-content");
    if (content) {
      content.classList.add("mat-tab-body-content-can-animate");
      content.classList.toggle("mat-tab-body-content-left", !active && directionClass === "left");
      content.classList.toggle("mat-tab-body-content-right", !active && directionClass === "right");
    }
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value == null ? "" : String(value);
    }
  }

  function setActivityCard(wrapper, test) {
    var card = wrapper.querySelector("mat-card");
    var report = test.scoreReport || {};
    var titleNodes = card ? card.querySelectorAll("mat-card-content p .text-large.text-bold") : [];
    var registration = card ? Array.from(card.querySelectorAll("mat-card-content p")).find(function (node) {
      return node.textContent.trim().indexOf("Registration ID:") === 0;
    }) : null;
    var center = card ? card.querySelector("#test_center strong") : null;
    var centerLines = card ? card.querySelectorAll("#test_center .ng-star-inserted div") : [];
    var cityLine = card ? Array.from(card.querySelectorAll("#test_center div")).find(function (node) {
      return node.textContent.indexOf("AUS") !== -1 || node.textContent.indexOf(report.testCenterCountry || "") !== -1;
    }) : null;
    var viewLink = card ? card.querySelector("#link_view_score") : null;

    wrapper.style.display = "";
    setText(titleNodes[0], test.title || "PTE Academic");
    setText(titleNodes[1], formatDate(test.testDate) + " - " + testTime(test) + " " + testTimezone(test));
    setText(registration, "Registration ID: " + registrationId(test));
    setText(center, report.testCenterName || "");
    setText(centerLines[0], " " + (report.testCenterAddress1 || ""));
    setText(centerLines[1], " " + (report.testCenterAddress2 || ""));
    setText(cityLine, " " + [report.testCenterCity, report.testCenterState, report.testCenterCountry, report.testCenterPostalCode].filter(Boolean).join(", ").replace(", " + report.testCenterCountry, ", " + report.testCenterCountry + " "));

    if (viewLink) {
      viewLink.href = "/my-activity/test-score/" + encodeURIComponent(test.id);
    }
  }

  async function setupDynamicActivityTests() {
    var route = getRoute(new URL(window.location.href));
    var wrappers;
    var template;
    var data;

    if (route !== "/my-activity" && route !== "/activity") {
      return;
    }

    wrappers = Array.from(document.querySelectorAll("test-taker-appointment-history")).map(function (node) {
      return node.parentElement;
    }).filter(Boolean);
    template = wrappers[0];

    if (!template) {
      return;
    }

    data = await apiJson("/api/user/tests").catch(function () {
      return { tests: [] };
    });

    while (wrappers.length < data.tests.length) {
      var clone = template.cloneNode(true);
      template.parentNode.appendChild(clone);
      wrappers.push(clone);
    }

    wrappers.forEach(function (wrapper, index) {
      var test = data.tests[index];

      if (!test) {
        wrapper.style.display = "none";
        return;
      }

      setActivityCard(wrapper, test);
    });
  }

  function setDashboardRebookCard(test) {
    var card = document.querySelector("test-taker-re-book-test #card_re_book_test");
    var report = test && test.scoreReport ? test.scoreReport : {};
    var examName = card ? card.querySelector(".exam-name") : null;
    var center = card ? card.querySelector("#test_center strong") : null;
    var centerLines = card ? card.querySelectorAll("#test_center .ng-star-inserted div") : [];
    var cityLine = card ? Array.from(card.querySelectorAll("#test_center div")).find(function (node) {
      return node.textContent.indexOf("AUS") !== -1 || node.textContent.indexOf(report.testCenterCountry || "") !== -1;
    }) : null;
    var buttonLabel = card ? card.querySelector("#button_re_book_test .mdc-button__label") : null;

    if (!card || !test) {
      return;
    }

    setText(examName, test.title || "PTE Academic");
    setText(center, report.testCenterName || "");
    setText(centerLines[0], " " + (report.testCenterAddress1 || ""));
    setText(centerLines[1], " " + (report.testCenterAddress2 || ""));
    setText(cityLine, " " + [report.testCenterCity, report.testCenterState, report.testCenterCountry, report.testCenterPostalCode].filter(Boolean).join(", ").replace(", " + report.testCenterCountry, ", " + report.testCenterCountry + " "));
    setText(buttonLabel, " Re-book " + (test.title || "PTE Academic") + " ");
  }

  function setDashboardScoreCard(test) {
    var card = document.querySelector("test-taker-score-available #card_score_available");
    var button = card ? card.querySelector("#button_view_score") : document.querySelector("#button_view_score");
    var wrapper = card ? card.closest("mat-card") || card.parentElement : null;

    if (!test) {
      if (wrapper) {
        wrapper.style.display = "none";
      }
      return;
    }

    if (wrapper) {
      wrapper.style.display = "";
    }

    if (button) {
      button.dataset.scoreId = test.id;
      button.dataset.scoreRoute = "/my-activity/test-score/" + encodeURIComponent(test.id);
    }
  }

  function clearDashboardRebookCard() {
    var card = document.querySelector("test-taker-re-book-test #card_re_book_test");
    var wrapper = card ? card.closest("mat-card") || card.parentElement : null;

    if (wrapper) {
      wrapper.style.display = "none";
    }
  }

  async function setupDashboardLatestTest() {
    var route = getRoute(new URL(window.location.href));
    var data;
    var test;

    if (route !== "/" && route !== "/dashboard" && route !== "/myPTE" && route !== "/mypte") {
      return;
    }

    data = await apiJson("/api/user/tests").catch(function () {
      return { tests: [] };
    });
    test = data.tests && data.tests.length ? data.tests[0] : null;

    if (test) {
      setDashboardRebookCard(test);
      setDashboardScoreCard(test);
    } else {
      clearDashboardRebookCard();
      setDashboardScoreCard(null);
    }
  }

  function setScoreValue(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = value || "";
    });
  }

  function clearDynamicScoreReport(user) {
    var fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "" : "";
    var pteId = user && user.pteId ? user.pteId : "";

    setScoreValue("#profile-user-name, .candidate-name1", fullName);
    setScoreValue("#profile-display-id", pteId ? "PTE ID: " + pteId : "");
    setScoreValue("#text_test_name", "Score report not found");
    setScoreValue("#text_test_time", "This test score is not available for the signed-in user.");
    setScoreValue(".src_code", "");
    setScoreValue(".candidate-id", pteId ? "Test Taker ID: " + pteId : "");
    setScoreValue(".appointment-id .desktopview-inline, .reg-id-value", "");
    setScoreValue(".overall-value, .gse-badge__score", "");
    setScoreValue(".test-center-location, .test-center-id, .test-center-name, .mobile-view-test-centre", "");
    setScoreValue(".test-date, .valid-date", "");
    setScoreValue(".country-citizenship, .country-residence, .gender", "");
    ["Listening", "Reading", "Speaking", "Writing"].forEach(function (label) {
      setScoreBars(label, "");
      setSkillSpinner(label, "");
    });
    document.querySelectorAll(".vbar-online").forEach(function (bar) {
      bar.style.left = "0%";
    });
  }

  function normalizedScore(value) {
    var score = Number(value);

    if (!Number.isFinite(score)) {
      return 0;
    }

    return Math.max(0, Math.min(90, score));
  }

  function runAfterScoreReportReveal(callback) {
    window.setTimeout(function () {
      window.requestAnimationFrame(callback);
    }, 220);
  }

  function animateHorizontalSkillBar(bar, value) {
    var score = normalizedScore(value);

    bar.style.transition = "none";
    bar.style.width = "0%";
    bar.getBoundingClientRect();

    runAfterScoreReportReveal(function () {
      bar.style.transition = "width 650ms cubic-bezier(0, 0, 0.2, 1)";
      bar.style.width = score + "%";
    });
  }

  function setSkillSpinnerProgress(container, value) {
    var score = normalizedScore(value);
    var spinner = container.querySelector(".mat-mdc-progress-spinner");
    var circumference = 282.743;
    var offset = 0;

    if (spinner) {
      spinner.setAttribute("aria-valuenow", String(score));
    }

    container.querySelectorAll(".mdc-circular-progress__determinate-circle").forEach(function (circle) {
      circle.style.strokeDasharray = circumference.toFixed(3) + "px";
      circle.style.transition = "none";
      circle.style.strokeDashoffset = circumference.toFixed(3) + "px";
      circle.getBoundingClientRect();

      runAfterScoreReportReveal(function () {
        circle.style.transition = "stroke-dashoffset 500ms cubic-bezier(0, 0, 0.2, 1)";
        circle.style.strokeDashoffset = offset.toFixed(3) + "px";
      });
    });
  }

  function setScoreBars(label, value) {
    var normalized = value || "0";

    document.querySelectorAll(".skills-horizontal").forEach(function (row) {
      if (row.textContent.toLowerCase().indexOf(label.toLowerCase()) === -1) {
        return;
      }

      setText(row.querySelector(".skill-value"), normalized);
      row.querySelectorAll(".bar").forEach(function (bar) {
        animateHorizontalSkillBar(bar, normalized);
      });
    });
  }

  function setSkillSpinner(label, value) {
    var normalized = value || "0";

    document.querySelectorAll(".skills-item-container").forEach(function (container) {
      var name = container.querySelector(".skills-item-name");
      var score = container.querySelector(".skills-item-value");

      if (!name || !score || name.textContent.toLowerCase().indexOf(label.toLowerCase()) === -1) {
        return;
      }

      score.textContent = normalized;
      setSkillSpinnerProgress(container, normalized);
    });
  }

  function clampSkillProfileScore(value) {
    var score = Math.round(Number(value) || 0);

    return Math.max(0, Math.min(90, score));
  }

  function metadataSkillProfileScore(metadata, label) {
    var sources = [
      metadata.skillsProfile,
      metadata.skillProfile,
      metadata.skillsProfileScores,
      metadata.skillProfileScores,
      metadata.subskills,
    ].filter(Boolean);
    var normalizedLabel = label.toLowerCase().replace(/\s+/g, " ").trim();
    var compactLabel = normalizedLabel.replace(/[^a-z0-9]/g, "");
    var source;
    var direct;

    for (var index = 0; index < sources.length; index += 1) {
      source = sources[index];

      if (Array.isArray(source)) {
        direct = source.find(function (item) {
          var itemLabel = String(item.label || item.name || item.title || "").toLowerCase().replace(/\s+/g, " ").trim();
          return itemLabel === normalizedLabel || itemLabel.replace(/[^a-z0-9]/g, "") === compactLabel;
        });

        if (direct) {
          return direct.score == null ? direct.value : direct.score;
        }
      } else if (typeof source === "object") {
        if (source[label] !== undefined) {
          return source[label];
        }

        direct = Object.keys(source).find(function (key) {
          var normalizedKey = key.toLowerCase().replace(/\s+/g, " ").trim();
          return normalizedKey === normalizedLabel || normalizedKey.replace(/[^a-z0-9]/g, "") === compactLabel;
        });

        if (direct) {
          return source[direct];
        }
      }
    }

    return null;
  }

  function skillsProfileRows(scores, metadata) {
    var listening = clampSkillProfileScore(scores.Listening);
    var reading = clampSkillProfileScore(scores.Reading);
    var speaking = clampSkillProfileScore(scores.Speaking);
    var writing = clampSkillProfileScore(scores.Writing);
    var fallbacks = {
      "Open Response Speaking and Writing": Math.round((speaking + writing) / 2 + 5),
      "Reproducing Spoken and Written Language": Math.round((listening + speaking + writing) / 3),
      "Extended Writing": Math.max(10, writing - 19),
      "Short Writing": Math.min(90, writing + 7),
      "Extended Speaking": Math.min(90, speaking + 2),
      "Short Speaking": Math.min(90, speaking + 4),
      "Multiple-skills Comprehension": Math.round((listening + reading) / 2),
      "Single-skill Comprehension": Math.max(0, listening - 1),
    };

    return [
      { label: "Open Response Speaking and Writing", icons: ["speaking", "writing"] },
      { label: "Reproducing Spoken and Written Language", icons: ["speaking", "writing"] },
      { label: "Extended Writing", icons: ["writing"] },
      { label: "Short Writing", icons: ["writing"] },
      { label: "Extended Speaking", icons: ["speaking"] },
      { label: "Short Speaking", icons: ["speaking"] },
      { label: "Multiple-skills Comprehension", icons: ["listening", "reading"] },
      { label: "Single-skill Comprehension", icons: ["listening", "reading"] },
    ].map(function (row) {
      var metadataValue = metadataSkillProfileScore(metadata, row.label);
      return {
        label: row.label,
        icons: row.icons,
        value: clampSkillProfileScore(metadataValue == null ? fallbacks[row.label] : metadataValue),
      };
    });
  }

  function skillProfileIcon(name, selected) {
    var iconClass = {
      listening: "fa-headphones",
      reading: "fa-book-reader",
      speaking: "fa-comments",
      writing: "fa-pen-nib",
    }[name];

    return '<i class="far ' + iconClass + (selected ? " selected" : "") + '"></i>';
  }

  function skillProfileRowHtml(row, index) {
    var scale = Math.max(0, Math.min(1, row.value / 100));
    var icons = ["listening", "reading", "speaking", "writing"].map(function (name) {
      return skillProfileIcon(name, row.icons.indexOf(name) !== -1);
    }).join("");

    return [
      '<div _ngcontent-ng-c2218864371="" class="grid-panel-row ng-star-inserted" id="skills-profile-grid-row-' + index + '">',
      '<div _ngcontent-ng-c2218864371="">',
      '<div _ngcontent-ng-c2218864371="" class="toggle-col ng-star-inserted"><i _ngcontent-ng-c2218864371="" class="fal fa-arrow-circle-right ng-star-inserted"></i></div>',
      '<div _ngcontent-ng-c2218864371="" class="row-content">',
      '<div _ngcontent-ng-c2218864371="" class="header-col score-col ng-star-inserted" style="flex: 0 0 100%; max-width: 100%; text-align: unset;">',
      '<ignite-grid-custom _ngcontent-ng-c2218864371="" class="ng-star-inserted">',
      '<ignite-skill-score-header _nghost-ng-c445328285="" class="ng-star-inserted">',
      '<div _ngcontent-ng-c445328285="" class="score-container">',
      '<div _ngcontent-ng-c445328285="" class="subskill-name">' + escapeHtml(row.label) + '</div>',
      '<div _ngcontent-ng-c445328285="" class="score-indicator">',
      '<div _ngcontent-ng-c445328285="" class="icons">' + icons + '</div>',
      '<div _ngcontent-ng-c445328285="" class="score">',
      '<mat-progress-bar _ngcontent-ng-c445328285="" role="progressbar" aria-valuemin="0" aria-valuemax="100" tabindex="-1" ignite-progress-bar="" mode="determinate" class="mat-mdc-progress-bar mdc-linear-progress mat-normal mdc-linear-progress--animation-ready ignite-progress-bar" aria-valuenow="' + row.value + '">',
      '<div aria-hidden="true" class="mdc-linear-progress__buffer"><div class="mdc-linear-progress__buffer-bar" style="flex-basis: 100%;"></div></div>',
      '<div aria-hidden="true" class="mdc-linear-progress__bar mdc-linear-progress__primary-bar" style="transform: scaleX(' + scale + ');"><span class="mdc-linear-progress__bar-inner"></span></div>',
      '<div aria-hidden="true" class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar"><span class="mdc-linear-progress__bar-inner"></span></div>',
      '</mat-progress-bar>',
      '</div>',
      '</div>',
      '</div>',
      '</ignite-skill-score-header>',
      '</ignite-grid-custom>',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
    ].join("");
  }

  function skillsProfileHtml(scores, overall, metadata) {
    var rows = skillsProfileRows(scores, metadata || {});

    return [
      '<ignite-skills-profile-report _nghost-ng-c3320047766="" class="local-skill-profile-report ng-star-inserted">',
      '<div _ngcontent-ng-c3320047766="" class="ng-star-inserted">',
      '<div _ngcontent-ng-c3320047766="" id="overall-score-container" class="score-container">',
      '<div _ngcontent-ng-c3320047766="" class="panel-header"> Scores Overview<span _ngcontent-ng-c3320047766="" class="overall-score-text"><span _ngcontent-ng-c3320047766="">Overall score </span>' + escapeHtml(overall) + '</span></div>',
      '<div _ngcontent-ng-c3320047766="" class="overall-score-wrapper">',
      '<div _ngcontent-ng-c3320047766="" class="overall-score"><div _ngcontent-ng-c3320047766="">Overall Score</div><div _ngcontent-ng-c3320047766="">' + escapeHtml(overall) + '</div></div>',
      '<div _ngcontent-ng-c3320047766="" class="score-by-skill">',
      '<div _ngcontent-ng-c3320047766="" class="skill listening"><div _ngcontent-ng-c3320047766="">' + escapeHtml(scores.Listening) + '</div><div _ngcontent-ng-c3320047766="">Listening</div><i _ngcontent-ng-c3320047766="" class="far fa-headphones"></i></div>',
      '<div _ngcontent-ng-c3320047766="" class="skill reading"><div _ngcontent-ng-c3320047766="">' + escapeHtml(scores.Reading) + '</div><div _ngcontent-ng-c3320047766="">Reading</div><i _ngcontent-ng-c3320047766="" class="far fa-book-reader"></i></div>',
      '<div _ngcontent-ng-c3320047766="" class="skill speaking"><div _ngcontent-ng-c3320047766="">' + escapeHtml(scores.Speaking) + '</div><div _ngcontent-ng-c3320047766="">Speaking</div><i _ngcontent-ng-c3320047766="" class="far fa-comments"></i></div>',
      '<div _ngcontent-ng-c3320047766="" class="skill writing"><div _ngcontent-ng-c3320047766="">' + escapeHtml(scores.Writing) + '</div><div _ngcontent-ng-c3320047766="">Writing</div><i _ngcontent-ng-c3320047766="" class="far fa-pen-nib"></i></div>',
      '</div>',
      '</div>',
      '</div>',
      '<div _ngcontent-ng-c3320047766="" id="skills-profile-container" class="score-container skills-profile-container">',
      '<div _ngcontent-ng-c3320047766="" class="panel-header">Your Skills Profile</div>',
      '<div _ngcontent-ng-c3320047766="" class="skills-profile grid-container flex-height-row">',
      '<ignite-panel-grid _ngcontent-ng-c3320047766="" id="skills-profile-grid" name="SkillsProfileGrid" _nghost-ng-c2218864371="">',
      '<div _ngcontent-ng-c2218864371="" class="grid-panel" id="skills-profile-grid">',
      '<div _ngcontent-ng-c2218864371="" class="grid-panel-header ng-star-inserted" id="skills-profile-grid-header"><div _ngcontent-ng-c2218864371="" class="spacer-col ng-star-inserted">&nbsp;</div><div _ngcontent-ng-c2218864371="" class="row-content"><div _ngcontent-ng-c2218864371="" class="header-col-title ng-star-inserted" id="score-col-header" style="flex: 0 0 100%; max-width: 100%; justify-content: normal;"><span _ngcontent-ng-c2218864371="">  </span></div></div></div>',
      rows.map(skillProfileRowHtml).join(""),
      '<div _ngcontent-ng-c2218864371="" class="grid-row-details accordion ng-star-inserted"></div>',
      '</div>',
      '</ignite-panel-grid>',
      '</div>',
      '</div>',
      '</div>',
      '</ignite-skills-profile-report>',
    ].join("");
  }

  function openSkillsProfile(scores, overall, metadata) {
    var reportNode = document.querySelector("srw-search-report");
    var teaser = document.querySelector(".skills-profile-section");
    var existing = document.querySelector(".local-skill-profile-host");
    var host = reportNode && reportNode.parentNode ? reportNode.parentNode : document.querySelector("ignite-score-report .ng-star-inserted");

    if (!host) {
      return;
    }

    if (reportNode) {
      reportNode.style.display = "none";
    }

    if (teaser) {
      teaser.style.display = "none";
    }

    if (!existing) {
      existing = document.createElement("div");
      existing.className = "local-skill-profile-host";
      if (reportNode && reportNode.nextSibling) {
        reportNode.parentNode.insertBefore(existing, reportNode.nextSibling);
      } else {
        host.appendChild(existing);
      }
    }

    existing.innerHTML = skillsProfileHtml(scores, overall, metadata);
    existing.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setLabeledInfo(label, value) {
    document.querySelectorAll(".overview-points li, #parent3 .left, #parent3 .right").forEach(function (node) {
      var strong = node.querySelector("strong");
      var target = strong && strong.parentElement ? strong.parentElement.querySelector("span[class], p") : null;

      if (!strong || !target || strong.textContent.replace(/\s+/g, " ").trim().toLowerCase() !== label.toLowerCase()) {
        return;
      }

      target.textContent = value == null ? "" : String(value);
    });
  }

  function setCandidateInfo(user) {
    var dateOfBirth = "";

    if (user.birthDay && user.birthMonth && user.birthYear) {
      dateOfBirth = new Date(Date.UTC(user.birthYear, user.birthMonth - 1, user.birthDay)).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } else if (user.dateOfBirth) {
      dateOfBirth = formatShortDate(user.dateOfBirth);
    }

    setScoreValue(".candidate-info .country-citizenship", user.countryOfCitizenship || "");
    document.querySelectorAll(".candidate-info .country-residence").forEach(function (node, index) {
      node.textContent = index === 0 ? dateOfBirth : (user.countryOfResidence || "");
    });
    setScoreValue(".candidate-info .gender", user.gender || "");
  }

  async function setupDynamicScoreReport() {
    var route = getRoute(new URL(window.location.href));
    var id;
    var data;
    var auth;
    var test;
    var report;
    var overall;
    var listening;
    var reading;
    var speaking;
    var writing;

    if (!isScoreReportRoute(route)) {
      return;
    }

    showPreloader();

    try {
      id = route.split("/").pop();
      if (id === "latest") {
        data = await apiJson("/api/user/tests").then(function (payload) {
          return { test: payload.tests && payload.tests.length ? payload.tests[0] : null };
        }).catch(function () {
          return { test: null };
        });
      } else {
        data = await apiJson("/api/user/tests/" + encodeURIComponent(id)).catch(function () {
          return { test: null };
        });
      }
      auth = await apiJson("/api/auth/me").catch(function () {
        return {};
      });
      test = data.test;

      if (!test || (auth.user && Number(test.userId) !== Number(auth.user.id))) {
        clearDynamicScoreReport(auth.user || null);
        return;
      }

      if (id === "latest") {
        window.history.replaceState({ localRoute: "/my-activity/test-score/" + test.id }, "", "/my-activity/test-score/" + encodeURIComponent(test.id));
      }

      report = test.scoreReport || {};
      var metadata = Object.assign({}, test.metadata || {}, report.metadata || {});
      var validUntil = report.validUntil || addYears(test.testDate, 2);
      var reportDate = formatReportDate(test.testDate);
      var validDate = formatReportDate(validUntil);
      overall = reportScore(test, "overallScore");
      listening = reportScore(test, "listeningScore");
      reading = reportScore(test, "readingScore");
      speaking = reportScore(test, "speakingScore");
      writing = reportScore(test, "writingScore");
      var scores = {
        Listening: listening,
        Reading: reading,
        Speaking: speaking,
        Writing: writing,
      };

      setText(document.querySelector("#text_test_name"), (test.title || "PTE Academic") + " • ID" + registrationId(test));
      setText(document.querySelector("#text_test_time"), formatDate(test.testDate) + " - " + testTime(test) + " " + testTimezone(test));
      setScoreValue(".src_code", report.reportCode || "");
      setScoreValue(".overall-value, .gse-badge__score", overall);
      document.querySelectorAll(".vbar-online").forEach(function (bar) {
        bar.style.left = (overall || "0") + "%";
      });
      setScoreBars("Listening", listening);
      setScoreBars("Reading", reading);
      setScoreBars("Speaking", speaking);
      setScoreBars("Writing", writing);
      setSkillSpinner("Listening", listening);
      setSkillSpinner("Reading", reading);
      setSkillSpinner("Speaking", speaking);
      setSkillSpinner("Writing", writing);
      setScoreValue(".test-center-location", report.testCenterCountry || "");
      setScoreValue(".test-center-id", metadata.testCenterId || "");
      setScoreValue(".test-center-name, .mobile-view-test-centre", report.testCenterName || "");
      setScoreValue(".test-date", reportDate);
      setScoreValue(".valid-date", validDate);
      var reportUser = test.user || auth.user || {};
      var fullName = [reportUser.firstName, reportUser.lastName].filter(Boolean).join(" ") || reportUser.username || "";
      var pteId = reportUser.pteId || "";

      setScoreValue("#profile-user-name, .candidate-name1, .candidate-name2", fullName);
      setScoreValue("#profile-display-id", pteId ? "PTE ID: " + pteId : "");
      setScoreValue(".candidate-id", pteId ? "Test Taker ID: " + pteId : "");
      if (reportUser.avatarUrl) {
        document.querySelectorAll(".avatar-image").forEach(function (image) {
          image.src = reportUser.avatarUrl;
        });
      }

      setLabeledInfo("Test Taker ID", reportUser.pteId || "");
      setLabeledInfo("Registration ID", registrationId(test));
      setLabeledInfo("Test Centre Country", report.testCenterCountry || "");
      setLabeledInfo("Test Centre ID", metadata.testCenterId || "");
      setLabeledInfo("Test Date", reportDate);
      setLabeledInfo("Valid Until", validDate);

      if (reportUser) {
        setCandidateInfo(reportUser);
      }

      var skillsProfileButton = document.querySelector("#view-skills-profile-button");
      if (skillsProfileButton && skillsProfileButton.dataset.localSkillsProfileReady !== "true") {
        skillsProfileButton.dataset.localSkillsProfileReady = "true";
        skillsProfileButton.addEventListener("click", function (event) {
          if (event) {
            event.preventDefault();
            event.stopPropagation();
          }

          openSkillsProfile(scores, overall, metadata);
          return false;
        }, true);
      }
    } finally {
      hidePreloader();
    }
  }

  function setupActivityTabs() {
    var root = document.querySelector(".activity-tabs");
    var testsTab;
    var orderHistoryTab;
    var testsWrapper;
    var orderHistoryWrapper;

    if (!root || root.dataset.localActivityTabsReady === "true") {
      return;
    }

    testsTab = root.querySelector("#mat-tab-group-2-label-0");
    orderHistoryTab = root.querySelector("#mat-tab-group-2-label-1");
    testsWrapper = root.querySelector("#mat-tab-group-2-content-0")?.closest(".mat-mdc-tab-body-wrapper");
    orderHistoryWrapper = root.querySelector("#mat-tab-group-0-content-1")?.closest(".mat-mdc-tab-body-wrapper");

    if (!testsTab || !orderHistoryTab || !testsWrapper || !orderHistoryWrapper) {
      return;
    }

    function activateTab(tabName) {
      var showOrderHistory = tabName === "order-history";

      setActivityTabLabel(testsTab, !showOrderHistory);
      setActivityTabLabel(orderHistoryTab, showOrderHistory);

      testsWrapper.style.display = showOrderHistory ? "none" : "";
      orderHistoryWrapper.style.display = showOrderHistory ? "" : "none";

      setActivityTabBody(root.querySelector("#mat-tab-group-2-content-0"), !showOrderHistory, "left");
      setActivityTabBody(root.querySelector("#mat-tab-group-2-content-1"), false, "right");
      setActivityTabBody(root.querySelector("#mat-tab-group-0-content-0"), false, "left");
      setActivityTabBody(root.querySelector("#mat-tab-group-0-content-1"), showOrderHistory, "right");
    }

    function handleKeydown(event, tabName) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateTab(tabName);
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        activateTab(tabName === "tests" ? "order-history" : "tests");
      }
    }

    root.dataset.localActivityTabsReady = "true";

    testsTab.addEventListener("click", function () {
      activateTab("tests");
    });
    orderHistoryTab.addEventListener("click", function () {
      activateTab("order-history");
    });
    testsTab.addEventListener("keydown", function (event) {
      handleKeydown(event, "tests");
    });
    orderHistoryTab.addEventListener("keydown", function (event) {
      handleKeydown(event, "order-history");
    });

    activateTab(orderHistoryTab.getAttribute("aria-selected") === "true" ? "order-history" : "tests");
  }

  function getLearnViewFromUrl() {
    var params = new URL(window.location.href).searchParams;
    var view = params.get("view") || "store";

    if (view === "purchases") {
      return "my-purchases";
    }

    return ["store", "my-purchases", "free-resources"].includes(view) ? view : "store";
  }

  function updateLearnUrl(view, journeyId, sectionId) {
    var url = new URL(window.location.href);

    if (view === "store") {
      url.searchParams.delete("view");
      url.searchParams.delete("journeyId");
      url.searchParams.delete("section");
    } else {
      url.searchParams.set("view", view);
    }

    if (view === "free-resources") {
      url.searchParams.set("journeyId", journeyId || "pte-academic");

      if (sectionId) {
        url.searchParams.set("section", sectionId);
      } else {
        url.searchParams.delete("section");
      }
    } else {
      url.searchParams.delete("journeyId");
      url.searchParams.delete("section");
    }

    window.history.replaceState({ localRoute: "/learn" }, "", url.pathname + url.search);
  }

  function renderResourceMeta(resource) {
    return [resource.type, resource.time].filter(Boolean).map(function (value) {
      return '<span class="chip"><span>' + escapeHtml(value) + '</span></span>';
    }).join("");
  }

  function renderFreeResourceCards(items) {
    if (!items || !items.length) {
      return '<div class="local-free-resources__empty">No resources are available for this section.</div>';
    }

    return [
      '<div class="local-free-resources__cards">',
      items.map(function (item) {
        return [
          '<article class="learn-free-product-card local-free-resources__card">',
          item.thumbnail ? '<a class="learn-free-product-card__thumbnail" href="' + escapeHtml(item.url || "#") + '" target="_blank" rel="noopener" style="background-image:url(' + escapeHtml(item.thumbnail) + ')" aria-label="' + escapeHtml(item.title) + '"></a>' : '',
          '<div class="learn-free-product-card__wrapper">',
          '<div class="learn-free-product-card__header">',
          item.thumbnail ? '<a class="learn-free-product-card__thumbnail--mini" href="' + escapeHtml(item.url || "#") + '" target="_blank" rel="noopener" style="background-image:url(' + escapeHtml(item.thumbnail) + ')" aria-label="' + escapeHtml(item.title) + '"></a>' : '',
          '<div>',
          '<div class="learn-free-product-card__title">' + escapeHtml(item.title) + '</div>',
          '<div class="learn-free-product-card__subtitle">' + renderResourceMeta(item) + '</div>',
          '</div>',
          '</div>',
          item.text ? '<div class="learn-free-product-card__content">' + escapeHtml(item.text) + '</div>' : '',
          item.url ? '<div class="learn-free-product-card__buttons"><a class="learn-free-product-card__buttons__button" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">Open resource</a></div>' : '',
          '</div>',
          '</article>',
        ].join("");
      }).join(""),
      '</div>',
    ].join("");
  }

  function renderStudyPlan(section) {
    var plans = section.studyPlans || [];

    if (!plans.length) {
      return renderFreeResourceCards(section.items || []);
    }

    return [
      '<div class="local-free-resources__plans">',
      plans.map(function (plan) {
        return [
          '<section class="local-free-resources__plan">',
          '<h3>' + escapeHtml(plan.title) + '</h3>',
          '<div class="local-free-resources__plan-items">',
          (plan.studyPlanItems || []).map(function (item) {
            var actions = (item.actions || []).filter(function (action) {
              return action.actionUrl;
            });

            return [
              '<article class="local-free-resources__plan-item">',
              '<div>',
              '<div class="local-free-resources__card-title">' + escapeHtml(item.title) + '</div>',
              item.description ? '<p class="local-free-resources__text">' + escapeHtml(item.description) + '</p>' : '',
              '<div class="local-free-resources__meta">' + renderResourceMeta({ type: item.price && item.price !== "0" ? item.price : "Free", time: item.time }) + '</div>',
              '</div>',
              actions.length ? '<div class="local-free-resources__actions">' + actions.map(function (action) {
                return '<a class="ignite-link local-free-resources__link" href="' + escapeHtml(action.actionUrl) + '" target="_blank" rel="noopener">' + escapeHtml(action.title || "Open resource") + (action.time ? " - " + escapeHtml(action.time) : "") + '</a>';
              }).join("") + '</div>' : '',
              '</article>',
            ].join("");
          }).join(""),
          '</div>',
          '</section>',
        ].join("");
      }).join(""),
      '</div>',
    ].join("");
  }

  function renderPurchaseMaterials(exam) {
    var isCore = exam === "pte-core";
    var products = isCore
      ? ["PTE Core Question Bank", "Official Guide to PTE Core", "PTE Core - Self Study Guide"]
      : ["PTE Academic Question Bank", "Official Guide to PTE Academic", "PTE Expert - Self Study Guide B1/B2"];

    return [
      '<test-taker-purchased-scored-practice-tests class="ng-star-inserted">',
      '<div class="title">Practice Tests</div>',
      '<div class="no-purchases ng-star-inserted">',
      '<div class="no-purchases-container">',
      "<div class=\"title\">You haven't purchased any scored practice tests</div>",
      '<div class="ignite-dialog-buttons-container"><button id="goto-shopping" type="button" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-secondary"><span class="mdc-button__label"> Visit store </span></button></div>',
      '</div>',
      '</div>',
      '</test-taker-purchased-scored-practice-tests>',
      '<test-taker-learn-materials class="ng-star-inserted">',
      '<div class="title">Other learning materials</div>',
      "<div class=\"text ng-star-inserted\"> Note: For first-time access, you'll need to go to the Pearson English Portal, create an account and enter the access code received in your confirmation email.<br><br><b>Don't have a code?</b> Get a code when you buy these learning materials from the <a id=\"goto-shopping-link\">Store</a>. </div>",
      '<div class="cards ng-star-inserted">',
      products.map(function (name) {
        return [
          '<mat-card ignite-dashboard-card class="mat-mdc-card mdc-card ignite-dashboard-card ng-star-inserted">',
          '<mat-card-content class="mat-mdc-card-content">',
          '<div class="card-content">',
          '<div class="action-content">',
          '<div class="product-name"> ' + escapeHtml(name) + ' </div>',
          '<div class="button-container">',
          '<div class="button-content">',
          '<div class="ignite-dialog-buttons-container"><button type="button" class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-primary local-access-code-button"><span class="mdc-button__label"> Access with code </span></button></div>',
          '</div>',
          '</div>',
          '</div>',
          '</div>',
          '</mat-card-content>',
          '</mat-card>',
        ].join("");
      }).join(""),
      '</div>',
      '</test-taker-learn-materials>',
    ].join("");
  }

  function activateLearnPurchasesExamTab(exam) {
    var root = document.querySelector("test-taker-learn-purchases");
    var isCore = exam === "pte-core";
    var academicTab = root ? root.querySelector("#local-purchases-label-0") : null;
    var coreTab = root ? root.querySelector("#local-purchases-label-1") : null;
    var academicBody = root ? root.querySelector("#local-purchases-content-0") : null;
    var coreBody = root ? root.querySelector("#local-purchases-content-1") : null;

    if (!root || !academicTab || !coreTab || !academicBody || !coreBody) {
      return;
    }

    setActivityTabLabel(academicTab, !isCore);
    setActivityTabLabel(coreTab, isCore);
    setActivityTabBody(academicBody, !isCore, "left");
    setActivityTabBody(coreBody, isCore, "right");
  }

  function setupLearnPurchasesActions(root) {
    root.querySelectorAll("#goto-shopping, #goto-shopping-link").forEach(function (node) {
      if (node.dataset.localPurchasesStoreReady === "true") {
        return;
      }

      node.dataset.localPurchasesStoreReady = "true";
      node.addEventListener("click", function (event) {
        event.preventDefault();
        activateLearnTab("store");
        updateLearnUrl("store");
        setupLearnTabs();
      });
    });

    root.querySelectorAll(".local-access-code-button").forEach(function (button) {
      if (button.dataset.localAccessCodeReady === "true") {
        return;
      }

      button.dataset.localAccessCodeReady = "true";
      button.addEventListener("click", function () {
        window.open("https://english-dashboard.pearson.com/", "_blank", "noopener");
      });
    });
  }

  function renderLearnPurchases() {
    var body = document.querySelector("#mat-tab-group-0-content-1 .mat-mdc-tab-body-content");

    if (!body) {
      return;
    }

    body.innerHTML = [
      '<test-taker-learn-purchases class="ng-star-inserted">',
      '<div class="learn-purchases-container ng-star-inserted local-learn-purchases">',
      '<div class="banner-container"><div class="image">&nbsp;</div></div>',
      '<div class="learn-items-container">',
      '<mat-tab-group animationduration="0ms" class="mat-mdc-tab-group mat-primary mat-mdc-tab-group-stretch-tabs" style="--mat-tab-animation-duration: 0ms;">',
      '<mat-tab-header class="mat-mdc-tab-header">',
      '<div class="mat-ripple mat-mdc-tab-header-pagination mat-mdc-tab-header-pagination-before mat-mdc-tab-header-pagination-disabled"><div class="mat-mdc-tab-header-pagination-chevron"></div></div>',
      '<div class="mat-mdc-tab-label-container">',
      '<div role="tablist" class="mat-mdc-tab-list" style="transform: translateX(0px);">',
      '<div class="mat-mdc-tab-labels">',
      '<div role="tab" class="mdc-tab mat-mdc-tab mat-focus-indicator mdc-tab--active mdc-tab-indicator--active" id="local-purchases-label-0" tabindex="0" aria-posinset="1" aria-setsize="2" aria-controls="local-purchases-content-0" aria-selected="true" aria-disabled="false"><span class="mdc-tab__ripple"></span><div class="mat-ripple mat-mdc-tab-ripple"></div><span class="mdc-tab__content"><span class="mdc-tab__text-label"><span class="label-text menu-style">PTE Academic</span></span></span><span class="mdc-tab-indicator"><span class="mdc-tab-indicator__content mdc-tab-indicator__content--underline"></span></span></div>',
      '<div role="tab" class="mdc-tab mat-mdc-tab mat-focus-indicator" id="local-purchases-label-1" tabindex="-1" aria-posinset="2" aria-setsize="2" aria-controls="local-purchases-content-1" aria-selected="false" aria-disabled="false"><span class="mdc-tab__ripple"></span><div class="mat-ripple mat-mdc-tab-ripple"></div><span class="mdc-tab__content"><span class="mdc-tab__text-label"><span class="label-text menu-style">PTE Core</span></span></span><span class="mdc-tab-indicator"><span class="mdc-tab-indicator__content mdc-tab-indicator__content--underline"></span></span></div>',
      '</div>',
      '</div>',
      '</div>',
      '<div class="mat-ripple mat-mdc-tab-header-pagination mat-mdc-tab-header-pagination-after mat-mdc-tab-header-pagination-disabled"><div class="mat-mdc-tab-header-pagination-chevron"></div></div>',
      '</mat-tab-header>',
      '<div class="mat-mdc-tab-body-wrapper _mat-animation-noopable">',
      '<mat-tab-body role="tabpanel" class="mat-mdc-tab-body mat-mdc-tab-body-active" id="local-purchases-content-0" aria-labelledby="local-purchases-label-0" aria-hidden="false"><div class="mat-mdc-tab-body-content mat-tab-body-content-can-animate">' + renderPurchaseMaterials("pte-academic") + '</div></mat-tab-body>',
      '<mat-tab-body role="tabpanel" class="mat-mdc-tab-body" id="local-purchases-content-1" aria-labelledby="local-purchases-label-1" aria-hidden="true" inert=""><div class="mat-mdc-tab-body-content mat-tab-body-content-can-animate mat-tab-body-content-right">' + renderPurchaseMaterials("pte-core") + '</div></mat-tab-body>',
      '</div>',
      '</mat-tab-group>',
      '</div>',
      '</div>',
      '</test-taker-learn-purchases>',
    ].join("");

    body.querySelector("#local-purchases-label-0").addEventListener("click", function () {
      activateLearnPurchasesExamTab("pte-academic");
    });
    body.querySelector("#local-purchases-label-1").addEventListener("click", function () {
      activateLearnPurchasesExamTab("pte-core");
    });
    [body.querySelector("#local-purchases-label-0"), body.querySelector("#local-purchases-label-1")].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          tab.click();
        }
      });
    });

    setupLearnPurchasesActions(body);
  }

  function renderFreeResources(resources, journeyId, sectionId) {
    var body = document.querySelector("#mat-tab-group-0-content-2 .mat-mdc-tab-body-content");
    var journey = resources.find(function (item) {
      return item.journeyId === journeyId;
    }) || resources[0];
    var section = journey && (journey.sections || []).find(function (item) {
      return item.sectionId === sectionId;
    });

    if (!body || !journey) {
      return;
    }

    section = section || (journey.sections || [])[0];
    body.innerHTML = [
      '<div class="local-free-resources">',
      '<div class="local-free-resources__heading">',
      '<h1>Free resources</h1>',
      '<p>' + escapeHtml(journey.description || "") + '</p>',
      '</div>',
      '<div class="local-free-resources__journeys" role="tablist" aria-label="Free resource journeys">',
      resources.map(function (item) {
        var active = item.journeyId === journey.journeyId;

        return '<button class="local-free-resources__journey' + (active ? " is-active" : "") + '" type="button" role="tab" aria-selected="' + String(active) + '" data-journey-id="' + escapeHtml(item.journeyId) + '">' + escapeHtml(item.title) + '</button>';
      }).join(""),
      '</div>',
      '<div class="local-free-resources__layout">',
      '<div class="local-free-resources__sections" role="tablist" aria-label="' + escapeHtml(journey.title) + ' resource sections">',
      (journey.sections || []).map(function (item) {
        var active = section && item.sectionId === section.sectionId;

        return '<button class="local-free-resources__section' + (active ? " is-active" : "") + '" type="button" role="tab" aria-selected="' + String(active) + '" data-section-id="' + escapeHtml(item.sectionId) + '">' + (item.iconPath ? '<img src="' + escapeHtml(item.iconPath) + '" alt="">' : '') + '<span>' + escapeHtml(item.menuTitle || item.title) + '</span></button>';
      }).join(""),
      '</div>',
      '<section class="local-free-resources__panel" role="tabpanel">',
      section ? '<h2>' + escapeHtml(section.title) + '</h2>' : '',
      section && section.subTitle ? '<p class="local-free-resources__subtitle">' + escapeHtml(section.subTitle) + '</p>' : '',
      section && section.studyPlans ? renderStudyPlan(section) : renderFreeResourceCards(section ? section.items : []),
      '</section>',
      '</div>',
      '</div>',
    ].join("");

    body.querySelectorAll("[data-journey-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        var nextJourney = resources.find(function (item) {
          return item.journeyId === button.dataset.journeyId;
        });
        var nextSection = nextJourney && nextJourney.sections && nextJourney.sections[0];

        updateLearnUrl("free-resources", button.dataset.journeyId, nextSection ? nextSection.sectionId : "");
        renderFreeResources(resources, button.dataset.journeyId, nextSection ? nextSection.sectionId : "");
      });
    });

    body.querySelectorAll("[data-section-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        updateLearnUrl("free-resources", journey.journeyId, button.dataset.sectionId);
        renderFreeResources(resources, journey.journeyId, button.dataset.sectionId);
      });
    });
  }

  function activateLearnStoreExamTab(exam) {
    var root = document.querySelector("test-taker-learn-shop-tabs");
    var isCore = exam === "pte-core";
    var academicTab;
    var coreTab;
    var academicBody;
    var coreBody;
    var coreContent;

    if (!root) {
      return;
    }

    academicTab = root.querySelector("#mat-tab-group-3-label-0");
    coreTab = root.querySelector("#mat-tab-group-3-label-1");
    academicBody = root.querySelector("#mat-tab-group-3-content-0");
    coreBody = root.querySelector("#mat-tab-group-3-content-1");
    coreContent = coreBody ? coreBody.querySelector(".mat-mdc-tab-body-content") : null;

    if (!academicTab || !coreTab || !academicBody || !coreBody || !coreContent) {
      return;
    }

    if (isCore && !coreContent.querySelector("learn-products-component")) {
      coreContent.innerHTML = renderPteCoreShop();
    }

    setActivityTabLabel(academicTab, !isCore);
    setActivityTabLabel(coreTab, isCore);
    setActivityTabBody(academicBody, !isCore, "left");
    setActivityTabBody(coreBody, isCore, "right");
    setupLearnCartButtons();
  }

  function setupLearnStoreExamTabs() {
    var root = document.querySelector("test-taker-learn-shop-tabs");
    var academicTab;
    var coreTab;

    if (!root || root.dataset.localStoreExamTabsReady === "true") {
      return;
    }

    academicTab = root.querySelector("#mat-tab-group-3-label-0");
    coreTab = root.querySelector("#mat-tab-group-3-label-1");

    if (!academicTab || !coreTab) {
      return;
    }

    root.dataset.localStoreExamTabsReady = "true";
    academicTab.addEventListener("click", function () {
      activateLearnStoreExamTab("pte-academic");
    });
    coreTab.addEventListener("click", function () {
      activateLearnStoreExamTab("pte-core");
    });
    [academicTab, coreTab].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        tab.click();
      });
    });

    activateLearnStoreExamTab(coreTab.getAttribute("aria-selected") === "true" ? "pte-core" : "pte-academic");
  }

  function activateLearnTab(view) {
    var root = document.querySelector("test-taker-learn");
    var config = {
      store: { index: 0 },
      "my-purchases": { index: 1 },
      "free-resources": { index: 2 },
    };

    if (!root || !config[view]) {
      return;
    }

    Object.keys(config).forEach(function (name) {
      var index = config[name].index;
      var active = name === view;

      setActivityTabLabel(root.querySelector("#mat-tab-group-0-label-" + index), active);
      setActivityTabBody(root.querySelector("#mat-tab-group-0-content-" + index), active, index < config[view].index ? "left" : "right");
    });
  }

  async function setupLearnTabs() {
    var root = document.querySelector("test-taker-learn");
    var route = getRoute(new URL(window.location.href));
    var params;
    var view;

    if (route !== "/learn" || !root) {
      return;
    }

    params = new URL(window.location.href).searchParams;
    view = getLearnViewFromUrl();

    [
      { tab: root.querySelector("#mat-tab-group-0-label-0"), view: "store" },
      { tab: root.querySelector("#mat-tab-group-0-label-1"), view: "my-purchases" },
      { tab: root.querySelector("#mat-tab-group-0-label-2"), view: "free-resources" },
    ].forEach(function (item) {
      if (!item.tab || item.tab.dataset.localLearnTabReady === "true") {
        return;
      }

      item.tab.dataset.localLearnTabReady = "true";
      item.tab.addEventListener("click", function () {
        var nextJourney = item.view === "free-resources" ? (params.get("journeyId") || "pte-academic") : "";

        activateLearnTab(item.view);
        updateLearnUrl(item.view, nextJourney);

        if (item.view === "my-purchases") {
          renderLearnPurchases();
        }

        if (item.view === "free-resources") {
          setupLearnTabs();
        }
      });
      item.tab.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        item.tab.click();
      });
    });

    activateLearnTab(view);
    setupLearnStoreExamTabs();

    if (view === "my-purchases") {
      renderLearnPurchases();
    }

    if (view === "store") {
      activateLearnStoreExamTab(params.get("journeyId") === "pte-core" ? "pte-core" : "pte-academic");
    }

    if (view !== "free-resources") {
      return;
    }

    try {
      var response = await fetch("/assets/learn/learn-resources.json", { credentials: "same-origin" });
      var resources = await response.json();

      renderFreeResources(resources, params.get("journeyId") || "pte-academic", params.get("section") || "");
    } catch (error) {
      var body = document.querySelector("#mat-tab-group-0-content-2 .mat-mdc-tab-body-content");

      if (body) {
        body.innerHTML = '<div class="local-free-resources"><div class="local-free-resources__empty">Free resources could not be loaded.</div></div>';
      }
    }
  }

  function getScoreReportPath(trigger) {
    var explicitPath = trigger.dataset.scoreRoute || trigger.dataset.scoreHref;
    var scoreId = trigger.dataset.scoreId || trigger.dataset.testScoreId;
    var link = trigger.closest("a[href]");

    if (explicitPath) {
      return explicitPath;
    }

    if (scoreId) {
      return "/my-activity/test-score/" + encodeURIComponent(scoreId);
    }

    if (link) {
      return new URL(link.href, window.location.href).pathname;
    }

    return defaultScoreReportPath;
  }

  function setupScoreReportButtons() {
    document.querySelectorAll("#button_view_score").forEach(function (button) {
      if (button.dataset.localScoreNavigationReady === "true") {
        return;
      }

      button.dataset.localScoreNavigationReady = "true";
      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo(getScoreReportPath(button));
      });
    });
  }

  function setDashboardLink(selector, href, external) {
    document.querySelectorAll(selector).forEach(function (link) {
      link.setAttribute("href", href);

      if (external) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      } else {
        link.removeAttribute("target");
        link.setAttribute("rel", "noopener");
      }
    });
  }

  function setupDashboardLinks() {
    setDashboardLink("#link_banner", "/learn?view=free-resources&journeyId=pte-academic", false);
    setDashboardLink("#btn_prep_academic_store", "/learn?view=store&journeyId=pte-academic", false);
    setDashboardLink("#btn_prep_core_store", "/learn?view=store&journeyId=pte-core", false);
    setDashboardLink("#btn_my_purchases", "/learn?view=my-purchases", false);
    setDashboardLink("#btn_free_pte_academic", "/learn?view=free-resources&journeyId=pte-academic", false);
    setDashboardLink("#btn_free_pte_core", "/learn?view=free-resources&journeyId=pte-core", false);
    setDashboardLink("#btn_free_pte_home", "/learn?view=free-resources&journeyId=pte-home", false);
    setDashboardLink("#btn_learn_academic", "https://www.pearsonpte.com/pte-academic/test-format", true);
    setDashboardLink("#btn_learn_core", "https://www.pearsonpte.com/pte-core/test-format", true);
    setDashboardLink("#btn_learn_home", "https://www.pearsonpte.com/selt-tests", true);

    document.querySelectorAll("#button_re_book_test").forEach(function (button) {
      if (button.dataset.localRebookNavigationReady === "true") {
        return;
      }

      button.dataset.localRebookNavigationReady = "true";
      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo("/users/profile/quick-registration");
      });
    });

    document.querySelectorAll("#linkbtn_feedback").forEach(function (button) {
      if (button.dataset.localFeedbackNavigationReady === "true") {
        return;
      }

      button.dataset.localFeedbackNavigationReady = "true";
      button.addEventListener("click", function (event) {
        event.preventDefault();
        window.open("https://www.pearsonpte.com/contact-us/", "_blank", "noopener");
      });
    });
  }

  function setupScoreReportBackButtons() {
    document.querySelectorAll("ignite-score-report[backurl] .ignite-back-arrow").forEach(function (button) {
      var report = button.closest("ignite-score-report[backurl]");
      var backUrl = report ? report.getAttribute("backurl") : "";

      if (!backUrl || button.dataset.localScoreBackReady === "true") {
        return;
      }

      button.dataset.localScoreBackReady = "true";
      button.setAttribute("role", "link");
      button.setAttribute("tabindex", "0");
      button.setAttribute("aria-label", "Back to my activity");
      button.addEventListener("click", function (event) {
        event.preventDefault();
        navigateTo(backUrl);
      });
      button.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        navigateTo(backUrl);
      });
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = filename || "score-report.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function filenameFromDisposition(value) {
    var match = String(value || "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);

    return match ? decodeURIComponent(match[1].replace(/"$/g, "")) : "";
  }

  function setupScoreReportPdfButtons() {
    if (!isScoreReportRoute()) {
      return;
    }

    document.querySelectorAll(".more-result-button").forEach(function (button) {
      var label = button.textContent.replace(/\s+/g, " ").trim().toLowerCase();

      if (button.dataset.localPdfReady === "true" || label !== "view as pdf") {
        return;
      }

      button.dataset.localPdfReady = "true";
      button.addEventListener("click", function (event) {
        // User asked: retain the original button text and don't change to preparing pdf
        var id = getRoute(new URL(window.location.href)).split("/").pop();
        event.preventDefault();
        button.disabled = true;

        fetch("/api/user/tests/" + encodeURIComponent(id) + "/pdf", {
          credentials: "same-origin",
          headers: authHeaders(),
        }).then(function (response) {
          if (!response.ok) {
            return response.json().catch(function () {
              return {};
            }).then(function (data) {
              throw new Error(data.error || "Failed to create PDF.");
            });
          }

          return response.blob().then(function (blob) {
            downloadBlob(blob, filenameFromDisposition(response.headers.get("Content-Disposition")) || "score-report.pdf");
          });
        }).catch(function (error) {
          window.alert(error.message || "Failed to create PDF.");
        }).finally(function () {
          button.disabled = false;
        });
      });
    });
  }

  function navigateTo(path) {
    loadRoute(new URL(path, window.location.href)).catch(function () {
      window.location.href = path;
    });

    return false;
  }

  function appendMissingHeadAssets(nextDocument) {
    nextDocument.querySelectorAll('link[rel="stylesheet"], link[rel="modulepreload"]').forEach(function (link) {
      var href = link.getAttribute("href");

      if (!href || document.querySelector('link[href="' + CSS.escape(href) + '"]')) {
        return;
      }

      document.head.appendChild(link.cloneNode(true));
    });

    nextDocument.head.querySelectorAll("style").forEach(function (style) {
      var styleText = style.textContent.trim();
      var exists = Array.from(document.head.querySelectorAll("style")).some(function (currentStyle) {
        return currentStyle.textContent.trim() === styleText;
      });

      if (!exists) {
        document.head.appendChild(style.cloneNode(true));
      }
    });
  }

  function waitForImage(src) {
    return new Promise(function (resolve) {
      var image = new Image();
      var done = function () {
        resolve();
      };

      image.onload = done;
      image.onerror = done;
      image.src = src;

      if (image.complete) {
        done();
      }
    });
  }

  function waitForStylesheets(nextDocument) {
    var stylesheets = Array.from(nextDocument.querySelectorAll('link[rel="stylesheet"][href]')).map(function (link) {
      var href = link.getAttribute("href");
      var current = document.querySelector('link[href="' + CSS.escape(href) + '"]');

      if (!current || current.sheet) {
        return Promise.resolve();
      }

      return new Promise(function (resolve) {
        current.addEventListener("load", resolve, { once: true });
        current.addEventListener("error", resolve, { once: true });
        window.setTimeout(resolve, 1500);
      });
    });

    return Promise.all(stylesheets);
  }

  function waitForPageAssets(nextDocument) {
    var imageSources = Array.from(nextDocument.querySelectorAll("app-root img[src]"))
      .map(function (image) {
        return image.getAttribute("src");
      })
      .filter(Boolean)
      .slice(0, 40);
    var imageLoads = imageSources.map(waitForImage);

    appendMissingHeadAssets(nextDocument);

    return Promise.all([
      waitForStylesheets(nextDocument),
      Promise.all(imageLoads),
      document.fonts && document.fonts.ready ? document.fonts.ready.catch(function () {}) : Promise.resolve(),
    ]);
  }

  async function loadRoute(url, options) {
    var route = getRoute(url);

    showPreloader();

    try {
      if (isProtectedRoute(route) && !getStoredAuthToken()) {
        window.location.href = loginRedirectUrl;
        return;
      }

      var response = await fetch(url.pathname + url.search, {
        credentials: "same-origin",
        headers: authHeaders({ "X-Local-Navigation": "1" }),
      });

      if (!response.ok) {
        window.location.href = url.href;
        return;
      }

      var html = await response.text();
      var nextDocument = new DOMParser().parseFromString(html, "text/html");
      var nextRoot = nextDocument.querySelector("app-root");
      var currentRoot = document.querySelector("app-root");

      if (!nextRoot || !currentRoot) {
        window.location.href = url.href;
        return;
      }

      await waitForPageAssets(nextDocument);

      currentRoot.replaceWith(nextRoot);

      var nextVersion = nextDocument.querySelector("#version_info");
      var currentVersion = document.querySelector("#version_info");

      if (nextVersion && currentVersion) {
        currentVersion.replaceWith(nextVersion);
      }

      document.title = nextDocument.title || document.title;

      if (!options || !options.fromPopState) {
        window.history.pushState({ localRoute: route }, "", url.pathname + url.search);
      }

      await init();
      syncRouteSpecificState();
      window.scrollTo(0, 0);
    } finally {
      hidePreloader();
    }
  }

  function setupLocalNavigation() {
    document.querySelectorAll("a[href]").forEach(function (link) {
      if (link.dataset.localNavigationReady === "true" || !sameOriginInternalLink(link)) {
        return;
      }

      link.dataset.localNavigationReady = "true";
      link.addEventListener("click", function (event) {
        var url = sameOriginInternalLink(link);

        if (!url || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }

        event.preventDefault();

        if (url.pathname + url.search === window.location.pathname + window.location.search) {
          syncRouteSpecificState();
          return;
        }

        loadRoute(url).catch(function () {
          window.location.href = url.href;
        });
      });
    });
  }

  document.addEventListener("click", function () {
    closeAll();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeAll();
    }
  });

  function setupAccountForms() {
    if (!isAccountRoute()) {
      return;
    }

    var profilePanel = Array.from(document.querySelectorAll("ignite-panel")).find(function (p) {
      var t = p.querySelector("#ignite-panel-title-text span");
      return t && t.textContent.trim().toLowerCase() === "profile";
    });

    if (profilePanel) {
      var profileForm = profilePanel.querySelector("form");

      function submitProfile(event) {
        if (event) {
          event.preventDefault();
        }

        setAccountMessage(profilePanel, "");
        var payload = {
          email: getInputValue("#tt-email-input"),
          username: getFirstInputValue(["#tt-username input", "#username-input"]),
          firstName: getFirstInputValue(["#tt-given-names input", "#mat-input-4", "#mat-input-6"]),
          lastName: getFirstInputValue(["#tt-last-name input", "#mat-input-5", "#mat-input-7"]),
          cityOfBirth: getInputValue("#mat-input-1"),
          countryOfBirth: getFirstInputValue(["#tt-country-birth input", "#mat-input-8"]),
          countryOfCitizenship: getFirstInputValue(["#tt-citizenship input", "#mat-input-9"]),
          countryOfResidence: getFirstInputValue(["#tt-country input", "#mat-input-10"]),
          streetAddress: getInputValue("#mat-input-2"),
          city: getInputValue("#mat-input-3"),
          phoneCountryCode: normalizePhoneCountryCode(getInputValue("#ignite_telephone_input_0_country_code")),
          primaryPhone: getInputValue("#ignite_telephone_input_0_telephone"),
          birthDay: getSelectValue("#mat-select-0"),
          birthMonth: getSelectValue("#mat-select-1"),
          birthYear: getSelectValue("#mat-select-2"),
          gender: getRadioValue({
            male: "#mat-radio-0-input",
            female: "#mat-radio-1-input",
            other: "#mat-radio-2-input",
          }),
            deliveredBy: getRadioValue({
              email: "#delivered-by-email-input",
              sms: "#delivered-by-sms-input",
              pdf: "#delivered-by-pdf-input",
            }),
            accommodationsNeeded: getChecked("#mat-radio-4-input"),
            smsConsent: getChecked("#tt-sms-consent-input"),
            noGivenNames: getChecked("#mat-mdc-checkbox-1-input"),
            noLastName: getChecked("#mat-mdc-checkbox-2-input"),
          inSimplifiedChinese: getSwitchChecked("#ff-in-simplified-chinese-button"),
        };

        fetch("/api/user/profile", {
          method: "POST",
          credentials: "same-origin",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        }).then(function (res) {
          if (res.ok) return res.json();
          else return res.json().then(function(data) { throw new Error(data.error || "Failed to update profile."); });
        }).then(function(data) {
          if (data && data.user) {
            updateUserChrome(data.user);
            populateAccountProfile(data.user);
          }
          markAccountPanelClean(profilePanel);
          setAccountMessage(profilePanel, "Profile updated successfully!");
        }).catch(function(err) {
          setAccountMessage(profilePanel, err.message, true);
        });
      }

      if (profileForm && profileForm.dataset.localFormReady !== "true") {
        profileForm.dataset.localFormReady = "true";
        profileForm.addEventListener("submit", submitProfile);
      }

      profilePanel.querySelectorAll("button").forEach(function (button) {
        var label = button.textContent.replace(/\s+/g, " ").trim().toLowerCase();

        if (label !== "save" || button.dataset.localProfileSaveReady === "true") {
          return;
        }

        button.dataset.localProfileSaveReady = "true";
        button.addEventListener("click", submitProfile);
      });
    }

    var passwordPanel = Array.from(document.querySelectorAll("ignite-panel")).find(function (p) {
      var t = p.querySelector("#ignite-panel-title-text span");
      return t && t.textContent.trim().toLowerCase() === "password";
    });

    if (passwordPanel) {
      var passwordBtn = passwordPanel.querySelector('button.ignite-button[color="primary"]');
      if (passwordBtn && passwordBtn.dataset.localFormReady !== "true") {
        passwordBtn.dataset.localFormReady = "true";
        passwordBtn.addEventListener("click", function (event) {
          event.preventDefault();
          setAccountMessage(passwordPanel, "");
          var currentPassword = document.querySelector("#mat-input-13")?.value;
          var newPassword = document.querySelector("#mat-input-14")?.value;

          if (!currentPassword || !newPassword) {
            setAccountMessage(passwordPanel, "Please enter both current and new passwords.", true);
            return;
          }

          fetch("/api/user/password", {
            method: "POST",
            credentials: "same-origin",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword }),
          }).then(function (res) {
            if (res.ok) {
                setAccountMessage(passwordPanel, "Password updated successfully!");
                document.querySelector("#mat-input-13").value = "";
                document.querySelector("#mat-input-14").value = "";
                updatePasswordFieldState(document.querySelector("#mat-input-13"));
                updatePasswordFieldState(document.querySelector("#mat-input-14"));
                markAccountPanelClean(passwordPanel);
            }
            else return res.json().then(function(data) { throw new Error(data.error || "Failed to update password."); });
          }).catch(function(err) {
            setAccountMessage(passwordPanel, err.message, true);
          });
        });
      }
    }

    var privacyPanel = Array.from(document.querySelectorAll("ignite-panel")).find(function (p) {
      var t = p.querySelector("#ignite-panel-title-text span");
      return t && t.textContent.trim().toLowerCase() === "privacy and sharing";
    });

    if (privacyPanel) {
      var privacyBtn = document.querySelector("#button-privacy-prefernce-save");
      if (privacyBtn && privacyBtn.dataset.localFormReady !== "true") {
        privacyBtn.dataset.localFormReady = "true";
        privacyBtn.addEventListener("click", function (event) {
          event.preventDefault();
          setAccountMessage(privacyPanel, "");
          var payload = {
            communicationConsent: document.querySelector("#tt-communication-consent-input")?.checked,
            researchConsent: document.querySelector("#tt-research-consent-input")?.checked,
          };

          fetch("/api/user/privacy", {
            method: "POST",
            credentials: "same-origin",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          }).then(function (res) {
            if (res.ok) return res.json();
            else return res.json().then(function(data) { throw new Error(data.error || "Failed to update privacy settings."); });
          }).then(function(data) {
            if (data && data.user) {
              populateAccountProfile(data.user);
            }
            markAccountPanelClean(privacyPanel);
            setAccountMessage(privacyPanel, "Privacy settings updated successfully!");
          }).catch(function(err) {
            setAccountMessage(privacyPanel, err.message, true);
          });
        });
      }
    }
  }

  async function init() {
    takeTokenFromUrl();
    var route = getRoute(new URL(window.location.href));
    if (isProtectedRoute(route) && !getStoredAuthToken()) {
      window.location.href = loginRedirectUrl + "?returnUrl=" + encodeURIComponent(window.location.href);
      return;
    }
    ensurePreloader();
    document.querySelectorAll("ignite-profile-menu").forEach(setupProfileMenu);
    setupActivityTabs();
    setupScoreReportButtons();
    setupDashboardLinks();
    setupLocalNavigation();
    await setupAuthChrome();
    await setupDashboardLatestTest();
    await setupDynamicActivityTests();
    await setupDynamicScoreReport();
    setupScoreReportButtons();
    setupDashboardLinks();
    setupLocalNavigation();
    setupPasswordFields();
    setupAccountProfilePanels();
    setupAccountForms();
    setupScoreReportBackButtons();
    setupScoreReportPdfButtons();
    await setupLearnTabs();
    setupLearnCartButtons();
    await setupCartPage();
    updateCartBadge();
    syncRouteSpecificState();
    setupCookieBanner();
    document.querySelectorAll(".menu-buttons-container").forEach(setupMenuStrike);
  }

  window.addEventListener("resize", function () {
    updateAllMenuStrikes();
  });

  window.addEventListener("popstate", function () {
    loadRoute(new URL(window.location.href), { fromPopState: true }).catch(function () {
      window.location.reload();
    });
  });

  window.localNavigate = navigateTo;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
