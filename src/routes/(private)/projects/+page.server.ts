import { projects } from "$lib/data/dummyTasks";

export async function load() {
	return {
		projects
	};
}