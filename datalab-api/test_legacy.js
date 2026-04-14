const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyCsETcuJ6eglG9tu8RQ2PoaHFd5hz1fe5c');

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Olá");
    console.log("SUCCESS [gemini-pro]:", await result.response.text());
  } catch (e) {
    console.error("ERROR [gemini-pro]:", e.message);
  }
}
run();
