import chineseArticles from './chinese/index.js';
import englishArticles from './english/index.js';
import programmingArticles from './programming/index.js';

export const articles = {
  chinese: {
    name: "中文",
    icon: "🇨🇳",
    articles: chineseArticles
  },
  english: {
    name: "English",
    icon: "🇬🇧",
    articles: englishArticles
  },
  programming: {
    name: "编程",
    icon: "💻",
    articles: programmingArticles
  }
};

export function getArticleById(articleId) {
  for (const lang of Object.values(articles)) {
    const article = lang.articles.find(a => a.id === articleId);
    if (article) {
      return { ...article, language: lang.name };
    }
  }
  return null;
}
