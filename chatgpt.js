document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 클립보드 내용 가져오기
    const text = await navigator.clipboard.readText();
    
    // ChatGPT의 실제 textarea 선택자로 변경
    const inputField = document.querySelector('textarea[data-id="root"]');
    
    if (inputField) {
      // 텍스트 입력
      inputField.value = text;
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      
      // 전송 버튼 찾아서 클릭
      const submitButton = document.querySelector('button[data-testid="send-button"]');
      if (submitButton) {
        submitButton.click();
      } else {
        console.error('전송 버튼을 찾을 수 없습니다.');
      }
    } else {
      console.error('입력창을 찾을 수 없습니다.');
    }
  } catch (error) {
    console.error('오류 발생:', error);
  }
});