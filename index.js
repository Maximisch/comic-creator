// Create an API to generate comic books by either accepting a prompt or generating a random prompt.
// The API will then generate a comic book storyline using ChatGPT by populating a premade prompt.
// ChatGPT will return a JSON object that contains a list of comic panels.
// The program will generate a new comic panel image for every entry in the JSON object, and subtitle it with the accompanying text defined in the JSON object.
// All generated images will then be assembled into one large image, and the image will be returned to the user.

// Import the required modules
const express = require('express');
const bodyParser = express.json();
const app = express();
const port = 3000;
const fs = require('fs');
const https = require('https');

// Import the required modules for generating comic books
const { Configuration, OpenAIApi } = require("openai");

// Example:
// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);

// const completion = await openai.createCompletion({
//   model: "text-davinci-003",
//   prompt: "Hello world",
// });
// console.log(completion.data.choices[0].text);

const configuration = new Configuration({
    apiKey: "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",
    //apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Create a new route for the API, POST a prompt, and return a comic book image
app.post('/comic', bodyParser, async (req, res) => {
    // Log
    console.log("Received request for comic book", req.body);
    // Get the prompt from the request body
    const prompt = req.body.prompt;

    // Return the comic book image
    res.send(await generateComicBook(prompt));
});

// Create a new method to generate a comic book image
async function generateComicBook(prompt) {

    // check if the prompt is empty, if yes set it to a static prompt
    if (prompt == "") {
        prompt = "A mouse and a dog are good friends and travel the world";
    }
    console.log("Received prompt request for " + prompt);
    
    let storyline = await generateComicBookStorylineDEV(prompt);

    // Traverse array and generate images
    let imageFileNames = [];
    for (let i = 0; i < storyline.length; i++) {
        let description = storyline[i].description;
        let subtitle = storyline[i].subtitle;
        console.log("Generating image for", description, "with subtitle", subtitle);
        let imageFileName = await generateComicBookImage(description, subtitle);
        imageFileNames.push(imageFileName);
    }

    return storyline;
}

async function generateComicBookStorylineDEV(prompt) {
    return JSON.parse(`[
        {
            "description": "A large snail crawling on the ground",
            "subtitle": "Little does the snail know its fate"
        },
        {
            "description": "The dog spotting the snail",
            "subtitle": "Its eyes lock onto its target"
        },
        {
            "description": "The dog running fast towards the snail",
            "subtitle": "The snail has nowhere to hide"
        },
        {
            "description": "The dog opening its mouth to eat the snail",
            "subtitle": "The dog gulps down the large creature in one bite"
        }
    ]`);
}
async function generateComicBookStoryline(prompt) {
    // Wrap the prompt in a promptTemplate
    let promptTemplate = `
        Generate a comic book story using the following prompt: ${prompt}
        Split the story into a number of comic panels and generate a description and subtitle for each image.
        Wrap the description and subtitle in a JSON format as follows:
        [
            {
                "description": "A mouse and a dog hugging",
                "subtitle": "The mouse and the dog are good friends and travel the world"
            },
            {
                "description": "A mouse and dog riding an airplane",
                "subtitle": "They fly to wonderful places"
            }
            (and so on...)
        ]
        Only return the JSON.
    `;

    // Generate a comic book using the prompt
    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: promptTemplate,
        max_tokens: 2000,
    });

    console.log("Prompted the following prompt:\n" + prompt);
    console.log("Received the following response:\n" + completion.data.choices[0].text);

    return JSON.parse(completion.data.choices[0].text);
}
async function generateComicBookImage(imageDescription, imageSubtitle) {
    console.log("Querying image for", imageDescription, "with subtitle", imageSubtitle);

    let promptTemplate = `
        In comic style, draw the prompt: ${imageDescription}
    `;

    return openai.createImage({
        prompt: promptTemplate,
        n: 1,
        size: "256x256",
        response_format: "url"
    }).then((resultImageUrlResponse) => {
        console.log("DEBUG: RAW IMG GEN RESPONSE", resultImageUrlResponse.data);
        let resultImageUrl = resultImageUrlResponse.data.data[0].url;
        console.log("Received image result for", imageDescription, "with subtitle", imageSubtitle, "from", resultImageUrl);
        // Download the result image from the URL to a file, named by prefixing the current ISO8601 timestamp to the imageSubtitle
        let outputFileName = new Date().toISOString() + "_" + imageSubtitle + ".png";
        let outputFile = fs.createWriteStream(outputFileName)
    
        let request = https.get(resultImageUrl, function(response) {
            response.pipe(outputFile);
        });
        return outputFileName;
    }).catch((error) => {
        console.log("Error querying image for", imageDescription, "with subtitle", imageSubtitle, ":", error);
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});