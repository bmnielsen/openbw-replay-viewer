window.OPENBW_VIDEO_EXPORT_CONFIG = Object.freeze({
  width: 1280,
  height: 960,
  fps: 24,
  videoBitrateMbps: 5,
  replaySpeed: 1024,
  pollIntervalMs: 100,
  extension: "webm",
  mimeTypes: [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ],
  modalTitle: "Exporting video",
  modalMessage: "Recording replay to WebM from the opening frame at maximum replay speed."
});
