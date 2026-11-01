// Prompts are safe to keep in server code because the API intentionally shows
// one of them to visitors. Accepted answers are loaded only from Wrangler's
// QUESTION_ANSWERS secret and must never be added to this module.
export const QUESTIONS = [
  { prompt: "What is Tom's last name?" },
  { prompt: "What is Tom's favorite snack?" },
  { prompt: "What is Tom's haircut?" },
  { prompt: "What is Tom's hair color?" },
  { prompt: "What does Tom drive?" },
  { prompt: "What color is Tom's house?" },
  { prompt: "What city does Tom live in?" },
  { prompt: "What city was Tom born in?" },
  { prompt: "What is Tom's favorite color?" },
  { prompt: "What month was Tom born in?" }
];
