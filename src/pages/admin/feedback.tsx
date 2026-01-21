import { useState, useEffect } from "react";
import { uid } from "uid";
import { firestore } from "@/config/firebase";
import { doc, setDoc, collection, getDoc, getDocs, orderBy, query, and, where, deleteDoc } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import Router from "next/router";
import { render } from '@react-email/render';
import { useAuth } from "@/context/AuthContext";

import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Linkify from "@/components/Linkify";
import ReactPlayer from "react-player";
import Comment from "@/components/Comment";
// import FeedbackSurveyEmail from "@/mailers/templates/FeedbackSurveyEmail";

import type { Submit, AccountSettings } from "@/utils/types";

const storage = getStorage();
const defaultSubmitData = {
	_id: '',
	account_id: '',
	uid: '',
	name: '',
	title: '',
	desc: '',
	votes: 1,
	voters: [],
	comments: [],
	email: '',
	type: 'bug',
	images: [],
	files: [],
	status: 'public',
	progress: 'open',
	device_info: '',
	created_at: 0,
}

const calcImpact = (data: Submit) => {
	const totalNum = data?.voters?.length;
	let stronglyNum = 0;
	let agreeNum = 0;
	let disagreeNum = 0;
	data?.voters?.forEach(voter => {
		if (voter.impact === 2 || voter.impact === 'strongly') stronglyNum += 1;
		if (voter.impact === 1 || voter.impact === 'agree') agreeNum += 1;
		if (voter.impact === 0 || voter.impact === 'disagree') disagreeNum += 1;
	});

	const showPercentage = (num: number) => {
		return Math.round((num / totalNum) * 100);
	}

	return (
		<>
			{stronglyNum !== 0 && <div className="space-x-2 p-2 bg-zinc-600 text-white"><span>Strongly agree</span><span>{showPercentage(stronglyNum)}%</span></div>}
			{agreeNum !== 0 && <div className="space-x-2 p-2 bg-zinc-400 text-white"><span>Agree</span><span>{showPercentage(agreeNum)}%</span></div>}
			{disagreeNum !== 0 && <div className="space-x-2 p-2 bg-zinc-200 text-gray-500"><span>Disagree</span><span>{showPercentage(disagreeNum)}%</span></div>}
		</>
	);
}

