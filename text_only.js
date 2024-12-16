(function () {
  // 자막 추출 관련 상수 정의
  const SELECTORS = {
    PRIMARY_BUTTON: "primary-button",
    SCRIPT_BUTTON: ".yt-spec-button-shape-next",
    TRANSCRIPT_SEGMENTS: "ytd-transcript-segment-renderer",
    SEGMENT_TEXT: ".segment-text"
  };

  const XPATH = {
    TRANSCRIPT_CONTAINER: '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]'
  };

  /**
   * 자막 세그먼트 처리 함수
   * @param {NodeList} transcriptSegments - 자막 세그먼트 요소들
   */
  function processTranscriptSegments(transcriptSegments) {
    const subtitlesText = Array.from(transcriptSegments)
      .map(segment => segment.querySelector(SELECTORS.SEGMENT_TEXT).textContent.trim())
      .join("\n");

    sendMessage({
      status: 'success',
      subtitles: subtitlesText
    });
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
   * 에러 처리 함수
   * @param {string} message - 에러 메시지
   */
  function handleError(message) {
    console.error(message);
    sendMessage({
      status: 'error',
      message: message
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
    handleError("버튼 컨테이너를 찾을 수 없습니다.");
    return;
  }

  const scriptButton = primaryButtonContainer.querySelector(SELECTORS.SCRIPT_BUTTON);

  if (!scriptButton) {
    handleError("자막 표시 버튼을 찾을 수 없습니다.");
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
    handleError("자막 컨테이너를 찾을 수 없습니다.");
    return;
  }

  const transcriptSegments = document.querySelectorAll(SELECTORS.TRANSCRIPT_SEGMENTS);
  if (transcriptSegments.length > 0) {
    processTranscriptSegments(transcriptSegments);
    return;
  }

  observeTranscriptChanges(transcriptContainer);
})();