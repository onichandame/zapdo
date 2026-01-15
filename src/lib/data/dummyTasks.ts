export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
	id: number;
	name: string;
	color: string;
	description?: string;
}

export interface Task {
	id: number;
	title: string;
	description: string;
	status: TaskStatus;
	priority: TaskPriority;
	dueDate: string | null;
	createdAt: string;
	projectId: number | null;
	tags: string[];
}

// Demo projects for future collaboration features
export const projects: Project[] = [
	{ id: 1, name: 'Personal', color: '#6366f1', description: 'Personal tasks and goals' },
	{ id: 2, name: 'Work', color: '#10b981', description: 'Work-related tasks' },
	{ id: 3, name: 'Side Projects', color: '#f59e0b', description: 'Personal projects and experiments' },
	{ id: 4, name: 'Learning', color: '#8b5cf6', description: 'Learning and development' },
];

export const dummyTasks: Task[] = [
	{
		id: 1,
		title: 'Review project proposal',
		description: 'Go through the quarterly project proposal and provide feedback',
		status: 'in_progress',
		priority: 'high',
		dueDate: '2024-01-15',
		createdAt: '2024-01-10T09:00:00Z',
		projectId: 2,
		tags: ['review'],
	},
	{
		id: 2,
		title: 'Update documentation',
		description: 'Update the API documentation with the new endpoints',
		status: 'pending',
		priority: 'medium',
		dueDate: '2024-01-18',
		createdAt: '2024-01-08T14:30:00Z',
		projectId: 2,
		tags: ['docs', 'backend'],
	},
	{
		id: 3,
		title: 'Read book: Atomic Habits',
		description: 'Continue reading chapter 5 and take notes',
		status: 'in_progress',
		priority: 'low',
		dueDate: null,
		createdAt: '2024-01-05T10:00:00Z',
		projectId: 1,
		tags: ['reading', 'self-improvement'],
	},
	{
		id: 4,
		title: 'Fix authentication bug',
		description: 'Users cannot login with OAuth providers on mobile',
		status: 'pending',
		priority: 'urgent',
		dueDate: '2024-01-14',
		createdAt: '2024-01-12T16:00:00Z',
		projectId: 3,
		tags: ['bug', 'auth', 'mobile'],
	},
	{
		id: 5,
		title: 'Plan weekend trip',
		description: 'Research destinations and book accommodations',
		status: 'pending',
		priority: 'medium',
		dueDate: '2024-01-20',
		createdAt: '2024-01-11T08:00:00Z',
		projectId: 1,
		tags: ['travel', 'planning'],
	},
	{
		id: 6,
		title: 'Complete React course',
		description: 'Finish the advanced React patterns section',
		status: 'completed',
		priority: 'medium',
		dueDate: '2024-01-10',
		createdAt: '2024-01-01T09:00:00Z',
		projectId: 4,
		tags: ['learning', 'react'],
	},
	{
		id: 7,
		title: 'Team sync meeting',
		description: 'Weekly sync with the development team',
		status: 'pending',
		priority: 'high',
		dueDate: '2024-01-15T14:00:00Z',
		createdAt: '2024-01-08T11:00:00Z',
		projectId: 2,
		tags: ['meeting', 'sync'],
	},
	{
		id: 8,
		title: 'Back up important files',
		description: 'Create backups of documents and code repositories',
		status: 'pending',
		priority: 'low',
		dueDate: '2024-01-25',
		createdAt: '2024-01-10T15:00:00Z',
		projectId: 1,
		tags: ['maintenance', 'backup'],
	},
	{
		id: 9,
		title: 'Design system update',
		description: 'Add new button variants to the design system',
		status: 'in_progress',
		priority: 'medium',
		dueDate: '2024-01-22',
		createdAt: '2024-01-09T10:30:00Z',
		projectId: 3,
		tags: ['design', 'ui'],
	},
	{
		id: 10,
		title: 'Cancel unused subscriptions',
		description: 'Review and cancel subscriptions that are no longer needed',
		status: 'cancelled',
		priority: 'low',
		dueDate: null,
		createdAt: '2024-01-07T13:00:00Z',
		projectId: 1,
		tags: ['finance', 'cleanup'],
	},
];

export function getProjectById(id: number | null): Project | undefined {
	return projects.find((p) => p.id === id);
}

export function getPriorityColor(priority: TaskPriority): string {
	const colors: Record<TaskPriority, string> = {
		urgent: '#ef4444',
		high: '#f97316',
		medium: '#eab308',
		low: '#22c55e',
	};
	return colors[priority];
}

export function getStatusColor(status: TaskStatus): string {
	const colors: Record<TaskStatus, string> = {
		pending: '#94a3b8',
		in_progress: '#3b82f6',
		completed: '#22c55e',
		cancelled: '#64748b',
	};
	return colors[status];
}
