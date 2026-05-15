const TOKEN_KEY = 'typing_game_gist_token';
const GIST_ID_KEY = 'typing_game_gist_id';
const LAST_SYNC_KEY = 'typing_game_last_sync';
const GIST_FILENAME = 'typing-game-rankings.json';
const GIST_DESCRIPTION = 'TypingRush 打字游戏排行榜';

// --- Token management ---

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(GIST_ID_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasToken() {
  return !!getToken();
}

// --- Gist ID management ---

export function getGistId() {
  return localStorage.getItem(GIST_ID_KEY) || null;
}

export function saveGistId(id) {
  localStorage.setItem(GIST_ID_KEY, id);
}

export function clearGistId() {
  localStorage.removeItem(GIST_ID_KEY);
}

// --- Sync status ---

export function getLastSyncTime() {
  return localStorage.getItem(LAST_SYNC_KEY) || null;
}

export function isSynced() {
  return hasToken() && !!getGistId();
}

// --- Core sync ---

export async function syncRankings() {
  const token = getToken();
  if (!token) {
    return { success: false, error: '请先设置 GitHub Token' };
  }

  const gistId = getGistId();
  if (!gistId) {
    return createGistAndSync();
  }

  try {
    const remote = await fetchGistContent(gistId, token);
    const local = JSON.parse(localStorage.getItem('typing_game_rankings') || '{}');
    const merged = mergeRankings(local, remote);
    await pushGistContent(gistId, token, merged);
    localStorage.setItem('typing_game_rankings', JSON.stringify(merged));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return { success: true, merged };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function createGistAndSync() {
  const token = getToken();
  if (!token) {
    return { success: false, error: '请先设置 GitHub Token' };
  }

  try {
    const local = JSON.parse(localStorage.getItem('typing_game_rankings') || '{}');
    const gistId = await createGist(token, local);
    saveGistId(gistId);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return { success: true, merged: local };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function unsync() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

// --- Internal helpers ---

async function fetchGistContent(gistId, token) {
  const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (resp.status === 401 || resp.status === 403) {
    if (resp.headers.get('X-RateLimit-Remaining') === '0') {
      throw new Error('API 频率限制，请稍后重试');
    }
    throw new Error('Token 无效或已过期，请重新设置');
  }
  if (resp.status === 404) {
    throw new Error('Gist 不存在或已被删除');
  }
  if (!resp.ok) {
    throw new Error(`同步失败: ${resp.status}`);
  }

  const data = await resp.json();
  const file = data.files[GIST_FILENAME];
  if (!file || !file.content) {
    return {};
  }
  try {
    return JSON.parse(file.content);
  } catch {
    throw new Error('Gist 数据格式错误');
  }
}

async function pushGistContent(gistId, token, content) {
  const body = {
    files: {
      [GIST_FILENAME]: { content: JSON.stringify(content) }
    }
  };

  const resp = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (resp.status === 401 || resp.status === 403) {
    throw new Error('Token 无效或已过期，请重新设置');
  }
  if (resp.status === 404) {
    clearGistId();
    throw new Error('Gist 不存在或已被删除');
  }
  if (!resp.ok) {
    throw new Error(`同步失败: ${resp.status}`);
  }
}

async function createGist(token, rankings) {
  const body = {
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILENAME]: { content: JSON.stringify(rankings) }
    }
  };

  const resp = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (resp.status === 401 || resp.status === 403) {
    throw new Error('Token 无效或已过期，请重新设置');
  }
  if (!resp.ok) {
    throw new Error(`创建 Gist 失败: ${resp.status}`);
  }

  const data = await resp.json();
  return data.id;
}

function mergeRankings(local, remote) {
  const allIds = new Set([
    ...Object.keys(local),
    ...Object.keys(remote)
  ]);

  const result = {};
  for (const id of allIds) {
    const localScores = local[id] || [];
    const remoteScores = remote[id] || [];
    const playerMap = new Map();

    for (const s of [...remoteScores, ...localScores]) {
      const existing = playerMap.get(s.playerName);
      if (!existing || s.wpm > existing.wpm || (s.wpm === existing.wpm && s.accuracy > existing.accuracy)) {
        playerMap.set(s.playerName, s);
      }
    }

    result[id] = [...playerMap.values()]
      .sort((a, b) => b.wpm - a.wpm)
      .slice(0, 10);
  }

  return result;
}
