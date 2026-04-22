import { tool } from "ai";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";

const readFileTool = tool({
  name: "read_file",
  description: "读取指定路径的文件内容",
  inputSchema: z.object({ filePath: z.string().describe("文件路径") }),
  execute: async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      console.log(
        `[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`,
      );
      return `文件内容:\n${content}`;
    } catch (error) {
      console.error(
        `[工具调用] read_file("${filePath}") - 失败: ${error.message}`,
      );
      return `读取文件失败: ${error.message}`;
    }
  },
});

const writeFileToole = tool({
  name: "write_file",
  description: "向指定路径写入文件内容，自动创建目录",
  inputSchema: z.object({
    filePath: z.string().describe("文件路径"),
    content: z.string().describe("要写入的内容"),
  }),
  execute: async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");

      console.log(
        `[工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`,
      );
      return `文件写入成功 ${filePath}`;
    } catch (error) {
      console.error(
        `[工具调用] write_file("${filePath}") - 失败: ${error.message}`,
      );
      return `文件写入失败: ${error.message} ${filePath}`;
    }
  },
});

export { readFileTool, writeFileToole };
