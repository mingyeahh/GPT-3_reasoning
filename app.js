const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json()); // parse JSON requests
app.use(express.static("client"));

/*
TODO:
- Delete all json file things DONE 
- Reconstruct a proper bench mark dialouge which should have the property of: Different topics, each topics should be in different length, 
- 
*/ 

 
// Apply GPT-3 to do summerisation
const configuration2 = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai2 = new OpenAIApi(configuration2);

class Model1{
    constructor(histPath, batchSize=10, buffer=10){
        this.histPath = histPath;
        this.listory = require(this.histPath);
        this.counter = 0;
        this.index = 0;
        this.batchSize = batchSize;
        this.buffer = buffer;
        this.summaries = [];
        if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
            // automatically summarise recursively
            this.summariseHistory();
        }
    }

    push(sender, msg, time) {
        this.listory.push({
            sender: sender,
            msg: msg,
            time: time,
        });
        if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
            // automatically summarise recursively
            this.summariseHistory();
        }
        fs.writeFileSync(this.histPath, JSON.stringify(this.listory));
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

    summariseHistory(){
        this.isSummarising = true;
        openai2.createCompletion({
            model: "text-davinci-002",
            prompt:
            // ffs I spent ages to debug and it turns out the prompt has to be in this format :/
    `Dialogue 1: 
    Human: Can you teach me Chinese?
    AI: I'm sorry, but I don't know how to speak Chinese.
    Human: Maybe you can teach me German then?
    AI: I'm sorry, but I also don't know how to speak German.

    Summary 1:
    The topics discussed were learning Chinese and learning German.
    
    Dialogue 2:
    Human: Have you ever read Dracula?
    AI: Yes, I have actually read Dracula. It's a classic novel by Bram Stoker.
    Human: Do you read a lot of books?
    AI: Yes, I love reading books!

    Summary 2:
    The topics discussed were Dracula and reading books.

    Dialogue 3:
    ${this.historyToText(this.index, (this.index + this.batchSize))}

    Summary 3:
    The topics discussed were`,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        }).then(gpt => {
            this.summaries.push(gpt.data.choices[0].text);
    
            this.counter += 1;
            // Update the starting index of the history which haven't summerised
            this.index = this.counter * this.batchSize;
    
            console.log('summary for the text: ' + this.summaries[this.summaries.length-1]);
            console.log('current index is: ' + this.index);

            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory();
            } else {
                this.isSummarising = false;
            }
        });
    }

    conversationPrompt(){
        let builtInText = "We'll be learning about NLP, we've already discussed:";
        let restHist = this.historyToText(this.index);
        console.log(this.summaries);
        return `${builtInText}\n${this.summaries.join(' ')}\n${restHist}AI:`;
        
    }
}

// index => the index of the starting conversation that needs to be summerised
// buffer => the size of conversation that I define
// batchSize => the size of one batch of conversation that we define for summerisation
// histPath => the path to log all the past conversation in a json file
// listory => a verb i made means the list of history lmao :D
class Model2{
    constructor(index, buffer, batchSize, histPath){
        this.index = index;
        this.buffer = buffer;
        this.batchSize = batchSize;
        this.histPath = histPath;
        this.listory = require(this.histPath);
        this.counter = 0;
        this.currentSummary = "";
        this.isSummarising = false;
        if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
            this.summariseHistory();
        }
    }
    
// Set the starting and ending index of the conversation batch we need to use
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
        if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
            this.summariseHistory();
        }
    }
    
    summariseHistory(){
        this.isSummarising = true;
        openai2.createCompletion({
            model: "text-davinci-002",
            prompt:
            // ffs I spent ages to debug and it turns out the prompt has to be in this format :/
    `Old Summary 1:
    The topics discussed were maths homework and geography homework.

    Dialogue 1: 
    Human: Can you teach me Chinese?
    AI: I'm sorry, but I don't know how to speak Chinese.
    Human: Maybe you can teach me German then?
    AI: I'm sorry, but I also don't know how to speak German.

    Summary 1:
    The topics discussed were homework, learning Chinese and learning German.
    
    Old Summary 2:
    The topics discussed were zombies, garlic, transformers, and vampires.

    Dialogue 2:
    Human: Have you ever read Dracula?
    AI: Yes, I have actually read Dracula. It's a classic novel by Bram Stoker.
    Human: Do you read a lot of books?
    AI: Yes, I love reading books!

    Summary 2:
    The topics discussed were zombies, garlic, transformers, vampires, Dracula, and reading books.

    Old Summary 3:
    The topics discussed were ${this.currentSummary}

    Dialogue 3:
    ${this.historyToText(this.index, (this.index + this.batchSize))}

    Summary 3:
    The topics discussed were`,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        }).then(gpt => {
            this.currentSummary = gpt.data.choices[0].text;
    
            this.counter += 1;
            // Update the starting index of the history which haven't summerised
            this.index = this.counter * this.batchSize;
    
            console.log('summary for the text' + this.currentSummary);
            console.log('current index is: ' + this.index);

            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory();
            } else {
                this.isSummarising = false;
            }
        });
    }

    conversationPrompt(){
        let builtInText = "We'll be learning about NLP, we've already discussed:";
        let restHist = this.historyToText(this.index);
        return `${builtInText} ${this.currentSummary}\n\n${restHist}AI:`;
    }
}

let conversation2 = new Model2(0, 10, 10, "./history2.json");

let conversation1 = new Model1("./history1.json");

let conversation = {
    1: conversation1,
    2: conversation2,
};

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
    conversation[req.query.model].push("human", msg, Math.floor(Date.now() / 1000));
    openai.createCompletion({
        model: "text-davinci-002",
        prompt:conversation[req.query.model].conversationPrompt(),
        temperature: 0.9,
        max_tokens: 150,
        stop: ["Human:", "AI:"],
    }).then(gpt => {
        conversation[req.query.model].push("AI", gpt.data.choices[0].text, gpt.data.created);
        res.send({
            text: gpt.data.choices[0].text,
            promp: conversation[req.query.model].conversationPrompt()
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
    if(Object.keys(conversation).includes(req.query.model)){
        res.send(conversation[req.query.model].listory);
    } else {
        res.status(404).end();
    }
});

// // List of summerisation 
// let list_discussed = ['Transformer']

// const discussed_item = (list_discussed) =>{
//     let temp = [...list_discussed];
//     let last = temp.pop(); 
//     let str = temp.join(', ');
//     return `${str}, and ${last}`;


module.exports = app;
