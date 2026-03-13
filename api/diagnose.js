export default async function handler(req, res) {
    // إعدادات CORS الشاملة
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { messages } = req.body;
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messages,
                temperature: 0.7
            })
        });

        const data = await response.json();
        // إرسال الرد بالكامل كما هو من OpenAI
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Server Error", details: error.message });
    }
}
