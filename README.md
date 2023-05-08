# GPT-3 Chatbot with memory

## Getting Started
Here is how you could utilise the code.

## Dataset for prompt example selection
We use the SUMSum dataset [downloaded via: https://huggingface.co/datasets/samsum] as our corpus.

## Installation

```sh
pip install -r requirements.txt
```

## Usage

1. Route the terminal to the downloaded folder,
2. run `npm install`,
3. run `npm start`
4. access the application via `localhost:8080` on a browser in the url space.

## File construction
* `history1.json` and `sum1.json` store the past dialogues and summaries for the chunk model.
* `history2.json` and `sum2.json` store the past dialogues and summaries for the hierarchical model.
* `history4.json` stores the past dialogues for the baseline ChatGPT model.

When starting a new dialogue, users need to manually delete the histories in the json files.

## Parameters tuning
Parameters for the chatters are set in the backend of the chatter model in `app.js` from line 15 to line 25.


