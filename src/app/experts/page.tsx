"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Alert, Button, Card, Empty, Input, Select, Space, Spin, Tag, Typography } from "antd";
import { FireOutlined, TeamOutlined } from "@ant-design/icons";
import Link from "next/link";
import { stripMarkdown, truncateText } from "@/lib/markdown";

const { Title, Text, Paragraph } = Typography;

interface BigVAuthorFilter {
  name: string;
  avatar: string | null;
  category: string;
}

interface BigVArticle {
  id: string;
  title: string;
  content: string;
  images: string[];
  sourceUrl?: string;
  summary: string;
  primaryCategory: string;
  tags: string[];
  sentiment: string;
  score: number;
  rankScore: number;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    slug: string;
    avatar: string | null;
    category: string;
    bio?: string | null;
  };
}

interface BigVApiResponse {
  filters: {
    authors: BigVAuthorFilter[];
    categories: string[];
    tags: string[];
  };
  articles: BigVArticle[];
}

interface BigVCollection {
  author: BigVArticle["author"];
  latestPublishedAt: string;
  latestScore: number;
  articles: BigVArticle[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "获取大V分析失败");
  }
  return json.data as BigVApiResponse;
};

function sentimentLabel(sentiment: string) {
  if (sentiment === "bullish") return { text: "偏多", color: "red" as const };
  if (sentiment === "bearish") return { text: "偏谨慎", color: "green" as const };
  return { text: "中性", color: "default" as const };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-CN");
}

function buildCollections(articles: BigVArticle[]) {
  const grouped = new Map<string, BigVCollection>();

  [...articles]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .forEach((article) => {
      const key = article.author.id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          author: article.author,
          latestPublishedAt: article.publishedAt,
          latestScore: article.score,
          articles: [article],
        });
        return;
      }

      grouped.get(key)?.articles.push(article);
    });

  return [...grouped.values()]
    .map((collection) => ({
      ...collection,
      articles: collection.articles.slice(0, 2),
    }))
    .sort((a, b) => {
      const dateDiff = new Date(b.latestPublishedAt).getTime() - new Date(a.latestPublishedAt).getTime();
      if (dateDiff) {
        return dateDiff;
      }
      return b.latestScore - a.latestScore;
    });
}

function buildCollectionPrompt(collection: BigVCollection) {
  const titles = collection.articles.map((item) => `《${item.title}》`).join("、");
  return `请把 ${collection.author.name} 最近的观点合集做一次通俗总结，重点说明：1）核心判断；2）和上一条相比有什么新增变化；3）更偏多、偏空还是中性；4）普通投资者今天最该关注什么。请综合这些文章：${titles}。`;
}

