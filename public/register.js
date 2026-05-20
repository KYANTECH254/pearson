(function () {
  function value(selector) {
    var element = document.querySelector(selector);
    return element ? element.value.trim() : "";
  }

  function checked(selector) {
    var element = document.querySelector(selector);
    return Boolean(element && element.checked);
  }

  function setMessage(text, isError) {
    var message = document.querySelector(".local-register-message");

    if (!message) {
      message = document.createElement("div");
      message.className = "local-register-message";
      message.style.marginTop = "12px";
      message.style.minHeight = "22px";
      message.style.fontFamily = "var(--ignite-regular-font, Arial, sans-serif)";
      document.querySelector(".create-account-content")?.appendChild(message);
    }

    message.textContent = text || "";
    message.style.color = isError ? "#b00020" : "#206b31";
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
      toggle.addEventListener("focusout", function () {
        setPasswordVisible(toggle, input, false);
      });
    });
  }

  function payload() {
    var email = value("#email-input");
    var password = value("#password input, #mat-input-1");

    return {
      email: email,
      username: email,
      password: password,
      firstName: value("#tt-given-names input, #mat-input-3"),
      lastName: value("#tt-last-name input, #mat-input-4"),
      countryOfResidence: value("#tt-country input, #mat-input-2"),
      communicationConsent: checked("#tt-communication-consent-input"),
      researchConsent: checked("#tt-research-consent-input"),
      noGivenNames: checked("#mat-mdc-checkbox-2-input"),
      noLastName: checked("#mat-mdc-checkbox-3-input"),
    };
  }

  async function submitSignup(button) {
    var data = payload();

    setMessage("");

    if (!data.email || !data.password) {
      setMessage("Email/username and password are required.", true);
      return;
    }

    button.disabled = true;
    button.style.opacity = ".55";

    try {
      var response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      var result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(result.error || "Unable to create account.");
      }

      if (result.token) {
        localStorage.setItem("pearson_session_token", result.token);
      }

      window.location.href = "/users/edit-user-account/collapse";
    } catch (error) {
      setMessage(error.message, true);
      button.disabled = false;
      button.style.opacity = "1";
    }
  }

  function init() {
    setupPasswordFields();

    document.querySelectorAll("#btn-save").forEach(function (button) {
      if (button.dataset.localRegisterReady === "true") {
        return;
      }

      button.dataset.localRegisterReady = "true";
      button.setAttribute("type", "button");
      button.addEventListener("click", function (event) {
        event.preventDefault();
        submitSignup(button);
      });
    });

    document.querySelectorAll(".back-button").forEach(function (link) {
      link.setAttribute("href", "/login");
      link.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "/login";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
