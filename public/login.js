// login.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const button = form.querySelector("button.login-btn");

  // Input focus effect
  [usernameInput, passwordInput].forEach(input => {
    input.addEventListener("focus", () => {
      input.style.borderColor = "#4a6cf7";
      input.style.boxShadow = "0 0 0 3px rgba(74,108,247,0.12)";
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = "#e0e0e0";
      input.style.boxShadow = "none";
    });
  });

  // Button hover animation
  button.addEventListener("mouseover", () => {
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 20px rgba(74,108,247,0.5)";
  });
  button.addEventListener("mouseout", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 14px rgba(74,108,247,0.35)";
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