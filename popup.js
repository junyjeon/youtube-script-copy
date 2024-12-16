// popup.js

// DOM 요소 캐싱을 위한 상수
const DOM = {
  elements: null,
  init() {
    this.elements = {
      container: document.getElementById("buttonContainer"),
      copyBtn: document.getElementById("copyButton"),
      textOnlyBtn: document.getElementById("copyTextOnlyButton")
    };
    return Object.values(this.elements).every(Boolean);
  }
};

// 유틸리티 함수
const utils = {
  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  },
  
  createButton(index) {
    const button = document.createElement("button");
    button.textContent = `Copy Part ${index + 1}`;
    button.dataset.partIndex = index;
    return button;
  }
};

// 핵심 기능 클래스
class PopupManager {
  constructor() {
    this.dom = DOM;
    this.initialized = false;
  }

  async init() {
    if (!this.dom.init()) {
      console.error("Required elements not found");
      return;
    }

    this.setupEventListeners();
    this.setupMessageListener();
    this.initialized = true;
  }

  setupEventListeners() {
    const { container, copyBtn, textOnlyBtn } = this.dom.elements;

    // 이벤트 위임
    container.addEventListener('click', this.handleButtonClick.bind(this));
    
    // 주요 버튼 이벤트
    copyBtn.addEventListener('click', () => this.executeScript('youtube.js'));
    textOnlyBtn.addEventListener('click', () => this.executeScript('text_only.js'));
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.subtitles) {
            navigator.clipboard.writeText(message.subtitles)
                .then(() => console.log("Copied to clipboard"))
                .catch(err => console.error("Copy failed:", err));
        }
        return true;
    });
  }

  async handleButtonClick(e) {
    if (!e.target.matches('button') || !e.target.dataset.partIndex) return;
    
    const index = parseInt(e.target.dataset.partIndex);
    await this.sendCopyRequest(index);
  }

  async executeScript(scriptPath) {
    const tab = await utils.getCurrentTab();
  
    // 여기서 미리 messageListener 등록
    const subtitles = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Timeout: No subtitles received'));
      }, 10000);
  
      function messageListener(message) {
        if (message.type === 'subtitlesReady' && message.subtitles) {
          clearTimeout(timeoutId);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(message.subtitles);
        }
      }
  
      chrome.runtime.onMessage.addListener(messageListener);
  
      // 리스너 등록 끝나고 나서 스크립트 실행
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [scriptPath],
      });
    });
  
    // 자막 로드 완료 후 복사
    await navigator.clipboard.writeText(subtitles);
    console.log('Subtitles copied to clipboard');
  }

  async sendCopyRequest(partIndex) {
    try {
      const tab = await utils.getCurrentTab();
      await chrome.tabs.sendMessage(tab.id, {
        action: "copyPartText",
        partIndex
      });
    } catch (err) {
      console.error('Copy request failed:', err);
    }
  }

  createPartButtons(textLength = 15000) {
    if (!this.initialized) return;

    const { container } = this.dom.elements;
    const numberOfButtons = Math.ceil(textLength / 15000);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < numberOfButtons; i++) {
      fragment.appendChild(utils.createButton(i));
    }

    container.appendChild(fragment);
  }
}

// 초기화 및 실행
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupManager();
  popup.init().catch(console.error);
});