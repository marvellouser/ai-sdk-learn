import dotenv from "dotenv";
import path from "node:path";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output, streamText, stepCountIs } from "ai";
import { z } from "zod";
import { readFileTool, writeFileToole } from "./allTools.mjs";
dotenv.config();

const { QWEN_API_KEY, QWEN_BASE_URL, QWEN_MODEL_NAME } = process.env;

const model = createOpenAICompatible({
  apiKey: QWEN_API_KEY,
  baseURL: QWEN_BASE_URL,
  modelName: QWEN_MODEL_NAME,
})(QWEN_MODEL_NAME);

const result = await generateText({
  model,
  system: "你是一个文档分析助手",
  tools: {
    read_file: readFileTool,
    write_file: writeFileToole,
  },
  stopWhen: stepCountIs(5),
  prompt:
    "读取当前文件夹下的README.md文件, 分析下文档主要的内容是什么，文档末尾处，写入一条信息：已阅",
});

console.log(result.text);
// for await (const chunk of result.textStream) {
//   console.log(chunk);
// }

// const test = await generateText({
//     model,
//     system: '你是我的人工智能助手',
//     prompt: '你好'
// })

// console.log(test)

// const { output } = await generateText({
//   model,
//   system: "Return strictly valid JSON that matches the schema.",
//   output: Output.object({
//     schema: z.object({
//       recipe_name: z.string(),
//       prep_time_minutes: z.number(),
//       cook_time_minutes: z.number(),
//       total_time_minutes: z.number(),
//       servings: z.number(),
//       difficulty: z.string(),
//       ingredients: z.array(z.string()),
//       instructions: z.array(z.string()),
//       cuisine: z.string().optional(),
//       tips: z.array(z.string()).optional(),
//       storage_instructions: z.string().optional(),
//     }),
//   }),
//   prompt:
//     "Generate a lasagna recipe and respond in JSON. Use exactly these top-level keys: recipe_name, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, difficulty, ingredients, instructions. ingredients and instructions must be arrays of strings.",
// });

// console.log(output, "....");
