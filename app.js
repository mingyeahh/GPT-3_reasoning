const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const fs = require("fs");
let history = require("./history.json");

const historyToPrompt = (hist) => {
    let buffer = "";
    // hist.forEach((h) => {
    //     buffer = buffer.concat(`${h.sender}: ${h.msg}\n`);
    // });
    return buffer;
}

const port = 8080;

const app = express();
app.use(express.json()); // parse JSON requests
app.use(express.static("client"));

// console.log(history); // DEBUG

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


// List of topics that have been discussed 
let list_discussed = ['Transformer', 'LSTM', 'Large language models']

const discussed_item = (list_discussed) =>{
    let temp = [...list_discussed];
    let last = temp.pop(); 
    let str = temp.join(', ');
    return `${str}, and ${last}`;
}


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
`We'll be learning about NLP, we've already discussed: ${(discussed_item(list_discussed))}. Now we will discuss more things related to NLP. You should be leading the conversation by asking humans what they know first, and teaching the human something they never know.
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
});

app.get('/history', (req, res) =>{
    res.send(history);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
