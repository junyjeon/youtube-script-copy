(() => {
  const SELECTORS = {
    PRIMARY_BUTTON: "primary-button",
    SCRIPT_BUTTON: ".yt-spec-button-shape-next",
    TRANSCRIPT_SEGMENTS: "ytd-transcript-segment-renderer",
    SEGMENT_TIMESTAMP: ".segment-timestamp",
    SEGMENT_TEXT: ".segment-text",
  };

  const XPATH = {
    TRANSCRIPT_CONTAINER: '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]',
  };

  const COPY_CONFIG = {
    PART_SIZE: 15000,
  };

  const state = {
    subtitles: [],
    observer: null,
  };

  function sendMessage(data) {
    chrome.runtime.sendMessage(data);
  }

  function processTranscriptSegments(segments) {
    const subtitles = [];
    for (const segment of segments) {
      const timeEl = segment.querySelector(SELECTORS.SEGMENT_TIMESTAMP);
      const textEl = segment.querySelector(SELECTORS.SEGMENT_TEXT);
      if (timeEl && textEl) {
        subtitles.push(`${timeEl.textContent.trim()} ${textEl.textContent.trim()}`);
      }
    }
    state.subtitles = subtitles;
    sendMessage({ type: 'subtitlesReady', subtitles: subtitles.join("\n") });
  }

  function onTranscriptMutations(mutations, obs, resolve) {
    const segments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
    if (segments.length > 0) {
      processTranscriptSegments(segments);
      obs.disconnect();
      resolve();
    }
  }

  function observeTranscriptChanges(container, resolve) {
    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver((mutations, obs) => onTranscriptMutations(mutations, obs, resolve));
    state.observer.observe(container, { childList: true, subtree: true });
  }

  function initialize() {
    return new Promise((resolve, reject) => {
      const primaryButton = document.getElementById(SELECTORS.PRIMARY_BUTTON);
      if (!primaryButton) return reject("Button container not found");

      const scriptButton = primaryButton.querySelector(SELECTORS.SCRIPT_BUTTON);
      if (!scriptButton) return reject("Script button not found");

      scriptButton.click();

      // 패널 로딩 여유 시간
      setTimeout(() => {
        const transcriptContainer = document.evaluate(
          XPATH.TRANSCRIPT_CONTAINER,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;

        if (!transcriptContainer) return reject("Transcript container not found");

        const segments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
        if (segments.length > 0) {
          processTranscriptSegments(segments);
          resolve();
        } else {
          observeTranscriptChanges(transcriptContainer, resolve);
        }
      }, 500);
    });
  }

  function handleCopyRequest(partIndex) {
    if (!state.subtitles.length) return;
    const fullText = state.subtitles.join("\n");
    const partText = fullText.substring(
      partIndex * COPY_CONFIG.PART_SIZE,
      (partIndex + 1) * COPY_CONFIG.PART_SIZE
    );
    navigator.clipboard.writeText(partText).catch(err => console.error("Copy failed:", err));
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "copyPartText") {
      handleCopyRequest(message.partIndex);
    }
  });

  initialize().then(() => {
    console.log("Initialization complete");
  }).catch(error => {
    console.error("Initialization failed:", error);
  });
})();
