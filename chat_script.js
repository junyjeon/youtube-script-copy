document.addEventListener("DOMContentLoaded", async () => {
  const text = await navigator.clipboard.readText();
  const inputField = document.querySelector('input[type="text"]'); // 입력창 선택자는 실제 웹사이트에 맞게 조정해야 합니다.
  if (inputField) {
    inputField.value = text;
    inputField.dispatchEvent(new Event("input", { bubbles: true }));
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      bubbles: true,
    });
    inputField.dispatchEvent(enterEvent);
  }
});
