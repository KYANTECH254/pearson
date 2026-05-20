(function () {
  var form = document.getElementById("userForm");
  var message = document.getElementById("message");
  var users = document.getElementById("users");

  function setMessage(text, isError) {
    message.textContent = text || "";
    message.style.color = isError ? "#b00020" : "#206b31";
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

  function renderUsers(items) {
    users.innerHTML = items.map(function (user) {
      return [
        "<tr>",
        "<td>" + user.firstName + " " + user.lastName + "</td>",
        "<td>" + user.username + "</td>",
        "<td>" + user.email + "</td>",
        "<td>" + user.role + "</td>",
        "</tr>",
      ].join("");
    }).join("");
  }

  async function loadUsers() {
    var data = await request("/api/admin/users");
    renderUsers(data.users || []);
  }

  request("/api/auth/me").then(function (data) {
    if (!data.user || data.user.role !== "ADMIN") {
      window.location.href = "/login";
      return;
    }

    loadUsers().catch(function (error) {
      setMessage(error.message, true);
    });
  }).catch(function () {
    clearStoredAuthToken();
    window.location.href = "/login";
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage("");

    try {
      await request("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      setMessage("User created.");
      await loadUsers();
    } catch (error) {
      setMessage(error.message, true);
    }
  });

  document.getElementById("logoutButton").addEventListener("click", async function () {
    await request("/api/auth/logout", { method: "POST" }).catch(function () {});
    clearStoredAuthToken();
    window.location.href = "/login";
  });
})();
