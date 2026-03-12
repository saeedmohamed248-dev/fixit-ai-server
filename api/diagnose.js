export default async function handler(req, res) {
    // إعدادات CORS للسماح بالاتصال من موقعك
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const apiKey = process.env.OPENAI_KEY;
        
        // التحقق من وصول البيانات بشكل صحيح
        let messages = req.body.messages;
        if (typeof messages === 'string') {
            messages = JSON.parse(messages);
        }

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Invalid messages format" });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messages,
                temperature: 0.5
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("OpenAI API Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // إرسال النتيجة بتنسيق OpenAI الأصلي
        return res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Function Error:", error);
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}
