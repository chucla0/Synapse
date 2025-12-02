const getVerificationEmailTemplate = (verificationLink, name, frontendUrl) => {
    const logoUrl = `${frontendUrl}/synapse_logo.jpg`;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Synapse account</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f4f4f9;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      padding: 30px;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.3);
      margin-bottom: 15px;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px 30px;
      text-align: center;
    }
    .welcome-text {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 20px;
    }
    .description {
      color: #6b7280;
      margin-bottom: 30px;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #4f46e5;
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.3s ease;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
    }
    .button:hover {
      background-color: #4338ca;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }
    .link-fallback {
      margin-top: 30px;
      font-size: 12px;
      color: #9ca3af;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Synapse Logo" class="logo">
      <h1>Welcome to Synapse</h1>
    </div>
    <div class="content">
      <h2 class="welcome-text">Hello, ${name}!</h2>
      <p class="description">
        Thanks for signing up. To start using your account and organizing your academic and personal life, please verify your email address.
      </p>
      <a href="${verificationLink}" class="button">Verify my account</a>
      
      <div class="link-fallback">
        <p>If the button doesn't work, copy and paste the following link into your browser:</p>
        <a href="${verificationLink}" style="color: #4f46e5;">${verificationLink}</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Synapse. All rights reserved.</p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = { getVerificationEmailTemplate };
