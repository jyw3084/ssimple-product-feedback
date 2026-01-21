import { useState, useEffect } from "react";
import { firestore } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";

import Linkify from "@/components/Linkify";
import ReactPlayer from "react-player";

import type { Comment } from "@/utils/types";

const defaultReply = {
	role: 'user',
	_id: '',
	uid: '',
	name: '',
	email: '',
	content: '',
	files: [],
	submit_id: '',
	submit_title: '',
	is_thread: false,
	thread_parent_id: '',
	thread_children_ids: [],
	status: 'public',
	created_at: 0,
}

function maskEmail(str: string) {
	if (str.length > 0) return str[0] + '*'.repeat(str.length - 2) + str.substring(str.length - 1);
}

export default function Reply({ replyId, primaryColor }: { replyId: string, primaryColor: string }) {
	const [reply, setReply] = useState<Comment>(defaultReply);

	const getData = async (id: string) => {
		try {
			const querySnapshot = await getDoc(doc(firestore, 'submit_comments', id));
			if (querySnapshot.exists()) setReply(querySnapshot.data() as Comment);
		} catch (error: any) {
			alert(error.message);
		}
	}

	useEffect(() => {
		if (replyId) getData(replyId);
	}, [replyId]);

	return (
		<li className="space-y-1">
			<div
				className="flex items-center gap-1"
				style={reply.role === 'admin' ? { color: primaryColor + 'CC' } : { color: '#6B7280' }}
			>
				<i className="fas fa-user-circle"></i>
				<span className="text-xs">{reply.role === 'admin' ? 'Admin' : maskEmail(reply.email)}</span>
			</div>
			<div
				className="p-3 rounded space-y-4"
				style={reply.role === 'admin' ? { backgroundColor: primaryColor + '1A' } : { backgroundColor: '#F8FAFC' }}
			>
				<div>
					<Linkify primaryColor={primaryColor}>{reply.content}</Linkify>
				</div>
				{reply.files?.length > 0 &&
					<ul className="space-y-2">
						{reply.files.map(file => {
							if (file.status !== 'published') return;
							if (file.type === 'image') {
								return (
									<li key={file._id} className="p-2 bg-slate-100 rounded">
										<img src={file.download_url} />
									</li>
								);
							}
							if (file.type === 'video') {
								return (
									<li key={file._id} className="p-2 bg-slate-100 rounded">
										<ReactPlayer
											className="react-player"
											url={file.download_url}
											controls
											width="100%"
											height="100%"
											config={{
												file: {
													attributes: {
														controlsList: 'nodownload'
													}
												}
											}}
										/>
									</li>
								);
							}
						})}
					</ul>
				}
			</div>
		</li>
	);
}