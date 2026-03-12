export function getTonghuashunStockUrl(code: string) {
  return `https://stockpage.10jqka.com.cn/${code}/`;
}

export function getTonghuashunIndexUrl(code: string) {
  const normalized = INDEX_CODE_MAP[code] ?? code;
  return `https://stockpage.10jqka.com.cn/${normalized}/`;
}

const INDEX_CODE_MAP: Record<string, string> = {
  "000001": "1A0001",
  "399001": "399001",
  "399006": "399006",
  "000300": "000300",
  "000905": "000905",
};
