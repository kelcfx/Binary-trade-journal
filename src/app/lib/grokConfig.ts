import { ChatGroq } from "@langchain/groq";

export const chat = new ChatGroq({
    apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    model: "gemma2-9b-it",
});
