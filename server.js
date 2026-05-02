const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const app = express();
const nodemailer = require("nodemailer");

// Nodemailer setup using Gmail App Password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dixitanshumaan984@gmail.com",
    pass: "saalxovgnlibvlef",
  },
});

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

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
      return res.json({ success: false, message: "Email already registered ❌" }); // ✅ FIXED
    }

    const otp = generateOTP();

    otpStore[email] = {
      otp: otp,
      expires: Date.now() + 5 * 60 * 1000,
      username,
      password
    };

    await transporter.sendMail({
      from: "dixitanshumaan984@gmail.com",
      to: email,
      subject: "Your Signup OTP",
      text: `Your OTP is: ${otp}`
    });

    res.json({ success: true, message: "OTP sent" }); // ✅ FIXED

  } catch (err) {
    console.log(err);
    res.json({ success: false, message: "Error during signup ❌" }); // ✅ FIXED
  }
});

// VERIFY OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) {
    return res.json({ success: false, message: "No OTP found" }); // ✅ FIXED
  }

  if (Date.now() > record.expires) {
    return res.json({ success: false, message: "OTP expired" }); // ✅ FIXED
  }

  if (record.otp != otp) {
    return res.json({ success: false, message: "Invalid OTP" }); // ✅ FIXED
  }

  const newUser = new User({
    username: record.username,
    email,
    password: record.password
  });

  await newUser.save();
  delete otpStore[email];

  res.json({ success: true, message: "Signup successful" }); // ✅ FIXED
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
app.post("/contact", (req, res) => {
  console.log(req.body);
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

  await new Payment({
    name,
    email,
    course,
    transactionId,
    status: "pending"
  }).save();

  res.json({ message: "Payment submitted" });
});

// ADMIN PAYMENTS
app.get("/admin/payments", async (req, res) => {
  const payments = await Payment.find().sort({ date: -1 });
  res.json(payments);
});

// APPROVE
app.post("/admin/approve/:id", async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.send("Not found");

  payment.status = "approved";
  await payment.save();

  const existing = await Enrollment.findOne({
    username: payment.name,
    course: payment.course
  });

  if (!existing) {
    await new Enrollment({
      username: payment.name,
      course: payment.course
    }).save();
  }

  await transporter.sendMail({
    from: "dixitanshumaan984@gmail.com",
    to: payment.email,
    subject: "Payment Approved",
    text: "Your payment has been approved\nYou are now enrolled successfully!\nThank you for choosing our platform."
  });

  res.send("Approved");
});

// DISAPPROVE
app.post("/admin/disapprove/:id", async (req, res) => {
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

    const payment = await Payment.findOne({ email })
      .sort({ date: -1 });

    if (!payment) {
      return res.json({ status: "not_found" });
    }

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