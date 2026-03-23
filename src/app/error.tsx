"use client";

import { useEffect } from "react";
import { Button, Result } from "antd";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="page-container" style={{ paddingTop: 48 }}>
      <Result
        status="error"
        title="页面加载失败"
        subTitle="刚刚遇到了前端运行异常。您可以先重试一次，如果还是失败，请强制刷新页面。"
        extra={[
          <Button key="retry" type="primary" onClick={() => reset()}>
            重试
          </Button>,
          <Button key="reload" onClick={() => window.location.reload()}>
            强制刷新
          </Button>,
        ]}
      />
    </div>
  );
}
