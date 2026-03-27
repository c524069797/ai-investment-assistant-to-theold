import { expect, test } from "@playwright/test";
import { mockAppApi } from "./support/mock-app";

test.describe("ai-investment-assistant web flows", () => {
  test("用户登录后进入首页", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: false, initialWatchlist: [] });

    await page.goto("/login");
    await page.getByText("爸爸", { exact: true }).click();
    await page.getByPlaceholder("请输入密码").fill("123456");
    await page.getByRole("button", { name: /登\s*录/ }).click();

    await page.waitForURL("/");
    await expect(page.getByText("爸爸的a股智能投资助手")).toBeVisible();
    await expect(page.getByText("A股实时指数")).toBeVisible();
  });

  test("股票搜索后可打开详情并加入自选", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: true, initialWatchlist: [] });

    await page.goto("/stocks");
    await page.getByPlaceholder("输入股票代码或名称，如 600519 或 贵州茅台").fill("贵州茅台");
    await page.keyboard.press("Enter");

    await expect(page.getByText("搜索结果：贵州茅台")).toBeVisible();

    const popupPromise = page.waitForEvent("popup");
    await page.locator('a[href="/stocks/600519?market=1"]').first().click();
    const popup = await popupPromise;

    await popup.waitForLoadState("domcontentloaded");
    await expect(popup.getByRole("heading", { name: "贵州茅台" })).toBeVisible();
    await popup.getByRole("button", { name: "加自选" }).click();

    await expect(popup.getByRole("button", { name: "已自选" })).toBeVisible();
  });

  test("基金搜索后可进入详情页查看关键信息", async ({ page, context }) => {
    await mockAppApi(context, { startLoggedIn: true, initialWatchlist: [] });

    await page.goto("/funds");
    await page.getByPlaceholder("输入基金代码或名称，如 110011").fill("白酒基金");
    await page.keyboard.press("Enter");

    await expect(page.getByText("搜索结果：白酒基金")).toBeVisible();
    await page.locator('a[href="/funds/161725"]').first().click();

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
    await expect(page.getByText("历史对话", { exact: true })).toBeVisible();
    await page.getByPlaceholder("请输入您的问题...").fill("帮我看看贵州茅台现在怎么样？");
    await page.getByRole("button", { name: "发送" }).click();

    await expect(page.getByText("根据当前模拟数据，贵州茅台技术面偏多，但仍要注意仓位控制与风险提示。")).toBeVisible();
  });
});
