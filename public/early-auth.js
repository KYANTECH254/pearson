(function () {
  var authStorageKey = "pearson_session_token";

  function getToken() {
    try {
      return window.localStorage.getItem(authStorageKey) || "";
    } catch (error) {
      return "";
    }
  }

  function isLocalApi(input) {
    var url = typeof input === "string" ? input : input && input.url;

    if (!url) {
      return false;
    }

    try {
      return new URL(url, window.location.origin).origin === window.location.origin && new URL(url, window.location.origin).pathname.indexOf("/api/") === 0;
    } catch (error) {
      return false;
    }
  }

  function addAuthHeader(headers) {
    var token = getToken();
    var nextHeaders = new Headers(headers || {});

    if (token && !nextHeaders.has("Authorization")) {
      nextHeaders.set("Authorization", "Bearer " + token);
    }

    return nextHeaders;
  }

  if (window.fetch) {
    var nativeFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      var requestInit = init || {};

      if (isLocalApi(input)) {
        requestInit = {
          ...requestInit,
          credentials: requestInit.credentials || "same-origin",
          headers: addAuthHeader(requestInit.headers || (input && input.headers)),
        };
      }

      return nativeFetch(input, requestInit);
    };
  }

  if (window.XMLHttpRequest) {
    var nativeOpen = window.XMLHttpRequest.prototype.open;
    var nativeSend = window.XMLHttpRequest.prototype.send;

    window.XMLHttpRequest.prototype.open = function (method, url) {
      this.__localPearsonApi = isLocalApi(url);
      return nativeOpen.apply(this, arguments);
    };

    window.XMLHttpRequest.prototype.send = function () {
      var token = getToken();

      if (this.__localPearsonApi && token) {
        this.setRequestHeader("Authorization", "Bearer " + token);
      }

      return nativeSend.apply(this, arguments);
    };
  }
})();
