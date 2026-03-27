import {
  mapHoldingPeriodLabel,
  mapInvestmentStyleLabel,
  mapRiskPreferenceLabel,
  normalizeMatchText,
  summarizeAssistantText,
  type UserInvestmentProfileData,
} from "./shared";

interface AnalysisSnapshotLike {
  title: string;
  summary: string;
  createdAt?: Date | string;
}

interface MemoryThesisLike {
  code?: string;
  name?: string | null;
  watchReason?: string | null;
  bullPoints?: string[];
  bearPoints?: string[];
  watchSignals?: string[];
  invalidationConditions?: string[];
  lastJudgement?: string | null;
}

interface BuildChatMemoryContextInput {
  query: string;
  profile?: Partial<UserInvestmentProfileData> | null;
  thesis?: MemoryThesisLike | null;
  recentSnapshots?: AnalysisSnapshotLike[];
  fallbackTheses?: MemoryThesisLike[];
}

export function findRelevantThesis<T extends { code: string; name?: string | null }>(
  theses: T[],
  query: string,
  explicitCode = "",
) {
  if (!theses.length) {
    return null;
  }

  if (explicitCode) {
    return theses.find((item) => item.code === explicitCode) ?? null;
  }

  const normalizedQuery = normalizeMatchText(query);
  return theses.find((item) => {
    if (!item.name) {
      return false;
    }
    return normalizedQuery.includes(normalizeMatchText(item.name));
  }) ?? null;
}

function formatSnapshotLine(snapshot: AnalysisSnapshotLike) {
  const date = snapshot.createdAt
    ? new Date(snapshot.createdAt).toLocaleDateString("zh-CN")
    : "最近";
  return `- ${date}：${snapshot.title}：${summarizeAssistantText(snapshot.summary, 100)}`;
}

export function buildChatMemoryContext({
  query,
  profile,
  thesis,
  recentSnapshots = [],
  fallbackTheses = [],
}: BuildChatMemoryContextInput) {
  const hasMeaningfulProfile = Boolean(
    profile?.summary?.trim() ||
    profile?.investmentStyle?.length ||
    profile?.preferredEvidence?.length ||
    profile?.dislikedPatterns?.length ||
    (profile?.riskPreference && profile.riskPreference !== "balanced") ||
    (profile?.holdingPeriodPreference && profile.holdingPeriodPreference !== "mid-term"),
  );

  if (!hasMeaningfulProfile && !thesis?.code && !recentSnapshots.length && !fallbackTheses.length) {
    return "";
  }

  const lines = [
    "以下是系统记录的用户长期记忆，请在回答时优先参考；若与最新市场事实冲突，以最新事实为准。",
  ];

  if (profile && hasMeaningfulProfile) {
    const styles = profile.investmentStyle?.length
      ? profile.investmentStyle.map(mapInvestmentStyleLabel).join("、")
      : "未明确";
    const evidence = profile.preferredEvidence?.length
      ? profile.preferredEvidence.join("、")
      : "未明确";
    const disliked = profile.dislikedPatterns?.length
      ? profile.dislikedPatterns.join("、")
      : "未明确";

    lines.push(
      `- 用户画像：${mapRiskPreferenceLabel(profile.riskPreference ?? "balanced")}，风格 ${styles}，偏好持有周期 ${mapHoldingPeriodLabel(profile.holdingPeriodPreference ?? "mid-term")}。`,
    );
    lines.push(`- 用户偏好证据：${evidence}。`);
    if (disliked !== "未明确") {
      lines.push(`- 用户不喜欢：${disliked}。`);
    }
    if (profile.summary?.trim()) {
      lines.push(`- 用户摘要：${profile.summary.trim()}`);
    }
  }

  if (thesis?.code) {
    lines.push(`- 当前关联标的：${thesis.name ? `${thesis.name}（${thesis.code}）` : thesis.code}`);
    if (thesis.watchReason?.trim()) {
      lines.push(`- 关注原因：${thesis.watchReason.trim()}`);
    }
    if (thesis.bullPoints?.length) {
      lines.push(`- 看多依据：${thesis.bullPoints.slice(0, 3).join("；")}`);
    }
    if (thesis.bearPoints?.length) {
      lines.push(`- 风险点：${thesis.bearPoints.slice(0, 3).join("；")}`);
    }
    if (thesis.watchSignals?.length) {
      lines.push(`- 观察信号：${thesis.watchSignals.slice(0, 4).join("、")}`);
    }
    if (thesis.invalidationConditions?.length) {
      lines.push(`- 逻辑失效条件：${thesis.invalidationConditions.slice(0, 2).join("；")}`);
    }
    if (thesis.lastJudgement?.trim()) {
      lines.push(`- 最近判断：${thesis.lastJudgement.trim()}`);
    }
  } else if (query.includes("自选") && fallbackTheses.length) {
    lines.push("- 用户近期关注标的摘要：");
    fallbackTheses.slice(0, 3).forEach((item) => {
      if (!item.code) {
        return;
      }
      lines.push(`  - ${item.name ? `${item.name}（${item.code}）` : item.code}：${item.lastJudgement?.trim() || item.watchReason?.trim() || "已加入自选"}`);
    });
  }

  if (recentSnapshots.length) {
    lines.push("- 最近分析快照：");
    recentSnapshots.slice(0, 3).forEach((snapshot) => {
      lines.push(formatSnapshotLine(snapshot));
    });
  }

  return lines.join("\n");
}
