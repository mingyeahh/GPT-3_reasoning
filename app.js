const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const fs = require("fs");
let history = require("./history.json");

const historyToPrompt = (hist) => {
    let buffer = "";
    hist.forEach((h) => {
        buffer = buffer.concat(`${h.sender}: ${h.msg}\n`);
    });
    return buffer;
}

const port = 8000;

const app = express();
app.use(express.json()); // parse JSON requests
app.use(express.static("client"));

console.log(history); // DEBUG

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
// openai.createCompletion({
//     model: "text-davinci-002",
//     prompt: "Can you predict whether the Chinese government will loosen the covid policy?",
//     temperature: 0,
//     max_tokens: 100,
// }).then(res => {
//     console.log(res.data.choices[0].text);
//     history.push(res.data);
//     fs.writeFileSync("history.json", JSON.stringify(history));
// }).catch(err => {
//     console.log(err);
// });

app.post("/send", (req, res) => {
    let msg = req.body.msg;
    if (msg === undefined || msg.length === 0) {
        res.status(400);
        res.end();
        return;
    }
    history.push({
        sender: "human",
        msg: msg,
        time: Math.floor(Date.now() / 1000),
    });
    openai.createCompletion({
        model: "text-davinci-002",
        prompt:
`The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.

Human: Hello, who are you?
AI: I am an AI created by OpenAI. How can I help you today?
${historyToPrompt(history)}
Human: ${msg}
AI:`,
        temperature: 0.9,
        max_tokens: 150,
        stop: ["Human:", "AI:"],
    }).then(gpt => {
        console.log(gpt.data.choices[0].text);
        history.push({
            sender: "AI",
            msg: gpt.data.choices[0].text,
            time: gpt.data.created,
        });
        res.send({
            text: gpt.data.choices[0].text,
        });
        fs.writeFileSync("history.json", JSON.stringify(history));
    }).catch(err => {
        console.log(err);
        res.status(500);
        res.send(err);
    });
});

app.post('*', (req, res) => {
    console.log(req);
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
