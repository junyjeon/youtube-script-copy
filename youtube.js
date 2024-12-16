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

  function processTranscriptSegments(segments) {
    state.subtitles = Array.from(segments).map((segment) => ({
      time: segment.querySelector(SELECTORS.SEGMENT_TIMESTAMP).textContent.trim(),
      text: segment.querySelector(SELECTORS.SEGMENT_TEXT).textContent.trim(),
    }));

    const subtitlesText = state.subtitles
      .map((sub) => `${sub.time} ${sub.text}`)
      .join("\n");

    chrome.runtime.sendMessage({ type: 'subtitlesReady', subtitles: subtitlesText });
  }

  function observeTranscriptChanges(container, resolve) {
    if (state.observer) {
      state.observer.disconnect();
    }

    state.observer = new MutationObserver(() => {
      const segments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
      if (segments.length > 0) {
        processTranscriptSegments(segments);
        state.observer.disconnect();
        resolve(); // 자막 로딩 완료 시 resolve
      }
    });

    state.observer.observe(container, { childList: true, subtree: true });
  }

  function initialize() {
    return new Promise((resolve, reject) => {
      const primaryButton = document.getElementById(SELECTORS.PRIMARY_BUTTON);
      if (!primaryButton) return reject("Button container not found");
  
      const scriptButton = primaryButton.querySelector(SELECTORS.SCRIPT_BUTTON);
      if (!scriptButton) return reject("Script button not found");
  
      scriptButton.click();
  
      // 패널 로딩을 위해 약간의 대기 시간 주기 (예: 500ms)
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
          resolve(); // 즉시 로드된 경우 resolve
        } else {
          observeTranscriptChanges(transcriptContainer, resolve);
        }
      }, 500); // 여기서 500ms 딜레이 주는 예시
    });
  }

  function handleCopyRequest(partIndex) {
    if (!state.subtitles.length) return;

    const text = state.subtitles
      .map((sub) => `${sub.time} ${sub.text}`)
      .join("\n");

    const partText = text.substring(
      partIndex * COPY_CONFIG.PART_SIZE,
      (partIndex + 1) * COPY_CONFIG.PART_SIZE
    );

    navigator.clipboard.writeText(partText)
      .then(() => console.log(`Part ${partIndex + 1} copied`))
      .catch((err) => console.error("Copy failed:", err));
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "copyPartText") {
      handleCopyRequest(message.partIndex);
    }
  });

  initialize()
    .then(() => {
      console.log("Initialization complete");
    })
    .catch((error) => {
      console.error("Initialization failed:", error);
    });
})();
