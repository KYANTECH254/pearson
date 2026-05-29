(function () {
  function getStoredAuthToken() {
    try {
      return window.localStorage.getItem("pearson_session_token") || "";
    } catch (error) {
      return "";
    }
  }

  function text(selector, value, root) {
    var nodes = Array.prototype.slice.call((root || document).querySelectorAll(selector));
    nodes.forEach(function (node) {
      if (value !== undefined && value !== null) {
        node.textContent = String(value);
      }
    });
  }

  function paddedDateParts(user) {
    if (user.birthDay && user.birthMonth && user.birthYear) {
      return new Date(Number(user.birthYear), Number(user.birthMonth) - 1, Number(user.birthDay));
    }

    return user.dateOfBirth ? new Date(user.dateOfBirth) : null;
  }

  function formatDate(value, options) {
    var date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-AU", options || {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  }

  function formatLongDate(value) {
    return formatDate(value, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function setWidth(selector, score) {
    var safeScore = Math.max(0, Math.min(90, Number(score) || 0));
    document.querySelectorAll(selector).forEach(function (node) {
      node.style.width = safeScore + "%";
    });
  }

  function setSkillByName(name, score) {
    document.querySelectorAll(".skills-horizontal").forEach(function (row) {
      var label = row.querySelector(".label-container");
      var value = row.querySelector(".skill-value");
      if (label && value && label.textContent.toLowerCase().indexOf(name.toLowerCase()) !== -1) {
        value.textContent = score;
      }
    });

    document.querySelectorAll(".skills-item-container").forEach(function (item) {
      var label = item.querySelector(".skills-item-name");
      var value = item.querySelector(".skills-item-value");
      if (label && value && label.textContent.toLowerCase().indexOf(name.toLowerCase()) !== -1) {
        value.textContent = score;
      }
    });
  }

  function setProgress(selector, score) {
    var safeScore = Math.max(0, Math.min(90, Number(score) || 0));
    var offset = 282.743 - (282.743 * safeScore / 90);

    document.querySelectorAll(selector).forEach(function (spinner) {
      spinner.setAttribute("aria-valuenow", String(safeScore));
      spinner.querySelectorAll(".mdc-circular-progress__determinate-circle").forEach(function (circle) {
        circle.style.strokeDashoffset = offset.toFixed(3) + "px";
      });
    });
  }

  async function requestScore() {
    var token = getStoredAuthToken();
    var id = window.location.pathname.split("/").filter(Boolean).pop() || "";
    var headers = {};
    var authResponse;
    var authData;
    var response;
    var data;
    var test;

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    authResponse = await fetch("/api/auth/me", {
      credentials: "same-origin",
      headers: headers,
    });

    if (!authResponse.ok) {
      return null;
    }

    authData = await authResponse.json();
    response = await fetch("/api/user/tests/" + encodeURIComponent(id), {
      credentials: "same-origin",
      headers: headers,
    });

    if (!response.ok) {
      return { user: authData.user || null, test: null };
    }

    data = await response.json();
    test = data.test || null;

    if (test && authData.user && Number(test.userId) !== Number(authData.user.id)) {
      test = null;
    }

    if (test && id === "latest") {
      window.history.replaceState({}, "", "/my-activity/test-score/" + encodeURIComponent(test.id));
    }

    return { user: authData.user || null, test: test };
  }

  function clearScore(user) {
    var fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "" : "";
    var pteId = user && user.pteId ? user.pteId : "";

    text("#profile-user-name, .candidate-name1", fullName);
    text("#profile-display-id", pteId ? "PTE ID: " + pteId : "");
    text("#text_test_name", "Score report not found");
    text("#text_test_time", "This test score is not available for the signed-in user.");
    text(".src_code", "");
    text(".candidate-id", pteId ? "Test Taker ID: " + pteId : "");
    text(".appointment-id .desktopview-inline, .reg-id-value", "");
    text(".gse-badge__score, .overall-value", "");
    text(".test-center-location, .test-center-id, .test-center-name", "");
    text(".test-date, .valid-date", "");
    text(".country-citizenship, .country-residence, .gender", "");
    ["Listening", "Reading", "Speaking", "Writing"].forEach(function (name) {
      setSkillByName(name, "");
      setWidth(".bar-" + name.toLowerCase(), 0);
      setProgress(".circle-" + name.toLowerCase(), 0);
    });
  }

  function applyScore(payload) {
    var test = payload && payload.test;

    if (!test) {
      clearScore(payload && payload.user);
      return;
    }

    var report = test.scoreReport || {};
    var metadata = Object.assign({}, test.metadata || {}, report.metadata || {});
    var user = test.user || {};
    var fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
    var pteId = user.pteId || "";
    var registrationId = report.registrationId || metadata.registrationId || "";
    var reportCode = report.reportCode || metadata.reportCode || "";
    var testDate = test.testDate || metadata.testDate;
    var validUntil = report.validUntil || metadata.validUntil;
    var timezone = report.timezone || metadata.timezone || "";
    var testTime = report.testTime || metadata.testTime || "";
    var title = test.title || "PTE Academic";
    var overall = report.overallScore == null ? test.score : report.overallScore;
    var scores = {
      Listening: report.listeningScore,
      Reading: report.readingScore,
      Speaking: report.speakingScore,
      Writing: report.writingScore,
    };
    var birthDate = paddedDateParts(user);

    text("#profile-user-name, .candidate-name1", fullName);
    text("#profile-display-id", pteId ? "PTE ID: " + pteId : "");
    if (user.avatarUrl) {
      document.querySelectorAll(".avatar-image").forEach(function (image) {
        image.src = user.avatarUrl;
      });
    }
    text("#text_test_name", title + (registrationId ? " • ID" + registrationId : ""));
    text("#text_test_time", [formatLongDate(testDate), [testTime, timezone].filter(Boolean).join(" ")].filter(Boolean).join(" - "));
    text(".src_code", reportCode);
    text(".candidate-id", pteId ? "Test Taker ID: " + pteId : "");
    text(".appointment-id .desktopview-inline", registrationId ? ": " + registrationId : "");
    text(".reg-id-value", registrationId);
    text(".gse-badge__score, .overall-value", overall);
    text(".test-center-location", report.testCenterCountry || metadata.testCenterCountry);
    text(".test-center-id", report.testCenterId || metadata.testCenterId);
    text(".test-center-name", report.testCenterName || metadata.testCenterName);
    text(".test-date", formatDate(testDate));
    text(".valid-date", formatDate(validUntil));
    text(".country-citizenship", user.countryOfCitizenship);
    text(".country-residence", user.countryOfResidence);
    text(".gender", user.gender);

    document.querySelectorAll(".candidate-info .country-residence").forEach(function (node, index) {
      node.textContent = index === 0 ? formatDate(birthDate) : (user.countryOfResidence || "");
    });

    Object.keys(scores).forEach(function (name) {
      var score = scores[name];
      if (score === undefined || score === null || score === "") {
        return;
      }

      setSkillByName(name, score);
      setWidth(".bar-" + name.toLowerCase(), score);
      setProgress(".circle-" + name.toLowerCase(), score);
    });

    document.querySelectorAll(".vbar-online").forEach(function (node) {
      node.style.left = (Number(overall) || 0) + "%";
    });
  }

  requestScore().then(applyScore).catch(function () {
    clearScore(null);
  });
})();
