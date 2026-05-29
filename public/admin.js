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

  function resetUserForm() {
    form.reset();
    setFormValue(form, "id", "");
    form.elements.password.required = true;
    saveUserButton.textContent = "Create user";
  }

  function resetTestForm() {
    testForm.reset();
    setFormValue(testForm, "id", "");
    saveTestButton.textContent = "Save test";
  }

  function fillUserForm(user) {
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
    form.elements.password.required = false;
    saveUserButton.textContent = "Update user";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillTestForm(test) {
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
    setFormValue(testForm, "testTime", metadata.testTime);
    setFormValue(testForm, "registrationId", report.registrationId);
    setFormValue(testForm, "reportCode", report.reportCode);
    setFormValue(testForm, "testCenterName", report.testCenterName);
    setFormValue(testForm, "testCenterId", metadata.testCenterId);
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
    users.innerHTML = items.map(function (user) {
      return [
        "<tr>",
        "<td>" + escapeHtml(user.firstName + " " + user.lastName) + "</td>",
        "<td>" + escapeHtml(user.username) + "</td>",
        "<td>" + escapeHtml(user.email) + "</td>",
        "<td>" + escapeHtml(user.role) + "</td>",
        "<td><a href=\"#\" data-user-id=\"" + user.id + "\">Edit</a></td>",
        "</tr>",
      ].join("");
    }).join("");

    testUserId.innerHTML = items.map(function (user) {
      return "<option value=\"" + user.id + "\">" + escapeHtml(user.firstName + " " + user.lastName + " (" + user.username + ")") + "</option>";
    }).join("");
  }

  function renderTests(items) {
    testItems = items;
    tests.innerHTML = items.map(function (test) {
      var report = test.scoreReport || {};

      return [
        "<tr>",
        "<td>" + escapeHtml(test.user ? test.user.firstName + " " + test.user.lastName : "Unknown") + "</td>",
        "<td>" + escapeHtml(test.title) + "</td>",
        "<td>" + (test.score !== null && test.score !== undefined ? test.score : "-") + "</td>",
        "<td>" + new Date(test.testDate).toLocaleDateString() + "</td>",
        "<td>" + escapeHtml(test.status || report.registrationId || "-") + "</td>",
        "<td><a href=\"#\" data-test-id=\"" + test.id + "\">Edit</a> | <a href=\"/my-activity/test-score/" + encodeURIComponent(test.id) + "\">View score</a></td>",
        "</tr>",
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

  request("/api/auth/me").then(function (data) {
    if (!data.user || data.user.role !== "ADMIN") {
      window.location.href = "https://id.mypte.pearsonpte.com/Account/Login";
      return;
    }

    return Promise.all([loadUsers(), loadTests()]);
  }).catch(function () {
    clearStoredAuthToken();
    window.location.href = "https://id.mypte.pearsonpte.com/Account/Login";
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
    var trigger = event.target.closest("[data-user-id]");

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
    var trigger = event.target.closest("[data-test-id]");

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
    clearStoredAuthToken();
    window.location.href = "https://id.mypte.pearsonpte.com/Account/Login";
  });
})();