export default function Feedback() {
	// @ts-ignore
	const { user } = useAuth();

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitModal, setIsSubmitModal] = useState(false);
	const [isConfirmModal, setIsConfirmModal] = useState(false);
	const [hasFiles, setHasFiles] = useState(false);
	const [isTestEmailSuccess, setIsTestEmailSuccess] = useState(false);

	const [accountId, setAccountId] = useState('');
	const [submits, setSubmits] = useState<Submit[]>([]);
	const [submitData, setSubmitData] = useState<Submit>(defaultSubmitData);
	const [commentContent, setCommentContent] = useState('');
	const [activeSubmitId, setActiveSubmitId] = useState('');
	const [adminEmail, setAdminEmail] = useState('');
	const [primaryColor, setPrimaryColor] = useState('#1E293B');
	const [brandUrl, setBrandUrl] = useState('');
	const [brandName, setBrandName] = useState('');
	const [visibleFilter, setVisibleFilter] = useState('');
	const [progressFilter, setProgressFilter] = useState('');
	const [activeSort, setActiveSort] = useState('created_at');
	const [confirmModalType, setConfirmModalType] = useState('');

	const sendEmail = async (type: string) => {
		try {
			if (type === 'adminCommentNotifyUser') {
				const { _id, status, title, desc } = submitData;
				const response = await fetch('/api/send', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email: submitData.email,
						subject: "You received a new reply from the " + brandName + " admin",
						html: status === 'public' ? "<p>You received a new reply from the " + brandName + " admin on your feedback. Take a look here: <a href='https://" + brandUrl + ".ssimple.co/?topic=" + _id + "' target='_blank'>https://" + brandUrl + ".ssimple.co/?topic=" + _id + "</a></p>" : "<div><p>You received a new reply from the " + brandName + " admin on your feedback:</p></div><div><h2>" + title + "</h2><p>" + desc + "</p></div><div><h3>Admin's Reply:</h3><p>" + commentContent + "</p></div>"
					})
				});
				return response.json();
			}

			// if (type === 'sendTestEmail') {
			// 	const emailHtml = render(
			// 		<FeedbackSurveyEmail
			// 			submitData={submitData}
			// 			brandUrl={brandUrl}
			// 		/>, {
			// 		pretty: true,
			// 	});

			// 	await fetch('/api/send', {
			// 		method: 'POST',
			// 		headers: {
			// 			'Content-Type': 'application/json',
			// 		},
			// 		body: JSON.stringify({
			// 			email: adminEmail,
			// 			subject: 'Do you agree with this suggestion for ' + brandName + ' – "' + submitData.title + '"',
			// 			html: emailHtml
			// 		})
			// 	});
			// 	return 'SUCCESS';
			// }
		} catch (error: any) {
			console.error('Error sending email: ' + error.message);
		}
	}

	const getAccountData = async () => {
		if (user.uid) setAccountId(user.uid);
		try {
			const querySnapshot = await getDocs(query(collection(firestore, 'accounts'), where('account_id', '==', user.uid)));
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() }));
			const data = foundData[0] as AccountSettings;
			setAdminEmail(data.admin_email);
			setPrimaryColor(data.primary_color);
			setBrandUrl(data.brand_url);
			setBrandName(data.brand_name);
		} catch (error: any) {
			console.error('Error getting account data: ' + error.message);
		}
	}

	const getSubmits = async (sort: string, status?: string, progress?: string) => {
		try {
			let querySnapshot;
			if (status && progress) {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), and(where('account_id', '==', accountId), where('status', '==', status), where('progress', '==', progress)), orderBy(sort, "desc")));
			} else if (status) {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), and(where('account_id', '==', accountId), where('status', '==', status)), orderBy(sort, "desc")));
			} else if (progress) {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), and(where('account_id', '==', accountId), where('progress', '==', progress)), orderBy(sort, "desc")));
			} else {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), where('account_id', '==', accountId), orderBy(sort, "desc")));
			}
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() }));
			setSubmits(foundData as Submit[]);
			setIsLoading(false);
		} catch (error: any) {
			console.error('Error getting feedback: ' + error.message);
		}
	}

	const getData = async () => {
		await getAccountData();
		await getSubmits(activeSort, visibleFilter, progressFilter);
	}

	const getSubmitQuery = async (submitId: string) => {
		try {
			const querySnapshot = await getDocs(query(collection(firestore, 'submits'), and(where('account_id', '==', user.uid), where('_id', '==', submitId))));
			const foundData = await Promise.all(querySnapshot.docs.map(document => ({ ...document.data() })));
			const data = foundData[0] as Submit;
			if (data !== undefined) {
				setIsSubmitModal(true);
				setSubmitData(data);
				setIsLoading(false);
			} else {
				alert('Topic not found');
			}
		} catch (error: any) {
			console.error('Error getting query: ' + error.message);
		}
	}

	const onVisibleChange = async (status: string, id: string) => {
		if (status === 'public') handleStatusUpdate('public', id);
		if (status === 'private') handleStatusUpdate('private', id);
	}

	const onProgressChange = async (progress: string, id: string) => {
		switch (progress) {
			case 'open':
				await handleProgressUpdate('open', id);
				break;

			case 'in_progress':
				await handleProgressUpdate('in_progress', id);
				break;

			case 'done':
				await handleProgressUpdate('done', id);
				break;

			default:
				break;
		}
	}

	const handleModalOpen = (type: string, id: string) => {
		if (type === 'submit') {
			const foundData = submits.find(data => data._id === id);
			setIsSubmitModal(true);
			setSubmitData(foundData as Submit);
			Router.push('?topic=' + id, undefined, { scroll: false });
		}

		if (type === 'sendSurvey') {
			setConfirmModalType('sendSurvey');
			setIsConfirmModal(true);
			setActiveSubmitId(id);
		}

		if (type === 'delete') {
			setConfirmModalType('delete');
			setIsConfirmModal(true);
			setActiveSubmitId(id);
		}
	}

	const handleModalClose = (type: string) => {
		if (type === 'submit') {
			setIsSubmitModal(false);
			setSubmitData(defaultSubmitData);
			Router.push(Router.pathname, undefined, { scroll: false });
		}

		if (type === 'confirmModal') {
			setIsConfirmModal(false);
			setConfirmModalType('');
			setActiveSubmitId('');
		}
	}

	const handleStatusUpdate = async (status: string, id: string) => {
		try {
			const foundData = submits.find(data => data._id === id);
			const newSubmitData = {
				...foundData,
				status,
			}
			await setDoc(doc(firestore, 'submits', id), newSubmitData);
			getSubmits(activeSort, visibleFilter, progressFilter);
		} catch (error: any) {
			console.error('Error updating status: ' + error.message);
		}
	}

	const handleProgressUpdate = async (progress: string, id: string) => {
		try {
			const foundData = submits.find(data => data._id === id);
			const newSubmitData = {
				...foundData,
				progress,
			}
			await setDoc(doc(firestore, 'submits', id), newSubmitData);
			getSubmits(activeSort, visibleFilter, progressFilter);
		} catch (error: any) {
			console.error('Error changing item progress');
		}
	}

	const handleDelete = async (id: string) => {
		try {
			const foundData = submits.find(data => data._id === id) as Submit;
			for (const comment of foundData.comments) {
				if (comment.attachment && comment.attachment.length > 0) {
					await Promise.all(comment.attachment.map(async (file) => {
						const storageRef = ref(storage, 'uploads/comments/' + file._id);
						await deleteObject(storageRef);
						await deleteDoc(doc(firestore, 'uploads', file._id));
					}));
				}
				await deleteDoc(doc(firestore, 'submit_comments', comment._id))
			}

			if (foundData.voters && foundData.voters.length > 0) await Promise.all(foundData.voters.map(voter => deleteDoc(doc(firestore, 'submit_votes', voter._id))));

			if (foundData.images && foundData.images.length > 0) {
				await Promise.all(foundData.images.map(async (image) => {
					const storageRef = ref(storage, 'uploads/topics/' + image._id);
					await deleteObject(storageRef);
					await deleteDoc(doc(firestore, 'uploads', image._id));
				}));
			}

			if (foundData.files && foundData.files.length > 0) {
				await Promise.all(foundData.files.map(async (file) => {
					const storageRef = ref(storage, 'uploads/topics/' + file._id);
					await deleteObject(storageRef);
					await deleteDoc(doc(firestore, 'uploads', file._id));
				}));
			}

			if (foundData.bug_files && foundData.bug_files.length > 0) {
				await Promise.all(foundData.bug_files.map(async (file) => {
					const storageRef = ref(storage, 'uploads/topics/' + file._id);
					await deleteObject(storageRef);
					await deleteDoc(doc(firestore, 'uploads', file._id));
				}));
			}

			await deleteDoc(doc(firestore, 'submits', id));
			Router.reload();
		} catch (error: any) {
			console.error('Something went wrong: ' + error.message);
		}
	}

	const onSendTestEmailClick = async () => {
		const responseStatus = await sendEmail('sendTestEmail');
		if (responseStatus === 'SUCCESS') setIsTestEmailSuccess(true);
	}

	const handleChange = (type: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (type === 'adminComment') setCommentContent(e.target.value);
	}

	const handleSubmit = async (type: string, e: React.SyntheticEvent) => {
		e.preventDefault();
		const newId = uid(16);

		try {
			if (type === 'adminComment') {
				const newComment = {
					role: 'admin',
					_id: newId,
					account_id: accountId,
					uid: '',
					name: '',
					email: adminEmail,
					files: [],
					content: commentContent,
					submit_id: submitData._id,
					submit_title: submitData.title,
					status: 'public',
					created_at: Date.now(),
				}
				await setDoc(doc(firestore, 'submit_comments', newId), newComment);

				const newCommentArr: { _id: string }[] = submitData.comments;
				newCommentArr.push({ _id: newId });
				const newItemData = {
					...submitData,
					comments: newCommentArr
				}
				await setDoc(doc(firestore, 'submits', submitData._id), newItemData);

				setCommentContent('');
				sendEmail('adminCommentNotifyUser');
			}
		} catch (error: any) {
			console.error('Error submitting admin comment: ' + error.message);
		}
	}

	useEffect(() => {
		getData();
	}, [isLoading, activeSort, visibleFilter, progressFilter]);

	useEffect(() => {
		if (Router.query.topic) getSubmitQuery(Router.query.topic.toString());
	}, []);

	return (
		<ProtectedRoute>
			<Head>
				<title>Feedback – {brandName}</title>
			</Head>
			<Sidebar />
			<div className="md:ml-60 px-4 pt-24 pb-8 md:p-16 md:pt-24 space-y-4">
				<div className="flex flex-col sm:flex-row gap-4 sm:items-center">
					<div className="flex gap-2 items-center">
						<div className="font-medium">Sort</div>
						<select className="border px-2 py-1 rounded-lg" value={activeSort} onChange={e => setActiveSort(e.target.value)}>
							<option value="created_at">New</option>
							<option value="votes">Popular</option>
						</select>
					</div>
					<div className="flex gap-2 items-center">
						<div className="font-medium">Visibility</div>
						<select className="border px-2 py-1 rounded-lg" value={visibleFilter} onChange={e => setVisibleFilter(e.target.value)}>
							<option value="">All</option>
							<option value="public">Public</option>
							<option value="private">Private</option>
						</select>
					</div>
					<div className="flex gap-2 items-center">
						<div className="font-medium">Progress</div>
						<select className="border px-2 py-1 rounded-lg" value={progressFilter} onChange={e => setProgressFilter(e.target.value)}>
							<option value="">All</option>
							<option value="open">Exploring</option>
							<option value="in_progress">In Progress</option>
							<option value="done">Done</option>
						</select>
					</div>
					{(visibleFilter || progressFilter) && <div>
						<button type="button" className="font-bold text-gray-400 hover:text-gray-500 transition-colors" onClick={() => {
							setVisibleFilter('');
							setProgressFilter('');
						}}>Reset</button>
					</div>}
				</div>
				<div className="overflow-x-scroll border rounded-lg">
					<table className="w-full table-fixed">
						<thead className="text-xs text-gray-400 bg-zinc-100">
							<tr>
								<th className="w-32 p-4 text-left">Type</th>
								<th className="w-96 text-left">Title (click to view details)</th>
								<th className="w-20">Upvotes</th>
								<th className="w-20">Comments</th>
								<th className="w-28">Visibility</th>
								<th className="w-28">Progress</th>
								<th className="w-52 text-right px-4">Time Received</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y">
							{isLoading ? (
								<tr>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
									<td><div className="m-4 h-4 bg-zinc-200 animate-pulse rounded"></div></td>
								</tr>
							) : (
								<>
									{submits.map(submit => {
										const time = new Date(submit.created_at);
										return (
											<tr key={submit._id} className="text-center">
												<td>
													<div className="text-left p-4">{submit.type === 'bug' ? 'Issue' : 'Suggestion'}</div>
												</td>
												<td>
													<button type="button" className="my-2 w-full text-left font-bold text-gray-400 hover:text-gray-500 transition-colors" onClick={() => handleModalOpen('submit', submit._id)}>{submit.title}</button>
												</td>
												<td>{submit.votes}</td>
												<td>{submit.comments.length}</td>
												<td>
													<div>
														<select className="p-1 border transition-colors rounded-lg cursor-pointer" value={submit.status} onChange={e => onVisibleChange(e.target.value, submit._id)}>
															<option value="public">Public</option>
															<option value="private">Private</option>
														</select>
													</div>
												</td>
												<td>
													<div>
														<select className="p-1 border transition-colors rounded-lg cursor-pointer" value={submit.progress} onChange={e => onProgressChange(e.target.value, submit._id)}>
															<option value="open">Exploring</option>
															<option value="in_progress">In Progress</option>
															<option value="done">Done</option>
														</select>
													</div>
												</td>
												<td>
													<div className="text-right px-4">{time.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
												</td>
											</tr>
										);
									})}
								</>
							)}
						</tbody>
					</table>
				</div>
			</div>
			{Router.query.topic && isSubmitModal && <div className="fixed top-0 w-full h-full z-20">
				{/* modal overlay */}
				<div className="fixed inset-0 bg-zinc-300 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full" onClick={() => handleModalClose('submit')}></div>
				{/* modal content */}
				<div className="relative m-8 xl:mx-auto p-8 border max-w-7xl h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded-lg bg-zinc-50">
					<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('submit')}><i className="fas fa-times"></i></button>
					{submitData && <div className="flex flex-col-reverse md:flex-row gap-8">
						<div className="md:w-2/3 space-y-4">
							<div className="space-y-4">
								<div>
									<h2 className="font-medium text-2xl grow">{submitData.title}</h2>
								</div>
								<div>
									<Linkify primaryColor={primaryColor}>{submitData.desc}</Linkify>
								</div>
								{submitData.images && submitData.images.length > 0 && <div>
									<div className="font-medium">
										Uploaded images
									</div>
									<ul className="space-y-2">
										{submitData.images.map(image => {
											if (image.status === 'published') return (
												<li key={image._id} className="p-2 bg-slate-100 rounded">
													<img src={image.download_url} />
												</li>
											);
										})}
									</ul>
								</div>}
								{submitData.files && submitData.files.length > 0 && <div>
									<div className="font-medium">
										Uploaded attachments
									</div>
									<ul className="space-y-2">
										{submitData.files.map(file => {
											if (file.status === 'published') {
												if (file.type === 'image') {
													return (
														<li key={file._id} className="p-2 bg-slate-100 rounded">
															<img src={file.download_url} />
														</li>
													);
												} else {
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
											}
										})}
									</ul>
								</div>}
								{submitData.bug_files && submitData.bug_files.length > 0 && <div>
									<div className="font-medium">
										Bug screenshot
									</div>
									<div className="p-2 bg-zinc-100 rounded-lg">
										<img src={submitData.bug_files[0].download_url} />
									</div>
								</div>}
								{submitData.console_log && submitData.console_log.length > 0 && <div>
									<div className="font-medium">
										Console log
									</div>
									<div className="p-4 bg-zinc-100 rounded-lg">
										<ul className="space-y-2">
											{submitData.console_log.map(log => {
												const time = new Date(log.time_stamp);
												return (
													<li key={log.time_stamp}>
														<div className="flex gap-2 text-gray-400 text-sm font-medium">
															<div>{log.type}</div>
															<div>{time.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
														</div>
														<div>{log.value}</div>
													</li>
												)
											})}
										</ul>
									</div>
								</div>}
							</div>
							<hr />
							<div className="space-y-8 py-8">
								{submitData.comments?.length > 0 ? (
									<div>
										<ul className="space-y-4">
											{submitData.comments.map((comment, i) => (
												<Comment
													key={i}
													commentId={comment._id}
													primaryColor={primaryColor}
													isRepliable={false}
													userEmail={adminEmail}
													submitId={submitData._id}
													submitTitle={submitData.title}
													setHasFiles={setHasFiles}
												/>
											))}
										</ul>
									</div>
								) : (
									<div className="px-2">
										<p className="text-gray-400">No comment</p>
									</div>
								)}
								<div>
									<form className="space-y-1" onSubmit={e => handleSubmit('adminComment', e)}>
										<div>
											<textarea
												className="border rounded-lg w-full p-2"
												rows={3}
												placeholder="Reply ad admin"
												value={commentContent}
												onChange={e => handleChange('adminComment', e)}
												onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
												maxLength={10000}
												required
											/>
										</div>
										<div className="text-right">
											<button type="submit" className="w-full md:w-auto px-4 py-2 bg-zinc-500 text-white font-bold rounded-lg hover:bg-zinc-600 transition-colors">Reply as Admin</button>
										</div>
									</form>
								</div>
							</div>
						</div>
						<div className="md:w-1/3 space-y-4 flex flex-col">
							<div>
								<span className="font-medium px-2 py-1 border border-zinc-400 bg-white rounded-full">{submitData.type === 'bug' ? 'Issue' : 'Suggestion'}</span>
							</div>
							<div className="space-y-1">
								<div className="font-medium">Submitted by</div>
								<div className="text-gray-400">{submitData.email}</div>
							</div>
							<div className="space-y-2">
								<div className="font-medium">
									Feedback sentiment
								</div>
								<div className="text-sm font-medium bg-zinc-100">
									{calcImpact(submitData)}
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex space-x-2">
									<span className="font-medium">Votes</span>
									<span className="font-bold text-gray-400">{submitData.votes}</span>
								</div>
								{submitData.voters?.length > 0 &&
									<table className="table-fixed">
										<tbody className="divide-y">
											{submitData.voters.map(voter => (
												<tr key={voter._id}>
													<td className="px-2 py-1">
														{(voter.impact === 2 || voter.impact === 'strongly') &&
															<div>Strongly agree</div>
														}
														{(voter.impact === 1 || voter.impact === 'agree') &&
															<div>Agree</div>
														}
														{(voter.impact === 0 || voter.impact === 'disagree') &&
															<div>Disagree</div>
														}
													</td>
													<td className="px-2 py-1">
														<div>{voter.email}</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								}
							</div>
							{submitData.device_info && <div>
								<div className="font-medium">User device info</div>
								<div className="p-4 border rounded-lg">{submitData.device_info}</div>
							</div>}
							<div>
								<button type="button" className="px-2 py-1 rounded-lg font-bold text-gray-400 hover:text-gray-500 transition-colors" onClick={() => handleModalOpen('delete', submitData._id)}>Delete Feedback</button>
							</div>
						</div>
					</div>}
				</div>
			</div>}
			{isConfirmModal && <div className="fixed top-0 w-full h-full flex z-30">
				{/* modal overlay */}
				<div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full"></div>
				{/* modal content */}
				<div className="relative mx-8 my-auto sm:m-auto p-8 border sm:min-w-[500px] sm:w-1/4 overflow-y-scroll shadow-lg rounded-lg bg-white space-y-8">
					<div className="space-y-2">
						<h2 className="font-bold text-2xl">{confirmModalType === 'delete' ? 'Delete Feedback?' : 'Send Email Surveys'}</h2>
						<p className="font-medium">{confirmModalType === 'delete' ? 'All comments, voters, and impact sentiment data related to this feedback will be deleted forever.' : 'Send email surveys to contacts that have interacted with your feedback portal (votes, comments, submit new feedback) if they agree/disagree with this feedback.'}</p>
						{confirmModalType === 'sendSurvey' && <div><button type="button" className="font-bold text-sky-400 hover:text-sky-500 transition-colors" onClick={() => onSendTestEmailClick()}>Send myself a test email</button></div>}
						{isTestEmailSuccess && <div className="text-sm">Test email sent successfully</div>}
					</div>
					<div className="flex flex-col sm:flex-row justify-end gap-2">
						{confirmModalType === 'delete' && <button type="button" className="px-4 py-2 bg-red-400 hover:bg-red-500 transition-colors rounded-lg font-bold text-white" onClick={() => handleDelete(activeSubmitId)}>Delete</button>}
						{confirmModalType === 'sendSurvey' && <button type="button" className="px-4 py-2 font-bold text-white rounded-lg bg-zinc-500 hover:bg-zinc-600 transition-colors"><i className="fas fa-paper-plane"></i> Send Surveys</button>}
						<button className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 transition-colors rounded-lg font-bold" onClick={() => handleModalClose('confirmModal')}>Cancel</button>
					</div>
				</div>
			</div>}
		</ProtectedRoute>
	);
}