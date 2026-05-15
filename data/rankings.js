const RANKING_KEY = 'typing_game_rankings';

export function getRankings(articleId) {
  const allRankings = getAllRankings();
  return allRankings[articleId] || [];
}

export function getAllRankings() {
  try {
    const data = localStorage.getItem(RANKING_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveScore(articleId, playerName, wpm, accuracy, time) {
  const allRankings = getAllRankings();
  if (!allRankings[articleId]) {
    allRankings[articleId] = [];
  }
  
  const score = {
    playerName,
    wpm,
    accuracy,
    time,
    date: new Date().toISOString().split('T')[0]
  };
  
  allRankings[articleId].push(score);
  allRankings[articleId].sort((a, b) => b.wpm - a.wpm);
  allRankings[articleId] = allRankings[articleId].slice(0, 10);
  
  localStorage.setItem(RANKING_KEY, JSON.stringify(allRankings));
  return allRankings[articleId];
}

export function clearRankings() {
  localStorage.removeItem(RANKING_KEY);
}
