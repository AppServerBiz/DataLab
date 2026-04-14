const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyCsETcuJ6eglG9tu8RQ2PoaHFd5hz1fe5c');

async function test(name) {
  console.log(`Testing model: ${name}`);
  try {
    const model = genAI.getGenerativeModel({ model: name });
    const result = await model.generateContent("Olá");
    console.log(`SUCCESS [${name}]:`, await result.response.text());
  } catch (e) {
    console.error(`ERROR [${name}]:`, e.message);
  }
}

async function run() {
  await test("gemini-2.0-flash");
}
run();
