export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ error: "Method not allowed" });
}

try {

const apiKey = process.env.OPENAI_KEY;

const response = await fetch("https://api.openai.com/v1/chat/completions",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${apiKey}`
},
body:JSON.stringify({
model:"gpt-4o-mini",
messages:req.body.messages
})
});

const data = await response.json();

res.status(200).json({
reply:data.choices?.[0]?.message?.content || "لم يتم استلام رد"
});

}catch(error){

console.log(error);

res.status(500).json({
error:"Server crashed"
});

}

}
