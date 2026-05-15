import { initTheme, toggleTheme } from './theme.js';
import { getArticleById } from './data/articles/index.js';
import { saveScore } from './data/rankings.js';
import { calculateWPM } from './utils.js';

const input = document.getElementById('input');
const textDisplay = document.getElementById('textDisplay');
const timeEl = document.getElementById('time');
const wpmEl = document.getElementById('wpm');
const accEl = document.getElementById('accuracy');
const progressEl = document.getElementById('progress');
const articleTitle = document.getElementById('articleTitle');
const modeBadge = document.getElementById('modeBadge');
const langBadge = document.getElementById('langBadge');
const descriptionArea = document.getElementById('descriptionArea');
const articleDescription = document.getElementById('articleDescription');
const restartBtn = document.getElementById('restartBtn');
const resultModal = document.getElementById('resultModal');
const playerNameInput = document.getElementById('playerName');
const saveBtn = document.getElementById('saveBtn');
const closeBtn = document.getElementById('closeBtn');
const resultWpm = document.getElementById('resultWpm');
const resultAccuracy = document.getElementById('resultAccuracy');
const resultTime = document.getElementById('resultTime');

let article = null;
let isEndless = false;
let interval = null;
let started = false;
let startTimestamp = null;
let currentIndex = 0;
let correctChars = 0;
let finalWPM = 0;
let finalAccuracy = 100;
let finalTime = 0;

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playCorrectSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.1);
}

function playErrorSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = 200;
  oscillator.type = 'sawtooth';
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.2);
}

function shakeCursor() {
  const currentSpan = document.querySelector('.text-display .current');
  if (currentSpan) {
    currentSpan.classList.add('shake');
    setTimeout(() => {
      currentSpan.classList.remove('shake');
    }, 300);
  }
}

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  const mode = urlParams.get('mode') || 'timed';

  if (!articleId) {
    goBack();
    return;
  }

  article = getArticleById(articleId);
  if (!article) {
    goBack();
    return;
  }

  isEndless = mode === 'endless';
  timeEl.textContent = isEndless ? '0' : '60';
  modeBadge.textContent = isEndless ? '无时限模式' : '计时模式';
  modeBadge.className = 'mode-badge ' + (isEndless ? 'endless' : 'timed');

  articleTitle.textContent = article.title;

  if (article.language) {
    langBadge.textContent = article.language;
    langBadge.style.display = 'inline-block';
  } else {
    langBadge.style.display = 'none';
  }

  if (article.description) {
    articleDescription.textContent = article.description;
    descriptionArea.style.display = 'block';
  } else {
    descriptionArea.style.display = 'none';
  }

  renderText();
  setupEventListeners();
}

function renderText() {
  textDisplay.innerHTML = '';

  article.text.split('').forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;

    if (index === currentIndex) {
      span.classList.add('current');
    } else if (index < currentIndex) {
      span.classList.add('completed');
    }

    textDisplay.appendChild(span);
  });

  const current = textDisplay.querySelector('.current');
  if (current) {
    current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function startTimer() {
  startTimestamp = Date.now();

  interval = setInterval(() => {
    const delta = Math.floor((Date.now() - startTimestamp) / 1000);

    if (isEndless) {
      timeEl.textContent = delta;
    } else {
      const remaining = Math.max(0, 60 - delta);
      timeEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        endGame();
      }
    }

    calculateStats();
  }, 250);
}

function calculateStats() {
  const delta = startTimestamp ? Math.floor((Date.now() - startTimestamp) / 1000) : 0;
  const elapsed = isEndless ? delta : Math.min(delta, 60);
  const wpm = calculateWPM(correctChars, Math.max(elapsed, 1));

  const totalChars = article.text.length;
  const acc = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

  wpmEl.textContent = wpm;
  accEl.textContent = acc;

  const progress = Math.round((currentIndex / totalChars) * 100);
  progressEl.textContent = `${progress}%`;
}

function endGame() {
  clearInterval(interval);
  input.disabled = true;

  finalWPM = parseInt(wpmEl.textContent);
  const totalChars = article.text.length;
  finalAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
  finalTime = startTimestamp ? Math.floor((Date.now() - startTimestamp) / 1000) : 0;

  resultWpm.textContent = finalWPM;
  resultAccuracy.textContent = finalAccuracy + '%';
  resultTime.textContent = isEndless ? formatTime(finalTime) : finalTime + 's';

  resultModal.style.display = 'flex';
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}分${s}秒`;
  }
  return `${s}秒`;
}

function setupEventListeners() {
  input.addEventListener('input', () => {
    const typedText = input.value;

    if (!started && typedText.length > 0) {
      startTimer();
      started = true;
    }

    const expectedText = article.text.substring(currentIndex, currentIndex + typedText.length);

    if (typedText === expectedText) {
      playCorrectSound();
      correctChars += typedText.length;
      currentIndex += typedText.length;
      input.value = '';
      renderText();

      if (currentIndex >= article.text.length) {
        clearInterval(interval);
        endGame();
      }
    }

    calculateStats();
  });

  restartBtn.addEventListener('click', resetGame);

  saveBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim() || '匿名玩家';
    saveScore(article.id, name, finalWPM, finalAccuracy, finalTime);
    alert('成绩已保存！');
    resultModal.style.display = 'none';
    goBack();
  });

  closeBtn.addEventListener('click', () => {
    resultModal.style.display = 'none';
    goBack();
  });
}

function resetGame() {
  clearInterval(interval);

  started = false;
  currentIndex = 0;
  correctChars = 0;
  startTimestamp = null;
  finalWPM = 0;
  finalAccuracy = 100;
  finalTime = 0;

  input.disabled = false;
  input.value = '';
  input.focus();

  timeEl.textContent = isEndless ? '0' : '60';
  wpmEl.textContent = 0;
  accEl.textContent = '100';
  progressEl.textContent = '0%';

  renderText();
}

function goBack() {
  window.location.href = 'index.html';
}

window.goBack = goBack;

document.getElementById('themeToggle').addEventListener('click', toggleTheme);

initTheme();
init();
