"use server";

import { requireAuth } from "@/lib/auth/guard";
import { globalSearch, type SearchResult } from "@/services/firestore/search.repo";

export async function globalSearchAction(query: string): Promise<SearchResult[]> {
  await requireAuth();
  return globalSearch(query);
}
