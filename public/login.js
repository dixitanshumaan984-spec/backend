// login.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const button = form.querySelector("button");

  // Input focus effect
  [usernameInput, passwordInput].forEach(input => {
    input.addEventListener("focus", () => {
      input.style.borderColor = "#1e3c72";
      input.style.boxShadow = "0 0 8px rgba(30,60,114,0.5)";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "#ccc";
      input.style.boxShadow = "none";
    });
  });

  // Button hover animation
  button.addEventListener("mouseover", () => {
    button.style.transform = "scale(1.05)";
    button.style.boxShadow = "0 6px 14px rgba(42,82,152,0.4)";
  });
  button.addEventListener("mouseout", () => {
    button.style.transform = "scale(1)";
    button.style.boxShadow = "none";
  });

  // Form submission
  form.addEventListener("submit", (e) => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  // Validation
  if (username.length < 3) {
    alert("Name should be at least 3 characters.");
    e.preventDefault();
    return;
  }

  if (password.length < 5) {
  alert("Password must be at least 5 characters.");
  e.preventDefault();
  return;
}
  // If valid → allow backend to handle login
  button.innerText = "Logging in...";
  button.disabled = true;
});
});
