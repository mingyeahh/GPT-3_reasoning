const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const fs = require("fs");
const spawn = require("child_process").spawn;
const StreamSplitter = require("stream-splitter");
const crypto = require("crypto");
const AsyncLock = require("async-lock");
const app = express();
app.use(express.json()); // parse JSON requests
app.use(express.static("client"));
const {get_encoding} = require('@dqbd/tiktoken')

let lock = new AsyncLock();

let temp_summeriser = 0;
let temp_chatter = 0;
/*
 * TODO:
 - 1. Manually set the shorter memory limitation for all of the models into the same limit by token  -> for efficient evaluation purposes
 * 2. Setting the system prompt, Prepare a lot of different scripts
 * 3. Do both of the experiments
 * 4. Set standards for the evaluations 
 * 5. Experiment and log results
 * 6. Model-3(optional)
*/

const isDialogue = true;
const batchSize = 20;
const bufferSize = 10;
const conversationStart = `You are an encouraging language teacher, your goal is to help users practice their oral English skills. To achieve this, you must automatically introduce new and common topics to practice with the user as soon as the previous one is finished. You should aim to cover at least 30 different daily topics with the user one by one. Whenever the user makes a grammar mistake, it's crucial that you point it out and help them correct it immediately. Additionally, you should always recommend new phrases for the user to use and improve their language proficiency. Here are some examples:

AI: Let’s talk about ‘Travel’. Please talked about a place you have been to recently. 
Human: Sure! I go to Cambridge last week, it was nice and pretty. I went punt with my cousins. There are a lot of tourists there! I enjoy my time there in Cambridge very much! Every thing are beautiful! 
AI: Great to hear that you had a good time in Cambridge last week! However, let me help you with your grammar mistakes. Instead of saying "go to", you should say "went to" since you are referring to a past event. Additionally, you should say "Everything was beautiful" instead of "Every thing are beautiful". It's great that you went on a punt with your cousins and enjoyed your time in Cambridge! What other cities have you visited in the past?
Human: I also went to Tokyo. It is such a big cities! I ate a lot of sushis there! They are so fresh and yummy!
AI: Wow, it sounds like you had a great time in Tokyo too! Just a few corrections: instead of saying "big cities", you should say "a big city" since Tokyo is a singular noun. Also, instead of saying "sushis", it would be better to say "sushi", since "sushi" is already a plural noun.
I'm glad to hear that you enjoyed the sushi there. Now, let’s move on to another topic: ‘Family’. Can you tell me something about your family?
Human: Sure! There are 4 people in my family, my parents, my brother and I, we love each other.
AI: Great to hear that you have a loving family! Just a small correction, instead of saying "my brother and I", it would be better to say "my brother and me" since "me" is the object of the verb "love". So the corrected sentence would be:
"Sure! There are 4 people in my family - my parents, my brother, and me. We love each other."
That's wonderful to hear! What activities do you enjoy doing together as a family?
Human: We often go travelling as a family together! Also, when everyone’s at home, we often cook together as well!
AI: That's great to hear! Spending quality time together as a family is very important. Let’s switch to another topic: ’Sports’ Do you enjoy doing sports?
Now let’s start your lesson!
`;

// Set IDs for each 
let MAXID = 100000;
let limit = 1800;

const p = spawn('python3',["PromptSelecter.py"]);
p.stdin.setEncoding('utf-8');
const p_stdout = p.stdout.pipe(StreamSplitter("\n"));

// debugging
// p_stdout.on('token', data => console.log(`Python says: ${data} \n`));
// p.stderr.on('data', data => console.log(`Python stderr says: ${data}`));

const TalkToPython = (body, cb) => {
    // generate ID
    let id = crypto.randomBytes(16).toString("hex");
    // listener deals with what python sends back 
    let listener = (data) => { // assume python returns id, data
        let txt = data.toString();
        let arr = txt.split(',');
        let parsed_id = arr.shift();
        let remainder = arr.join(',');
        if (parsed_id == id) {
            p_stdout.removeListener('token', listener);
            cb(JSON.parse(remainder));
        }
    }
    // Whenever there is an output from Python, this runs
    p_stdout.addListener('token', listener);

    p.stdin.cork();
    p.stdin.write(`${id},${JSON.stringify(body)}\n`);
    p.stdin.uncork();
}

