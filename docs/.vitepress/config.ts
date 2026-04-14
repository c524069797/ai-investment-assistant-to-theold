import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 投资助手',
  description: 'AI 投资助手项目资料与文档',
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href:
          'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap'
      }
    ]
  ],
  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
    siteTitle: 'AI 投资助手',
    outline: [2, 3],
    nav: [
      { text: '首页', link: '/' },
      { text: '项目总览', link: '/项目总览' },
      { text: '留言板', link: '/留言板' }
    ],
    sidebar: [
      {
        text: '项目',
        items: [
          { text: '项目总览', link: '/项目总览' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/c524069797/ai-investment-assistant-to-theold' }
    ],
    footer: {
      message: '由 VitePress 驱动',
      copyright: '© ' + new Date().getFullYear() + ' AI 投资助手'
    }
  }
})
