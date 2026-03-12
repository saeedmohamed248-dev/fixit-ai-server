export default async function handler(req, res) {
    // 1. إضافة رؤوس CORS للسماح لموقعك بالاتصال بالسيرفر
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // يمكنك وضع رابط موقعك هنا للأمان
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // التعامل مع طلبات OPTIONS (Pre-flight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const apiKey = process.env.OPENAI_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "API Key missing" });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: req.body.messages,
                temperature: 0.4
            })
        });

        const data = await response.json();

        // 2. التحقق من وجود خطأ من OpenAI نفسه (مثل انتهاء الرصيد)
        if (data.error) {
            console.error("OpenAI Error:", data.error);
            return res.status(response.status).json({ error: data.error.message });
        }

        // 3. إرسال الاستجابة كاملة ليتعرف عليها الكود في الموقع
        return res.status(200).json(data);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
