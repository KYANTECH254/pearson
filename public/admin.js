(function () {
  var form = document.getElementById("userForm");
  var testForm = document.getElementById("testForm");
  var message = document.getElementById("message");
  var testsMessage = document.getElementById("testsMessage");
  var users = document.getElementById("users");
  var tests = document.getElementById("tests");
  var testUserId = document.getElementById("testUserId");
  var saveUserButton = document.getElementById("saveUserButton");
  var saveTestButton = document.getElementById("saveTestButton");
  var avatarUpload = document.getElementById("avatarUpload");
  var avatarPreview = document.getElementById("avatarPreview");
  var userCount = document.getElementById("userCount");
  var testCount = document.getElementById("testCount");
  var tabButtons = Array.from(document.querySelectorAll("[data-admin-tab]"));
  var userItems = [];
  var testItems = [];

  function setMessage(text, isError) {
    message.textContent = text || "";
    message.style.color = isError ? "#b00020" : "#206b31";
  }

  function setTestsMessage(text, isError) {
    testsMessage.textContent = text || "";
    testsMessage.style.color = isError ? "#b00020" : "#206b31";
  }

  function activateTab(tabId) {
    document.querySelectorAll(".admin-page").forEach(function (page) {
      page.classList.toggle("is-active", page.id === tabId);
    });

    tabButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.adminTab === tabId);
    });
  }

  function getStoredAuthToken() {
    try {
      return window.localStorage.getItem("pearson_session_token") || "";
    } catch (error) {
      return "";
    }
  }

  function clearStoredAuthToken() {
    try {
      window.localStorage.removeItem("pearson_session_token");
    } catch (error) {}
  }

  function storeAuthToken(token) {
    try {
      window.localStorage.setItem("pearson_session_token", token);
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
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  function loginUrl(returnPath) {
    var url = new URL("https://id.mypte.pearsonpte.com/Account/Login");
    url.searchParams.set("returnUrl", window.location.origin + (returnPath || "/admin"));
    return url.href;
  }

  function clearBrowserSession() {
    clearStoredAuthToken();

    try {
      window.sessionStorage.clear();
    } catch (error) {}

    [
      "pearson_session=; Max-Age=0; path=/",
      "pearson_session=; Max-Age=0; path=/; domain=" + window.location.hostname,
      "pearson_session=; Max-Age=0; path=/; domain=.mypte.pearsonpte.com",
    ].forEach(function (cookie) {
      document.cookie = cookie;
    });
  }

  async function request(path, options) {
    var token = getStoredAuthToken();
    var headers = {
      "Content-Type": "application/json",
      ...((options && options.headers) || {}),
    };

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    var response = await fetch(path, {
      credentials: "same-origin",
      headers,
      ...(options || {}),
    });
    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
      }[character];
    });
  }

  function formPayload(targetForm) {
    var payload = Object.fromEntries(new FormData(targetForm));

    Object.keys(payload).forEach(function (key) {
      if (payload[key] === "") {
        payload[key] = "";
      }
    });

    return payload;
  }

  function inputDate(value) {
    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().slice(0, 10);
  }

  function setFormValue(targetForm, name, value) {
    if (targetForm.elements[name]) {
      targetForm.elements[name].value = value == null ? "" : String(value);
    }
  }

  function setAvatarPreview(value) {
    if (!avatarPreview) {
      return;
    }

    avatarPreview.src = value || "";
    avatarPreview.style.display = value ? "block" : "none";
  }

  function resetUserForm() {
    form.reset();
    setFormValue(form, "id", "");
    setFormValue(form, "avatarUrl", "");
    setAvatarPreview("");
    form.elements.password.required = true;
    saveUserButton.textContent = "Create user";
  }

  function resetTestForm() {
    testForm.reset();
    setFormValue(testForm, "id", "");
    saveTestButton.textContent = "Save test";
  }

  function fillUserForm(user) {
    activateTab("usersPage");
    setFormValue(form, "id", user.id);
    setFormValue(form, "pteId", user.pteId);
    setFormValue(form, "firstName", user.firstName);
    setFormValue(form, "lastName", user.lastName);
    setFormValue(form, "email", user.email);
    setFormValue(form, "username", user.username);
    setFormValue(form, "password", "");
    setFormValue(form, "role", user.role || "USER");
    setFormValue(form, "isActive", user.isActive === false ? "false" : "true");
    setFormValue(form, "birthDay", user.birthDay);
    setFormValue(form, "birthMonth", user.birthMonth);
    setFormValue(form, "birthYear", user.birthYear);
    setFormValue(form, "countryOfCitizenship", user.countryOfCitizenship);
    setFormValue(form, "countryOfResidence", user.countryOfResidence);
    setFormValue(form, "gender", user.gender);
    setFormValue(form, "avatarUrl", user.avatarUrl);
    setAvatarPreview(user.avatarUrl);
    form.elements.password.required = false;
    saveUserButton.textContent = "Update user";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillTestForm(test) {
    activateTab("testsPage");
    var report = test.scoreReport || {};
    var metadata = report.metadata || test.metadata || {};

    setFormValue(testForm, "id", test.id);
    setFormValue(testForm, "userId", test.userId);
    setFormValue(testForm, "title", test.title);
    setFormValue(testForm, "score", test.score == null ? report.overallScore : test.score);
    setFormValue(testForm, "status", test.status);
    setFormValue(testForm, "listeningScore", report.listeningScore);
    setFormValue(testForm, "readingScore", report.readingScore);
    setFormValue(testForm, "speakingScore", report.speakingScore);
    setFormValue(testForm, "writingScore", report.writingScore);
    setFormValue(testForm, "testDate", inputDate(test.testDate));
    setFormValue(testForm, "testTime", report.testTime || metadata.testTime);
    setFormValue(testForm, "registrationId", report.registrationId);
    setFormValue(testForm, "reportCode", report.reportCode);
    setFormValue(testForm, "testCenterName", report.testCenterName);
    setFormValue(testForm, "testCenterId", report.testCenterId || metadata.testCenterId);
    setFormValue(testForm, "testCenterAddress1", report.testCenterAddress1);
    setFormValue(testForm, "testCenterAddress2", report.testCenterAddress2);
    setFormValue(testForm, "testCenterCity", report.testCenterCity);
    setFormValue(testForm, "testCenterState", report.testCenterState);
    setFormValue(testForm, "testCenterCountry", report.testCenterCountry);
    setFormValue(testForm, "testCenterPostalCode", report.testCenterPostalCode);
    setFormValue(testForm, "timezone", report.timezone);
    setFormValue(testForm, "validUntil", inputDate(report.validUntil));
    setFormValue(testForm, "description", test.description);
    saveTestButton.textContent = "Update test";
    testForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderUsers(items) {
    userItems = items;
    if (userCount) {
      userCount.textContent = String(items.length);
    }

    users.innerHTML = items.map(function (user) {
      return [
        "<article class=\"record-card\">",
        "<div>",
        "<div class=\"record-card__title\">" + escapeHtml(user.firstName + " " + user.lastName) + "</div>",
        "<div class=\"record-card__meta\">" + escapeHtml(user.email) + "</div>",
        "<div class=\"record-card__meta\">" + escapeHtml(user.username) + " · " + escapeHtml(user.role) + "</div>",
        "</div>",
        "<div class=\"record-card__actions\"><a href=\"#\" data-user-id=\"" + user.id + "\">Edit</a><button class=\"danger-link\" type=\"button\" data-delete-user-id=\"" + user.id + "\">Delete</button></div>",
        "</article>",
      ].join("");
    }).join("");

    testUserId.innerHTML = items.map(function (user) {
      return "<option value=\"" + user.id + "\">" + escapeHtml(user.firstName + " " + user.lastName + " (" + user.username + ")") + "</option>";
    }).join("");
  }

  function renderTests(items) {
    testItems = items;
    if (testCount) {
      testCount.textContent = String(items.length);
    }

    tests.innerHTML = items.map(function (test) {
      var report = test.scoreReport || {};

      return [
        "<article class=\"record-card\">",
        "<div>",
        "<div class=\"record-card__title\">" + escapeHtml(test.title) + " · " + (test.score !== null && test.score !== undefined ? test.score : "-") + "</div>",
        "<div class=\"record-card__meta\">" + escapeHtml(test.user ? test.user.firstName + " " + test.user.lastName : "Unknown") + "</div>",
        "<div class=\"record-card__meta\">" + new Date(test.testDate).toLocaleDateString() + " · " + escapeHtml(test.status || report.registrationId || "-") + "</div>",
        "</div>",
        "<div class=\"record-card__actions\"><a href=\"#\" data-test-id=\"" + test.id + "\">Edit</a><a href=\"/my-activity/test-score/" + encodeURIComponent(test.id) + "\">View score</a><button class=\"danger-link\" type=\"button\" data-delete-test-id=\"" + test.id + "\">Delete</button></div>",
        "</article>",
      ].join("");
    }).join("");
  }

  async function loadUsers() {
    var data = await request("/api/admin/users");
    renderUsers(data.users || []);
  }

  async function loadTests() {
    var data = await request("/api/admin/tests");
    renderTests(data.tests || []);
  }

  takeTokenFromUrl();

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activateTab(button.dataset.adminTab);
    });
  });

  request("/api/auth/me").then(function (data) {
    if (!data.user || data.user.role !== "ADMIN") {
      window.location.href = loginUrl();
      return;
    }

    return Promise.all([loadUsers(), loadTests()]);
  }).catch(function () {
    clearStoredAuthToken();
    window.location.href = loginUrl();
  });

  avatarUpload.addEventListener("change", function () {
    var file = avatarUpload.files && avatarUpload.files[0];

    if (!file) {
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      setMessage("Please choose an image file.", true);
      avatarUpload.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setMessage("Image must be 3 MB or smaller.", true);
      avatarUpload.value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      setFormValue(form, "avatarUrl", reader.result);
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage("");

    try {
      var payload = formPayload(form);
      var id = payload.id;
      delete payload.id;

      if (id && !payload.password) {
        delete payload.password;
      }

      await request(id ? "/api/admin/users/" + encodeURIComponent(id) : "/api/admin/users", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      resetUserForm();
      setMessage(id ? "User updated." : "User created.");
      await Promise.all([loadUsers(), loadTests()]);
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  testForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setTestsMessage("");

    try {
      var payload = formPayload(testForm);
      var id = payload.id;
      delete payload.id;

      await request(id ? "/api/admin/tests/" + encodeURIComponent(id) : "/api/admin/tests", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      resetTestForm();
      setTestsMessage(id ? "Test updated." : "Test saved.");
      await loadTests();
    } catch (error) {
      setTestsMessage(error.message, true);
    }
  });

  users.addEventListener("click", function (event) {
    var deleteTrigger = event.target.closest("[data-delete-user-id]");
    var trigger = event.target.closest("[data-user-id]");

    if (deleteTrigger) {
      event.preventDefault();

      if (!window.confirm("Delete this user and all of their tests?")) {
        return;
      }

      request("/api/admin/users/" + encodeURIComponent(deleteTrigger.dataset.deleteUserId), {
        method: "DELETE",
      }).then(async function () {
        resetUserForm();
        setMessage("User deleted.");
        await Promise.all([loadUsers(), loadTests()]);
      }).catch(function (error) {
        setMessage(error.message, true);
      });
      return;
    }

    if (!trigger) {
      return;
    }

    event.preventDefault();
    var user = userItems.find(function (item) {
      return String(item.id) === String(trigger.dataset.userId);
    });

    if (user) {
      fillUserForm(user);
    }
  });

  tests.addEventListener("click", function (event) {
    var deleteTrigger = event.target.closest("[data-delete-test-id]");
    var trigger = event.target.closest("[data-test-id]");

    if (deleteTrigger) {
      event.preventDefault();

      if (!window.confirm("Delete this test?")) {
        return;
      }

      request("/api/admin/tests/" + encodeURIComponent(deleteTrigger.dataset.deleteTestId), {
        method: "DELETE",
      }).then(async function () {
        resetTestForm();
        setTestsMessage("Test deleted.");
        await loadTests();
      }).catch(function (error) {
        setTestsMessage(error.message, true);
      });
      return;
    }

    if (!trigger) {
      return;
    }

    event.preventDefault();
    var test = testItems.find(function (item) {
      return String(item.id) === String(trigger.dataset.testId);
    });

    if (test) {
      fillTestForm(test);
    }
  });

  document.getElementById("resetUserForm").addEventListener("click", resetUserForm);
  document.getElementById("resetTestForm").addEventListener("click", resetTestForm);

  document.getElementById("logoutButton").addEventListener("click", async function () {
    await request("/api/auth/logout", { method: "POST" }).catch(function () {});
    clearBrowserSession();
    window.location.href = loginUrl("/");
  });

})();
