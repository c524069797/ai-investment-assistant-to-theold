"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Drawer, Empty, FloatButton, Input, List, Tag, Typography, message } from "antd";
import { CompassOutlined, EnterOutlined, SendOutlined } from "@ant-design/icons";
import { NAVIGATION_AGENT_EXAMPLES, NAVIGATION_PAGES, resolveNavigationIntent } from "@/lib/navigation/agent";

const { Text, Title, Paragraph } = Typography;

export default function NavigationAgent() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const [lastResult, setLastResult] = useState<ReturnType<typeof resolveNavigationIntent>>(null);

  const quickPages = useMemo(() => NAVIGATION_PAGES.filter((item) => item.href !== "/login" && item.href !== "/register"), []);

  const navigateTo = (command: string) => {
    const result = resolveNavigationIntent(command);
    setLastCommand(command);
    setLastResult(result);

    if (!result) {
      message.warning("暂时没理解您的导航意图，可以试试“去自选”“打开股票 600519”这种说法。");
      return;
    }

    if (pathname === result.href) {
      message.info(`您已经在${result.title}了`);
      return;
    }

    router.push(result.href);
    message.success(`已前往${result.title}`);
    setOpen(false);
  };

  const handleSubmit = () => {
    if (!input.trim()) {
      return;
    }

    navigateTo(input.trim());
    setInput("");
  };

  return (
    <>
      <FloatButton
        icon={<CompassOutlined />}
        tooltip="导航助手"
        onClick={() => setOpen(true)}
        className="navigation-agent-fab"
      />

      <Drawer
        title={<span className="navigation-agent-drawer__title">导航助手</span>}
        placement="right"
        open={open}
        onClose={() => setOpen(false)}
        width={380}
        className="navigation-agent-drawer"
      >
        <div className="navigation-agent-drawer__body">
          <div className="navigation-agent-panel">
            <Title level={4} style={{ margin: 0 }}>一句话带你到目标页面</Title>
            <Paragraph className="navigation-agent-panel__desc">
              这是一个参考 Page Agent 思路做的轻量导航助手，支持“导航 + 简单页面操作”，例如自动进入股票页搜索关键词、切到指定老师、打开自选第一只股票。
            </Paragraph>

            <div className="navigation-agent-panel__composer">
              <Input
                size="large"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onPressEnter={handleSubmit}
                placeholder="例如：带我去自选股 / 打开 600519 / 我想看大V观点"
              />
              <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit}>执行</Button>
            </div>

            <div className="navigation-agent-panel__examples">
              {NAVIGATION_AGENT_EXAMPLES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="navigation-agent-chip"
                  onClick={() => {
                    setInput(item);
                    navigateTo(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {lastCommand ? (
            lastResult ? (
              <div className="navigation-agent-result">
                <div className="navigation-agent-result__head">
                  <Tag color={lastResult.actionType === "operate" ? "volcano" : "red"}>{lastResult.actionType === "operate" ? "已执行操作" : "已识别"}</Tag>
                  <Text type="secondary">{lastResult.reason}</Text>
                </div>
                <Title level={5} style={{ margin: "6px 0 4px" }}>{lastResult.title}</Title>
                <Text className="navigation-agent-result__desc">{lastResult.description}</Text>
                <div className="navigation-agent-result__path">目标路径：{lastResult.href}</div>
                <Button icon={<EnterOutlined />} onClick={() => navigateTo(lastCommand)}>再次前往</Button>
              </div>
            ) : (
              <div className="navigation-agent-result">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂时没识别出对应页面，请换个更明确的说法。"
                />
              </div>
            )
          ) : null}

          <div className="navigation-agent-panel navigation-agent-panel--secondary">
            <div className="navigation-agent-panel__section-title">快捷入口</div>
            <List
              dataSource={quickPages}
              renderItem={(item) => (
                <List.Item className="navigation-agent-page-item">
                  <button
                    type="button"
                    className="navigation-agent-page-item__btn"
                    onClick={() => navigateTo(item.title)}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <div>{item.description}</div>
                    </div>
                    <EnterOutlined />
                  </button>
                </List.Item>
              )}
            />
          </div>
        </div>
      </Drawer>
    </>
  );
}
