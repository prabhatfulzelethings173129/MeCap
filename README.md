# MeCap - IPO yourself. Built for the Meta Global AI Developer Hackathon.
A simulated personal stock exchange: I am the company, my logged time is the trading activity, and my productive time moves my share price. It is a simulation. No real money. Not financial advice.

The Llama log parser and the analyst note are new work built for this hackathon. All AI runs through one helper (web/lib/llm.ts) against an OpenAI-compatible endpoint (local Llama via Ollama).

Setup: go to the web folder, copy .env.example to .env.local, then run `npm install` and `npm run dev`.
