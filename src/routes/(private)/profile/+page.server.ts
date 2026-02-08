export const load = async ({ locals }) => {
  return {
    user: locals.device!.user
  };
};
