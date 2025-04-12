// Load environment variables from .env file
import 'dotenv/config'
import axios from 'axios';
import nodemailer from 'nodemailer';
import { CronJob } from 'cron';
import express from 'express';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up the transporter for email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MY_EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to fetch government exam-focused current affairs
const fetchExamCurrentAffairs = async () => {
  try {
    // Revised prompt focusing on detailed articles without MCQs
    const prompt = `
      Create a comprehensive daily current affairs digest for students preparing for Indian government exams (UPSC, SSC, Banking, Railways, State PSCs).
      
      Focus on creating DETAILED, well-structured ARTICLES rather than brief points. Only include REAL, SPECIFIC news from the past 48 hours with ACTUAL names, figures, and details.
      
      Include these sections with FACTUAL news only:
      
      1. NATIONAL AFFAIRS (3 items)
         - Recent policy decisions, laws, government initiatives
         - Important appointments and committees
         - Major national developments
      
      2. INTERNATIONAL RELATIONS (2 items)
         - India's bilateral/multilateral engagements
         - Important global events affecting India
      
      3. ECONOMY & BANKING (2 items)
         - Economic indicators, reports with exact figures
         - Banking sector developments, RBI decisions
      
      4. SCIENCE & TECHNOLOGY (2 items)
         - Scientific achievements with specific researchers/institutions
         - Technology launches, space missions, defense technology
      
      5. ENVIRONMENT & ECOLOGY (1 item)
         - Environmental initiatives or wildlife conservation updates
      
      6. IMPORTANT APPOINTMENTS & AWARDS (2 items)
         - Only REAL recent appointments with full names and positions
         - Actual awards given with recipient names and specific achievements
      
      7. SPORTS (1 item)
         - Recent tournament results with exact scores/rankings
      
      8. IMPORTANT DAYS & OBSERVANCES (1 item if relevant)
         - Only days being observed in the current week with specific theme
      
      For EACH news item:
      - Write a clear, specific headline with actual names and numbers
      - Write a well-structured 3-4 paragraph article with specific details
      - Include context, background, and significance for exam preparation
      - Mention exact details, figures, names, and dates
      - DO NOT include any MCQs or questions
      
      Format sections clearly with numbered headings and make each article detailed enough to give students complete understanding of the topic.
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Extract the text response from Gemini
    const content = response.data.candidates[0].content.parts[0].text;
    return content;
  } catch (error) {
    console.error('Error fetching current affairs:', error.response?.data || error.message);
    return null;
  }
};

// Function to create HTML email with improved readability and larger fonts
const createHTMLEmail = (content) => {
  // First, process the content to identify important keywords to highlight
  const keywordsToHighlight = [
    "UPSC", "SSC", "Banking", "Railways", "PSC", "IAS", "PCS", 
    "Government", "Ministry", "Cabinet", "Parliament", "Supreme Court",
    "RBI", "Budget", "GDP", "Fiscal", "Monetary", "Policy", "Amendment",
    "Act", "Bill", "Treaty", "Agreement", "MoU", "Constitution",
    "Scheme", "Mission", "Programme", "Initiative", "Campaign"
  ];
  
  // Create regex pattern for keywords with word boundaries to avoid partial matches
  const keywordPattern = new RegExp(`\\b(${keywordsToHighlight.join('|')})\\b`, 'gi');
  
  // Convert content to HTML with emphasis on readability and paragraph separation
  let htmlContent = content
    // Match section headers (1. NATIONAL AFFAIRS)
    .replace(/^(\d+)\.\s+(.*?)$/gm, '<h2 class="section-title">$1. $2</h2>')
    
    // Match headlines (Headline: text)
    .replace(/^Headline:\s+(.*?)$/gm, '<h3 class="headline">$1</h3>')
    
    // Enhance paragraphs by adding stronger visual separation
    // This matches paragraphs that don't begin with numbers, asterisks, or "Headline:"
    .replace(/^(?!\d+\.\s|\*|Headline:)(.+)$/gm, '<p class="article-text">$1</p>')
    
    // Convert bullet points
    .replace(/^\* (.*$)/gm, '<li class="bullet-point">$1</li>');
  
  // Apply highlighting to important keywords
  htmlContent = htmlContent.replace(keywordPattern, '<span class="keyword-highlight">$1</span>');
  
  // Wrap bullet points in <ul> tags for proper formatting
  htmlContent = htmlContent.replace(/<li class="bullet-point">(.*?)<\/li>(?:\s*<li class="bullet-point">.*?<\/li>)*/gs, 
    match => `<ul class="bullet-list">${match}</ul>`);
  
  // Today's date in Indian format
  const today = new Date().toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return `
    <html>
    <head>
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px;
          line-height: 1.8;
          color: #333;
          font-size: 18px;
          background-color: #f9f9f9;
        }
        .header { 
          background: linear-gradient(135deg, #1a4a7c 0%, #2980b9 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        .content {
          padding: 30px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
          background-color: #fff;
        }
        .section-title { 
          color: white; 
          background-color: #2c3e50; 
          padding: 15px 20px;
          border-radius: 8px;
          margin-top: 35px;
          font-size: 26px;
          letter-spacing: 0.5px;
        }
        .headline { 
          color: #2c3e50; 
          border-left: 5px solid #3498db;
          padding-left: 15px;
          margin-top: 30px;
          font-size: 22px;
          line-height: 1.4;
        }
        .article-text {
          font-size: 18px;
          line-height: 1.8;
          margin: 20px 0;
          text-align: justify;
          color: #2c3e50;
          padding: 8px 0;
          text-indent: 30px;
          border-bottom: 1px solid #f0f0f0;
        }
        /* Apply distinct styling to alternating paragraphs */
        .article-text:nth-child(odd) {
          background-color: #f8f9fa;
        }
        .bullet-list {
          background-color: #f8f8f8;
          padding: 15px 15px 15px 40px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .bullet-point {
          margin: 12px 0;
          line-height: 1.7;
          font-size: 18px;
        }
        .footer { 
          margin-top: 40px; 
          font-size: 16px; 
          color: #7f8c8d; 
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 25px;
        }
        .exam-tip {
          background-color: #ebf5fb;
          border-left: 5px solid #3498db;
          padding: 15px 20px;
          margin: 25px 0;
          font-size: 17px;
          line-height: 1.7;
        }
        .keyword-highlight {
          background-color: #fffacd;
          padding: 0 2px;
          font-weight: 600;
          border-radius: 3px;
        }
        /* Added for better readability */
        .article-container {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px dashed #e0e0e0;
        }
        @media (max-width: 600px) {
          body { font-size: 16px; padding: 10px; }
          .section-title { font-size: 22px; padding: 12px 15px; }
          .headline { font-size: 20px; }
          .article-text { font-size: 16px; text-indent: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="color: white; border: none; margin: 0; font-size: 32px;">CURRENT AFFAIRS DIGEST</h1>
        <p style="margin: 10px 0 0 0; font-size: 20px;">For Government Exam Preparation</p>
        <p style="margin: 10px 0 0 0; font-weight: bold; font-size: 18px;">${today}</p>
      </div>
      <div class="content">
        <div class="exam-tip">
          These articles have been carefully curated for government exam preparation. Focus on understanding the context, key figures, and implications for various exam topics.
        </div>
        
        <!-- Process the content to wrap each article in a container -->
        ${htmlContent.replace(/<h3 class="headline">(.*?)<\/h3>(?:[\s\S]*?(?=<h3 class="headline">|<h2 class="section-title">|<div class="exam-tip">|$))/g, 
          match => `<div class="article-container">${match}</div>`)}
        
        <div class="exam-tip">
          <strong>Study Tips:</strong>
          <ul>
            <li>Pay special attention to <span class="keyword-highlight">highlighted keywords</span> that frequently appear in exams</li>
            <li>Make notes connecting these current events with static portions of your syllabus</li>
            <li>For verification, refer to official sources like PIB, government websites, and reputable news outlets</li>
          </ul>
        </div>
      </div>
      <div class="footer">
        <p><strong>Daily Current Affairs Digest</strong> - Specifically curated for government exam preparation</p>
        <p>Stay consistent, stay focused!</p>
      </div>
    </body>
    </html>
  `;
};

// Function to send email with article-focused current affairs to multiple recipients
const sendEmail = async () => {
  try {
    console.log('Fetching government exam current affairs articles...');
    const currentAffairs = await fetchExamCurrentAffairs();
    
    if (currentAffairs) {
      const htmlContent = createHTMLEmail(currentAffairs);
      
      // Get recipients from environment variables
      // You can store multiple emails separated by commas in your .env file
      const recipients = process.env.STUDENT_EMAILS;
      
      const mailOptions = {
        from: process.env.MY_EMAIL,
        to: recipients, // This can handle multiple emails separated by commas
        subject: `Current Affairs Digest - ${new Date().toLocaleDateString('en-IN')}`,
        html: htmlContent,
        text: currentAffairs, // Plain text fallback
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`Current affairs email sent successfully to ${recipients}`);
      return true;
    } else {
      console.log('No current affairs content was generated');
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Create a simple endpoint for health checks
app.get('/', (req, res) => {
  res.send('Current Affairs Service is running!');
});

// Optional: Create a manual trigger endpoint (protected with a simple key)
app.get('/send-now', async (req, res) => {
  const apiKey = req.query.key;
  
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).send('Unauthorized');
  }
  
  try {
    const result = await sendEmail();
    if (result) {
      res.send('Email sent successfully!');
    } else {
      res.status(500).send('Failed to send email');
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cron job to send the current affairs every day at 6 AM
// Format: minute hour day-of-month month day-of-week
const job = new CronJob('0 6 * * *', async () => {
  await sendEmail();
});

// Start the cron job
job.start();
console.log('Current affairs service started. Email will be sent daily at 6 AM.');

// Uncomment this line to test immediately (optional)
// sendEmail();