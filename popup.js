// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const copyBtn = document.getElementById('copyButton');
  const textOnlyBtn = document.getElementById('copyTextOnlyButton');

  copyBtn.dataset.originalText = copyBtn.textContent.trim();
  textOnlyBtn.dataset.originalText = textOnlyBtn.textContent.trim();

  copyBtn.addEventListener('click', () => startRequest('youtube.js', copyBtn));
  textOnlyBtn.addEventListener('click', () => startRequest('text_only.js', textOnlyBtn));

  function startRequest(scriptPath, button) {
    // 요청 시작 시 두 버튼 비활성화
    copyBtn.disabled = true;
    textOnlyBtn.disabled = true;

    showLoadingFeedback(button);
    handleCopy(scriptPath, button)
      .finally(() => {
        // 요청 종료 후 두 버튼 다시 활성화
        copyBtn.disabled = false;
        textOnlyBtn.disabled = false;
      });
  }

  async function handleCopy(scriptPath, button) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const subtitles = await runScriptAndGetSubtitles(tab.id, scriptPath);
      await navigator.clipboard.writeText(subtitles);
      showSuccessFeedback(button);
    } catch (error) {
      console.error(error);
      showErrorFeedback(button);
    }
  }

  function runScriptAndGetSubtitles(tabId, scriptPath) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Timeout: No subtitles received'));
      }, 10000);

      function messageListener(message) {
        if (message.type === 'subtitlesReady' && typeof message.subtitles === 'string') {
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.subtitles);
        }
      }

      chrome.runtime.onMessage.addListener(messageListener);

      chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptPath],
      }, () => {
        if (chrome.runtime.lastError) {
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          reject(new Error(chrome.runtime.lastError.message));
        }
      });
    });
  }

  function showLoadingFeedback(button) {
    if (!button) return;
    button.classList.remove('success', 'error');
    button.textContent = "⌛ Loading...";
  }

  function showSuccessFeedback(button) {
    showFeedback(button, "✔ Copied!", 'success');
  }

  function showErrorFeedback(button) {
    showFeedback(button, "❌ Copy Failed", 'error');
  }

  function showFeedback(button, message, className) {
    if (!button) return;
    button.classList.remove('success', 'error');
    button.classList.add(className);
    button.textContent = message;
    setTimeout(() => {
      button.textContent = button.dataset.originalText;
      button.classList.remove(className);
    }, 1500);
  }
});
