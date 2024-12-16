console.log("timestamp/content_text_only.js");

(function () {
  const primaryButtonContainer = document.getElementById("primary-button");
  const scriptButton = primaryButtonContainer.querySelector(
    ".yt-spec-button-shape-next"
  );
  // const scriptButton = document.querySelector(
  //   'button[aria-label="스크립트 표시"]'
  // );

  if (scriptButton) {
    scriptButton.click();

    const xpath =
      '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]';
    const transcriptContainer = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (transcriptContainer) {
      const transcriptSegments = document.querySelectorAll(
        "ytd-transcript-segment-renderer"
      );
      if (transcriptSegments.length > 0) {
        processTranscriptSegments(transcriptSegments);
      }

      const observer = new MutationObserver((mutations, obs) => {
        const transcriptSegments = document.querySelectorAll(
          "ytd-transcript-segment-renderer"
        );
        if (transcriptSegments.length > 0) {
          processTranscriptSegments(transcriptSegments);
          obs.disconnect();
        }
      });

      observer.observe(transcriptContainer, {
        childList: true,
        subtree: true,
      });
    } else {
      console.error("자막 세그먼트 컨테이너를 찾을 수 없습니다.");
    }
  } else {
    console.error("스크립트 표시 버튼을 찾을 수 없습니다.");
  }
})();

function processTranscriptSegments(transcriptSegments) {
  let subtitlesText = Array.from(transcriptSegments)
    .map((segment) => segment.querySelector(".segment-text").textContent.trim())
    .join("\n");

  console.log(subtitlesText);
  chrome.runtime.sendMessage({ subtitles: subtitlesText });
}
