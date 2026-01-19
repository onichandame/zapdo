import type { UserKek } from '$lib/server/db/schema';

export const load = async ({ url, locals }) => {
  const { session } = locals;


  // Get user's KEKs
  const userKeks = session!.user.keks as UserKek[];

  // Get redirect URL from query params
  const redirectUrl = url.searchParams.get('redirect') || '/tasks';

  return {
    userKeks,
    redirectUrl
  };
};
