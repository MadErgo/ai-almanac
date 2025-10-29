import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

app.use(cors());
app.use(express.json());

async function generateAlmanac(input) {
  const { name, nickname, birthdate, birthTime, mood, language } = input;
  
  const prompt = language === 'cn' ? `为${nickname}生成黄历签文，返回JSON` : `Generate almanac for ${nickname}`;

  try {
    const message = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    return { success: true, data: message.choices[0].message.content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

app.post('/api/generate-almanac', async (req, res) => {
  const result = await generateAlmanac(req.body);
  res.json(result);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
