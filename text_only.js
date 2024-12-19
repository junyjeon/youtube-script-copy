// text_only.js
(function () {
  function extractTranscript() {
    const SELECTORS = {
      PRIMARY_BUTTON: "primary-button",
      SCRIPT_BUTTON: ".yt-spec-button-shape-next",
      TRANSCRIPT_SEGMENTS: "ytd-transcript-segment-renderer",
      SEGMENT_TEXT: ".segment-text",
    };

    const XPATH = {
      TRANSCRIPT_CONTAINER: '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]',
    };

    function sendMessage(message) {
      chrome.runtime.sendMessage(message);
    }

    function processSegments(segments) {
      // 타임스탬프 사용 X, 텍스트만 추출
      const subtitles = Array.from(segments)
        .map(segment => {
          const textEl = segment.querySelector(SELECTORS.SEGMENT_TEXT);
          if (!textEl) return null;
          const text = textEl.textContent.trim();
          return text || null;
        })
        .filter(Boolean);

      // 개행 대신 공백으로 구분
      sendMessage({ type: 'subtitlesReady', subtitles: subtitles.join(" ") });
    }

    function observeTranscriptChanges(container) {
      const observer = new MutationObserver(() => {
        const segments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
        if (segments.length > 0) {
          processSegments(segments);
          observer.disconnect();
        }
      });

      observer.observe(container, { childList: true, subtree: true });
    }

    const primaryButtonContainer = document.getElementById(SELECTORS.PRIMARY_BUTTON);
    if (!primaryButtonContainer) {
      sendMessage({ type: 'subtitlesReady', subtitles: "" });
      return;
    }

    const scriptButton = primaryButtonContainer.querySelector(SELECTORS.SCRIPT_BUTTON);
    if (!scriptButton) {
      sendMessage({ type: 'subtitlesReady', subtitles: "" });
      return;
    }

    scriptButton.click();

    const transcriptContainer = document.evaluate(
      XPATH.TRANSCRIPT_CONTAINER,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (!transcriptContainer) {
      sendMessage({ type: 'subtitlesReady', subtitles: "" });
      return;
    }

    const segments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
    if (segments.length > 0) {
      processSegments(segments);
    } else {
      observeTranscriptChanges(transcriptContainer);
    }
  }

  // 타임스탬프 없이 텍스트만 추출
  extractTranscript();
})();
