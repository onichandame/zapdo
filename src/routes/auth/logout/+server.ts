import { redirect, type RequestHandler } from '@sveltejs/kit';
import * as schema from '$lib/server/db/schema'

// TODO: delete device from db. also need to delete from client storage. need to add a page
export const POST: RequestHandler = async ({ request, locals, cookies }) => {

  throw redirect(302, '/?logged_out=true');
};

export const GET: RequestHandler = async ({ request, locals, cookies }) => {

  throw redirect(302, '/?logged_out=true');
};
