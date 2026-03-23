"use client";

import { Card, Tag, Typography } from "antd";
import { LESSONS } from "@/lib/constants/education";
import LessonCard from "@/components/education/LessonCard";

const { Title, Text, Paragraph } = Typography;

export default function EducationPage() {
  const sorted = [...LESSONS].sort((a, b) => a.order - b.order);
  const beginnerLessons = sorted.slice(0, 3);
  const latestLesson = sorted[sorted.length - 1];

  return (
    <div className="page-container education-page">
      <Card className="dashboard-hero education-hero" style={{ marginBottom: 16 }}>
        <div className="education-hero__grid">
          <div className="education-hero__main">
            <Text className="hero-eyebrow">investment academy</Text>
            <Title level={2} className="hero-title">投资学堂</Title>
            <Paragraph className="hero-subtitle">
              从入门到实战，按顺序学就行。
            </Paragraph>
            <div className="education-hero__tags">
              <Tag color="red">从零开始</Tag>
              <Tag color="volcano">通俗讲解</Tag>
              <Tag color="orange">边学边看盘</Tag>
            </div>
          </div>

          <div className="education-stats-grid">
            <div className="education-stat-card">
              <span className="education-stat-card__label">课程总数</span>
              <strong className="education-stat-card__value">{sorted.length}</strong>
              <span className="education-stat-card__hint">覆盖入门到进阶</span>
            </div>
            <div className="education-stat-card">
              <span className="education-stat-card__label">建议起点</span>
              <strong className="education-stat-card__value">第{beginnerLessons[0]?.order ?? 1}课</strong>
              <span className="education-stat-card__hint">先打基础再做实战</span>
            </div>
            <div className="education-stat-card education-stat-card--wide">
              <span className="education-stat-card__label">最近课程</span>
              <strong className="education-stat-card__value education-stat-card__value--small">{latestLesson?.title ?? "持续更新中"}</strong>
              <span className="education-stat-card__hint">建议学完基础后继续进阶</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="education-highlight-grid" style={{ marginBottom: 16 }}>
        {beginnerLessons.map((lesson) => (
          <Card key={lesson.id} className="education-highlight-card">
            <div className="education-highlight-card__top">
              <span className="education-highlight-card__icon">{lesson.icon}</span>
              <Tag color="red">第{lesson.order}课</Tag>
            </div>
            <Title level={4} style={{ margin: "8px 0 6px" }}>{lesson.title}</Title>
            <Text type="secondary">{lesson.description}</Text>
          </Card>
        ))}
      </div>

      <div className="education-section-header">
        <Title level={3} style={{ margin: 0 }}>全部课程</Title>
        <Tag color="red">共 {sorted.length} 节</Tag>
      </div>

      <div className="education-lessons-grid">
        {sorted.map((lesson) => (
          <LessonCard
            key={lesson.id}
            id={lesson.id}
            title={lesson.title}
            description={lesson.description}
            icon={lesson.icon}
            order={lesson.order}
          />
        ))}
      </div>
    </div>
  );
}
