module.exports = async function (req, res) {
    // 1. إعدادات السماح بمرور البيانات (CORS) لحل مشكلة الاتصال من شوبيفاي
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // 2. الرد على طلبات التحقق المسبقة من المتصفح
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. التحقق من وجود مفتاح OpenAI في إعدادات Vercel
    if (!process.env.OPENAI_KEY) {
        return res.status(500).json({ error: { message: "مفتاح OPENAI_KEY غير موجود في إعدادات Vercel" } });
    }

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
        return res.status(500).json({ error: { message: error.message } });
    }
};
