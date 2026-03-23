"use client";

import { Card, Tag, Typography } from "antd";
import Link from "next/link";

const { Title, Text } = Typography;

interface LessonCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  completed?: boolean;
}

export default function LessonCard({ id, title, description, icon, order, completed }: LessonCardProps) {
  return (
    <Link href={`/education/${id}`} className="education-lesson-link">
      <Card hoverable className="education-lesson-card" styles={{ body: { padding: 20, height: "100%" } }}>
        <div className="education-lesson-card__head">
          <div className="education-lesson-card__icon">{icon}</div>
          <div className="education-lesson-card__tags">
            <Tag color="red">第{order}课</Tag>
            {completed ? <Tag color="green">已学习</Tag> : <Tag>待学习</Tag>}
          </div>
        </div>

        <Title level={4} className="education-lesson-card__title">{title}</Title>
        <Text className="education-lesson-card__desc">{description}</Text>

        <div className="education-lesson-card__footer">
          <span>查看课程</span>
          <span>→</span>
        </div>
      </Card>
    </Link>
  );
}
