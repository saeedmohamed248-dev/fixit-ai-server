export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: req.body.messages,
                temperature: 0.7
            })
        });

        const data = await response.json();

        // هذا الجزء سيكشف لك السبب الحقيقي للخطأ في المتصفح
        if (data.error) {
            console.error("OpenAI Error:", data.error);
            return res.status(response.status).json({ 
                error: "خطأ من OpenAI", 
                detail: data.error.message // هنا سيظهر لك "Insufficent Balance" مثلاً
            });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Server Crash", detail: error.message });
    }
}
