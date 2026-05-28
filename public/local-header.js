(function () {
  var defaultScoreReportPath = "/my-activity/test-score/69ee8736b59b9ff4b555f82e";
  var internalRoutes = new Set([
    "/",
    "/activity",
    "/my-activity",
    "/learn",
    "/account",
    "/admin",
    "/users/edit-user-account",
    "/users/edit-user-account/collapse",
    "/cart",
    "/login",
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
    "/cart",
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
          setPanelOpen(panel, false);
        });
      });
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

  function isProtectedRoute(route) {
    return protectedRoutes.has(route) || internalRoutePatterns.some(function (pattern) {
      return pattern.test(route);
    });
  }

  function setInputValue(selector, value) {
    var input = document.querySelector(selector);
    var field;
    var label;
    var outline;

    if (!input) {
      return;
    }

    input.value = value == null ? "" : String(value);
    input.setAttribute("value", input.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    field = input.closest("mat-form-field");
    if (!field) {
      return;
    }

    field.classList.toggle("is-empty", !input.value);
    label = field.querySelector(".mdc-floating-label");
    outline = field.querySelector(".mdc-notched-outline");

    if (label) {
      label.classList.toggle("mdc-floating-label--float-above", Boolean(input.value));
    }

    if (outline) {
      outline.classList.toggle("mdc-notched-outline--notched", Boolean(input.value));
    }
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
    setInputValue("#mat-input-16", user.email);
    setInputValue("#username-input", user.username);
    setInputValue("#mat-input-6", user.firstName);
    setInputValue("#mat-input-7", user.lastName);
    setInputValue("#mat-input-1", user.cityOfBirth);
    setInputValue("#mat-input-8", user.countryOfBirth);
    setInputValue("#mat-input-9", user.countryOfCitizenship);
    setInputValue("#mat-input-10", user.countryOfResidence);
    setInputValue("#mat-input-2", user.streetAddress);
    setInputValue("#mat-input-3", user.city);
    setInputValue("#ignite_telephone_input_0_country_code", user.phoneCountryCode);
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
      window.location.href = "/login";
      return Promise.resolve(null);
    }

    userRequest = fetch("/api/auth/me", {
      credentials: "same-origin",
      headers: authHeaders(),
    }).then(function (response) {
      if (response.status === 401 && shouldBlockForUser) {
        clearStoredAuthToken();
        window.location.href = "/login";
        return null;
      }

      return response.ok ? response.json() : null;
    }).then(function (data) {
      if (data && data.user) {
        updateUserChrome(data.user);
        populateAccountProfile(data.user);
      }
    }).catch(function () {}).finally(function () {
      if (shouldBlockForUser) {
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
          window.location.href = "/login";
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
    ensurePreloader().classList.add("local-route-loader--visible");
  }

  function hidePreloader() {
    var elapsed = Date.now() - preloaderVisibleFrom;
    var delay = Math.max(0, 180 - elapsed);

    window.setTimeout(function () {
      ensurePreloader().classList.remove("local-route-loader--visible");
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

  function setScoreValue(selector, value) {
    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = value || "";
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
        bar.style.width = normalized + "%";
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
    });
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

    if (!/^\/my-activity\/test-score\/[^/]+$/.test(route)) {
      return;
    }

    id = route.split("/").pop();
    data = await apiJson("/api/user/tests/" + encodeURIComponent(id)).catch(async function () {
      var list = await apiJson("/api/user/tests").catch(function () {
        return { tests: [] };
      });
      return { test: list.tests[0] || null };
    });
    auth = await apiJson("/api/auth/me").catch(function () {
      return {};
    });
    test = data.test;

    if (!test) {
      return;
    }

    report = test.scoreReport || {};
    var metadata = report.metadata || test.metadata || {};
    var validUntil = report.validUntil || addYears(test.testDate, 2);
    var reportDate = formatReportDate(test.testDate);
    var validDate = formatReportDate(validUntil);
    overall = reportScore(test, "overallScore");
    listening = reportScore(test, "listeningScore");
    reading = reportScore(test, "readingScore");
    speaking = reportScore(test, "speakingScore");
    writing = reportScore(test, "writingScore");

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

    setLabeledInfo("Test Taker ID", reportUser.pteId || "");
    setLabeledInfo("Registration ID", registrationId(test));
    setLabeledInfo("Test Centre Country", report.testCenterCountry || "");
    setLabeledInfo("Test Centre ID", metadata.testCenterId || "");
    setLabeledInfo("Test Date", reportDate);
    setLabeledInfo("Valid Until", validDate);

    if (reportUser) {
      setCandidateInfo(reportUser);
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
        window.location.href = "/login";
        return;
      }

      var response = await fetch(url.pathname + url.search, {
        credentials: "same-origin",
        headers: { "X-Local-Navigation": "1" },
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
      if (profileForm && profileForm.dataset.localFormReady !== "true") {
        profileForm.dataset.localFormReady = "true";
        profileForm.addEventListener("submit", function (event) {
          event.preventDefault();
          setAccountMessage(profilePanel, "");
          var payload = {
            email: getInputValue("#tt-email-input"),
            firstName: getInputValue("#mat-input-6"),
            lastName: getInputValue("#mat-input-7"),
            cityOfBirth: getInputValue("#mat-input-1"),
            countryOfBirth: getInputValue("#mat-input-8"),
            countryOfCitizenship: getInputValue("#mat-input-9"),
            countryOfResidence: getInputValue("#mat-input-10"),
            streetAddress: getInputValue("#mat-input-2"),
            city: getInputValue("#mat-input-3"),
            phoneCountryCode: getInputValue("#ignite_telephone_input_0_country_code"),
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
            setAccountMessage(profilePanel, "Profile updated successfully!");
          }).catch(function(err) {
            setAccountMessage(profilePanel, err.message, true);
          });
        });
      }
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
            setAccountMessage(privacyPanel, "Privacy settings updated successfully!");
          }).catch(function(err) {
            setAccountMessage(privacyPanel, err.message, true);
          });
        });
      }
    }
  }

  async function init() {
    ensurePreloader();
    document.querySelectorAll("ignite-profile-menu").forEach(setupProfileMenu);
    setupActivityTabs();
    setupScoreReportButtons();
    setupLocalNavigation();
    await setupAuthChrome();
    await setupDynamicActivityTests();
    await setupDynamicScoreReport();
    setupScoreReportButtons();
    setupLocalNavigation();
    setupPasswordFields();
    setupAccountProfilePanels();
    setupAccountForms();
    setupScoreReportBackButtons();
    syncRouteSpecificState();
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
