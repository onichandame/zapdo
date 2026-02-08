import { error } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  checkDeviceRegistration: async ({ locals }) => {
    if (locals.device) {
      return { registered: true };
    }
    throw error(403, 'Device not registered');
  }
};