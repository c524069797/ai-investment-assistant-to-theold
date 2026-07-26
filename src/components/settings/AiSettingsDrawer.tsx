"use client";

import { useState } from "react";
import { App, Alert, AutoComplete, Button, Drawer, Form, Input, Select, Space, Tag, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useAiModelConfig } from "@/lib/hooks/useAiModelConfig";
import {
  AI_PROVIDER_OPTIONS,
  buildDefaultClientAiModelConfig,
  parseClientAiModelConfig,
  type ClientAiModelConfig,
} from "@/lib/ai/model-config";

const { Paragraph, Text, Title } = Typography;

const COMMON_MODEL_OPTIONS = [
  "gpt-4.1",
  "gpt-4o",
  "gpt-5.4",
  "Qwen/Qwen2.5-7B-Instruct",
  "Qwen/Qwen3-8B",
  "deepseek-ai/DeepSeek-V3",
].map((value) => ({ value }));

export default function AiSettingsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const { config, saveConfig, resetConfig, hasCustomConfig } = useAiModelConfig();
  const [draft, setDraft] = useState<ClientAiModelConfig>(config);

  const updateDraft = <K extends keyof ClientAiModelConfig>(key: K, value: ClientAiModelConfig[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    const parsed = parseClientAiModelConfig(draft);
    if (!parsed) {
      message.error("AI 配置格式不正确，请检查后再保存。");
      return;
    }

    saveConfig(parsed);
    message.success(parsed.apiKey ? "AI 配置已保存，本地配置会优先覆盖服务端默认值。" : "AI 配置已保存，当前会继续回退到服务端默认配置。");
    onClose();
  };

  const handleReset = () => {
    const defaults = buildDefaultClientAiModelConfig();
    resetConfig();
    setDraft(defaults);
    message.success("已恢复为默认模型配置。");
  };

  return (
    <Drawer
      title={(
        <span className="ai-settings-drawer__title">
          <SettingOutlined />
          <span>设置</span>
        </span>
      )}
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
      afterOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(config);
        }
      }}
      className="ai-settings-drawer"
    >
      <div className="ai-settings-drawer__body">
        <div className="ai-settings-panel">
          <div className="ai-settings-panel__head">
            <div>
              <Text className="ai-settings-panel__eyebrow">AI 配置</Text>
              <Title level={4} style={{ margin: 0 }}>本地模型接入</Title>
            </div>
            {hasCustomConfig ? <Tag color="red">优先使用本地配置</Tag> : <Tag>使用默认配置</Tag>}
          </div>

          <Paragraph className="ai-settings-panel__desc">
            API Key 仅保存在当前浏览器本地。保存后，聊天页、晨报和 Agent 工作台会优先使用这里的模型配置。
          </Paragraph>

          <Alert
            type="info"
            showIcon
            message="当前仅接入 OpenAI Compatible 协议"
            description="如果你使用的是第三方中转、硅基流动、OpenRouter 或自建兼容网关，只要它兼容 OpenAI Chat Completions 接口即可。"
          />

          <Form layout="vertical" className="ai-settings-form">
            <Form.Item label="模型协议">
              <Select
                value={draft.provider}
                options={[...AI_PROVIDER_OPTIONS]}
                onChange={(value) => updateDraft("provider", value as ClientAiModelConfig["provider"])}
              />
            </Form.Item>

            <Form.Item label="API Key">
              <Input.Password
                value={draft.apiKey}
                onChange={(event) => updateDraft("apiKey", event.target.value)}
                placeholder="例如：sk-xxxx"
              />
            </Form.Item>

            <Form.Item label="API 地址">
              <Input
                value={draft.baseUrl}
                onChange={(event) => updateDraft("baseUrl", event.target.value)}
                placeholder="例如：https://api.siliconflow.cn/v1"
              />
            </Form.Item>

            <Form.Item label="默认模型">
              <AutoComplete
                value={draft.model}
                options={COMMON_MODEL_OPTIONS}
                onChange={(value) => updateDraft("model", value)}
                placeholder="例如：gpt-5.4"
                filterOption={(inputValue, option) => (option?.value ?? "").toLowerCase().includes(inputValue.toLowerCase())}
              />
            </Form.Item>

            <Form.Item label="备选模型">
              <AutoComplete
                value={draft.fallbackModel}
                options={COMMON_MODEL_OPTIONS}
                onChange={(value) => updateDraft("fallbackModel", value)}
                placeholder="主模型失败时自动尝试"
                filterOption={(inputValue, option) => (option?.value ?? "").toLowerCase().includes(inputValue.toLowerCase())}
              />
            </Form.Item>
          </Form>

          <Space wrap>
            <Button type="primary" onClick={handleSave}>保存配置</Button>
            <Button onClick={handleReset}>恢复默认</Button>
          </Space>
        </div>
      </div>
    </Drawer>
  );
}
