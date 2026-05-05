// USER SESSION
const params = new URLSearchParams(window.location.search);
const user = params.get("user");

const dashboardLink = document.getElementById("dashboardLink");
const loginLink = document.getElementById("loginLink");
const signupLink = document.getElementById("signupLink");
const welcomeText = document.getElementById("welcomeText");

if (user) {
  dashboardLink.href = "dashboard.html?user=" + user;
  welcomeText.innerText = "Welcome, " + user;
  setTimeout(() => {
    welcomeText.classList.add("show");
  }, 100);
  loginLink.style.display = "none";
  signupLink.style.display = "none";
} else {
  dashboardLink.href = "login.html";
}

// COURSE NAVIGATION
function goToCourse(page) {
  const username = new URLSearchParams(window.location.search).get("user");
  if (!username) {
    alert("Please login first!");
    return;
  }
  window.location.href = page + "?user=" + username;
}

function goToMyCourses() {
  const username = new URLSearchParams(window.location.search).get("user");
  window.location.href = `/mycourses.html?user=${username}`;
}

function enrollAndGo(courseName, page) {
  const username = new URLSearchParams(window.location.search).get("user");
  if (!username) {
    alert("Please login first!");
    return;
  }
  fetch("/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, course: courseName })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    window.location.href = page + "?user=" + username;
  });
}

// CONTACT FORM
document.getElementById("contactForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const res = await fetch("/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      message: document.getElementById("message").value
    })
  });
  const data = await res.json();
  alert(data.message);
});

// TYPING EFFECT
const texts = [
  "Build real projects and get certified",
  "Learn AI/ML, Web Development and Data Structures"
];

let i = 0, j = 0, cur = "", del = false;

function typeEffect() {
  const el = document.getElementById("typing");
  if (!el) return;
  if (!del && j < texts[i].length) { cur += texts[i][j++]; }
  else if (del && j > 0) { cur = cur.slice(0, --j); }
  else { del = !del; if (!del) i = (i + 1) % texts.length; }
  el.innerHTML = cur;
  setTimeout(typeEffect, del ? 40 : 80);
}

typeEffect();