let enc = get_encoding("cl100k_base");
const SetLimit = (prompt) => {
    let remaining = limit;
    // go through the prompt, starting at the end -> count the tokens
    for (let i = prompt.length-1; i >= 0; i--) {
        let encoded = enc.encode(prompt[i].content);
        remaining -= encoded.length;
        if (remaining <= 0) {
            // this is the first message we should include
            let j = -remaining;
            let oded = encoded.slice(j);
            let croppedPrompt = [{role: prompt[i].role, content: new TextDecoder().decode(enc.decode(oded))}, ...prompt.slice(i+1)];
            console.log(new TextDecoder().decode(enc.decode(oded)));
            return {prompt: croppedPrompt, cutoff: [prompt[i].role==='system' ? -1 : prompt.length-i, new TextDecoder().decode(enc.decode(encoded.slice(0,j))).length]};
        }
    }
    return {prompt: prompt, cutoff: [-1,-1]};
}

// Apply GPT-3 to do summerisation
const configuration2 = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai2 = new OpenAIApi(configuration2);

// openai2.retrieveModel('gpt-4').then(res => console.log(res.data));



// index => the index of the starting conversation that needs to be summerised
// buffer => the size of conversation that I define
// batchSize => the size of one batch of conversation that we define for summerisation
// histPath => the path to log all the past conversation in a json file
// listory => a verb i made means the list of history lmao :D
// Concatenating summaries for different batches into the prompt

// Original Model 1 -> prompt is the stacked summaries
/*
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
            prompt:`${this.historyToText(this.index, (this.index + this.batchSize))}\n\nTl;dr`,
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
    
            console.log('summary for the text' + this.summaries[this.summaries.length-1]);
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
// */

// Model 1 is just summarise things and put them into the prompt tgt
// Prompt: each summarised memories stacking together
class Model1{
    constructor(histPath, batchSize=10, buffer=10){
        this.histPath = histPath;
        this.listory = require(this.histPath);
        this.counter = 0;
        this.index = 0;
        this.batchSize = batchSize;
        this.buffer = buffer;
        this.summaries = [];
        this.lockKey = crypto.randomBytes(16).toString("hex");
        lock.acquire(this.lockKey, (done) => {
            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory(done);
            } else {done();}
        }, ()=>{});
    }

    push(sender, msg, time) {
        this.listory.push({
            sender: sender,
            msg: msg,
            time: time,
        });
        lock.acquire(this.lockKey, (done) => {
            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory(done);
            } else {done();}
        }, ()=>{});
        fs.writeFileSync(this.histPath, JSON.stringify(this.listory));
    }

    historyToText(start=0, end=-1, as_string=false) {
        if (end < 0 || end > this.listory.length) {end = this.listory.length}
        let buffer = as_string ? "" : [];
        for (let i = start; i<end; i++){
            let h = this.listory[i];
            if (as_string) {
                buffer = buffer.concat(`${h.sender}: ${h.msg}\n`);
            } else {
                buffer.push({role:h.sender, content:h.msg});
            }
        }
        return buffer;
    }

    historyBatch(start=0, end=-1) {
        if (end < 0) {end = this.listory.length}
        return this.listory.slice(start,end);
    }

    summariseHistory(cb){
        let batch = {
            batch: this.historyBatch(this.index, (this.index + this.batchSize)),
            shots_count: 2,
        };

        let doSummary = (prompt) => {
            console.log(prompt);
            openai2.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                temperature: temp_summeriser,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            }).then(gpt => {
                this.summaries.push(gpt.data.choices[0].text);
                console.log('pushing summaries', this.summaries)
                this.counter += 1;
                // Update the starting index of the history which haven't summerised
                this.index = this.counter * this.batchSize;

                if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                    // automatically summarise recursively
                    this.summariseHistory(cb);
                } else {
                    cb();
                }
            });
        }

        if (isDialogue) {
            TalkToPython(batch, (resp) => {
                doSummary(`Dialogue 1: ${resp[0]['dialogue']}
Summary 1:
${resp[0]['summary']}

Dialogue 2:
${resp[1]['dialogue']}

Summary 2:
${resp[1]['summary']}

Dialogue 3:
${this.historyToText(this.index, (this.index + this.batchSize), true)}

Based on the previous summary examples' techniques, summarise Dialogue 3 in detail for at least 30 words, then give a list of topics what the user and the assistant talked about.
Summary 3:
The conversation has already started. The user and the assistant talked about`);
            });
        } else {
            doSummary(`${this.historyToText(this.index, (this.index + this.batchSize), true)}
            
            Please summarise what the assistant has said.`); 
        }
    }

    conversationPrompt(){
        let builtInText = {role:'system', content:conversationStart};
        let restHist = this.historyToText(this.index);
        console.log(`The current summary for model 1 is:\n ${this.summaries}`);
        if (this.summaries.length === 0) {
            return [builtInText].concat(restHist);
        } else {
            console.log('testing', this.summaries)
            return [builtInText, {role: 'system', content: (
                (isDialogue) ?
                'The conversation has already started. The user and the assistant talked about' + this.summaries.join(' They also talked about') :
                this.summaries.join(' ')
            )}].concat(restHist);
        }
        
    }
}



