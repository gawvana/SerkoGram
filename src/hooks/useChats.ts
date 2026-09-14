import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiClient } from '../lib/api-client';

export function useChats() {
  return useInfiniteQuery({
    queryKey: ['chats'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await ApiClient.get<any>(`/chats?offset=${pageParam}`);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    getNextPageParam: (lastPage, pages) => lastPage.nextOffset || undefined,
    initialPageParam: 0,
  });
}
