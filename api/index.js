import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

async function generateAlmanac(input) {
  const { name, nickname, birthdate, birthTime, mood, language } = input;
  
  const prompt = language === 'cn' ? `为${nickname}生成一份黄历签文，返回JSON格式` : `Generate an almanac reading for ${nickname}, return JSON format`;

  try {
    const message = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    return { success: true, wisdom: message.choices[0].message.content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const result = await generateAlmanac(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
