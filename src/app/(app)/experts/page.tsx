"use client";

import { useMemo, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  FireOutlined,
  TeamOutlined,
  MessageOutlined,
  LinkOutlined,
  CalendarOutlined,
  EyeOutlined,
} from "@ant-design/icons";
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "获取大V分析失败");
  }
  return json.data as BigVApiResponse;
};

function sentimentLabel(sentiment: string) {
  if (sentiment === "bullish") return { text: "偏多", color: "error" as const };
  if (sentiment === "bearish") return { text: "偏谨慎", color: "success" as const };
  return { text: "中性", color: "default" as const };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAIPrompt(article: BigVArticle) {
  return `请用通俗方式解读 ${article.author.name} 在《${article.title}》里的核心判断，并告诉我这篇文章对普通投资者有什么启示。`;
}

export default function ExpertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const author = searchParams.get("author")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const tag = searchParams.get("tag")?.trim() ?? "";
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const updateParams = useCallback(
    (patch: Record<string, string>) => {
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
    },
    [router, searchParams],
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (author) params.set("author", author);
    if (category) params.set("category", category);
    if (tag) params.set("tag", tag);
    if (keyword) params.set("keyword", keyword);
    params.set("limit", "200");
    return `/api/bigv?${params.toString()}`;
  }, [author, category, tag, keyword]);

  const { data, isLoading, error, mutate } = useSWR(query, fetcher, {
    refreshInterval: 60000,
  });

  const articles = data?.articles ?? [];

  const columns = useMemo(
    () => [
      {
        title: "文章标题",
        dataIndex: "title",
        key: "title",
        width: 320,
        render: (_: string, record: BigVArticle) => (
          <div className="experts-table-title">
            <Link href={`/experts/${record.id}`} className="experts-table-title__link">
              <span className="experts-table-title__text">{record.title}</span>
            </Link>
            <div className="experts-table-title__tags">
              {record.tags.slice(0, 3).map((t) => (
                <Tag key={t} className="experts-table-tag">
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        ),
      },
      {
        title: "作者",
        dataIndex: "author",
        key: "author",
        width: 140,
        render: (author: BigVArticle["author"]) => (
          <div className="experts-table-author">
            <span className="experts-table-author__avatar">{author.avatar ?? "🧠"}</span>
            <div className="experts-table-author__meta">
              <span className="experts-table-author__name">{author.name}</span>
              <Tag color="purple" className="experts-table-author__category">
                {author.category}
              </Tag>
            </div>
          </div>
        ),
      },
      {
        title: "分类",
        dataIndex: "primaryCategory",
        key: "primaryCategory",
        width: 110,
        render: (cat: string) => (
          <Tag color="blue" className="experts-table-category">
            {cat}
          </Tag>
        ),
      },
      {
        title: "情感",
        dataIndex: "sentiment",
        key: "sentiment",
        width: 90,
        render: (sentiment: string) => {
          const s = sentimentLabel(sentiment);
          return (
            <Tag color={s.color} className="experts-table-sentiment">
              {s.text}
            </Tag>
          );
        },
      },
      {
        title: "热度",
        dataIndex: "score",
        key: "score",
        width: 90,
        sorter: (a: BigVArticle, b: BigVArticle) => a.score - b.score,
        render: (score: number) => (
          <Tag icon={<FireOutlined />} color="volcano" className="experts-table-score">
            {score}
          </Tag>
        ),
      },
      {
        title: "发布时间",
        dataIndex: "publishedAt",
        key: "publishedAt",
        width: 130,
        sorter: (a: BigVArticle, b: BigVArticle) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
        defaultSortOrder: "descend" as const,
        render: (date: string) => (
          <span className="experts-table-date">
            <CalendarOutlined style={{ marginRight: 4 }} />
            {formatDate(date)}
          </span>
        ),
      },
      {
        title: "操作",
        key: "actions",
        width: 160,
        fixed: "right" as const,
        render: (_: unknown, record: BigVArticle) => (
          <Space size={4} wrap>
            <Link
              href={`/chat?title=${encodeURIComponent(`${record.author.name}观点解读`)}&prompt=${encodeURIComponent(buildAIPrompt(record))}`}
            >
              <Button type="link" size="small" icon={<MessageOutlined />} className="experts-table-action">
                AI解读
              </Button>
            </Link>
            {record.sourceUrl ? (
              <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                <Button type="link" size="small" icon={<LinkOutlined />} className="experts-table-action">
                  原文
                </Button>
              </a>
            ) : null}
          </Space>
        ),
      },
    ],
    [],
  );

  const expandable = useMemo(
    () => ({
      expandedRowKeys,
      onExpandedRowsChange: (keys: readonly React.Key[]) => setExpandedRowKeys(keys as string[]),
      expandedRowRender: (record: BigVArticle) => (
        <div className="experts-table-expand">
          <Paragraph className="experts-table-expand__summary">
            <strong>摘要：</strong>
            {record.summary}
          </Paragraph>
          <Paragraph className="experts-table-expand__content">
            <strong>预览：</strong>
            {truncateText(stripMarkdown(record.content), 200)}
          </Paragraph>
          <Space size={12}>
            <Link href={`/experts/${record.id}`}>
              <Button type="primary" size="small" icon={<EyeOutlined />}>
                查看全文
              </Button>
            </Link>
            <Link
              href={`/chat?title=${encodeURIComponent(`${record.author.name}观点合集`)}&prompt=${encodeURIComponent(`请综合分析 ${record.author.name} 的观点，结合这篇文章《${record.title}》的核心判断。`)}`}
            >
              <Button size="small" icon={<TeamOutlined />}>
                合集解读
              </Button>
            </Link>
          </Space>
        </div>
      ),
      rowExpandable: () => true,
    }),
    [expandedRowKeys],
  );

  const uniqueAuthors = useMemo(() => {
    const map = new Map<string, BigVArticle["author"]>();
    articles.forEach((a) => map.set(a.author.id, a.author));
    return [...map.values()];
  }, [articles]);

  return (
    <div className="page-container experts-page">
      <Card className="dashboard-hero experts-hero" style={{ marginBottom: 16 }}>
        <div className="experts-hero__top">
          <div className="experts-hero__left">
            <Text className="hero-eyebrow">观点合集</Text>
            <Title level={2} className="hero-title">
              大V观点追踪
            </Title>
            <Paragraph className="hero-subtitle" style={{ marginBottom: 0 }}>
              表格展示、可排序筛选、展开看摘要、一键 AI 解读。
            </Paragraph>
          </div>
          <div className="experts-hero__stats">
            <Tag color="red">最近 3 个月</Tag>
            <Tag color="purple">{uniqueAuthors.length} 位作者</Tag>
            <Tag color="blue">{articles.length} 篇文章</Tag>
          </div>
        </div>
      </Card>

      {error ? (
        <Alert type="warning" showIcon message="大V分析加载失败" description={error.message} />
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : articles.length ? (
        <Card className="tech-section-card experts-table-card">
          <Table
            dataSource={articles}
            columns={columns}
            rowKey="id"
            expandable={expandable}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ["10", "15", "30", "50"],
              showTotal: (total) => `共 ${total} 篇文章`,
            }}
            scroll={{ x: 900 }}
            className="experts-table"
            size="middle"
            title={() => (
              <div className="experts-table-toolbar">
                <div className="experts-table-toolbar__search">
                  <Input.Search
                    key={`${author}-${category}-${tag}-${keyword}`}
                    allowClear
                    defaultValue={keyword}
                    placeholder="输入老师名、标题关键词或板块关键词"
                    enterButton="搜索"
                    onSearch={(value) => updateParams({ keyword: value.trim() })}
                  />
                </div>
                <div className="experts-table-toolbar__filters">
                  <Select
                    allowClear
                    placeholder="按作者"
                    value={author || undefined}
                    onChange={(value) => updateParams({ author: value ?? "" })}
                    options={data?.filters.authors.map((item) => ({
                      value: item.name,
                      label: `${item.avatar ?? "🧠"} ${item.name}`,
                    })) ?? []}
                  />
                  <Select
                    allowClear
                    placeholder="按分类"
                    value={category || undefined}
                    onChange={(value) => updateParams({ category: value ?? "" })}
                    options={data?.filters.categories.map((item) => ({ value: item, label: item })) ?? []}
                  />
                  <Select
                    allowClear
                    placeholder="按标签"
                    value={tag || undefined}
                    onChange={(value) => updateParams({ tag: value ?? "" })}
                    options={data?.filters.tags.map((item) => ({ value: item, label: item })) ?? []}
                  />
                </div>
              </div>
            )}
          />
        </Card>
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
