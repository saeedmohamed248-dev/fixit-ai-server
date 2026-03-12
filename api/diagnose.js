export default async function handler(req, res) {
    // تفعيل CORS للسماح بالاتصال من أي موقع
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": Bearer ${process.env.OPENAI_KEY}
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: req.body.messages,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        // إرسال كائن choices مباشرة ليتوافق مع كود الموقع
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
}
