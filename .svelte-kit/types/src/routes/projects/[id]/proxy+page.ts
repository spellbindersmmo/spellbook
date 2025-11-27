// @ts-nocheck
import type { PageLoad } from './$types';

export const load = async ({ params }: Parameters<PageLoad>[0]) => {
  return {
    projectId: params.id
  };
};

// Disable SSR for this page
export const ssr = false;