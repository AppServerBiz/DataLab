const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyCsETcuJ6eglG9tu8RQ2PoaHFd5hz1fe5c');

async function run() {
  try {
    const list = await genAI.listModels();
    console.log("AVAILABLE MODELS:");
    list.models.forEach(m => {
      console.log(`- ${m.name} (${m.displayName}) methods: ${m.supportedGenerationMethods.join(',')}`);
    });
  } catch (e) {
    console.error("ERROR LISTING MODELS:", e.message);
  }
}
run();
