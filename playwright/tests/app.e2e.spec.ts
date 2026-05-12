import { expect, test } from "@playwright/test";
import { mockAppApi } from "./support/mock-app";

test.describe("ai-investment-assistant web flows", () => {
  test("首次访问无登录记录时进入游客模式", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: false, initialWatchlist: [] });

    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(page.getByText("游客模式")).toBeVisible();
    await expect(page.getByRole("heading", { name: "今天先看什么？" })).toBeVisible();
    await expect(page.getByText("登录后接收全球隔夜市场分析").first()).toBeVisible();

    await page.goto("/chat");
    await expect(page.getByText("游客模式可浏览，登录后开启 AI 对话")).toBeVisible();
    await expect(page.getByRole("link", { name: "选择身份登录" })).toBeVisible();
  });

  test("用户登录后进入首页", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: false, initialWatchlist: [] });

    await page.goto("/login");
    await page.getByText("爸爸", { exact: true }).click();

    await page.waitForURL("/");
    await expect(page.getByText("👨 爸爸")).toBeVisible();
    await expect(page.getByRole("heading", { name: "今天先看什么？" })).toBeVisible();
    await expect(page.getByText("全球隔夜市场与财经新闻分析").first()).toBeVisible();
    await expect(page.getByText("晨报协调 Agent").first()).toBeVisible();
  });

  test("登录后可退出并回到游客浏览状态", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: true, initialWatchlist: [] });

    await page.goto("/");
    await expect(page.getByText("👨 爸爸")).toBeVisible();

    await page.getByRole("button", { name: "退出" }).click();
    await page.waitForURL("/?mode=guest");

    await expect(page.getByText("游客模式")).toBeVisible();
    await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
  });

  test("股票搜索后可打开详情并加入自选", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: true, initialWatchlist: [] });

    await page.goto("/stocks");
    await page.getByPlaceholder("输入股票代码或名称，如 600519 或 贵州茅台").fill("贵州茅台");
    await page.keyboard.press("Enter");

    await expect(page.getByText("搜索结果：贵州茅台")).toBeVisible();

    await page.locator(".ant-card").filter({ hasText: "贵州茅台" }).filter({ hasText: "加入自选" }).last().click({ position: { x: 24, y: 24 } });

    await page.waitForURL(/\/stocks\/600519\?market=1$/);
    await expect(page.getByRole("heading", { name: "贵州茅台" })).toBeVisible();
    await page.getByRole("button", { name: "加自选" }).click();

    await expect(page.getByRole("button", { name: "已自选" })).toBeVisible();
  });

  test("基金搜索后可进入详情页查看关键信息", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: true, initialWatchlist: [] });

    await page.goto("/funds");
    await page.getByPlaceholder("输入基金代码或名称，如 110011").fill("白酒基金");
    await page.keyboard.press("Enter");

    await expect(page.getByText("搜索结果：白酒基金")).toBeVisible();
    await page.locator(".ant-card").filter({ hasText: "招商中证白酒指数" }).filter({ hasText: "加入自选" }).last().click({ position: { x: 24, y: 24 } });

    await page.waitForURL(/\/funds\/161725$/);
    await expect(page.getByRole("heading", { name: "招商中证白酒指数" })).toBeVisible();
    await expect(page.getByText("前十大持仓股")).toBeVisible();
    await expect(page.getByText("基金经理")).toBeVisible();
  });

  test("聊天页可发送问题并收到AI响应", async ({ page, context }) => {
    await mockAppApi(context, {
      startLoggedIn: true,
      initialWatchlist: [],
      chatReply: "根据当前模拟数据，贵州茅台技术面偏多，但仍要注意仓位控制与风险提示。",
    });

    await page.goto("/chat");
    await expect(page.getByText("对话记录", { exact: true })).toBeVisible();
    await page.getByPlaceholder("输入问题、股票代码，或者想看的老师观点...").fill("帮我看看贵州茅台现在怎么样？");
    await page.getByRole("button", { name: "发送" }).click();

    await expect(page.getByText("根据当前模拟数据，贵州茅台技术面偏多，但仍要注意仓位控制与风险提示。").last()).toBeVisible();
  });
});
