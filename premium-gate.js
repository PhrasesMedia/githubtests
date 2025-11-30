// premium-gate.js

(function () {
  const PREMIUM_FLAG = "bp_unlocked";
  const modal = document.getElementById("premiumModal");
  const closeBtn = document.getElementById("premiumClose");
  const rtw4Btn = document.getElementById("return4");

  if (!modal || !closeBtn || !rtw4Btn) {
    // Safety check – if elements are missing we bail out quietly.
    return;
  }

  function isUnlocked() {
    return localStorage.getItem(PREMIUM_FLAG) === "true";
  }

  function showModal() {
    modal.classList.add("open");
  }

  function hideModal() {
    modal.classList.remove("open");
  }

  closeBtn.addEventListener("click", hideModal);

  // If the user somehow opened BabyPay AFTER unlocking, don't bother them again.
  if (isUnlocked()) {
    // Nothing to gate – allow normal behaviour.
    return;
  }

  // Capture-phase listener runs BEFORE popup.js listeners.
  rtw4Btn.addEventListener(
    "click",
    function (event) {
      if (isUnlocked()) {
        // They’ve already unlocked – allow normal handler to run.
        return;
      }
      // Block the original click handlers from running.
      event.preventDefault();
      event.stopPropagation();
      showModal();
    },
    true // capture
  );
})();
