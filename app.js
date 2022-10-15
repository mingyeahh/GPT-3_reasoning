const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
openai.createCompletion({
    model: "text-davinci-002",
    prompt: "Can you predict whether the Chinese government will loosen the covid policy?",
    temperature: 0,
    max_tokens: 100,
}).then(res => {
    console.log(res.data.choices[0].text);
}).catch(err => {
    console.log(err);
});
