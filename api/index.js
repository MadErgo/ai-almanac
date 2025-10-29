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

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 计算五行和阴阳
function calculateElementAndPolarity(birthDate) {
  const date = new Date(birthDate);
  const year = date.getFullYear();
  const day = date.getDate();

  const elements = ['Water', 'Wood', 'Fire', 'Earth', 'Metal'];
  const elementsCN = ['水', '木', '火', '土', '金'];
  const elementIndex = (year % 10) % 5;

  const polarity = (year % 2 === 0) ? 'Yang' : 'Yin';
  const polarityCN = (year % 2 === 0) ? '阳' : '阴';

  const dayElementIndex = (day % 5);
  const dayElement = elements[dayElementIndex];
  const dayElementCN = elementsCN[dayElementIndex];

  return {
    element: { cn: dayElementCN, en: dayElement },
    polarity: { cn: polarityCN, en: polarity }
  };
}

function mapBirthTimeToContext(timeSlot) {
  const mapping = {
    'dawn': { cn: '清晨', en: 'dawn', energy: 'fresh and new' },
    'morning': { cn: '上午', en: 'morning', energy: 'active and energetic' },
    'noon': { cn: '中午', en: 'noon', energy: 'balanced and clear' },
    'afternoon': { cn: '下午', en: 'afternoon', energy: 'reflective and mature' },
    'dusk': { cn: '傍晚', en: 'dusk', energy: 'transitional and introspective' },
    'night': { cn: '夜间', en: 'night', energy: 'mysterious and deep' },
    'unknown': { cn: '不确定', en: 'unknown', energy: 'balanced' }
  };
  return mapping[timeSlot] || mapping['unknown'];
}

async function generateAlmanac(input) {
  const { name, nickname, birthdate, birthTime, mood, language } = input;
  const elementInfo = calculateElementAndPolarity(birthdate);
  const timeContext = mapBirthTimeToContext(birthTime || 'unknown');

  const element = language === 'cn' ? elementInfo.element.cn : elementInfo.element.en;
  const polarity = language === 'cn' ? elementInfo.polarity.cn : elementInfo.polarity.en;

  const moodDescriptions = {
    'calm': { cn: '平静', en: 'calm' },
    'anxious': { cn: '焦虑', en: 'anxious' },
    'impulsive': { cn: '冲动', en: 'impulsive' },
    'focused': { cn: '专注', en: 'focused' }
  };

  const moodName = language === 'cn' ? moodDescriptions[mood].cn : moodDescriptions[mood].en;

  const prompt = language === 'cn' ? `
你是一位古老的道家智者，专精于周易、五行八卦和人生命理。今天是${new Date().toLocaleDateString('zh-CN')}。

用户信息：
- 真名：${name}（仅用于分析，不会公开）
- 昵称：${nickname}
- 生日：${birthdate}
- 出生时段：${timeContext.cn}
- 当前心情：${moodName}
- 今日五行：${element}
- 今日阴阳：${polarity}

请根据这些信息，为${nickname}生成一份个性化的黄历签文。格式要求：

返回一个JSON对象，包含以下字段：
{
  "auspicious": "宜 [3-5个具体建议，用·分隔]",
  "avoid": "忌 [3-5个具体建议，用·分隔]",
  "luckyDirection": "东/南/西/北/中央",
  "luckyColor": "[一个颜色]",
  "luckyHour": "[一个时间段，如09:00-11:00]",
  "wisdom": "一句诗意的智慧签文，体现${element}${polarity}的能量和${moodName}的心态"
}

注意事项：
1. 签文要贴近${nickname}的当前心情
2. 建议要具有指导性和启发性，既温暖又有力
3. 智慧签文要富有哲理，可以引用道家、禅宗的思想
4. 回应要用简体中文
5. 返回有效的JSON格式
  ` : `
You are an ancient Taoist sage, expert in the I Ching, Five Elements, and divination. Today is ${new Date().toLocaleDateString('en-US')}.

User Information:
- Real Name: ${name} (for analysis only, not public)
- Nickname: ${nickname}
- Birth Date: ${birthdate}
- Birth Time: ${timeContext.en}
- Current Mood: ${moodName}
- Today's Element: ${element}
- Today's Polarity: ${polarity}

Generate a personalized Dao Almanac reading for ${nickname} based on this information. Format requirements:

Return a JSON object with these fields:
{
  "auspicious": "Auspicious: [3-5 specific suggestions, separated by ·]",
  "avoid": "Avoid: [3-5 specific suggestions, separated by ·]",
  "luckyDirection": "East/South/West/North/Center",
  "luckyColor": "[a color]",
  "luckyHour": "[a time slot, e.g., 09:00-11:00]",
  "wisdom": "A poetic wisdom saying that embodies the energy of ${element}${polarity} and the mindset of ${moodName}"
}

Important notes:
1. The reading should resonate with ${nickname}'s current mood
2. Suggestions should be inspiring and actionable
3. Wisdom sayings should reflect Taoist and Zen philosophy
4. Return valid JSON format
5. Use English for all responses
  `;

  try {
    const message = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const responseText = message.choices[0].message.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    const result = JSON.parse(jsonStr);

    return {
      element,
      polarity,
      auspicious: result.auspicious,
      avoid: result.avoid,
      lucky: `${language === 'cn' ? '幸运方向' : 'Lucky Direction'}: ${result.luckyDirection} · ${language === 'cn' ? '幸运颜色' : 'Lucky Color'}: ${result.luckyColor} · ${language === 'cn' ? '幸运时辰' : 'Lucky Hour'}: ${result.luckyHour}`,
      wisdom: result.wisdom
    };
  } catch (error) {
    console.error('Deepseek API Error:', error);
    return {
      element,
      polarity,
      auspicious: language === 'cn' ? '宜 专注计划 · 反思复盘 · 静心冥想' : 'Auspicious: Focus & Planning · Reflection · Meditation',
      avoid: language === 'cn' ? '忌 冲动消费 · 情绪化决策 · 过度承诺' : 'Avoid: Impulsive spending · Emotional decisions · Over-commitment',
      lucky: language === 'cn' ? '幸运方向：东方 · 幸运颜色：金色 · 幸运时辰：09:00-11:00' : 'Lucky Direction: East · Lucky Color: Gold · Lucky Hour: 09:00-11:00',
      wisdom: language === 'cn' ? '"静水深流，道法自然。"' : '"Still waters run deep; the Way flows with nature."'
    };
  }
}

export default function handler(req, res) {
  return new Promise(async (resolve) => {
    if (req.method === 'POST') {
      try {
        const input = req.body;
        
        if (!input.name || !input.nickname || !input.birthdate) {
          res.status(400).json({
            error: input.language === 'cn' ? '缺少必填字段' : 'Missing required fields'
          });
          resolve();
          return;
        }

        const result = await generateAlmanac(input);
        res.status(200).json(result);
        resolve();
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
          error: 'Failed to generate almanac'
        });
        resolve();
      }
    } else if (req.method === 'GET') {
      res.status(200).json({ status: 'ok' });
      resolve();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
      resolve();
    }
  });
}
