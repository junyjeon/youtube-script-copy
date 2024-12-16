(function () {
  // 상수 정의
  const SELECTORS = {
    PRIMARY_BUTTON: "primary-button",
    SCRIPT_BUTTON: ".yt-spec-button-shape-next",
    TRANSCRIPT_SEGMENTS: "ytd-transcript-segment-renderer",
    SEGMENT_TIMESTAMP: ".segment-timestamp",
    SEGMENT_TEXT: ".segment-text"
  };

  const XPATH = {
    TRANSCRIPT_CONTAINER: '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]'
  };

  const COPY_CONFIG = {
    PART_SIZE: 15000
  };

  // 전역 자막 저장소
  let subtitles = [];

  /**
   * 자막 세그먼트 처리 함수
   * @param {NodeList} transcriptSegments - 자막 세그먼트 요소들
   */
  function processTranscriptSegments(transcriptSegments) {
    subtitles = Array.from(transcriptSegments).map((segment) => ({
      time: segment.querySelector(SELECTORS.SEGMENT_TIMESTAMP).textContent.trim(),
      text: segment.querySelector(SELECTORS.SEGMENT_TEXT).textContent.trim()
    }));

    const subtitlesText = formatSubtitles(subtitles);
    console.log(subtitlesText);
    sendMessage({ subtitles: subtitlesText });
  }

  /**
   * 자막 텍스트 포맷팅
   * @param {Array} subs - 자막 배열
   * @returns {string} 포맷팅된 자막 텍스트
   */
  function formatSubtitles(subs) {
    return subs.map(sub => `${sub.time} ${sub.text}`).join("\n");
  }

  /**
   * 부분 텍스트 복사
   * @param {number} partIndex - 복사할 부분의 인덱스
   */
  function copyPartText(partIndex) {
    const subtitlesText = formatSubtitles(subtitles);
    const partText = subtitlesText.substring(
      partIndex * COPY_CONFIG.PART_SIZE,
      (partIndex + 1) * COPY_CONFIG.PART_SIZE
    );

    navigator.clipboard.writeText(partText)
      .then(() => console.log(`Part ${partIndex + 1} copied to clipboard`))
      .catch(err => console.error("Failed to copy text to clipboard", err));
  }

  /**
   * DOM 변화 감지 함수
   * @param {Element} container - 감시할 컨테이너 요소
   */
  function observeTranscriptChanges(container) {
    const observer = new MutationObserver((mutations, obs) => {
      const transcriptSegments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
      if (transcriptSegments.length > 0) {
        processTranscriptSegments(transcriptSegments);
        obs.disconnect();
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 메시지 전송 함수
   * @param {Object} message - 전송할 메시지 객체
   */
  function sendMessage(message) {
    chrome.runtime.sendMessage(message);
  }

  // 메인 실행 로직
  const primaryButtonContainer = document.getElementById(SELECTORS.PRIMARY_BUTTON);
  if (!primaryButtonContainer) {
    console.error("Button container not found");
    return;
  }

  const scriptButton = primaryButtonContainer.querySelector(SELECTORS.SCRIPT_BUTTON);
  if (!scriptButton) {
    console.error("Script button not found");
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
    console.error("Transcript container not found");
    return;
  }

  const transcriptSegments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
  if (transcriptSegments.length > 0) {
    processTranscriptSegments(transcriptSegments);
  } else {
    observeTranscriptChanges(transcriptContainer);
  }

  // 메시지 리스너 설정
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.action === "copyPartText") {
      copyPartText(message.partIndex);
    }
  });
})();