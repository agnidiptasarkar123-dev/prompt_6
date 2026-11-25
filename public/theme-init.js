(function () {
  try {
    var t = localStorage.getItem("hs_theme_mode");
    var r = t;
    if (!t || t === "system") {
      if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) {
        r = "high-contrast";
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        r = "dark";
      } else {
        r = "light";
      }
    }
    document.documentElement.setAttribute("data-theme", r);
    document.documentElement.classList.add(r);
  } catch {
    // Ignore storage read failure during initial paint
  }
})();
