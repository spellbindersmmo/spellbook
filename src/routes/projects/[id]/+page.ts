import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  return {
    projectId: params.id
  };
};

// Disable SSR for this page
export const ssr = false;