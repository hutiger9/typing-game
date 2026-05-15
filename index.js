import { initTheme, toggleTheme } from './theme.js';
import { articles } from './data/articles/index.js';
import { getRankings } from './data/rankings.js';
import { isSynced, getLastSyncTime, syncRankings, saveToken, unsync } from './data/gist-sync.js';

const languageGrid = document.getElementById('languageGrid');
const articleSection = document.getElementById('articleSection');
const articleList = document.getElementById('articleList');
const rankingSection = document.getElementById('rankingSection');
const rankingList = document.getElementById('rankingList');
const backBtn = document.getElementById('backBtn');
const rankingBackBtn = document.getElementById('rankingBackBtn');

let currentLanguage = null;

// --- Mode selector ---
let currentModeArticleId = null;

function showModeSelector(articleId) {
  currentModeArticleId = articleId;
  document.getElementById('modeModal').style.display = 'flex';
}

function hideModeSelector() {
  document.getElementById('modeModal').style.display = 'none';
  currentModeArticleId = null;
}

function startGameWithMode(mode) {
  if (currentModeArticleId) {
    window.location.href = `game.html?id=${currentModeArticleId}&mode=${mode}`;
  }
}

// --- Settings panel ---
function initSettings() {
  const settingsBtn = document.getElementById('settingsBtn');
  const panel = document.getElementById('settingsPanel');
  const closeBtn = document.getElementById('settingsCloseBtn');
  const saveTokenBtn = document.getElementById('saveTokenBtn');
  const syncBtn = document.getElementById('syncBtn');
  const unsyncBtn = document.getElementById('unsyncBtn');
  const tokenInput = document.getElementById('gistToken');
  const gistStatus = document.getElementById('gistStatus');
  const syncActions = document.getElementById('syncActions');
  const syncMessage = document.getElementById('syncMessage');
  const lastSyncEl = document.getElementById('lastSyncTime');

  function updateUI() {
    const synced = isSynced();
    gistStatus.textContent = synced ? '已同步' : '未同步';
    gistStatus.className = 'gist-status ' + (synced ? 'synced' : 'unsynced');
    syncActions.style.display = synced ? 'block' : 'none';
    tokenInput.style.display = synced ? 'none' : 'block';
    saveTokenBtn.style.display = synced ? 'none' : 'block';

    if (synced) {
      const lastSync = getLastSyncTime();
      if (lastSync) {
        const date = new Date(lastSync);
        lastSyncEl.textContent = `上次同步: ${date.toLocaleString()}`;
      }
    }

    syncMessage.innerHTML = '';
  }

  settingsBtn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    updateUI();
  });

  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  saveTokenBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) {
      syncMessage.innerHTML = '<div class="sync-message error">请输入 Token</div>';
      return;
    }
    saveToken(token);
    tokenInput.value = '';
    syncMessage.innerHTML = '<div class="sync-message success">Token 已保存</div>';
    updateUI();
  });

  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = '同步中...';
    syncMessage.innerHTML = '';

    const result = await syncRankings();

    if (result.success) {
      syncMessage.innerHTML = '<div class="sync-message success">同步成功！</div>';
      updateUI();
    } else {
      syncMessage.innerHTML = `<div class="sync-message error">${result.error}</div>`;
    }

    syncBtn.disabled = false;
    syncBtn.textContent = '同步排行榜';
  });

  unsyncBtn.addEventListener('click', () => {
    unsync();
    syncMessage.innerHTML = '<div class="sync-message success">已解除同步</div>';
    updateUI();
  });

  updateUI();
}

// --- Main page ---
function init() {
  renderLanguages();
  initSettings();

  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      startGameWithMode(card.dataset.mode);
    });
  });

  document.getElementById('modeCancelBtn').addEventListener('click', hideModeSelector);

  document.getElementById('modeModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideModeSelector();
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  initTheme();
}

function renderLanguages() {
  languageGrid.innerHTML = '';

  Object.entries(articles).forEach(([key, lang]) => {
    const card = document.createElement('div');
    card.className = 'language-card';
    card.innerHTML = `
      <span class="lang-icon">${lang.icon}</span>
      <span class="lang-name">${lang.name}</span>
      <span class="article-count">${lang.articles.length} 篇文章</span>
    `;
    card.addEventListener('click', () => selectLanguage(key));
    languageGrid.appendChild(card);
  });
}

function selectLanguage(langKey) {
  currentLanguage = langKey;
  languageGrid.parentElement.style.display = 'none';
  articleSection.style.display = 'block';
  renderArticles();
}

function renderArticles() {
  articleList.innerHTML = '';
  const lang = articles[currentLanguage];

  lang.articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'article-card';

    const difficultyBadge = {
      easy: '<span class="badge easy">简单</span>',
      medium: '<span class="badge medium">中等</span>',
      hard: '<span class="badge hard">困难</span>'
    }[article.difficulty];

    const rankings = getRankings(article.id);
    const topScore = rankings.length > 0 ? `${rankings[0].wpm} WPM` : '暂无记录';

    const langBadge = article.language
      ? `<span class="badge lang">${article.language}</span>`
      : '';

    card.innerHTML = `
      <div class="article-header">
        <h3>${article.title}</h3>
        <div class="badge-row">${langBadge}${difficultyBadge}</div>
      </div>
      <p class="article-author">作者：${article.author}</p>
      <p class="article-preview">${article.description || article.text.slice(0, 30) + '...'}</p>
      <div class="article-stats">
        <span>最高：${topScore}</span>
        <span>参与：${rankings.length} 人</span>
      </div>
      <div class="article-actions">
        <button class="btn-primary" onclick="showModeSelector('${article.id}')">开始练习</button>
        <button class="btn-secondary" onclick="showRankings('${article.id}')">查看排行</button>
      </div>
    `;
    articleList.appendChild(card);
  });
}

function showRankings(articleId) {
  articleSection.style.display = 'none';
  rankingSection.style.display = 'block';

  const article = articles[currentLanguage].articles.find(a => a.id === articleId);
  const rankings = getRankings(articleId);

  document.querySelector('.ranking-section h2').innerHTML = `🏆 ${article.title} - 排行榜`;

  if (rankings.length === 0) {
    rankingList.innerHTML = '<p class="empty-state">暂无记录，成为第一个挑战者吧！</p>';
    return;
  }

  rankingList.innerHTML = `
    <div class="ranking-header">
      <span>排名</span>
      <span>玩家</span>
      <span>WPM</span>
      <span>准确率</span>
      <span>用时</span>
      <span>日期</span>
    </div>
    ${rankings.map((score, index) => `
      <div class="ranking-item ${index < 3 ? `top-${index + 1}` : ''}">
        <span class="rank">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</span>
        <span class="player">${score.playerName}</span>
        <span class="wpm">${score.wpm}</span>
        <span class="accuracy">${score.accuracy}%</span>
        <span class="time">${score.time}s</span>
        <span class="date">${score.date}</span>
      </div>
    `).join('')}
  `;
}

backBtn.addEventListener('click', () => {
  articleSection.style.display = 'none';
  languageGrid.parentElement.style.display = 'block';
});

rankingBackBtn.addEventListener('click', () => {
  rankingSection.style.display = 'none';
  articleSection.style.display = 'block';
});

window.showModeSelector = showModeSelector;
window.showRankings = showRankings;

init();