// Prompt will be a constant amount, it'll be the hierachical summarisation of the past summaries.
class Model2{
    constructor(histPath, batchSize=10, buffer=10){
        this.index = 0;
        this.buffer = buffer;
        this.batchSize = batchSize;
        this.histPath = histPath;
        this.listory = require(this.histPath);
        this.counter = 0;
        this.currentSummary = "";
        this.lockKey = crypto.randomBytes(16).toString("hex");
        lock.acquire(this.lockKey, (done) => {
            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory(done);
            } else {done();}
        }, ()=>{});
    }
    
    // Set the starting and ending index of the conversation batch we need to use
    historyToText(start=0, end=-1, as_string=false) {
        if (end < 0 || end > this.listory.length) {end = this.listory.length}
        let buffer = as_string ? "" : [];
        for (let i = start; i<end; i++){
            let h = this.listory[i];
            if (as_string) {
                buffer = buffer.concat(`${h.sender}: ${h.msg}\n`);
            } else {
                buffer.push({role:h.sender, content:h.msg});
            }
        }
        return buffer;
    }

    historyBatch(start=0, end=-1) {
        if (end < 0) {end = this.listory.length}
        return this.listory.slice(start,end);
    }

    push(sender, msg, time) {
        this.listory.push({
            sender: sender,
            msg: msg,
            time: time,
        });
        lock.acquire(this.lockKey, (done) => {
            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory(done);
            } else {done();}
        }, ()=>{});
        fs.writeFileSync(this.histPath, JSON.stringify(this.listory));
    }
    
    
    summariseHistory(cb){
        let advanceSummariser = () => {
            this.counter += 1;
            // Update the starting index of the history which haven't summerised
            this.index = this.counter * this.batchSize;
    
            console.log('summary for the text for model 2 ' + this.currentSummary);
            console.log('current index is: ' + this.index);

            if (this.listory.length >= (this.index + this.batchSize + this.buffer)){
                // automatically summarise recursively
                this.summariseHistory(cb);
            } else {
                cb();
            }
        }

        let batch = {
            batch: this.historyBatch(this.index, (this.index + this.batchSize)),
            shots_count: 2,
        };

        let doSummary = (prompt) => {
            openai2.createCompletion({
                model: "text-davinci-003",
                prompt: prompt,
                temperature: temp_summeriser,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            }).then(gpt => {
                let A = gpt.data.choices[0].text;
                console.log(`batch summary: ${A}`);
 
                if (this.currentSummary === "") {
                    this.currentSummary = A;
                    advanceSummariser();
                } else {
                    let B = this.currentSummary;
                    openai.createChatCompletion({
                        model: "gpt-3.5-turbo",
                        messages: [{role: 'user', content: (
                            (isDialogue) ?
                            `The user and the assistant previously talked about ${B} They also talked about ${A}\nPlease summarise the given information above in detail.` :
                            `${B}\n${A}\nPlease summarise the information given above in detail.`
                        )}],
                        temperature: temp_summeriser,
                        max_tokens: 300,
                    }).then(gpt =>{
                        this.currentSummary = gpt.data.choices[0].message.content;
                        advanceSummariser();
                    });
                }
            });
        }
        
        if (isDialogue) {
            TalkToPython(batch, (resp) => {
                doSummary(`Dialogue 1: 
                ${resp[0]['dialogue']}
                
                Summary 1:
                ${resp[0]['summary']}
                
                Dialogue 2:
                ${resp[1]['dialogue']}
                
                Summary 2:
                ${resp[1]['summary']}
                
                Dialogue 3:
                ${this.historyToText(this.index, (this.index + this.batchSize), true)}
                
                Summary 3:
                Based on the previous summary examples' techniques, summarise dialogue 3 in details for at least 60 words.
                Perviously was discussing`);
            });
        } else {
            doSummary(`${this.historyToText(this.index, (this.index + this.batchSize), true)}
            
            Please summarise what the assistant has said.`); // TODO
        }
    }
    
    conversationPrompt(){
        let builtInText = {role:'system', content:conversationStart};
        let restHist = this.historyToText(this.index);
        console.log([{role: 'system', content : this.currentSummary}])
        if (this.currentSummary==="") {
            return [builtInText].concat(restHist);
        } else {
            return [builtInText, {role: 'system', content: this.currentSummary}].concat(restHist);
        }
    }
}

