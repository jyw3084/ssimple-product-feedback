export interface AccountSettings {
	account_id: string;
	admin_email: string;
	brand_name: string;
	brand_url: string;
	primary_color: string;
	home_url: string;
	board_title: string;
	type: string;
	features: string[];
	updated_at: number;
}

export interface File {
	_id: string;
	account_id: string;
	type: string;
	parent_type: string;
	parent_id: string;
	status: string;
	download_url: string;
	created_at: number;
}

export interface Comment {
	role: string;
	_id: string;
	account_id: string;
	uid: string;
	name: string;
	email: string;
	content: string;
	images?: File[];
	attachment?: File[];
	files: File[];
	submit_id: string;
	submit_title: string;
	is_thread?: boolean;
	thread_parent_id?: string | null;
	thread_replies?: { _id: string }[];
	status: string;
	created_at: number;
}

export interface Voter {
	_id: string;
	account_id: string;
	uid: string;
	name: string;
	email: string;
	impact: number | string;
	feedback_content?: string;
	submit_id: string;
	submit_title: string;
	created_at: number;
}

export interface Profile {
	_id: string;
	account_id: string;
	email: string;
	type?: string;
	created_at: number;
}

interface ConsoleLog {
	type: string;
	time_stamp: string;
	value: string;
}

export interface Submit {
	_id: string;
	account_id: string;
	uid: string;
	name: string;
	email: string;
	title: string;
	desc: string;
	votes: number;
	voters: Voter[];
	comments: Comment[];
	type: string;
	images?: File[];
	files?: File[];
	bug_files?: File[];
	console_log?: ConsoleLog[];
	status: string;
	progress?: string;
	device_info?: string;
	created_at: number;
}

export interface Survey {
	_id: string;
	account_id: string;
	name: string;
	survey_options?: { score: number, label: string }[];
	responses: { _id: string }[];
	last_sent?: number;
	next_send?: number;
	created_at: number;
}

export interface Response {
	_id: string;
	email?: string;
	score: number;
	feedback_content?: string;
	survey_id: string;
	quick_res_html?: string;
	created_at: number;
}