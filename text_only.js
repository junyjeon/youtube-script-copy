// text_only.js
(function () {
  const SELECTORS = {
    PRIMARY_BUTTON: "primary-button",
    SCRIPT_BUTTON: ".yt-spec-button-shape-next",
    TRANSCRIPT_SEGMENTS: "ytd-transcript-segment-renderer",
    SEGMENT_TEXT: ".segment-text"
  };

  const XPATH = {
    TRANSCRIPT_CONTAINER: '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]'
  };

  function processTranscriptSegments(segments) {
    const subtitlesText = Array.from(segments)
      .map(segment => segment.querySelector(SELECTORS.SEGMENT_TEXT)?.textContent.trim() || "")
      .filter(Boolean)
      .join("\n");

    sendMessage({ type: 'subtitlesReady', subtitles: subtitlesText });
  }

  function observeTranscriptChanges(container) {
    const observer = new MutationObserver(() => {
      const segments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
      if (segments.length > 0) {
        processTranscriptSegments(segments);
        observer.disconnect();
      }
    });

    observer.observe(container, { childList: true, subtree: true });
  }

  function sendMessage(message) {
    chrome.runtime.sendMessage(message);
  }

  // 실행 로직 시작
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

  // 자막 패널 열기
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
    // 자막이 이미 로딩되었다면 바로 처리
    processTranscriptSegments(segments);
  } else {
    // 아직 로딩되지 않았다면 변화 관찰
    observeTranscriptChanges(transcriptContainer);
  }
})();
