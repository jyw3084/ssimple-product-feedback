import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { uid } from "uid";
import { firestore } from "@/config/firebase";
import { doc, getDoc, collection, getDocs, setDoc, orderBy, query, deleteDoc, where, and, or } from "firebase/firestore";
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

import Upvotes from "@/components/Upvotes";
import Loading from "@/components/Loading";
import Linkify from "@/components/Linkify";
import ReactPlayer from "react-player";
import Comment from "@/components/Comment";

import type { AccountSettings, File, Submit, Profile } from "@/utils/types";
import type { FilePondFile, ProcessServerConfigFunction, RevertServerConfigFunction } from "filepond";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginMediaPreview, FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

const storage = getStorage();
const defaultItemData = {
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
	files: [],
	status: 'public',
	progress: 'open',
	device_info: '',
	created_at: 0,
}

function disableScroll() {
	const scrollTop = window.scrollY || document.documentElement.scrollTop;
	const scrollLeft = window.scrollX || document.documentElement.scrollLeft
	window.onscroll = function () {
		window.scrollTo(scrollLeft, scrollTop);
	};
}

function enableScroll() {
	window.onscroll = function () {};
}

const renderType = (type: string) => {
	if (type === 'bug') {
		return 'Issue';
	}
	if (type === 'feature' || type === 'improve') {
		return 'Suggestion';
	}
}

