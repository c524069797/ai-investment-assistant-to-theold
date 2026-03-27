export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBigVArticleById } from "@/lib/db";

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
        <Link
          href={`/chat?title=${encodeURIComponent(`${article.author.name}观点解读`)}&prompt=${encodeURIComponent(`请结合最近收录的大V观点，重点分析${article.author.name}今天对《${article.title}》的核心看法，并用通俗方式总结给我。`)}`}
          className="expert-detail-btn expert-detail-btn--primary"
        >
          交给 AI 解读
        </Link>
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
