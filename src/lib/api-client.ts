export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export class ApiClient {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const initData = typeof window !== 'undefined' && window.Telegram?.WebApp?.initData 
        ? window.Telegram.WebApp.initData 
        : '';
        
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `tma ${initData}`,
        ...options.headers,
      };

      const response = await fetch(`/api${endpoint}`, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || 'Произошла ошибка' };
      }
      return { data };
    } catch (error) {
      return { error: 'Сетевая ошибка' };
    }
  }

  static get<T>(path: string) { return this.request<T>(path); }
  static post<T>(path: string, body: any) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  static put<T>(path: string, body: any) { return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) }); }
  static delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}
