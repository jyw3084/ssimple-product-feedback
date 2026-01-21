import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { uid } from "uid";
import { firestore } from "@/config/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
// @ts-ignore
import FilePondPluginMediaPreview from 'filepond-plugin-media-preview';
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";

import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import 'filepond-plugin-media-preview/dist/filepond-plugin-media-preview.min.css';

import Linkify from "@/components/Linkify";
import ReactPlayer from "react-player";
import Reply from "@/components/Reply";

import type { File, Comment } from "@/utils/types";
import type { FilePondFile, ProcessServerConfigFunction, RevertServerConfigFunction } from "filepond";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginMediaPreview, FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

const storage = getStorage();
const defaultComment = {
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
	thread_replies: [],
	status: 'public',
	created_at: 0,
}

function maskEmail(str: string) {
	if (str.length > 0) return str[0] + '*'.repeat(str.length - 1);
}

export default function Comment({ commentId, primaryColor, isRepliable, userEmail, submitId, submitTitle, setHasFiles }: { commentId: string, primaryColor: string, isRepliable: boolean, userEmail: string, submitId: string, submitTitle: string, setHasFiles: Dispatch<SetStateAction<boolean>> }) {
	const [isReplying, setIsReplying] = useState(false);
	const [isSubmitActive, setIsSubmitActive] = useState(true);

	const [comment, setComment] = useState<Comment>(defaultComment);
	const [replyContent, setReplyContent] = useState('');
	const [replyFiles, setReplyFiles] = useState<FilePondFile[]>([]);
	const [files, setFiles] = useState<File[]>([]);

	const server: { process: ProcessServerConfigFunction, revert: RevertServerConfigFunction } = {
		process: (fieldName, file, metadata, load, error, progress, abort) => {
			const id = uid(16);
			const storageRef = ref(storage, 'uploads/comments/' + id);
			const uploadTask = uploadBytesResumable(storageRef, file);
			const fileType = file.type.split('/')[0];

			uploadTask.on('state_changed',
				snapshot => {
					progress(true, snapshot.bytesTransferred, snapshot.totalBytes);
				},
				err => {
					error(err.message);
				},
				() => {
					load(id);
					getDownloadURL(storageRef).then(url => {
						const newUploadObj = {
							_id: id,
							type: fileType,
							parent_type: 'comment',
							parent_id: '',
							status: 'pending',
							download_url: url,
							created_at: Date.now()
						}
						setDoc(doc(firestore, 'uploads', id), newUploadObj).then(() => {
							const newFiles = files;
							newFiles.push(newUploadObj);
							setFiles(newFiles);
							setIsSubmitActive(true);
						}).catch(err => error(err));
					});
				}
			);

			return {
				abort: () => {
					uploadTask.cancel();
					deleteDoc(doc(firestore, 'uploads', id)).then(() => {
						const newFiles = files;
						newFiles.pop();
						setFiles(newFiles);
						abort();
					}).catch(err => error(err));
				}
			}
		},
		revert: (uniqueFileId, load, error) => {
			const currentFiles = files;
			const newFiles = currentFiles.filter(({ _id }) => _id !== uniqueFileId);
			setFiles(newFiles);
			if (newFiles.length === 0) setHasFiles(false);
			const storageRef = ref(storage, 'uploads/comments/' + uniqueFileId);
			deleteObject(storageRef).then(() => {
				deleteDoc(doc(firestore, 'uploads', uniqueFileId)).then(() => {
					load();
				}).catch(err => error(err));
			}).catch(err => {
				error(err.message);
			});
		}
	}

	const getData = async (id: string) => {
		try {
			const querySnapshot = await getDoc(doc(firestore, 'submit_comments', id));
			if (querySnapshot.exists()) setComment(querySnapshot.data() as Comment);
		} catch (error: any) {
			alert(error.message);
		}
	}

	useEffect(() => {
		if (commentId) getData(commentId);
	}, [commentId, replyContent]);

	const handleAddFileStart = () => {
		setHasFiles(true);
		setIsSubmitActive(false);
	}

	const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setReplyContent(e.target.value);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const newId = uid(16);

		try {
			const publishedFiles = await Promise.all(files.map(async file => {
				file.status = 'published';
				file.parent_id = newId;
				// await setDoc(doc(firestore, 'uploads', file._id), file);
				return file;
			}));

			// create new reply in firestore
			const newReply = {
				role: 'user',
				_id: newId,
				uid: '',
				name: '',
				email: userEmail,
				content: replyContent,
				files: publishedFiles,
				submit_id: submitId,
				submit_title: submitTitle,
				is_thread: false,
				thread_parent_id: commentId,
				thread_replies: [],
				status: 'public',
				created_at: Date.now(),
			}
			// await setDoc(doc(firestore, 'submit_comments', newId), newReply);

			// update this comment with id of new reply in firestore
			const foundComment: Comment = comment;
			if (!foundComment) throw new Error('Comment not found');
			let newReplies: { _id: string }[] = [];
			if (foundComment.thread_replies) newReplies = foundComment.thread_replies!;
			newReplies.push({ _id: newReply._id });
			const newComment = {
				...foundComment,
				is_thread: true,
				thread_parent_id: null,
				thread_replies: newReplies,
			}
			// await setDoc(doc(firestore, 'submit_comments', foundComment._id), newComment);

			setReplyContent('');
			setReplyFiles([]);
			setHasFiles(false);
		} catch (error: any) {
			alert('Error replying: ' + error.message);
		}
	}

	return (
		<li className="space-y-1">
			<div
				className="flex items-center gap-1"
				style={comment.role === 'admin' ? { color: primaryColor + 'CC' } : { color: '#6B7280' }}
			>
				<i className="fas fa-user-circle"></i>
				<span className="text-xs">{comment.role === 'admin' ? 'Admin' : maskEmail(comment.email)}</span>
			</div>
			<div
				className="px-2 py-1 space-y-4 rounded-lg"
				style={comment.role === 'admin' ? { backgroundColor: primaryColor + '10' } : { backgroundColor: '' }}
			>
				<div>
					<Linkify primaryColor={primaryColor}>{comment.content}</Linkify>
				</div>
				{comment.attachment && comment.attachment.length > 0 &&
					<ul className="space-y-2">
						{comment.attachment.map(file => {
							if (file.status === 'published') return (
								<li key={file._id}>
									<img src={file.download_url} />
								</li>
							);
						})}
					</ul>
				}
				{comment.files && comment.files.length > 0 &&
					<ul className="space-y-2">
						{comment.files.map(file => {
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
			{isRepliable && !isReplying &&
				<div className="px-2">
					<button className="text-sm font-medium text-gray-400 hover:text-gray-500 transition-colors" onClick={() => setIsReplying(true)}>Reply</button>
				</div>
			}
			{comment.is_thread &&
				<ul className="ml-8 pt-4 space-y-6">
					{comment.thread_replies?.map(({ _id }, i) => <Reply key={i} replyId={_id} primaryColor={primaryColor} />)}
				</ul>
			}
			{isReplying && <form className="space-y-1 pt-2" onSubmit={e => handleSubmit(e)}>
				<div>
					<textarea
						className="border rounded-lg w-full p-2"
						rows={3}
						placeholder="This is a demo. No comment will actually be posted."
						value={replyContent}
						onChange={e => handleTextAreaChange(e)}
						onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
						maxLength={10000}
						required
					/>
				</div>
				<div className="flex md:justify-end gap-2">
					<button
						type="submit"
						className="w-full md:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
						style={isSubmitActive ? { backgroundColor: primaryColor + 'CC' } : { backgroundColor: '#E2E8F0' }}
						onMouseOver={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor : undefined}
						onMouseLeave={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor + 'CC' : undefined}
						disabled={isSubmitActive ? false : true}
					>Reply</button>
				</div>
			</form>}
		</li>
	);
}