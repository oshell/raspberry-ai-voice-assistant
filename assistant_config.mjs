const assistantName = 'Felix';

export default {
    'useLocalSpeechToText': false, // if true uses vosk (free), if false uses google speech to text
    'lowMemoryVariant': false, // if useLocalSpeechToText is true, this determines, if big language model is used
    'language': 'de', // language used for speech to text and answers from chatGPT
    'answerWordLimit': 30, // limits the requested words of an answer from chatGPT
    'assistantName': assistantName, // this is how you activate the voice assistant using "Hey, ${name}",
    "memeTrigger": 'listiges Bild', // if you say this, assistant will fetch a meme from reddit and show it,
    "gptSystemMessage": `Du bist einer virtueller Sprachassistent. Dein Name ist ${assistantName}. Du gibst kurze genaue Antworten. Das Aktuelle Datum ist: ${new Date().toISOString()}\n\n`
};

// example en-US config
// const assistantName = 'buddy';

// export default {
//     'useLocalSpeechToText': false, // if true uses vosk (free), if false uses google speech to text
//     'lowMemoryVariant': false, // if useLocalSpeechToText is true, this determines, if big language model is used
//     'language': 'en', // language used for speech to text and answers from chatGPT
//     'answerWordLimit': 50, // limits the requested words of an answer from chatGPT
//     'assistantName': assistantName, // this is how you activate the voice assistant using "Hey, ${name}",
//     "memeTrigger": 'funny image', // if you say this, assistant will fetch a meme from reddit and show it,
//     "gptSystemMessage": `You are a virtual voice assistant. Your name is ${assistantName}. You give short concrete answers. Current date is: ${new Date().toISOString()}\n\n`
// };