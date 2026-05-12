import { Mastra } from "@mastra/core";
import { investmentAgent } from "./agents/investment-agent";
import {
  dailyBriefingCoordinatorAgent,
  financeNewsAnalystAgent,
  globalMarketScoutAgent,
} from "./agents/market-briefing-agents";

export const mastra = new Mastra({
  agents: {
    investmentAgent,
    globalMarketScoutAgent,
    financeNewsAnalystAgent,
    dailyBriefingCoordinatorAgent,
  },
});
