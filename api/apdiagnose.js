export default async function handler(req, res) {

const {messages} = req.body;

try {

const response = await fetch("https://api.openai.com/v1/chat/completions",{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":"Bearer " + process.env.OPENAI_KEY
},
body: JSON.stringify({
model:"gpt-4o-mini",
messages:messages
})
})

const data = await response.json()

res.status(200).json({
reply:data.choices[0].message.content
})

}catch(e){

res.status(500).json({
error:"server error"
})

}

}
