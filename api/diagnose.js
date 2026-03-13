<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<style>
    :root { --bmw-blue: #1c69d4; --bmw-gold: #ffcc00; }
    .fixit-container { direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 800px; margin: 20px auto; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); background: #fff; }
    .fixit-header { background: var(--bmw-blue); color: white; padding: 20px; display: flex; align-items: center; gap: 15px; }
    .input-group { margin-bottom: 15px; }
    .input-group label { display: block; font-size: 13px; font-weight: bold; margin-bottom: 5px; color: #444; }
    .input-field { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
    .btn-primary { background: var(--bmw-gold); color: #000; border: none; padding: 15px; width: 100%; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; transition: 0.3s; }
    .btn-primary:hover { background: #e6b800; transform: translateY(-2px); }
    .chat-box { height: 450px; overflow-y: auto; padding: 20px; background: #f9f9f9; display: flex; flex-direction: column; gap: 12px; }
    .msg { padding: 12px 16px; border-radius: 12px; max-width: 85%; font-size: 14px; line-height: 1.6; }
    .msg.user { align-self: flex-end; background: var(--bmw-blue); color: white; border-bottom-left-radius: 2px; }
    .msg.ai { align-self: flex-start; background: white; border: 1px solid #eee; border-bottom-right-radius: 2px; color: #333; }
    .msg.ai a { display: inline-block; margin-top: 10px; color: var(--bmw-blue); font-weight: bold; text-decoration: none; border: 1px solid var(--bmw-blue); padding: 5px 10px; border-radius: 5px; }
</style>

<div class="fixit-container">
    <div class="fixit-header">
        <div style="font-size: 28px;">🤖</div>
        <div>
            <h3 style="margin:0; font-size:18px;">مساعد FIXIT الذكي</h3>
            <p style="margin:0; font-size:11px; opacity:0.8;">تحليل أعطال BMW و MINI بناءً على بياناتك</p>
        </div>
    </div>

    <div id="setup-step" style="padding: 25px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="input-group">
                <label>رقم الشاسيه (VIN)</label>
                <div style="display: flex; gap: 5px;">
                    <input id="vin-input" class="input-field" placeholder="17 حرفاً..." style="text-transform: uppercase;">
                    <button onclick="fetchVinData()" id="vin-btn" style="padding: 0 15px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer;">جلب</button>
                </div>
            </div>
            <div class="input-group">
                <label>رقم الموبايل</label>
                <input id="phone-input" class="input-field" placeholder="01xxxxxxxxx">
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div class="input-group"><label>الموديل</label><input id="car-model" class="input-field"></div>
            <div class="input-group"><label>السنة</label><input id="car-year" class="input-field"></div>
            <div class="input-group"><label>المحرك</label><input id="car-engine" class="input-field"></div>
        </div>
        <div class="input-group">
            <label>وصف العطل</label>
            <textarea id="problem-input" class="input-field" style="height: 80px; resize: none;" placeholder="اشرح ما تلاحظه في السيارة..."></textarea>
        </div>
        <button onclick="startDiagnosis()" class="btn-primary">بدء التشخيص الذكي 🚀</button>
    </div>

    <div id="chat-step" style="display: none;">
        <div id="chat-display" class="chat-box"></div>
        <div style="padding: 15px; display: flex; gap: 10px; border-top: 1px solid #eee;">
            <input id="chat-input" class="input-field" placeholder="اسأل المساعد عن تفاصيل أخرى..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()" style="background: var(--bmw-blue); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">إرسال</button>
        </div>
    </div>
</div>

<script>
    const CONFIG = {
        API_URL: "https://fixit-ai-server-git-main-saeedmohamed248-1205s-projects.vercel.app/api/diagnose",
        WA: "201125157767",
        BOOK: "https://fixitbmwmini.com/pages/service-appointment",
        PART: "https://fixitbmwmini.com/search?q="
    };

    let history = [];

    async function fetchVinData() {
        const vin = document.getElementById('vin-input').value;
        const btn = document.getElementById('vin-btn');
        if(vin.length < 10) return alert("يرجى إدخال VIN صحيح");
        btn.innerText = "...";
        try {
            const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`);
            const d = await res.json();
            const getV = (n) => d.Results.find(r => r.Variable === n)?.Value || "";
            document.getElementById('car-model').value = getV("Model");
            document.getElementById('car-year').value = getV("Model Year");
            document.getElementById('car-engine').value = getV("Engine Model") || "N52/N20";
        } catch(e) { alert("خطأ في الجلب التلقائي"); }
        btn.innerText = "جلب";
    }

    async function startDiagnosis() {
        const prob = document.getElementById('problem-input').value;
        const model = document.getElementById('car-model').value;
        const eng = document.getElementById('car-engine').value;
        if(!prob) return alert("صف المشكلة أولاً");

        document.getElementById('setup-step').style.display = 'none';
        document.getElementById('chat-step').style.display = 'block';

        const sys = `أنت مهندس FIXIT. السيارة: ${model} محرك ${eng}. العطل: ${prob}. قدم حلولاً واختم دائماً بـ:
        1. [طلب قطع غيار](${CONFIG.PART}${eng}+${model})
        2. [حجز صيانة](${CONFIG.BOOK})
        3. [واتساب](https://wa.me/${CONFIG.WA})`;

        addMsg(prob, 'user');
        await callAI(sys);
    }

    async function callAI(text) {
        const id = addMsg("⏳ جاري التحليل...", 'ai');
        history.push({ role: "user", content: text });
        try {
            const res = await fetch(CONFIG.API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history })
            });
            const data = await res.json();
            const reply = data.choices[0].message.content;
            document.getElementById(id).innerHTML = marked.parse(reply);
            history.push({ role: "assistant", content: reply });
        } catch(e) { document.getElementById(id).innerText = "❌ خطأ في السيرفر. تأكد من الرصيد والـ API."; }
    }

    async function sendMessage() {
        const inp = document.getElementById('chat-input');
        if(!inp.value.trim()) return;
        const m = inp.value; inp.value = "";
        addMsg(m, 'user');
        await callAI(m);
    }

    function addMsg(t, s) {
        const box = document.getElementById('chat-display');
        const d = document.createElement('div');
        const id = "m"+Date.now();
        d.id = id; d.className = `msg ${s}`;
        d.innerHTML = s === 'ai' ? t : t;
        box.appendChild(d);
        box.scrollTop = box.scrollHeight;
        return id;
    }
</script>
