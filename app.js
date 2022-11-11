const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json()); // parse JSON requests
app.use(express.static("client"));

// let history = require("./history.json"); // list of past conversation

class History{
    constructor(index, buffer, batchSize, histPath){
        this.index = index;
        this.buffer = buffer;
        this.batchSize = batchSize;
        this.histPath = histPath;
        this.listory = require(this.histPath);
        this.currentSummary = "";
    }

    historyToText(start=0, end=-1) {
        if (end < 0) {end = this.listory.length}
        let buffer = "";
        for (let i = start; i<end; i++){
            let h = this.listory[i];
            buffer = buffer.concat(`${h.sender}: ${h.msg}\n`);
        }
        return buffer;
    }

    push(sender, msg, time) {
        this.listory.push({
            sender: sender,
            msg: msg,
            time: time,
        });
        fs.writeFileSync(this.histPath, JSON.stringify(this.listory));
        if (this.listory.length >= this.index + this.batchSize + this.buffer){
            // do summary thing
        }
    }
    conversationPrompt(){
        let builtInText = "We'll be learning about NLP, we've already discussed:";
        let restHist = this.historyToText(this.index);
        return `${builtInText} ${this.currentSummary}\n\n${restHist}AI:`;
    }
}
let conversation = new History(0, 20, 20, "./history.json");


// Apply GTP-3 to answer questions based on input conversation
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Response from GPT-3 based on prompt and user input
app.post("/send", (req, res) => {
    let msg = req.body.msg;
    if (msg === undefined || msg.length === 0) {
        res.status(400);
        res.end();
        return;
    }
    conversation.push("human", msg, Math.floor(Date.now() / 1000));
    openai.createCompletion({
        model: "text-davinci-002",
        prompt:conversation.conversationPrompt(),
        temperature: 0.9,
        max_tokens: 150,
        stop: ["Human:", "AI:"],
    }).then(gpt => {
        conversation.push("AI", gpt.data.choices[0].text, gpt.data.created);
        res.send({
            text: gpt.data.choices[0].text,
        });
    }).catch(err => {
        console.log(err);
        res.status(500);
        res.send(err);
    });
});

app.post('*', (req, res) => {
    console.log(req);
});

// Send past conversation to log in front-end from server side
app.get('/history', (req, res) =>{
    res.send(conversation.listory);
});

// List of summerisation 
let list_discussed = ['Transformer']

// const configuration2 = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
// });
// const openai2 = new OpenAIApi(configuration2);

//     openai2.createCompletion({
//         model: "text-davinci-002",
//         prompt:
// `Summerise ${(discussed_item(list_discussed))} in details.`,
//         temperature: 0.7,
//         max_tokens: 256,
//         top_p: 1,
//         frequency_penalty: 0,
//         presence_penalty: 0,
//     })

// const response = await openai2.createCompletion({
//   model: "text-davinci-002",
//   prompt: "Summarize ",
//   temperature: 0.7,
//   max_tokens: 256,
//   top_p: 1,
//   frequency_penalty: 0,
//   presence_penalty: 0,
// });


const discussed_item = (list_discussed) =>{
    let temp = [...list_discussed];
    let last = temp.pop(); 
    let str = temp.join(', ');
    return `${str}, and ${last}`;
}

module.exports = app;
