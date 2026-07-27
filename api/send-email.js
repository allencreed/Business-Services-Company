const { Resend } = require('resend');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const resend = new Resend(apiKey);
  const { subject, body, html, replyTo, formType } = req.body || {};

  if (!subject || (!body && !html)) {
    return res.status(400).json({ error: 'Missing required fields: subject, body/html' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Imperium Infrastructure <onboarding@resend.dev>',
      to: ['sheldon.rollins@icloud.com'],
      replyTo: replyTo || 'sheldon.rollins@icloud.com',
      subject: subject,
      ...(html ? { html } : { text: body }),
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, id: data?.id, formType });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
