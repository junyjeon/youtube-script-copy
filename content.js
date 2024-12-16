console.log("timestamp/content.js");

(function () {
  const primaryButtonContainer = document.getElementById("primary-button");
  const scriptButton = primaryButtonContainer.querySelector(
    ".yt-spec-button-shape-next"
  );
  // const scriptButton = document.querySelector(
  //   'button[aria-label="스크립트 표시"]'
  // );

  console.log(scriptButton);
  if (scriptButton) {
    scriptButton.click();

    // XPath를 사용하여 자막 세그먼트가 포함된 컨테이너를 찾습니다.
    const xpath =
      '//*[@id="panels"]/ytd-engagement-panel-section-list-renderer[5]';
    const transcriptContainer = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    console.log(transcriptContainer);
    if (transcriptContainer) {
      // 이미 로드된 자막 세그먼트가 있는지 확인하고 처리합니다.
      const transcriptSegments = document.querySelectorAll(
        "ytd-transcript-segment-renderer"
      );
      if (transcriptSegments.length > 0) {
        processTranscriptSegments(transcriptSegments);
      }

      // 자막 세그먼트가 로드될 때까지 기다리는 MutationObserver를 생성합니다.
      const observer = new MutationObserver((mutations, obs) => {
        const transcriptSegments = document.querySelectorAll(
          "ytd-transcript-segment-renderer"
        );
        if (transcriptSegments.length > 0) {
          processTranscriptSegments(transcriptSegments);
          obs.disconnect();
        }
      });

      // 자막 세그먼트가 포함될 것으로 예상되는 요소를 관찰합니다.
      observer.observe(transcriptContainer, {
        childList: true,
        subtree: true,
      });
    } else {
      console.error("자막 세그먼트 컨테이너를 찾을 수 없습니다.");
    }
  }
})();

let subtitles = []; // 전역 변수로 subtitles 선언

function processTranscriptSegments(transcriptSegments) {
  subtitles = Array.from(transcriptSegments).map((segment) => {
    const time = segment.querySelector(".segment-timestamp").textContent.trim();
    const text = segment.querySelector(".segment-text").textContent.trim();
    return { time, text };
  });

  // 자막 데이터를 문자열로 변환합니다.
  let subtitlesText = subtitles
    .map((sub) => `${sub.time} ${sub.text}`)
    .join("\n");

  // console.log(subtitles);
  console.log(subtitlesText);
  chrome.runtime.sendMessage({ subtitles: subtitlesText });
}

function copyPartText(partIndex) {
  // 자막 데이터를 파트별로 분할
  const partSize = 15000; // 한 파트당 문자 수
  let subtitlesText = subtitles
    .map((sub) => `${sub.time} ${sub.text}`)
    .join("\n");

  // 파트 인덱스에 따라 해당하는 텍스트 추출
  const partText = subtitlesText.substring(
    partIndex * partSize,
    (partIndex + 1) * partSize
  );

  // 추출된 텍스트를 클립보드에 복사
  navigator.clipboard
    .writeText(partText)
    .then(() => {
      console.log(`Part ${partIndex + 1} copied to clipboard`);
    })
    .catch((err) => {
      console.error("Failed to copy text to clipboard", err);
    });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "copyPartText") {
    copyPartText(message.partIndex);
  }
});
