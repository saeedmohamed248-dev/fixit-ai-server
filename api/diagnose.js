export default async function handler(req, res) {
    // السماح فقط بطلبات POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const apiKey = process.env.OPENAI_KEY;

        // التأكد من وجود مفتاح API
        if (!apiKey) {
            return res.status(500).json({ error: "OpenAI API Key is missing in environment variables" });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // تأكد من أن هذا الموديل متاح في حسابك
                messages: req.body.messages,
                temperature: 0.4
            })
        });

        const data = await response.json();

        // التحقق مما إذا كان هناك خطأ من OpenAI نفسه
        if (data.error) {
            console.error("OpenAI Error:", data.error);
            return res.status(500).json({ error: data.error.message });
        }

        // إرسال البيانات بنفس التنسيق الذي يتوقعه كود الموقع (Frontend)
        // ليتمكن الكود من قراءة data.choices[0].message.content
        return res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Server Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            details: error.message
        });
    }
}
