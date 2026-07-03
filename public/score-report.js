(function () {
  if (window.__localHeaderOwnsScoreReport) {
    return;
  }

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

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character];
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
      node.style.transition = "none";
      node.style.width = "0%";
      node.getBoundingClientRect();

      window.requestAnimationFrame(function () {
        node.style.transition = "width 650ms cubic-bezier(0, 0, 0.2, 1)";
        node.style.width = safeScore + "%";
      });
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
    var circumference = 282.743;
    var safeScore = Math.max(0, Math.min(90, Number(score) || 0));
    var offset = 0;

    document.querySelectorAll(selector).forEach(function (spinner) {
      spinner.setAttribute("aria-valuenow", String(safeScore));
      spinner.querySelectorAll(".mdc-circular-progress__determinate-circle").forEach(function (circle) {
        circle.style.strokeDasharray = circumference.toFixed(3) + "px";
        circle.style.transition = "none";
        circle.style.strokeDashoffset = circumference.toFixed(3) + "px";
        circle.getBoundingClientRect();

        window.requestAnimationFrame(function () {
          circle.style.transition = "stroke-dashoffset 500ms cubic-bezier(0, 0, 0.2, 1)";
          circle.style.strokeDashoffset = offset.toFixed(3) + "px";
        });
      });
    });
  }

  function clampSkillScore(value) {
    var score = Math.round(Number(value) || 0);

    return Math.max(0, Math.min(90, score));
  }

  function metadataSkillScore(metadata, label) {
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

  function skillProfileRows(scores, metadata) {
    var listening = clampSkillScore(scores.Listening);
    var reading = clampSkillScore(scores.Reading);
    var speaking = clampSkillScore(scores.Speaking);
    var writing = clampSkillScore(scores.Writing);
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
      var metadataValue = metadataSkillScore(metadata, row.label);
      return {
        label: row.label,
        icons: row.icons,
        value: clampSkillScore(metadataValue == null ? fallbacks[row.label] : metadataValue),
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
    var rows = skillProfileRows(scores, metadata);

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
    response = await fetch(id === "latest" ? "/api/user/tests" : "/api/user/tests/" + encodeURIComponent(id), {
      credentials: "same-origin",
      headers: headers,
    });

    if (!response.ok) {
      return { user: authData.user || null, test: null };
    }

    data = await response.json();
    test = id === "latest" ? (data.tests && data.tests.length ? data.tests[0] : null) : data.test || null;

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

    var pdfBtn = document.getElementById("btn_view_pdf");
    if (pdfBtn) {
      pdfBtn.onclick = function (event) {
        if (event) {
          event.preventDefault();
        }
        var token = getStoredAuthToken();
        var url = "/api/user/tests/" + encodeURIComponent(test.id) + "/pdf";
        if (token) {
          url += "?token=" + encodeURIComponent(token);
        }
        window.open(url, "_blank", "noopener");
        // User asked: don't change text, just leave it as View as pdf
        return false;
      };
    }

    var skillsProfileBtn = document.getElementById("view-skills-profile-button");
    if (skillsProfileBtn) {
      skillsProfileBtn.onclick = function (event) {
        if (event) {
          event.preventDefault();
        }

        openSkillsProfile(scores, overall, metadata);
        return false;
      };
    }

    // Share results redirection
    var shareBtn = document.getElementById("ignite-action-card-action-button");
    if (shareBtn) {
      shareBtn.onclick = function (e) {
        e.preventDefault();
        window.location.href = "https://wsr.pearsonvue.com/testtaker/asr/AdditionalScoreReports/PEARSONLANGUAGE?_gl=&conversationId=163654";
      };
    }

    // Info icons dialogs
    setupInfoDialogs();
    // Run periodically to catch any dynamic rendering
    var setupInterval = setInterval(setupInfoDialogs, 500);
    setTimeout(function() { clearInterval(setupInterval); }, 10000);
  }

  function setupInfoDialogs() {
    var icons = document.querySelectorAll(".score-overview-cont .adjust-right mat-icon, .communication-skils-cont .adjust-right mat-icon");

    icons.forEach(function (icon) {
      if (icon.textContent.trim() !== "info_outline") return;
      if (icon.dataset.dialogReady === "true") return;

      icon.dataset.dialogReady = "true";
      icon.style.cursor = "pointer";
      icon.style.display = "inline-block";
      icon.style.visibility = "visible";
      icon.style.opacity = "1";

      icon.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var container = icon.closest(".score-overview-cont, .communication-skils-cont, .further-info-cont");
        var title = "Communicative skills";
        var content = "Scores for communicative skills (listening, reading, speaking and writing) are based on all test questions that assess these skills, either as a single skill or together with other skills. <a class=\"hand-cursor\"> More information. </a>";

        if (container && container.classList.contains("score-overview-cont")) {
          title = "Overall score";
          content = "The overall score reflects the candidate's English language ability. The score is based on performance on all questions in the test. The range for the overall score is 10-90 points on Pearson's Global Scale of English (GSE). <a class=\"hand-cursor\"> More information. </a>";
        }

        showDialog(title, content);
      };
    });
  }

  function showDialog(title, contentHtml) {
    var backdrop = document.createElement("div");
    backdrop.className = "mat-mdc-dialog-backdrop";

    var container = document.createElement("div");
    container.className = "mat-mdc-dialog-container mdc-dialog cdk-dialog-container mat-mdc-dialog-container-with-actions mdc-dialog--open";
    container.innerHTML = `
      <div class="mat-mdc-dialog-inner-container mdc-dialog__container">
        <div class="mat-mdc-dialog-surface mdc-dialog__surface">
          <srw-dialog-content class="mat-mdc-dialog-component-host">
            <h1 mat-dialog-title class="mat-mdc-dialog-title mdc-dialog__title title">${title}</h1>
            <div mat-dialog-content class="mat-mdc-dialog-content mdc-dialog__content content">${contentHtml}</div>
            <div mat-dialog-actions class="mat-mdc-dialog-actions mdc-dialog__actions actions">
              <button mat-button class="mdc-button mat-mdc-button-base mat-mdc-button mat-unthemed btn-ok">
                <span class="mdc-button__ripple"></span>
                <span class="mdc-button__label"> OK </span>
              </button>
            </div>
          </srw-dialog-content>
        </div>
      </div>
    `;

    function close() {
      document.body.removeChild(backdrop);
      document.body.removeChild(container);
    }

    container.querySelector(".btn-ok").onclick = close;
    backdrop.onclick = close;

    document.body.appendChild(backdrop);
    document.body.appendChild(container);
  }

  requestScore().then(applyScore).catch(function () {
    clearScore(null);
  });
})();
