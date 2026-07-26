export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBigVArticleById } from "@/lib/db";
import ChatHandoffLink from "@/components/chat/ChatHandoffLink";

function sentimentLabel(sentiment: string) {
  if (sentiment === "bullish") return { text: "偏多", className: "expert-detail-badge expert-detail-badge--bullish" };
  if (sentiment === "bearish") return { text: "偏谨慎", className: "expert-detail-badge expert-detail-badge--bearish" };
  return { text: "中性", className: "expert-detail-badge expert-detail-badge--neutral" };
}

export default async function ExpertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getBigVArticleById(id);

  if (!article) {
    notFound();
  }

  const sentiment = sentimentLabel(article.sentiment);

  return (
    <div className="page-container expert-detail-page">
      <div className="expert-detail-toolbar">
        <Link href="/experts" className="expert-detail-btn expert-detail-btn--default">
          ← 返回大V分析
        </Link>
        <ChatHandoffLink
          title={`${article.author.name}观点解读`}
          prompt={`请结合最近收录的大V观点，重点分析 ${article.author.name} 在《${article.title}》中的核心看法，按下面结构输出：
1. 核心结论：这篇文章到底想表达什么；
2. 市场态度：偏多、偏空、震荡，还是等待确认；
3. 重点方向：提到了哪些指数、板块、个股、风格切换；
4. 节奏判断：作者更强调反弹、回踩、轮动、补跌、观察，还是其他节奏；
5. 风险提醒：文中明确提醒了哪些风险；
6. 给普通投资者的翻译：把原文里的交易语言翻译成容易理解的话。

要求：
- 尽量依据文章原文，不要泛泛而谈；
- 不要直接给出“买/卖”指令；
- 用通俗中文，写清楚，不要只给一句话结论。`}
          className="expert-detail-btn expert-detail-btn--primary"
        >
          交给 AI 解读
        </ChatHandoffLink>
        {article.sourceUrl ? (
          <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="expert-detail-btn expert-detail-btn--default">
            原文链接
          </a>
        ) : null}
      </div>

      <article className="expert-detail-card">
        <div className="expert-detail-meta">
          <span className="expert-detail-badge expert-detail-badge--category">{article.primaryCategory}</span>
          <span className={sentiment.className}>{sentiment.text}</span>
          <span className="expert-detail-badge expert-detail-badge--heat">热度 {article.score}</span>
          <span className="expert-detail-badge expert-detail-badge--teacher">老师分类：{article.author.category}</span>
          <span className="expert-detail-date">{new Date(article.publishedAt).toLocaleDateString("zh-CN")}</span>
        </div>

        <h1 className="expert-detail-title">{article.title}</h1>
        <div className="markdown-body expert-detail-summary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.summary}</ReactMarkdown>
        </div>

        <div className="expert-detail-author-row">
          <span className="expert-detail-author-name">{article.author.avatar ?? "🧠"} {article.author.name}</span>
          <div className="expert-detail-tags">
            {article.tags.map((item) => (
              <span key={item} className="expert-detail-tag">{item}</span>
            ))}
          </div>
        </div>

        {article.images.length ? (
          <div className="expert-detail-images">
            {article.images.map((image) => (
              <div key={image} className="expert-detail-image-box">
                <Image src={image} alt={article.title} fill sizes="400px" style={{ objectFit: "cover" }} unoptimized />
              </div>
            ))}
          </div>
        ) : null}

        <div className="markdown-body expert-detail-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
