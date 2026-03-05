import { Mastra } from "@mastra/core";
import { investmentAgent } from "./agents/investment-agent";

export const mastra = new Mastra({
  agents: { investmentAgent },
});
