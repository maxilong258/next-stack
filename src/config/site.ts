export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  lang: "zh-CN",
  name: "NextStack",
  description: "Pure thoughts, simple stories.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  copyRight: "© 2025 maxilong",
  socialLinks: [
    {
      icon: 'github',
      link: 'https://github.com/maxilong258'
    },
    {
      icon: 'twitter',
      link: 'https://x.com/maxilong1234'
    },
  ],
};