export default function ExpertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const author = searchParams.get("author")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const tag = searchParams.get("tag")?.trim() ?? "";
  const keyword = searchParams.get("keyword")?.trim() ?? "";

  const updateParams = useCallback((patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
        return;
      }
      params.set(key, value);
    });

    const query = params.toString();
    router.replace(query ? `/experts?${query}` : "/experts");
  }, [router, searchParams]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (author) params.set("author", author);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (keyword) params.set("keyword", keyword);
    params.set("limit", "80");
    return `/api/bigv?${params.toString()}`;
  }, [author, category, tag, keyword]);

  const { data, isLoading, error, mutate } = useSWR(query, fetcher, {
    refreshInterval: 60000,
  });

  const collections = useMemo(() => buildCollections(data?.articles ?? []), [data?.articles]);

  return (
    <div className="page-container experts-page">
      <Card className="dashboard-hero experts-hero" style={{ marginBottom: 16 }}>
        <Text className="hero-eyebrow">观点合集</Text>
        <Title level={2} className="hero-title">大V观点合集</Title>
      </Card>

      <Card className="tech-section-card" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Input.Search
            key={`${author}-${category}-${tag}-${keyword}`}
            allowClear
            defaultValue={keyword}
            placeholder="输入老师名、标题关键词或板块关键词"
            enterButton="搜索"
            onSearch={(value) => updateParams({ keyword: value.trim() })}
          />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Select
              allowClear
              placeholder="按老师筛选"
              value={author || undefined}
              onChange={(value) => updateParams({ author: value ?? "" })}
              options={data?.filters.authors.map((item) => ({
                value: item.name,
                label: `${item.avatar ?? "🧠"} ${item.name}`,
              })) ?? []}
            />
            <Select
              allowClear
              placeholder="按分类筛选"
              value={category || undefined}
              onChange={(value) => updateParams({ category: value ?? "" })}
              options={data?.filters.categories.map((item) => ({ value: item, label: item })) ?? []}
            />
            <Select
              allowClear
              placeholder="按标签筛选"
              value={tag || undefined}
              onChange={(value) => updateParams({ tag: value ?? "" })}
              options={data?.filters.tags.map((item) => ({ value: item, label: item })) ?? []}
            />
          </div>
        </Space>
      </Card>

      {error ? (
        <Alert type="warning" showIcon message="大V分析加载失败" description={error.message} />
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
      ) : collections.length ? (
        <div className="experts-collection-grid">
          {collections.map((collection) => {
            return (
              <Card
                key={collection.author.id}
                className="tech-section-card experts-collection-card"
                title={
                  <div className="experts-collection-card__header-main">
                    <div className="experts-collection-card__author">
                      <span className="experts-collection-card__author-avatar">{collection.author.avatar ?? "🧠"}</span>
                      <div className="experts-collection-card__author-meta">
                        <span className="experts-collection-card__author-name">{collection.author.name}</span>
                        <span className="experts-collection-card__author-desc">最近更新 {formatDate(collection.latestPublishedAt)}</span>
                      </div>
                    </div>
                    <Tag icon={<TeamOutlined />} color="purple">{collection.author.category}</Tag>
                  </div>
                }
                extra={
                  <div className="experts-collection-card__header-extra">
                    <Link href={`/chat?title=${encodeURIComponent(`${collection.author.name}观点合集`)}&prompt=${encodeURIComponent(buildCollectionPrompt(collection))}`}>
                      <Button type="link">交给 AI 解读</Button>
                    </Link>
                  </div>
                }
              >
                <div className="experts-collection-card__list">
                  {collection.articles.map((article, index) => {
                    const sentiment = sentimentLabel(article.sentiment);
                    const isSingle = collection.articles.length === 1;
                    const summaryPreview = truncateText(stripMarkdown(article.summary), isSingle ? 88 : 120);
                    const contentPreview = truncateText(stripMarkdown(article.content), isSingle ? 72 : 96);

                    return (
                      <div key={article.id} className={`experts-collection-item${collection.articles.length === 1 ? " experts-collection-item--single" : ""}`}>
                        <div className="experts-collection-item__top">
                          <div className="experts-collection-item__meta">
                            <Text className="experts-article-card__date">{formatDate(article.publishedAt)}</Text>
                            <Tag color="blue">{article.primaryCategory}</Tag>
                            <Tag color={sentiment.color}>{sentiment.text}</Tag>
                            <Tag icon={<FireOutlined />} color="volcano">热度 {article.score}</Tag>
                            {index === 0 ? <Tag color="red">最新</Tag> : null}
                          </div>
                        </div>

                        <Link href={`/experts/${article.id}`}>
                          <Title level={4} className="experts-collection-item__title">{article.title}</Title>
                        </Link>

                        <Paragraph className="experts-collection-item__summary">{summaryPreview}</Paragraph>
                        <Text className="experts-article-card__preview experts-collection-item__preview">{contentPreview}</Text>

                        <div className="experts-collection-item__tags">
                          {article.tags.slice(0, 5).map((item) => (
                            <Tag key={item}>{item}</Tag>
                          ))}
                        </div>

                        <div className="experts-collection-item__actions">
                          <Link href={`/chat?title=${encodeURIComponent(`${collection.author.name}观点解读`)}&prompt=${encodeURIComponent(`请用通俗方式解读 ${collection.author.name} 在《${article.title}》里的核心判断，并告诉我相对上一条观点有何变化。`)}`}>
                            <Button type="link">交给 AI 解读</Button>
                          </Link>
                          {article.sourceUrl ? (
                            <a href={article.sourceUrl} target="_blank" rel="noreferrer">
                              <Button>原文链接</Button>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="tech-section-card">
          <Empty description="最近三个月内还没有大V文章，先用脚本上传一些内容吧。" />
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <Button onClick={() => mutate()}>重新加载</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
