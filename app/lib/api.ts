// APIクライアントのラッパー
// openapi-tsで生成されたクライアントを使いやすくするためのヘルパー関数

import createClient from 'openapi-fetch';
import type { paths } from './api-client';

// API設定
const API_BASE_URL = process.env.KERUTA_API_URL || 'http://localhost:8080';

// APIクライアントの設定
export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
  // 必要に応じて認証設定を追加
  // headers: {
  //   'Authorization': `Bearer ${token}`
  // }
});

// エラーハンドリング用のヘルパー関数
export const handleApiError = (error: unknown) => {
  console.error('API Error:', error);
  if (error instanceof Response) {
    return error.text().then(text => {
      throw new Error(`API Error ${error.status}: ${text}`);
    });
  }
  throw error;
};

// 型エクスポート
export type { paths } from './api-client';

// 使用例:
// const { data, error } = await api.GET('/api/v1/sessions');
// const { data, error } = await api.POST('/api/v1/sessions', {
//   body: { name: 'test session' }
// });