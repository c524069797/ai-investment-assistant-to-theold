"use client";

import { useState } from "react";
import { Card, Button, Typography, Space, Alert } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { QuizQuestion } from "@/types/education";

const { Title, Text } = Typography;

interface QuizProps {
  questions: QuizQuestion[];
  onComplete?: () => void;
}

export default function Quiz({ questions, onComplete }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) return null;

  const current = questions[currentIndex];
  const isCorrect = selectedIndex === current.correctIndex;

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
    setShowResult(true);
    if (index === current.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setShowResult(false);
    } else {
      setFinished(true);
      onComplete?.();
    }
  };

  if (finished) {
    return (
      <Card style={{ textAlign: "center", padding: 24 }}>
        <Title level={3}>🎉 测验完成！</Title>
        <Text style={{ fontSize: 20 }}>
          您答对了 {correctCount}/{questions.length} 题
        </Text>
        <br />
        <Text style={{ fontSize: 16, color: "#666", marginTop: 8, display: "block" }}>
          {correctCount === questions.length
            ? "太棒了，全部正确！"
            : correctCount >= questions.length / 2
              ? "很不错，继续加油！"
              : "别灰心，多看几遍课程内容就好了！"}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">
          第 {currentIndex + 1}/{questions.length} 题
        </Text>
      </div>
      <Title level={4} style={{ marginBottom: 20 }}>
        {current.question}
      </Title>

      <Space orientation="vertical" style={{ width: "100%" }} size={12}>
        {current.options.map((option, index) => {
          let buttonType: "default" | "primary" | "dashed" = "default";
          let borderColor: string | undefined;

          if (showResult) {
            if (index === current.correctIndex) {
              borderColor = "#52c41a";
            } else if (index === selectedIndex && !isCorrect) {
              borderColor = "#ff4d4f";
            }
          } else if (index === selectedIndex) {
            buttonType = "primary";
          }

          return (
            <Button
              key={index}
              block
              size="large"
              type={buttonType}
              style={{
                height: "auto",
                minHeight: 52,
                whiteSpace: "normal",
                textAlign: "left",
                fontSize: 16,
                padding: "12px 20px",
                borderColor,
                borderWidth: borderColor ? 2 : 1,
              }}
              onClick={() => handleSelect(index)}
              icon={
                showResult && index === current.correctIndex ? (
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                ) : showResult && index === selectedIndex && !isCorrect ? (
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                ) : null
              }
            >
              {option}
            </Button>
          );
        })}
      </Space>

      {showResult && (
        <>
          <Alert
            style={{ marginTop: 16 }}
            type={isCorrect ? "success" : "error"}
            title={isCorrect ? "回答正确！" : "回答错误"}
            description={current.explanation}
            showIcon
          />
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button type="primary" size="large" onClick={handleNext}>
              {currentIndex < questions.length - 1 ? "下一题" : "完成测验"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
