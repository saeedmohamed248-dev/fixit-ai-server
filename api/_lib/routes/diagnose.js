export default async function handler(req, res) {
    // 1. إعدادات السماح بمرور البيانات (CORS) لحل مشكلة Failed to fetch
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 2. الرد الفوري على طلبات فحص الأمان من المتصفح
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. الاتصال بـ OpenAI
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
                messages: messages || [],
                temperature: 0.7
            })
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        // في حالة وجود خطأ داخلي، يتم إرساله لتشخيصه
        return res.status(500).json({ error: error.message });
    }
}
