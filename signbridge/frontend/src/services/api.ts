const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('signbridge_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  register: (email: string, password: string, displayName: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; user: { id: string; email: string; display_name: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  createRoom: (hostName: string) =>
    request<{ room_id: string }>(`/rooms?host_name=${encodeURIComponent(hostName)}`, {
      method: 'POST',
    }),

  getRoom: (roomId: string) => request(`/rooms/${roomId}`),

  joinRoom: (roomId: string) =>
    request(`/rooms/${roomId}/join`, { method: 'POST' }),

  translate: (text: string, sourceLang: string, targetLang: string) =>
    request<{ translated: string }>(
      `/translation/translate?text=${encodeURIComponent(text)}&source_lang=${sourceLang}&target_lang=${targetLang}`,
      { method: 'POST' },
    ),

  getLanguages: () => request<{ languages: { code: string; name: string }[] }>('/translation/languages'),

  predictSentence: (context: string) =>
    request<{ predictions: string[] }>(
      `/translation/predict?context=${encodeURIComponent(context)}`,
      { method: 'POST' },
    ),

  getSignVocabulary: () =>
    request<{ vocabulary: Record<string, string> }>('/sign/vocabulary'),

  getAvatarConfig: () => request('/avatar/config'),

  buildAvatarMessage: (text: string, translatedText?: string) =>
    request(
      `/avatar/message?text=${encodeURIComponent(text)}${translatedText ? `&translated_text=${encodeURIComponent(translatedText)}` : ''}`,
      { method: 'POST' },
    ),
};

export function saveToken(token: string) {
  localStorage.setItem('signbridge_token', token);
}

export function clearToken() {
  localStorage.removeItem('signbridge_token');
}
