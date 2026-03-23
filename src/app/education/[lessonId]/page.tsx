"use client";

import { use, useMemo } from "react";
import { Typography, Card, Button, Divider, Space } from "antd";
import { ArrowLeftOutlined, RobotOutlined } from "@ant-design/icons";
import Link from "next/link";
import { getLessonById } from "@/lib/constants/education";
import { getChartsForLesson } from "@/lib/constants/education-charts";
import Quiz from "@/components/education/Quiz";
import LessonChart from "@/components/education/LessonChart";
import type { LessonChart as LessonChartType } from "@/types/education";

const { Title, Text, Paragraph } = Typography;

export default function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const lesson = getLessonById(lessonId);
  const charts = useMemo(() => getChartsForLesson(lessonId), [lessonId]);

  const chartMap = useMemo(() => {
    const map = new Map<string, LessonChartType>();
    const allCharts = [...charts, ...(lesson?.charts ?? [])];
    for (const chart of allCharts) {
      map.set(chart.id, chart);
    }
    return map;
  }, [charts, lesson?.charts]);

  if (!lesson) {
    return (
      <div className="page-container" style={{ textAlign: "center", padding: 60 }}>
        <Text>未找到该课程</Text>
        <br />
        <Link href="/education">
          <Button type="link">返回课程列表</Button>
        </Link>
      </div>
    );
  }

  // Enhanced markdown-like rendering with code blocks and chart support
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];

    const flushTable = () => {
      if (tableHeaders.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} style={{ overflowX: "auto", margin: "16px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
              <thead>
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        border: "1px solid #f0f0f0",
                        padding: "10px 12px",
                        background: "#fafafa",
                        textAlign: "left",
                      }}
                    >
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{ border: "1px solid #f0f0f0", padding: "10px 12px" }}
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
      }
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    };

    const flushCodeBlock = () => {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          style={{
            background: "#1e1e2e",
            color: "#cdd6f4",
            padding: "16px 20px",
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.6,
            overflowX: "auto",
            margin: "12px 0",
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          }}
        >
          {codeLines.join("\n")}
        </pre>,
      );
      codeLines = [];
      inCodeBlock = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block handling
      if (line.trimStart().startsWith("```")) {
        if (inCodeBlock) {
          flushCodeBlock();
        } else {
          if (inTable) flushTable();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Chart marker: {{chart:chartId}}
      const chartMatch = line.trim().match(/^\{\{chart:(.+?)\}\}$/);
      if (chartMatch) {
        if (inTable) flushTable();
        const chartId = chartMatch[1];
        const chart = chartMap.get(chartId);
        if (chart) {
          elements.push(
            <LessonChart key={`chart-${chartId}`} title={chart.title} option={chart.option} />,
          );
        }
        continue;
      }

      // Table detection
      if (line.startsWith("|") && line.endsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableHeaders = line.split("|").filter(Boolean);
        } else if (line.includes("---")) {
          continue; // Separator
        } else {
          tableRows.push(line.split("|").filter(Boolean));
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      if (line.startsWith("# ")) {
        elements.push(
          <Title key={i} level={2} style={{ marginTop: 24 }}>
            {line.slice(2)}
          </Title>,
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <Title key={i} level={3} style={{ marginTop: 20 }}>
            {line.slice(3)}
          </Title>,
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <Title key={i} level={4} style={{ marginTop: 16 }}>
            {line.slice(4)}
          </Title>,
        );
      } else if (line.startsWith("- **")) {
        const boldMatch = line.match(/- \*\*(.+?)\*\*[：:]?\s*(.*)/);
        if (boldMatch) {
          elements.push(
            <Paragraph key={i} style={{ fontSize: 16, marginBottom: 8, paddingLeft: 16 }}>
              • <strong>{boldMatch[1]}</strong>
              {boldMatch[2] ? `：${boldMatch[2]}` : ""}
            </Paragraph>,
          );
        }
      } else if (line.startsWith("- ")) {
        elements.push(
          <Paragraph key={i} style={{ fontSize: 16, marginBottom: 8, paddingLeft: 16 }}>
            • {line.slice(2)}
          </Paragraph>,
        );
      } else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s\*\*(.+?)\*\*[：:]?\s*(.*)/);
        if (match) {
          elements.push(
            <Paragraph key={i} style={{ fontSize: 16, marginBottom: 8, paddingLeft: 16 }}>
              {match[1]}. <strong>{match[2]}</strong>
              {match[3] ? `：${match[3]}` : ""}
            </Paragraph>,
          );
        } else {
          elements.push(
            <Paragraph key={i} style={{ fontSize: 16, marginBottom: 8, paddingLeft: 16 }}>
              {line}
            </Paragraph>,
          );
        }
      } else if (line.trim()) {
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        elements.push(
          <p
            key={i}
            style={{ fontSize: 16, lineHeight: 1.8, margin: "0 0 14px" }}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />,
        );
      }
    }

    if (inCodeBlock) flushCodeBlock();
    if (inTable) flushTable();

    return elements;
  };

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }}>
        <Link href="/education">
          <Button icon={<ArrowLeftOutlined />}>返回课程</Button>
        </Link>
      </Space>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>{lesson.icon}</span>
          <div>
            <Title level={3} style={{ margin: 0 }}>{lesson.title}</Title>
            <Text style={{ color: "#666", fontSize: 16 }}>{lesson.description}</Text>
          </div>
        </div>
        <Divider />
        <div>{renderContent(lesson.content)}</div>
      </Card>

      {/* Quiz */}
      {lesson.quiz.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>📝 课后小测验</Title>
          <Quiz questions={lesson.quiz} />
        </div>
      )}

      {/* Ask AI */}
      <Card style={{ textAlign: "center" }}>
        <RobotOutlined style={{ fontSize: 40, color: "#1677ff", marginBottom: 8 }} />
        <Title level={4}>还有疑问？问问 AI 老师</Title>
        <Text style={{ fontSize: 16, color: "#666", display: "block", marginBottom: 16 }}>
          关于「{lesson.title}」的任何问题，小智都可以帮您解答
        </Text>
        <Link href="/chat">
          <Button type="primary" size="large" icon={<RobotOutlined />}>
            问 AI 老师
          </Button>
        </Link>
      </Card>
    </div>
  );
}
