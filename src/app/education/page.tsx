"use client";

import { Typography, Row, Col } from "antd";
import { LESSONS } from "@/lib/constants/education";
import LessonCard from "@/components/education/LessonCard";

const { Title, Text } = Typography;

export default function EducationPage() {
  const sorted = [...LESSONS].sort((a, b) => a.order - b.order);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>📚 投资学堂</Title>
        <Text style={{ fontSize: 16, color: "#666" }}>
          从零开始学投资，用最简单的语言帮您理解投资知识
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {sorted.map((lesson) => (
          <Col xs={24} sm={12} md={8} key={lesson.id}>
            <LessonCard
              id={lesson.id}
              title={lesson.title}
              description={lesson.description}
              icon={lesson.icon}
              order={lesson.order}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
}
