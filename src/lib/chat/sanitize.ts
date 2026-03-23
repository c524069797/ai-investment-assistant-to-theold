const THINK_BLOCK_RE = /<think\b[^>]*>[\s\S]*?<\/think>/gi;
const THINKING_BLOCK_RE = /<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi;
const OPEN_THINK_RE = /<think\b[^>]*>[\s\S]*$/i;
const OPEN_THINKING_RE = /<thinking\b[^>]*>[\s\S]*$/i;
const TRACE_LINE_RE = /^\s*(?:\[WebSearch\]|\[Tool\]|\[browse_page\]|browse_page\b|web_search\b|search_web\b|tool_call\b|tool_result\b).*$/gim;

export function sanitizeAssistantText(text: string) {
  return text
    .replace(THINK_BLOCK_RE, "")
    .replace(THINKING_BLOCK_RE, "")
    .replace(OPEN_THINK_RE, "")
    .replace(OPEN_THINKING_RE, "")
    .replace(TRACE_LINE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
