document.getElementById("copyButton").addEventListener("click", () => {
  console.log("copyButton clicked");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["content.js"],
      },
      () => {
        console.log("content.js executed");
      }
    );
  });
});

document.getElementById("copyTextOnlyButton").addEventListener("click", () => {
  console.log("copyTextOnlyButton clicked");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        files: ["content_text_only.js"],
      },
      () => {
        console.log("content_text_only.js executed");
      }
    );
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.subtitles) {
    navigator.clipboard
      .writeText(message.subtitles)
      .then(() => {
        console.log("자막이 클립보드에 복사되었습니다.");
      })
      .catch((err) => {
        console.error("클립보드에 복사하는데 실패했습니다.", err);
      });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const textLength = 15000; // 예시로 15000자를 사용, 실제로는 복사할 텍스트 길이를 사용해야 함
  // 복사할 텍스트 길이에 따라 버튼 개수 결정
  if (textLength > 15000) {
    const buttonContainer = document.getElementById("buttonContainer");
    const numberOfButtons = Math.ceil(textLength / 15000);
    for (let i = 0; i < numberOfButtons; i++) {
      const button = document.createElement("button");
      button.textContent = `Copy Part ${i + 1}`;
      button.addEventListener("click", () => {
        // 각 버튼에 해당하는 텍스트 복사 로직 추가
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: copyPartText,
              args: [i], // 현재 클릭된 버튼의 인덱스를 전달
            });
          }
        );
        console.log(`Part ${i + 1} copied`);
      });
      buttonContainer.appendChild(button);
    }
  } else {
    // 15000자를 넘지 않는 경우, 기존의 'Copy Script'와 'Copy Text Only' 버튼만 사용
    // 이 경우 추가적인 동적 버튼 생성 로직은 필요 없음
    console.log("No need for additional buttons");
  }
  for (let i = 0; i < numberOfButtons; i++) {
    const button = document.createElement("button");
    button.textContent = `Copy Part ${i + 1}`;
    // IIFE를 사용하여 각 버튼에 대한 정확한 인덱스를 캡처
    (function (index) {
      button.addEventListener("click", () => {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "copyPartText",
              partIndex: index,
            });
          }
        );
      });
    })(i);
    buttonContainer.appendChild(button);
  }
});

// content.js에서 호출될 함수
function copyPartText(partIndex) {
  // 이 함수는 content.js에서 구현될 것임
}

// 버튼 클릭 이벤트 리스너 내부
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  chrome.tabs.sendMessage(tabs[0].id, { action: "copyPartText", partIndex: i });
});
