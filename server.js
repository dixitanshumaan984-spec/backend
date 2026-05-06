const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const app = express();
const { Resend } = require("resend");
const session = require("express-session"); // ✅ NEW
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

let otpStore = {};

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

const User = mongoose.model("User", userSchema);

const enrollmentSchema = new mongoose.Schema({
  username: String,
  course: String
});

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

const paymentSchema = new mongoose.Schema({
  name: String,
  email: String,
  course: String,
  transactionId: String,
  status: { type: String, default: "pending" },
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.model("Payment", paymentSchema);

const PORT = process.env.PORT || 3000;

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const Contact = mongoose.model("Contact", contactSchema);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// ✅ NEW: Session middleware
app.use(session({
  secret: "engineers_admin_secret",
  resave: false,
  saveUninitialized: false
}));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ NEW: Admin page - shows login or panel based on session
app.get("/admin", (req, res) => {
  if (req.session.isAdmin) {
    return res.sendFile(path.join(__dirname, "views", "admin.html")); // ← change public to views
  }
  res.sendFile(path.join(__dirname, "views", "adminlogin.html")); // ← change public to views
});

// ✅ NEW: Admin password check
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === "admin@123") { // 🔴 change this to your password
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Wrong password!" });
  }
});

// ✅ NEW: Admin logout
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin");
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username });
    if (!user) return res.send("❌ User not found.");
    if (user.password !== password) return res.send("❌ Incorrect password.");
    res.redirect(`/index.html?user=${username}`);
  } catch (err) {
    console.log(err);
    res.send("Error during login");
  }
});

// SIGNUP
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "Email already registered ❌" });
    }
    const otp = generateOTP();
    otpStore[email] = {
      otp: otp,
      expires: Date.now() + 5 * 60 * 1000,
      username,
      password
    };
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your Signup OTP",
      text: `Your OTP is: ${otp}`
    });
    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error during signup ❌" });
  }
});

// VERIFY OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  if (!record) return res.json({ success: false, message: "No OTP found" });
  if (Date.now() > record.expires) return res.json({ success: false, message: "OTP expired" });
  if (record.otp != otp) return res.json({ success: false, message: "Invalid OTP" });

  const newUser = new User({
    username: record.username,
    email,
    password: record.password
  });
  await newUser.save();
  delete otpStore[email];
  res.json({ success: true, message: "Signup successful" });
});

// QUIZ
app.post("/submit-quiz", (req, res) => {
  const answers = req.body;
  const correctAnswers = {
    q1: "b", q2: "b", q3: "b", q4: "a", q5: "b",
    q6: "b", q7: "b", q8: "a", q9: "b", q10: "b"
  };
  let score = 0;
  for (let q in correctAnswers) {
    if (answers[q] === correctAnswers[q]) score++;
  }
  res.send(`<h1>Your Score: ${score}/10</h1>`);
});

// CONTACT
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  await new Contact({ name, email, message }).save();
  res.json({ message: "Response recorded" });
});

// ENROLL
app.post("/enroll", async (req, res) => {
  const { username, course } = req.body;
  const existing = await Enrollment.findOne({ username, course });
  if (existing) return res.json({ message: "Already enrolled" });
  await new Enrollment({ username, course }).save();
  res.json({ message: "Enrolled successfully" });
});

// MY COURSES
app.get("/my-courses", async (req, res) => {
  const courses = await Enrollment.find({ username: req.query.username });
  res.json(courses);
});

// SAVE PAYMENT
app.post("/save-payment", async (req, res) => {
  const { name, email, course, transactionId } = req.body;
  const existing = await Payment.findOne({ transactionId });
  if (existing) return res.json({ message: "Duplicate transaction ❌" });
  await new Payment({ name, email, course, transactionId, status: "pending" }).save();
  res.json({ message: "Payment submitted" });
});

// ADMIN PAYMENTS ✅ protected
app.get("/admin/payments", async (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({ message: "Unauthorized" });
  const payments = await Payment.find().sort({ date: -1 });
  res.json(payments);
});

// APPROVE ✅ protected
app.post("/admin/approve/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({ message: "Unauthorized" });
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.send("Not found");

  payment.status = "approved";
  await payment.save();

  const existing = await Enrollment.findOne({ username: payment.name, course: payment.course });
  if (!existing) {
    await new Enrollment({ username: payment.name, course: payment.course }).save();
  }

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: payment.email,
    subject: "Payment Approved",
    text: "Your payment has been approved\nYou are now enrolled successfully!\nThank you for choosing our platform."
  });

  res.send("Approved");
});

// DISAPPROVE ✅ protected
app.post("/admin/disapprove/:id", async (req, res) => {
  if (!req.session.isAdmin) return res.status(401).json({ message: "Unauthorized" });
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.send("Not found");
  payment.status = "failed";
  await payment.save();
  res.send("Payment failed");
});

// CHECK STATUS
app.get("/check-status", async (req, res) => {
  try {
    const email = req.query.email;
    const payment = await Payment.findOne({ email }).sort({ date: -1 });
    if (!payment) return res.json({ status: "not_found" });
    res.json({ status: payment.status });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error");
  }
});

// SERVER START
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});