export default function Board() {
	const [isLoading, setIsLoading] = useState(true);
	const [isUserEmail, setIsUserEmail] = useState(false);
	const [isModalLoading, setIsModalLoading] = useState(true);
	const [isItemModal, setIsItemModal] = useState(false);
	const [isUserEmailModal, setIsUserEmailModal] = useState(false);
	const [isComment, setIsComment] = useState(false);
	const [isWarningModal, setIsWarningModal] = useState(false);
	const [isCommentSubmitActive, setIsCommentSubmitActive] = useState(true);
	const [hasFiles, setHasFiles] = useState(false);
	const [isImpactExpand, setIsImpactExpand] = useState(false);

	const [accountId, setAccountId] = useState('');
	const [logoUrl, setLogoUrl] = useState('');
	const [userEmail, setUserEmail] = useState('');
	const [sort, setSort] = useState('votes');
	const [filter, setFilter] = useState('');
	const [primaryColor, setPrimaryColor] = useState('#09090B');
	const [brandName, setBrandName] = useState('');
	const [homeUrl, setHomeUrl] = useState('');
	const [boardTitle, setBoardTitle] = useState('');
	const [progress, setProgress] = useState('open');
	const [submits, setSubmits] = useState<Submit[]>([]);
	const [itemData, setItemData] = useState<Submit>(defaultItemData);
	const [commentContent, setCommentContent] = useState('');
	const [commentFiles, setCommentFiles] = useState<FilePondFile[]>([]);
	const [files, setFiles] = useState<File[]>([]);
	const [impact, setImpact] = useState('');
	const [impactFeedbackContent, setImpactFeedbackContent] = useState('');

	const router = useRouter();

	const handleWindowClose = (e: BeforeUnloadEvent) => {
		if (!hasFiles) return;
		e.preventDefault();
		return (e.returnValue = 'You have unsaved content - are you sure you wish to leave this page?');
	}

	const handleBrowseAway = () => {
		if (!hasFiles) return;
		if (window.confirm('You have unsaved content - are you sure you wish to leave this page?')) {
			setFiles([]);
			setHasFiles(false);
			return;
		}
		router.events.emit('routeChangeError');
		throw 'cancelRouteChange';
	}

	const getAccountData = async () => {
		// const url = window.location.href.split('.ssimple')[0].split('https://')[1];
		const url = process.env.NEXT_PUBLIC_USER_URL;
		try {
			const querySnapshot = await getDoc(doc(firestore, 'accounts', url));
			if (querySnapshot.exists()) {
				const data = querySnapshot.data() as AccountSettings;
				setPrimaryColor(data.primary_color);
				setBrandName(data.brand_name);
				setHomeUrl(data.home_url);
				setBoardTitle(data.board_title);
				setAccountId(data.account_id);
			}
		} catch (error: any) {
			console.error('Error getting account data: ' + error.message);
		}
	}

	const getLogoFile = async () => {
		try {
			const httpsReference = ref(storage, 'https://firebasestorage.googleapis.com/v0/b/ssimple-product-feedback.firebasestorage.com/o/brand%2FTm80AQwbD2YesQKGEUY5quvSxU53.png');
			// const url = await getDownloadURL(ref(storage, 'brand/' + accountId + '.png'));
			const url = await getDownloadURL(httpsReference);
			setLogoUrl(url);
		} catch (error: any) {
			alert('Error getting logo: ' + error.message);
		}
	}

	const getSubmits = async (progress: string, sort: string, filter?: string) => {
		try {
			setIsItemModal(true);
			let querySnapshot;

			if (filter && filter === 'bug') {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), and(where('account_id', '==', accountId), where('status', '==', 'public'), where('type', '==', 'bug'), where('progress', '==', progress)), orderBy(sort, 'desc')));
			} else if (filter && filter === 'improve') {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), and(where('account_id', '==', accountId), where('status', '==', 'public'), or(where('type', '==', 'improve'), where('type', '==', 'feature')), where('progress', '==', progress)), orderBy(sort, 'desc')));
			} else {
				querySnapshot = await getDocs(query(collection(firestore, "submits"), and(where('account_id', '==', accountId), where('status', '==', 'public'), where('progress', '==', progress)), orderBy(sort, 'desc')));
			}

			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() as Submit }));
			setSubmits(foundData);
		} catch (error: any) {
			console.error('Error fetching feedback: ' + error.message);
		}
	}

	const getData = async (progress: string, sort: string, filter?: string) => {
		await getAccountData();
		if (accountId) {
			// await getLogoFile();
			await getSubmits(progress, sort, filter);
		}
		setIsLoading(false);
	}

	const getQuerySubmit = async (submitId: string) => {
		// const url = window.location.href.split('.ssimple')[0].split('https://')[1];
		const url = process.env.NEXT_PUBLIC_USER_URL;
		try {
			const accountSnapshot = await getDoc(doc(firestore, 'accounts', url));
			if (accountSnapshot.exists()) {
				const accountData = accountSnapshot.data();
				const accountId = accountData.account_id;
				const querySnapshot = await getDocs(query(collection(firestore, 'submits'), and(where('account_id', '==', accountId), where('_id', '==', submitId))));
				const foundData = await Promise.all(querySnapshot.docs.map(document => ({ ...document.data() })));
				const data = foundData[0] as Submit;
				if (data !== undefined) {
					if (data.status !== 'public') {
						alert('Private access only');
						router.push('/');
						enableScroll();
					}
					setItemData(data);
					setIsModalLoading(false);
				} else {
					alert('Topic not found');
					router.push('/');
					enableScroll();
				}
			}
		} catch (error: any) {
			console.error('Error getting query: ' + error.message);
		}
	}

	const handleSortClick = (val: string) => {
		setSort(val);
	}

	const handleFilterClick = (val: string) => {
		if (filter && filter === val) {
			setFilter('');
			return;
		}
		setFilter(val);
	}

	const showProgressLabel = (placement: string, progress: string) => {
		if (placement === 'board') switch (progress) {
			case 'in_progress':
				return (
					<div className="absolute -top-2 -right-2 text-sm font-semibold px-3 py-1 rounded-full" style={{ color: primaryColor, backgroundColor: 'white', borderColor: primaryColor, borderStyle: 'solid', borderWidth: '1px' }}>in progress</div>
				);

			case 'done':
				return (
					<div className="absolute -top-2 -right-2 text-sm font-semibold px-3 py-1 rounded-full" style={{ color: 'white', backgroundColor: primaryColor }}>done</div>
				);

			default:
				break;
		}

		if (placement === 'modal') switch (progress) {
			case 'in_progress':
				return <span className="text-sm px-2 py-1 rounded-full" style={{ color: primaryColor, backgroundColor: 'white', borderColor: primaryColor, borderStyle: 'solid', borderWidth: '1px' }}>In Progress</span>;

			case 'done':
				return <span className="text-sm px-2 py-1 rounded-full" style={{ color: 'white', backgroundColor: primaryColor }}>Done</span>;

			default:
				break;
		}
	}

	const handleModalOpen = async (modal: string, itemId?: string) => {
		disableScroll();

		if (modal === 'topic' && itemId) {
			setIsModalLoading(true);
			setIsItemModal(true);
			router.push('?topic=' + itemId);
			const querySnapshot = await getDoc(doc(firestore, 'submits', itemId));
			if (querySnapshot.exists()) {
				setItemData(querySnapshot.data() as Submit);
				setIsModalLoading(false);
			} else {
				alert('Error. Not found');
			}
		}

		if (modal === 'userEmail') setIsUserEmailModal(true);
	}

	const handleModalClose = (modal: string) => {
		if (modal === 'topic') {
			if (hasFiles) {
				setIsWarningModal(true);
				return;
			}
			setIsItemModal(false);
			setIsComment(false);
			setItemData(defaultItemData);
			setCommentContent('');
			setImpact('');
			setImpactFeedbackContent('');
			router.push(router.pathname, undefined, { scroll: false });
		}

		if (modal === 'userEmail') setIsUserEmailModal(false);
		if (modal === 'warning') setIsWarningModal(false);

		enableScroll();
	}

	const handleAction = async (action: string) => {
		if (action === 'cancelAttach') {
			try {
				for (const file of files) {
					const storageRef = ref(storage, 'uploads/comments/' + file._id);
					await deleteObject(storageRef);
					await deleteDoc(doc(firestore, 'uploads', file._id));
				}
				setFiles([]);
				setHasFiles(false);
				setIsWarningModal(false);
				setIsItemModal(false);
				setCommentContent('');
				setCommentFiles([]);
			} catch (error: any) {
				alert('Unable to delete object from storage: ' + error.message);
			}
		}
	}

	const handleAddFileStart = (type: string) => {
		setHasFiles(true);
		if (type === 'comment') setIsCommentSubmitActive(false);
	}

	const handleInputChange = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === 'email') setUserEmail(e.currentTarget.value);
	}

	const handleTextAreaChange = (type: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
		if (type === 'impactFeedback') setImpactFeedbackContent(e.currentTarget.value);
		if (type === 'comment') setCommentContent(e.currentTarget.value);
	}

	const handleImpactClick = async (impact: string) => {
		setIsImpactExpand(false);
		if (impact === 'strongly') setImpact('strongly');
		if (impact === 'agree') setImpact('agree');
		if (impact === 'disagree') setImpact('disagree');
	}

	const handleSubmit = async (type: string, e: React.FormEvent) => {
		e.preventDefault();
		const newId = uid(16);

		// if (typeof window !== 'undefined' && window.localStorage) {
		// 	localStorage.removeItem('userEmail');
		// 	localStorage.setItem('userEmail', userEmail);
		// }

		try {
			// get matching profile data from userEmail
			const querySnapshot = await getDocs(query(collection(firestore, "profiles"), where('email', '==', userEmail)));
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() as Profile }));
			// set profile data from userEmail
			if (foundData.length === 0) {
				const newProfile = {
					_id: newId,
					account_id: accountId,
					email: userEmail,
					type: ''
				}
				// await setDoc(doc(firestore, 'profiles', newId), newProfile);
			}

			if (type === 'impactFeedback') {
				const newVoter = {
					_id: newId,
					account_id: accountId,
					uid: '',
					name: '',
					email: userEmail,
					impact,
					feedback_content: impactFeedbackContent,
					submit_id: itemData._id,
					submit_title: itemData.title,
					created_at: Date.now(),
				}
				const newVoters = itemData.voters;
				newVoters.push(newVoter);
				const newItemData = {
					...itemData,
					voters: newVoters,
					votes: itemData.votes + (impact === 'disagree' ? 0 : 1),
				}
				// await setDoc(doc(firestore, 'submit_votes', newId), newVoter);
				// await setDoc(doc(firestore, 'submits', itemData._id), newItemData);
				setItemData(newItemData);
				setImpact('');
				setImpactFeedbackContent('');
			} else if (type === 'comment') {
				const publishedFiles = await Promise.all(files.map(async file => {
					file.status = 'published';
					file.parent_id = newId;
					// await setDoc(doc(firestore, 'uploads', file._id), file);
					return file;
				}));

				const newComment = {
					role: 'user',
					_id: newId,
					account_id: accountId,
					uid: '',
					name: '',
					email: userEmail,
					content: commentContent,
					files: publishedFiles,
					submit_id: itemData._id,
					submit_title: itemData.title,
					is_thread: false,
					thread_parent_id: null,
					thread_replies: [],
					status: 'public',
					created_at: Date.now(),
				}
				// await setDoc(doc(firestore, 'submit_comments', newId), newComment);

				// const newCommentArr: { _id: string }[] = itemData.comments;
				// newCommentArr.push({ _id: newId });
				// const newItemData = {
				// 	...itemData,
				// 	comments: newCommentArr
				// }
				// await setDoc(doc(firestore, 'submits', itemData._id), newItemData);

				setCommentContent('');
				setCommentFiles([]);
				setHasFiles(false);
			}
		} catch (error: any) {
			console.error('Error: ' + error.message);
		}
	}

	useEffect(() => {
		window.addEventListener('beforeunload', handleWindowClose);
		router.events.on('routeChangeStart', handleBrowseAway);
		return () => {
			window.removeEventListener('beforeunload', handleWindowClose);
			router.events.off('routeChangeStart', handleBrowseAway);
		}
	}, [hasFiles]);

	useEffect(() => {
		if (typeof window !== 'undefined' && window.localStorage) {
			const email = localStorage.getItem('userEmail');
			if (email) {
				setUserEmail(email);
				setIsUserEmail(true);
			}
		}
	}, []);

	useEffect(() => {
		getData(progress, sort, filter);
	}, [isLoading, accountId, isComment, commentContent, progress, sort, filter, itemData]);

	useEffect(() => {
		if (router.query.topic) {
			disableScroll();
			getQuerySubmit(router.query.topic.toString());
		}
	}, []);

	return (
		<>
			<Head>
				<title>{brandName} – Feedback</title>
			</Head>
			<div className="p-8 lg:mx-auto max-w-5xl">
				<div className="flex justify-between items-center mb-8">
					{isLoading ? (
						<div className="w-[160px] h-[50px] bg-zinc-200 animate-pulse rounded"></div>
					) : (
						<>
							<img src="https://firebasestorage.googleapis.com/v0/b/ssimple-product-feedback.firebasestorage.app/o/brand%2FTm80AQwbD2YesQKGEUY5quvSxU53.png?alt=media&token=e643f40e-b3bf-4e05-8d11-a74133b1e7f9" alt="logo" className="max-w-[160px] max-h-[50px]" />
						</>
					)}
					<div className="text-sm font-bold">
						THIS IS A DEMO
					</div>
					{/* {homeUrl && <Link href={homeUrl}
						style={{ color: primaryColor + 'CC' }}
						onMouseOver={e => e.currentTarget.style.color = primaryColor}
						onMouseLeave={e => e.currentTarget.style.color = primaryColor + 'CC'}
						className="text-sm font-bold transition-colors"
					>Visit our homepage</Link>} */}
				</div>
				<div className="p-4 sm:p-8 bg-zinc-100 rounded-lg space-y-4 mb-8">
					<div>
						{isLoading ? (
							<div className="h-12 bg-zinc-200 animate-pulse rounded"></div>
						) : (
							<h1 className="sm:text-xl font-medium">{boardTitle}</h1>
						)}
					</div>
					<div>
						<Link
							href="/new"
							style={{ backgroundColor: primaryColor + 'CC' }}
							onMouseOver={e => e.currentTarget.style.backgroundColor = primaryColor}
							onMouseLeave={e => e.currentTarget.style.backgroundColor = primaryColor + 'CC'}
							className="block sm:inline-block text-center px-4 py-2 text-white transition-colors rounded-lg font-bold"
						>Give Us Feedback
						</Link>
					</div>
				</div>
				<div className="space-y-8 mb-16">
					<div className="space-x-4">
						<button type="button"
							className={`sm:p-2 font-medium sm:text-xl transition-colors${progress === 'open' ? ' border-b-2 border-gray-600' : ' text-gray-400 hover:text-gray-500'}`}
							onClick={() => setProgress('open')}
						>Exploring</button>
						<button type="button"
							className={`sm:p-2 font-medium sm:text-xl transition-colors${progress === 'in_progress' ? ' border-b-2 border-gray-600' : ' text-gray-400 hover:text-gray-500'}`}
							onClick={() => setProgress('in_progress')}
						>In Progress</button>
						<button type="button"
							className={`sm:p-2 font-medium sm:text-xl transition-colors${progress === 'done' ? ' border-b-2 border-gray-600' : ' text-gray-400 hover:text-gray-500'}`}
							onClick={() => setProgress('done')}
						>Done</button>
					</div>
					<div className="space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center divide-y sm:divide-y-0 sm:divide-x">
							<div className="flex gap-2 sm:text-sm font-medium pb-2 sm:pb-0 sm:px-4">
								<button type="button"
									className={`px-2 py-1 ${sort === 'votes' ? 'bg-zinc-200' : 'bg-white'} hover:bg-zinc-200 transition-colors border rounded-full`}
									onClick={() => handleSortClick('votes')}
								>Popular</button>
								<button type="button"
									className={`px-2 py-1 ${sort === 'created_at' ? 'bg-zinc-200' : 'bg-white'} hover:bg-zinc-200 transition-colors border rounded-full`}
									onClick={() => handleSortClick('created_at')}
								>New</button>
							</div>
							<div className="flex gap-2 sm:text-sm font-medium pt-2 sm:pt-0 sm:px-4">
								<button type="button"
									className={`px-2 py-1 ${filter === 'bug' ? 'bg-zinc-200' : 'bg-white'} hover:bg-zinc-200 transition-colors border rounded-full`}
									onClick={() => handleFilterClick('bug')}
								>#Issue {filter === 'bug' ? <span className="text-gray-400 hover:text-gray-500 transition-colors"><i className="fas fa-times"></i></span> : null}
								</button>
								<button type="button"
									className={`px-2 py-1 ${filter === 'improve' ? 'bg-zinc-200' : 'bg-white'} hover:bg-zinc-200 transition-colors border rounded-full`}
									onClick={() => handleFilterClick('improve')}
								>#Suggestion {filter === 'improve' ? <span className="text-gray-400 hover:text-gray-500 transition-colors"><i className="fas fa-times"></i></span> : null}
								</button>
							</div>
						</div>
						<div>
							<ul className="divide-y">
								{isLoading ? (
									<div className="my-4 sm:px-4 sm:py-6 w-full">
										<div className="flex-1 text-left space-y-2 overflow-hidden">
											<div className="h-8 w-96 bg-zinc-200 animate-pulse rounded"></div>
											<div className="h-8 bg-zinc-200 animate-pulse rounded"></div>
											<div className="h-4 w-40 bg-zinc-200 animate-pulse rounded"></div>
										</div>
									</div>
								) : (
									<>
										{submits && submits.length > 0 ? submits.map(submit => (
											<li key={submit._id}>
												<button type="button"
													className="my-4 sm:px-4 sm:py-6 w-full hover:bg-zinc-100 rounded-lg transition-all"
													style={(submit.progress && submit.progress !== 'open') ? { borderColor: primaryColor } : undefined}
													onClick={() => handleModalOpen('topic', submit._id)}
												>
													<div className="flex items-center gap-2">
														<div className="flex-1 text-left space-y-2 overflow-hidden">
															<div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
																<span className="font-medium text-sm text-gray-400 px-2 py-1 bg-white border border-zinc-200 rounded-full">{renderType(submit.type)}</span>
																<h2 className="font-medium">{submit.title}</h2>
															</div>
															<div>
																<p className="truncate text-gray-500">{submit.desc}</p>
															</div>
															{submit.type !== 'bug' && <div>
																<Upvotes data={submit} userEmail={userEmail} primaryColor={primaryColor} />
															</div>}
														</div>
														<div className="text-center font-bold text-gray-400 w-[80px] lg:w-[100px]">
															<i className="far fa-comment"></i> {submit.comments?.length ?? '0'}
														</div>
													</div>
												</button>
											</li>
										)) : (
											<div className="px-4 py-6 w-full text-center font-medium text-gray-400">Nothing to show</div>
										)}
									</>
								)}
							</ul>
						</div>
					</div>
				</div>
			</div>
			{router.query.topic && isItemModal && <div className="fixed top-0 w-full h-full">
				{/* modal overlay */}
				<div className="fixed inset-0 bg-zinc-300 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full" onClick={() => handleModalClose('topic')}></div>
				{/* modal content */}
				<div className="relative m-4 md:mx-auto p-6 sm:px-12 sm:py-8 border md:w-[720px] max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded-lg bg-zinc-50">
					{isModalLoading ? (<Loading />) : (
						<>
							<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('topic')}><i className="fas fa-times"></i></button>
							<div className="space-y-4">
								<div className="space-y-4">
									<div className="space-x-2 font-medium">
										<span className="text-sm text-gray-400 px-2 py-1 border border-zinc-200 bg-white rounded-full">{renderType(itemData.type)}</span>
										{itemData.progress && showProgressLabel('modal', itemData.progress)}
									</div>
									<div>
										<h2 className="font-medium text-2xl grow">{itemData.title}</h2>
									</div>
									<div>
										<Linkify primaryColor={primaryColor}>{itemData.desc}</Linkify>
									</div>
									{itemData.type !== 'bug' && <div className="flex gap-4">
										<Upvotes data={itemData} userEmail={userEmail} primaryColor={primaryColor} />
										{itemData.voters.find(voter => voter.email === userEmail) && <div className="text-sm font-medium">You have voted</div>}
									</div>}
									{!itemData.voters.find(voter => voter.email === userEmail) && <>
										{itemData.type === 'bug' ? (
											<></>
										) : (
											<div className="space-y-2">
												<div>
													<button type="button"
														className={`w-full sm:w-[300px] flex justify-between items-center p-2 font-medium border border-zinc-400 bg-white rounded-lg${isImpactExpand ? ' rounded-b-none text-gray-400' : ''}`}
														onClick={() => setIsImpactExpand(!isImpactExpand)}
													>
														{(isImpactExpand || !impact) && 'Do you agree with this suggestion?'}
														{(!isImpactExpand && impact === 'strongly') && 'Strongly agree'}
														{(!isImpactExpand && impact === 'agree') && 'Agree'}
														{(!isImpactExpand && impact === 'disagree') && 'Disagree'}
														<i className={`fas fa-chevron-${isImpactExpand ? 'up' : 'down'}`}></i></button>
													{isImpactExpand && <div className="absolute w-full sm:w-[300px] flex flex-col items-start font-medium border border-zinc-400 border-t-0 rounded-t-none bg-white rounded-lg divide-y">
														<button type="button"
															className="w-full p-2 text-left hover:bg-zinc-100 transition-colors"
															onClick={() => handleImpactClick('strongly')}
														>Strongly agree</button>
														<button type="button"
															className="w-full p-2 text-left hover:bg-zinc-100 transition-colors"
															onClick={() => handleImpactClick('agree')}
														>Agree</button>
														<button type="button"
															className="w-full p-2 text-left hover:bg-zinc-100 transition-colors"
															onClick={() => handleImpactClick('disagree')}
														>Disagree</button>
													</div>}
												</div>
												{impact && <form className="space-y-2" onSubmit={e => handleSubmit('impactFeedback', e)}>
													<div className="space-y-1">
														<label htmlFor="impactFeedback" className="font-medium">Why do you {impact === 'strongly' ? 'strongly agree' : impact} with this suggestion? <span className="text-gray-400">(Optional. Only seen by our team)</span></label>
														<textarea
															id="impactFeedback"
															className="w-full border rounded-lg p-2"
															rows={3}
															placeholder="This is a demo. No feedback will be posted."
															value={impactFeedbackContent}
															onChange={e => handleTextAreaChange('impactFeedback', e)}
															onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
															maxLength={10000}
														/>
													</div>
													<div className="flex flex-col sm:flex-row gap-2">
														<div className="sm:grow">
															<input type="email"
																name="email"
																className="w-full border rounded-lg p-2"
																value={userEmail}
																placeholder="Your email"
																onChange={e => handleInputChange('email', e)}
																onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
																maxLength={320}
																required
															/>
														</div>
														<div>
															<button type="submit"
																className="w-full sm:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
																style={isCommentSubmitActive ? { backgroundColor: primaryColor + 'CC' } : { backgroundColor: '#E2E8F0' }}
																onMouseOver={isCommentSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor : undefined}
																onMouseLeave={isCommentSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor + 'CC' : undefined}
																disabled={isCommentSubmitActive ? false : true}
															>Vote</button>
														</div>
													</div>
												</form>}
											</div>
										)}
									</>}
									{itemData.images && itemData.images.length > 0 && <div>
										<ul className="space-y-2">
											{itemData.images.map(image => {
												if (image.status === 'published') return (
													<li key={image._id} className="p-2 bg-slate-100 rounded">
														<img src={image.download_url} />
													</li>
												);
											})}
										</ul>
									</div>}
									{itemData.files && itemData.files.length > 0 && <div>
										<ul className="space-y-2">
											{itemData.files.map(file => {
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
								</div>
								<hr />
								<div className="space-y-8 py-8">
									{itemData.comments?.length > 0 ? (
										<div>
											<ul className="space-y-4">
												{itemData.comments.map((comment, i) => {
													if (comment.status !== 'private') {
														const isRepliable = (isUserEmail && itemData.voters.find(voter => voter.email === userEmail)) ? true : false;
														return (
															<Comment
																key={i}
																commentId={comment._id}
																primaryColor={primaryColor}
																isRepliable={false}
																userEmail={userEmail}
																submitId={itemData._id}
																submitTitle={itemData.title}
																setHasFiles={setHasFiles}
															/>
														);
													}
												})}
											</ul>
										</div>
									) : (
										<div className="px-2">
											<p className="text-gray-400">Be the first to comment</p>
										</div>
									)}
									<form className="space-y-2" onSubmit={e => handleSubmit('comment', e)}>
										<div>
											<textarea
												className="w-full border rounded-lg p-2"
												rows={3}
												placeholder="This is a demo. No comment will be posted."
												value={commentContent}
												onChange={e => handleTextAreaChange('comment', e)}
												onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
												maxLength={10000}
												required
											/>
										</div>
										<div className="flex flex-col sm:flex-row gap-2">
											<div className="sm:grow">
												<input type="email"
													name="email"
													className="w-full border rounded-lg p-2"
													value={userEmail}
													placeholder="Your email"
													onChange={e => handleInputChange('email', e)}
													onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
													maxLength={320}
													required
												/>
											</div>
											<div>
												<button type="submit"
													className="w-full sm:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
													style={isCommentSubmitActive ? { backgroundColor: primaryColor + 'CC' } : { backgroundColor: '#E2E8F0' }}
													onMouseOver={isCommentSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor : undefined}
													onMouseLeave={isCommentSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor + 'CC' : undefined}
													disabled={isCommentSubmitActive ? false : true}
												>Comment</button>
											</div>
										</div>
									</form>
								</div>
							</div>
						</>
					)}
				</div>
			</div>}
			{isUserEmailModal && <div className="fixed top-0 w-full h-full">
				{/* modal overlay */}
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={() => handleModalClose('userEmail')}></div>
				{/* modal content */}
				<div className="relative md:top-20 m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
					<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('userEmail')}><i className="fas fa-times"></i></button>
					<div className="mb-4">
						<p>Your email is used to remember your posts, upvotes, and comments. You also get notified when the topic you care about has an update.</p>
					</div>
					<div>
						<form className="gap-x-2 flex flex-col md:flex-row" onSubmit={e => handleSubmit('userEmail', e)}>
							<input
								type="email"
								name="email"
								className="border rounded-lg p-2"
								placeholder="Your email"
								onChange={e => handleInputChange('email', e)}
								onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
								maxLength={320}
								required
							/>
							<button
								type="submit"
								className="px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
								style={{ backgroundColor: primaryColor + 'CC' }}
								onMouseOver={e => e.currentTarget.style.backgroundColor = primaryColor}
								onMouseLeave={e => e.currentTarget.style.backgroundColor = primaryColor + 'CC'}
							>{isUserEmail ? 'Update Email' : 'Continue as Guest'}</button>
						</form>
					</div>
				</div>
			</div>}
			{isWarningModal && <div className="fixed top-0 w-full h-full flex z-20">
				{/* modal overlay */}
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full"></div>
				{/* modal content */}
				<div className="relative m-auto p-8 border md:min-w-[300px] md:w-1/4 overflow-y-scroll shadow-lg rounded bg-white">
					<div className="mb-4 space-y-2">
						<h2 className="font-bold text-2xl">Are you sure to cancel?</h2>
						<p>You will lose all unsaved content</p>
					</div>
					<div className="flex flex-col md:flex-row md: justify-end gap-2">
						<button className="px-4 py-2 bg-red-400 rounded-lg font-bold text-white" onClick={() => handleAction('cancelAttach')}>Yes</button>
						<button className="px-4 py-2 bg-zinc-200 rounded-lg font-bold" onClick={() => handleModalClose('warning')}>No</button>
					</div>
				</div>
			</div>}
			{/* <div className="fixed right-2 sm:right-8 bottom-2 sm:bottom-6 px-3 pt-0.5 pb-1 border border-zinc-400 rounded-full bg-white">
				<span className="font-bold text-sm text-gray-400 hover:text-gray-500 transition-colors"><a href="https://ssimple.co" target="_blank">Powered by ssimple</a></span>
			</div> */}
		</>
	);
}