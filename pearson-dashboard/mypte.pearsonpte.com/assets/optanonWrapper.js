// OneTrust Cookies Consent Notice start for mypte.pearsonpte.com
function OptanonWrapper() {
  window.OneTrust.OnConsentChanged(function () {
    window.dispatchEvent(new Event("consentChanged"));
  });
}
