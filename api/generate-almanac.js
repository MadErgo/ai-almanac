export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, nickname, birthdate, birthTime, mood, language } = req.body;
    
    const prompt = language === 'cn' 
      ? `你是一位古老的道家智者。为用户${nickname}生成一份个性化的黄历签文。
请返回一个JSON对象，包含以下字段（必须是有效的JSON）：
{
  "auspicious": "宜 [3-5个建议，用·分隔]",
  "avoid": "忌 [3-5个建议，用·分隔]",
  "luckyDirection": "东/南/西/北/中央",
  "luckyColor": "[颜色]",
  "luckyHour": "[时间段]",
  "wisdom": "[智慧签文]"
}`
      : `Generate an almanac reading for ${nickname}. Return a valid JSON object with fields: auspicious, avoid, luckyDirection, luckyColor, luckyHour, wisdom`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ 
        success: false, 
        error: 'No response from Deepseek',
        rawResponse: data 
      });
    }

    const messageContent = data.choices[0].message.content;
    
    // 尝试从响应中提取 JSON
    const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
    let parsedData;
    
    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        parsedData = { 
          auspicious: messageContent,
          avoid: '谨慎行动',
          luckyDirection: '东',
          luckyColor: '金色',
          luckyHour: '09:00-11:00',
          wisdom: messageContent
        };
      }
    } else {
      parsedData = { 
        auspicious: messageContent,
        avoid: '谨慎行动',
        luckyDirection: '东',
        luckyColor: '金色',
        luckyHour: '09:00-11:00',
        wisdom: messageContent
      };
    }

    res.status(200).json({ 
      success: true, 
      data: parsedData,
      rawMessage: messageContent
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
