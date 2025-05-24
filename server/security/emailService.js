const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER, // Use your email
    pass: process.env.EMAIL_PASS, // Use an App Password if using Gmail
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Email Verification",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color:#305acd;">Email Verification</h2>
        <p>Dear User,</p>
        <p>We received a request to verify your email address. Please use the OTP below to complete the verification process:</p>
        <h3 style="color: #305acd;">${otp}</h3>
        <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this, please ignore this email.</p>
        <p>Thank you,</p>
        <p><strong>The Support Team</strong></p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

const sendFeedbackEmail = async (userDetails, feedback, rating = null) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "admin@evenbetter.in",
    subject: "Feedback from User",
    html: `
      <div style="font-family: Arial, sans-serif; color: #222;">
        <h2 style="color: #d32f2f;">Beta Customer Feedback</h2>
        <p><strong>Name:</strong> ${userDetails.first_name ?? 'N/A'} ${userDetails.last_name ?? ''}</p>
        <p><strong>Phone:</strong> ${userDetails.mobile_number}</p>
        ${rating ? `<p><strong>Rating:</strong> ${rating}/5</p>` : ''}
        <h3>Feedback</h3>
        <p style="background: #f9f9f9; padding: 10px; border-left: 4px solid #d32f2f;">
          ${feedback}
        </p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};

const sendAllFeedbacksEmail = async (targetEmail, feedbacks) => {
  let feedbacksHtml = feedbacks
    .map((feedback) => {
      return `
      <tr>
        <td>${
          feedback.User
            ? feedback.User.first_name + " " + feedback.User.last_name
            : "N/A"
        }</td>
        <td>${feedback.User ? feedback.User.mobile_number : "N/A"}</td>
        <td>${feedback.rating || "N/A"}</td>
        <td>${feedback.feedback}</td>
        <td>${new Date(feedback.created_at).toLocaleString()}</td>
      </tr>
    `;
    })
    .join("");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: targetEmail,
    subject: "All User Feedbacks",
    html: `
      <h1>All User Feedbacks</h1>
      <p>Total Feedbacks: ${feedbacks.length}</p>
      <table border="1" cellpadding="5" style="border-collapse: collapse;">
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Rating</th>
          <th>Feedback</th>
          <th>Date</th>
        </tr>
        ${feedbacksHtml}
      </table>
    `,
  };

  await transporter.sendMail(mailOptions);
  return { message: "Feedbacks sent to email successfully" };
};

module.exports = {
  sendOTPEmail,
  sendFeedbackEmail,
  sendAllFeedbacksEmail,
};
