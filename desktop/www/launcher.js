(function() {
  const statusEl = document.getElementById("status");

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function findReplayArgument() {
    const args = Array.isArray(window.NL_ARGS) ? window.NL_ARGS : [];
    for (let i = args.length - 1; i >= 0; --i) {
      const arg = args[i];
      if (!arg || typeof arg !== "string") continue;
      if (arg.startsWith("--")) continue;
      if (arg.endsWith(".rep") || arg.endsWith(".REP")) return arg;
    }
    return "";
  }

  function viewerLaunchUrl() {
    const viewerIndex = "/viewer/index.html?desktop=1";
    const replayArg = findReplayArgument();
    if (!replayArg) return viewerIndex;

    return viewerIndex + "&desktopReplayPath=" + encodeURIComponent(replayArg);
  }

  async function launchViewer() {
    setStatus("Opening bundled viewer…");
    try {
      await Neutralino.init();
      await DesktopSettingsPersistence.hydrate();
      window.location.replace(viewerLaunchUrl());
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      setStatus("Failed to launch bundled viewer: " + message);
    }
  }

  launchViewer();
})();
