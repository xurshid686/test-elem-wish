const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(req.body);
    const { testName, studentName, timeSpent, score, totalQuestions, percentage, timestamp } = body;

    // Validate required fields
    if (!testName || !studentName || !timeSpent || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get environment variables - use the actual values, not secret references
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Check if environment variables are set
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not set');
      return res.status(500).json({ 
        error: 'Server configuration error: TELEGRAM_BOT_TOKEN not configured',
        details: 'Please set the TELEGRAM_BOT_TOKEN environment variable in Vercel'
      });
    }

    if (!TELEGRAM_CHAT_ID) {
      console.error('TELEGRAM_CHAT_ID is not set');
      return res.status(500).json({ 
        error: 'Server configuration error: TELEGRAM_CHAT_ID not configured',
        details: 'Please set the TELEGRAM_CHAT_ID environment variable in Vercel'
      });
    }

    // Create formatted message
    const message = `
📚 *Test Completed - ${testName}*

👤 *Student:* ${studentName}
⏱️ *Time Spent:* ${timeSpent}
📊 *Score:* ${score}/${totalQuestions} (${percentage}%)
🕒 *Completed:* ${new Date(timestamp).toLocaleString()}

${percentage >= 80 ? '🎉 Excellent work!' : percentage >= 60 ? '👍 Good job!' : '💪 Keep practicing!'}
    `.trim();

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramData);
      return res.status(500).json({ 
        error: 'Failed to send Telegram message',
        details: telegramData.description || 'Unknown Telegram API error'
      });
    }

    console.log('Test result sent to Telegram:', { studentName, score, timeSpent });
    
    res.status(200).json({ 
      success: true, 
      message: 'Test submitted successfully',
      telegramMessageId: telegramData.result.message_id
    });

  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