// Prompt will be the 
class Model3{

}

class Playground{
    constructor(histPath){
        this.histPath = histPath;
        this.listory = require(this.histPath);
    }

    push(sender, msg, time) {
        this.listory.push({
            sender: sender,
            msg: msg,
            time: time,
        });

        fs.writeFileSync(this.histPath, JSON.stringify(this.listory));
    }

    // Get things from listory and put it into buffer to send to front-end
    historyToText(start=0, end=-1) {
        if (end < 0) {end = this.listory.length}
        let buffer = [];
        for (let i = start; i<end; i++){
            let h = this.listory[i];
            buffer.push({role:h.sender, content:h.msg});
        }
        return buffer;
    }

    conversationPrompt(){
        let builtInText = {role:'system', content:conversationStart};
        let dialogue = [builtInText, ...this.historyToText()];
        return dialogue;
        
    }
}

let conversation1 = new Model1("./history1.json", batchSize, bufferSize);

let conversation2 = new Model2("./history2.json", batchSize, bufferSize);



let conversation4 = new Playground("./history4.json");

let conversation = {
    1: conversation1,
    2: conversation2,
    // 3: conversation3,
    4: conversation4,
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
    conversation[req.query.model].push("user", msg, Math.floor(Date.now() / 1000));
    let croppedPrompt = SetLimit(conversation[req.query.model].conversationPrompt());
    console.log('cropped\n\n',croppedPrompt)
    openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages:croppedPrompt.prompt,
        temperature: temp_chatter,
        max_tokens: 500,
    }).then(gpt => {
        conversation[req.query.model].push("assistant", gpt.data.choices[0].message.content, gpt.data.created);
        res.send({
            text: gpt.data.choices[0].message.content,
            cutoff: croppedPrompt.cutoff,
        });
    }).catch(err => {
        console.log(`err msg ${err}`);
        res.status(500);
        res.send(err);
    });
});

app.post('*', (req, res) => {
    console.log(`req: ${req}`);
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


