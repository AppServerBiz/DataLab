const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyCsETcuJ6eglG9tu8RQ2PoaHFd5hz1fe5c');

async function run() {
  try {
    // Attempting to generate with 'gemini-1.5-flash-8b' as some accounts have only this in early tiers
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const result = await model.generateContent("Olá");
    console.log("SUCCESS [gemini-1.5-flash-8b]:", await result.response.text());
  } catch (e) {
    console.error("ERROR [gemini-1.5-flash-8b]:", e.message);
  }
}
run();
