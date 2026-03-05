"use client";

import { Card, Typography, Tag } from "antd";
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
    <Link href={`/education/${id}`}>
      <Card
        hoverable
        style={{ height: "100%" }}
        styles={{ body: { padding: "20px 24px" } }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <span style={{ fontSize: 40 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Tag color="blue">第{order}课</Tag>
              {completed && <Tag color="green">已学习</Tag>}
            </div>
            <Title level={5} style={{ margin: "4px 0", fontSize: 18 }}>
              {title}
            </Title>
            <Text style={{ color: "#666", fontSize: 15 }}>{description}</Text>
          </div>
        </div>
      </Card>
    </Link>
  );
}
