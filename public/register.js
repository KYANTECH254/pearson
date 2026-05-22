(function () {
  var currentStep = 0;

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
      message.style.textAlign = "center";

      var container = document.querySelector(".create-account-content") || document.querySelector(".personal-information-form-container");
      container?.appendChild(message);
    }

    message.textContent = text || "";
    message.style.color = isError ? "#b00020" : "#206b31";

    if (text) {
        message.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function updateFieldState(input) {
    var field = input.closest(".ignite-password-field, .mat-mdc-form-field, .ignite-auto-complete-field, mat-form-field");
    if (!field) return;

    var label = field.querySelector(".mdc-floating-label, .mat-mdc-floating-label");
    var outline = field.querySelector(".mdc-notched-outline, .mat-mdc-notched-outline");
    var hasValue = Boolean(input.value);

    field.classList.toggle("is-empty", !hasValue);
    field.classList.toggle("mdc-text-field--label-floating", hasValue || document.activeElement === input);
    field.classList.toggle("mat-mdc-form-field-label-always-float", hasValue || document.activeElement === input);

    if (label) {
      label.classList.toggle("mdc-floating-label--float-above", hasValue || document.activeElement === input);
    }

    if (outline) {
      outline.classList.toggle("mdc-notched-outline--notched", hasValue || document.activeElement === input);
    }
  }

  function setPasswordStrength(wrapper, className, state) {
    var item = wrapper.querySelector("." + className);
    if (!item) return;
    item.classList.remove("unchecked", "valid", "invalid");
    item.classList.add(state);
  }

  function updatePasswordStrength(input) {
    var field = input.closest(".ignite-password-field, mat-form-field");
    var wrapper = field ? field.querySelector(".password-strength-wrapper") : null;
    var val = input.value || "";

    if (!wrapper) return;

    if (!val) {
      ["size-strength", "number-strength", "cap-strength", "lower-strength", "schar-strength"].forEach(function (className) {
        setPasswordStrength(wrapper, className, "unchecked");
      });
      return;
    }

    setPasswordStrength(wrapper, "size-strength", val.length >= 12 && val.length <= 120 ? "valid" : "invalid");
    setPasswordStrength(wrapper, "number-strength", /[0-9]/.test(val) ? "valid" : "invalid");
    setPasswordStrength(wrapper, "cap-strength", /[A-Z]/.test(val) ? "valid" : "invalid");
    setPasswordStrength(wrapper, "lower-strength", /[a-z]/.test(val) ? "valid" : "invalid");
    setPasswordStrength(wrapper, "schar-strength", /[~`! @#$%^&*()_\-+={[\]}|\\:;"'<,>.?/]/.test(val) ? "valid" : "invalid");
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

  function setupInputStates() {
    document.querySelectorAll("input, select, mat-select").forEach(function (input) {
      if (input.dataset.localStateReady === "true") return;
      input.dataset.localStateReady = "true";

      updateFieldState(input);

      input.addEventListener("input", function () {
        updateFieldState(input);
      });
      input.addEventListener("focus", function () {
        updateFieldState(input);
      });
      input.addEventListener("blur", function () {
        updateFieldState(input);
      });
    });
  }

  function setupPasswordFields() {
    document.querySelectorAll(".ignite-password-field").forEach(function (field) {
      var input = field.querySelector('input[type="password"], input[type="text"]');
      var toggle = field.querySelector(".show-hide-password");

      if (!input) return;

      updateFieldState(input);
      updatePasswordStrength(input);

      if (input.dataset.localPasswordInputReady !== "true") {
        input.dataset.localPasswordInputReady = "true";
        input.addEventListener("input", function () {
          updatePasswordStrength(input);
        });
      }

      if (!toggle || toggle.dataset.localPasswordToggleReady === "true") return;

      toggle.dataset.localPasswordToggleReady = "true";
      toggle.setAttribute("role", "button");
      toggle.setAttribute("tabindex", "0");

      toggle.addEventListener("mousedown", function (event) {
          event.preventDefault();
      });

      toggle.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var isVisible = input.type === "text";
        setPasswordVisible(toggle, input, !isVisible);
        input.focus();
      });

      toggle.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle.click();
      });
    });
  }

  function goToStep(index) {
    var contents = document.querySelectorAll(".mat-horizontal-stepper-content");
    var headers = document.querySelectorAll(".mat-step-header");

    contents.forEach(function (content, i) {
      content.classList.remove("mat-horizontal-stepper-content-current", "mat-horizontal-stepper-content-next", "mat-horizontal-stepper-content-previous");
      if (i === index) {
        content.classList.add("mat-horizontal-stepper-content-current");
        content.removeAttribute("inert");
      } else if (i < index) {
        content.classList.add("mat-horizontal-stepper-content-previous");
        content.setAttribute("inert", "");
      } else {
        content.classList.add("mat-horizontal-stepper-content-next");
        content.setAttribute("inert", "");
      }
    });

    headers.forEach(function (header, i) {
        var icon = header.querySelector(".mat-step-icon");
        var label = header.querySelector(".mat-step-label");

        header.classList.toggle("mat-step-header-active", i === index);
        header.setAttribute("aria-selected", i === index);

        if (i < index) {
            header.classList.add("mat-step-done");
            header.removeAttribute("aria-disabled");
            if (icon) {
                icon.classList.add("mat-step-icon-state-done");
                icon.classList.remove("mat-step-icon-selected");
            }
        } else if (i === index) {
            header.classList.remove("mat-step-done");
            header.removeAttribute("aria-disabled");
            if (icon) {
                icon.classList.add("mat-step-icon-selected");
                icon.classList.remove("mat-step-icon-state-done");
            }
            if (label) label.classList.add("mat-step-label-active", "mat-step-label-selected");
        } else {
            header.classList.remove("mat-step-done");
            header.setAttribute("aria-disabled", "true");
            if (icon) {
                icon.classList.remove("mat-step-icon-selected", "mat-step-icon-state-done");
            }
            if (label) label.classList.remove("mat-step-label-active", "mat-step-label-selected");
        }
    });

    currentStep = index;
    setMessage("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function payload() {
    return {
      email: value("#email-input"),
      username: value("#email-input"),
      password: value("#password input, #mat-input-1"),
      countryOfResidence: value("#tt-country input, #mat-input-2"),
      communicationConsent: checked("#tt-communication-consent-input"),
      researchConsent: checked("#tt-research-consent-input"),
      firstName: value("#tt-given-names input, #mat-input-3"),
      lastName: value("#tt-last-name input, #mat-input-4"),
      noGivenNames: checked("#mat-mdc-checkbox-2-input"),
      noLastName: checked("#mat-mdc-checkbox-3-input"),
      day: value("#day-field mat-select, #mat-select-0"),
      month: value("#month-field mat-select, #mat-select-1"),
      year: value("#year-field mat-select, #mat-select-2")
    };
  }

  async function submitSignup(button) {
    var data = payload();
    setMessage("");

    if (!data.firstName && !data.noGivenNames) {
        setMessage("Given name is required.", true);
        return;
    }
    if (!data.lastName && !data.noLastName) {
        setMessage("Surname is required.", true);
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
      var result = await response.json().catch(function () { return {}; });

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

  function addStepperStyles() {
    var style = document.createElement('style');
    style.textContent = `
        .mat-horizontal-stepper-content:not(.mat-horizontal-stepper-content-current) {
            display: none !important;
        }
        .mat-step-icon-state-done .step-check { display: block !important; }
        .mat-step-icon-state-done span:not(.step-check):not(.step-error) { display: none !important; }
        .mat-step-icon .step-check, .mat-step-icon .step-error { display: none; }
        .mat-horizontal-stepper-content-current { display: block !important; height: auto !important; visibility: visible !important; }
    `;
    document.head.appendChild(style);
  }

  function init() {
    addStepperStyles();
    setupInputStates();
    setupPasswordFields();

    var step1Button = document.querySelector("test-taker-create-account #btn-save");
    if (step1Button) {
        step1Button.addEventListener("click", function(e) {
            e.preventDefault();
            if (!value("#email-input") || !value("#password input, #mat-input-1")) {
                setMessage("Please enter email and password.", true);
                return;
            }
            goToStep(1);
        });
    }

    var otpInputs = document.querySelectorAll(".otp-input");
    otpInputs.forEach(function(input, idx) {
        input.addEventListener("input", function() {
            if (input.value && idx < otpInputs.length - 1) {
                otpInputs[idx+1].focus();
            }
            if (idx === otpInputs.length - 1 && input.value) {
                setTimeout(function() { goToStep(2); }, 500);
            }
        });
    });

    var step3Button = document.querySelector("test-taker-personal-information-form #btn-save");
    if (step3Button) {
        step3Button.addEventListener("click", function(e) {
            e.preventDefault();
            submitSignup(step3Button);
        });
    }

    document.querySelectorAll(".back-button").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "/login";
      });
    });

    document.querySelectorAll("mat-select").forEach(function(select) {
        select.addEventListener("click", function() {
            var labelElement = select.closest(".mat-mdc-form-field")?.querySelector(".mdc-floating-label, .mat-mdc-floating-label");
            var label = labelElement?.textContent.trim() || "value";
            var val = prompt("Enter " + label + ":");
            if (val) {
                var valueSpan = select.querySelector(".mat-mdc-select-placeholder, .mat-mdc-select-value-text");
                if (valueSpan) {
                    valueSpan.textContent = val;
                    valueSpan.classList.remove("mat-mdc-select-placeholder");
                    valueSpan.classList.add("mat-mdc-select-value-text");
                }
                select.value = val;
                updateFieldState(select);
            }
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
