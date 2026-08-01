import dotenv from 'dotenv';
dotenv.config();
import { generateFlashcardsTask } from './src/server/ai/tasks/generateFlashcards.ts';
const result = await generateFlashcardsTask({ prompt: 'Biologia', count: 2, language: 'pt', difficulty: 'medium', selectedTopics: ['Células'] });
console.log(JSON.stringify(result, null, 2));
