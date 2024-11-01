import React, { useState, useEffect } from "react";
import Router, { useRouter } from "next/router";
import { uid } from "uid";
import { firestore } from "../config/firebase";
import { doc, getDoc, collection, getDocs, setDoc, orderBy, query, deleteDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";

import "filepond/dist/filepond.min.css";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";

import Upvotes from "../components/Upvotes";
import Loading from "../components/Loading";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

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

function maskEmail(str) {
	return str[0] + '*'.repeat(str.length - 2) + str.substring(str.length - 1);
}

const renderType = (type: string) => {
	if (type === 'bug') {
		return 'bug';
	}
	if (type === 'feature') {
		return 'missing feature';
	}
	if (type === 'improve') {
		return 'improvement';
	}
}

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const brandUrl = process.env.NEXT_PUBLIC_BRAND_URL;

const sendEmail = async (type: string, email: string, topicId: string) => {
	if (type === 'newSubmitNotifyUser') {
		const response = await fetch('api/send', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				email,
				subject: "Thank you for sharing your feedback",
				html: "<p>Link to your feedback post: <a href='https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "' target='_blank'>https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "</a></p>"
			})
		});
		return response.json();
	}

	if (type === 'newSubmitNotifyAdmin') {
		const response = await fetch('api/send', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				email,
				subject: "New Feedback Submission Received",
				html: "<p>Link to new submitted post: <a href='https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "' target='_blank'>https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "</a></p>"
			})
		});
		return response.json();
	}
}

const storage = getStorage();

const defaultSubmitData = {
	_id: '',
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
	created_at: 0,
}

const deleteFileFromStorage = (id: string) => {
	const storageRef = ref(storage, 'uploads/topics/' + id);
	deleteObject(storageRef).catch(error => error);
}

let imagesToPublish: { _id: string, type: string, status: string, downloadUrl: string, created_at: number }[] = [];

const server = {
	process: (fieldName, file, metadata, load, error, progress, abort) => {
		const id = uid(16);
		const storageRef = ref(storage, 'uploads/topics/' + id);
		const uploadTask = uploadBytesResumable(storageRef, file);
		let downloadUrl = '';

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
					downloadUrl = url;
					const newUploadObj = {
						_id: id,
						type: 'image',
						status: 'pending',
						downloadUrl,
						created_at: Date.now()
					}
					setDoc(doc(firestore, 'uploads', id), newUploadObj).then(() => {
						imagesToPublish.push(newUploadObj);
					}).catch(err => error(err));
				});
			}
		);

		return {
			abort: () => {
				uploadTask.cancel();
				deleteDoc(doc(firestore, 'uploads', id)).then(() => {
					imagesToPublish.pop();
					abort();
				}).catch(err => error(err));
			}
		}
	},
	revert: (uniqueFileId, load, error) => {
		const newImagesToUpload = imagesToPublish.filter(({ _id }) => _id !== uniqueFileId);
		imagesToPublish = newImagesToUpload;
		const storageRef = ref(storage, 'uploads/topics/' + uniqueFileId);
		deleteObject(storageRef).then(() => {
			deleteDoc(doc(firestore, 'uploads', uniqueFileId)).then(() => {
				load();
			}).catch(err => error(err));
		}).catch(err => {
			error(err.message);
		});
	}
}

const warningText = 'You have unsaved content - are you sure you wish to leave this page?';

const handleWindowClose = (e) => {
	if (imagesToPublish.length === 0) return;
	e.preventDefault();
	return (e.returnValue = warningText);
}

const handleBrowseAway = () => {
	if (imagesToPublish.length === 0) return;
	if (window.confirm(warningText)) return;
	Router.events.emit('routeChangeError');
	throw 'routeChange aborted.';
}

export default function Issues() {
	const [isLoading, setIsLoading] = useState(true);
	const [isModalLoading, setIsModalLoading] = useState(true);
	const [isItemModal, setIsItemModal] = useState(false);
	const [isNewModal, setIsNewModal] = useState(false);
	const [isUserEmailModal, setIsUserEmailModal] = useState(false);
	const [isComment, setIsComment] = useState(false);
	const [isWarningModal, setIsWarningModal] = useState(false);

	const [logoUrl, setLogoUrl] = useState('');
	const [submits, setSubmits] = useState([]);
	const [itemData, setItemData] = useState(defaultSubmitData);
	const [submitData, setSubmitData] = useState(defaultSubmitData);
	const [newSubmitType, setNewSubmitType] = useState('bug');
	const [userEmail, setUserEmail] = useState('');
	const [commentContent, setCommentContent] = useState('');
	const [sort, setSort] = useState('votes');

	const router = useRouter();

	useEffect(() => {
		window.addEventListener('beforeunload', handleWindowClose);
		router.events.on('routeChangeStart', handleBrowseAway);
		return () => {
			window.removeEventListener('beforeunload', handleWindowClose);
			router.events.off('routeChangeStart', handleBrowseAway);
		}
	}, [imagesToPublish.length]);

	useEffect(() => {
		if (typeof window !== 'undefined' && window.localStorage) {
			const email = localStorage.getItem('userEmail');
			if (email) setUserEmail(email);
		}
	}, []);

	useEffect(() => {
		getDownloadURL(ref(storage, 'brand/logo.png'))
			.then(url => setLogoUrl(url))
			.catch(error => alert('Logo not found'));
	}, []);

	const getQuerySubmit = async (submitId: string) => {
		const querySnapshot = await getDoc(doc(firestore, 'submits', submitId));
		if (querySnapshot.exists()) {
			setItemData(querySnapshot.data());
			setIsModalLoading(false);
		} else {
			alert('Error. Not found');
		}
	}

	useEffect(() => {
		if (router.query.topic) {
			disableScroll();
			getQuerySubmit(router.query.topic);
		}
	}, []);

	const getSubmits = async (sort) => {
		setIsItemModal(true);
		const querySnapshot = await getDocs(query(collection(firestore, "submits"), orderBy(sort, 'desc')));
		const foundSubmits = querySnapshot.docs.map(doc => {
			return { ...doc.data() }
		});
		setSubmits(foundSubmits);
		setIsLoading(false);
	}

	useEffect(() => {
		getSubmits(sort);
	}, [isLoading, isComment, commentContent, sort]);

	const handleModalOpen = async (type: string, itemId?: string) => {
		disableScroll();

		if (type === 'topic') {
			setIsModalLoading(true);
			setIsItemModal(true);
			router.push('?topic=' + itemId);
			const querySnapshot = await getDoc(doc(firestore, 'submits', itemId));
			if (querySnapshot.exists()) {
				setItemData(querySnapshot.data());
				setIsModalLoading(false);
			} else {
				alert('Error. Not found');
			}
		}

		if (type === 'new') {
			setIsNewModal(true);
		}

		if (type === 'userEmail') {
			setIsUserEmailModal(true);
		}
	}

	const handleModalClose = (type) => {
		if (type === 'topic') {
			setIsItemModal(false);
			setIsComment(false);
			router.push(router.pathname, undefined, { scroll: false });
			setItemData(defaultSubmitData);
		}

		if (type === 'new') {
			if (imagesToPublish.length !== 0) {
				setIsWarningModal(true);
				return;
			}
			setIsNewModal(false);
			setNewSubmitType('bug');
		}

		if (type === 'userEmail') {
			setIsUserEmailModal(false);
		}
		enableScroll();

		if (type === 'warning') {
			setIsWarningModal(false);
		}

		if (type === 'cancelNew') {
			imagesToPublish.forEach(({ _id }) => {
				const error = deleteFileFromStorage(_id);
				if (error) {
					console.log(error.message);
				}
				deleteDoc(doc(firestore, 'uploads', _id)).catch(error => console.log(error));
			});
			imagesToPublish = [];
			setIsWarningModal(false);
			setIsNewModal(false);
			setNewSubmitType('bug');
		}
	}

	const handleInputChange = (type: string, field: string, e: React.SyntheticEvent) => {
		if (type === 'new') {
			const newData = {
				...submitData
			}
			newData[field] = e.target.value;
			setSubmitData(newData);
			if (field === 'type') {
				setNewSubmitType(e.target.value);
			}
		}

		if (type === 'comment') {
			setCommentContent(e.target.value);
		}
	}

	const handleImpactClick = async (impact: number) => {
		setIsComment(true);
		const newId = uid(16);
		const newVoter = {
			_id: newId,
			uid: '',
			name: '',
			email: userEmail,
			impact,
			submit_id: itemData._id,
			submit_title: itemData.title,
			created_at: Date.now(),
		}
		const newVoters = itemData.voters;
		newVoters.push(newVoter);
		const newItemData = {
			...itemData,
			voters: newVoters,
			votes: itemData.votes + (impact === 0 ? null : 1),
		}
		await setDoc(doc(firestore, 'submit_votes', newId), newVoter);
		await setDoc(doc(firestore, 'submits', itemData._id), newItemData);
		setItemData(newItemData);
		setIsLoading(true);
	}

	const handleSubmit = async (type: string, e: React.SyntheticEvent) => {
		e.preventDefault();
		const newId = uid(16);

		if (type === 'new') {
			const newVoterId = uid(16);
			const newVoter = {
				_id: newVoterId,
				uid: '',
				name: '',
				email: userEmail,
				impact: 2,
				submit_id: newId,
				submit_title: submitData.title,
				created_at: Date.now(),
			}

			const publishedImages = imagesToPublish.map(obj => {
				obj.status = 'published';
				setDoc(doc(firestore, 'uploads', obj._id), obj);
				return obj;
			});

			const newData = {
				...submitData,
				_id: newId,
				email: userEmail,
				voters: [newVoter],
				images: publishedImages,
				created_at: Date.now(),
			}
			try {
				await setDoc(doc(firestore, 'submit_votes', newVoterId), newVoter);
				await setDoc(doc(firestore, 'submits', newId), newData);
				sendEmail('newSubmitNotifyUser', userEmail, newId);
				sendEmail('newSubmitNotifyAdmin', adminEmail, newId);
				setSubmitData(defaultSubmitData);
				window.removeEventListener('beforeunload', handleWindowClose);
				router.events.off('routeChangeStart', handleBrowseAway);
				router.reload();
			} catch (error) {
				alert('Something went wrong. Please contact us')
			}
		}

		if (type === 'userEmail') {
			setUserEmail(e.target.email.value);
			if (typeof window !== 'undefined' && window.localStorage) {
				localStorage.removeItem('userEmail');
				localStorage.setItem('userEmail', e.target.email.value);
			}
			handleModalClose('userEmail');
		}

		if (type === 'comment') {
			const newComment = {
				role: 'user',
				_id: newId,
				uid: '',
				name: '',
				email: userEmail,
				content: commentContent,
				submit_id: itemData._id,
				submit_title: itemData.title,
				created_at: Date.now(),
			}
			const newCommentArr = itemData.comments;
			newCommentArr.push(newComment);
			const newItemData = {
				...itemData,
				comments: newCommentArr
			}
			await setDoc(doc(firestore, 'submit_comments', newId), newComment);
			await setDoc(doc(firestore, 'submits', itemData._id), newItemData);
			setCommentContent('');
		}
	}

	return (
		<>
			<div className="m-8 xl:mx-auto md:mb-24 xl:max-w-6xl">
				<div className="mb-16 flex justify-between items-center">
					<div className="max-w-[100px] md:max-w-[160px] max-h-[80px]">
						{logoUrl && <img src={logoUrl} alt="logo" className="w-full" />}
					</div>
					<div>
						<span>{userEmail ?? ''} <button type="button" className="text-primary/80 hover:text-primary transition-colors font-bold text-sm" onClick={() => handleModalOpen('userEmail')}>{userEmail ? 'change email' : 'Interact as guest'}</button></span>
					</div>
				</div>
				<div className="mb-8 space-y-2">
					<h1 className="text-3xl font-bold">Experiencing issues or would like to request a feature?</h1>
					<p>Encountered a bug? Couldn't figure out how to do something? Wish there was a feature that isn't there? Share your thoughts or comment on ones posted by others.</p>
				</div>
				<div className="mb-1">
					<span className="text-sm text-gray-300">powered by </span>
					<span className="text-sm font-bold text-gray-400 hover:text-gray-500"><a href="https://ssimple.co" target="_blank">ssimple</a></span>
				</div>
				<div className="flex space-x-8">
					<div className="bg-slate-50 px-4 py-8 md:p-8 rounded border w-full">
						<div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-4 mb-8">
							<div className="flex flex-col md:flex-row md:items-center text-gray-400 gap-2">
								<span>Sort by:</span>
								<select className="border px-2 py-1 rounded" value={sort} onChange={e => setSort(e.target.value)}>
									<option value="votes">Most popular <i className="fas fa-chevron-down"></i></option>
									<option value="created_at">Newest <i className="fas fa-chevron-down"></i></option>
								</select>
							</div>
							<div>
								<button type="button" className="w-full md:w-auto px-4 py-2 bg-primary/80 hover:bg-primary text-white transition-colors rounded font-bold" onClick={() => handleModalOpen('new')}><i className="far fa-comment-dots"></i> Share Your Thoughts</button>
							</div>
						</div>
						<ul className="space-y-4">
							{!isLoading && submits?.map(submit => (
								<li key={submit._id}>
									<button type="button" className="flex flex-col md:flex-row items-center border px-4 py-6 rounded bg-white w-full gap-4 hover:shadow-md transition-shadow" onClick={() => handleModalOpen('topic', submit._id)}>
										<Upvotes
											data={submit}
											userEmail={userEmail}
										/>
										<div className="w-full grow text-left space-y-2">
											<div className="space-x-2">
												<h2 className="font-medium">{submit.title}</h2>
											</div>
											<div>
												<p className="text-gray-400">{submit.desc.length < 200 ? submit.desc : submit.desc.substring(0, 200) + "..."}</p>
											</div>
											<div>
												<span className="text-sm text-gray-400 px-2 py-1 bg-slate-100 rounded-full">{renderType(submit.type)}</span>
											</div>
										</div>
										<div className="text-left md:text-center md:ml-auto font-bold text-gray-400 md:px-4 w-full md:w-auto min-w-[100px]">
											<i className="far fa-comment"></i> {submit.comments.length ?? '0'}
										</div>
									</button>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
			{router.query.topic && isItemModal &&
				<div className="fixed top-0 w-full h-full">
					{/* modal overlay */}
					<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={() => handleModalClose('topic')}></div>
					{/* modal content */}
					<div className="relative md:top-20 m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
						{isModalLoading ? (<Loading />) : (
							<>
								<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('topic')}><i className="fas fa-times"></i></button>
								<div className="space-y-2 mb-4">
									<div className="flex flex-col md:flex-row md:items-center gap-2">
										<Upvotes
											data={itemData}
											userEmail={userEmail}
										/>
										<h2 className="font-bold text-2xl grow">{itemData?.title}</h2>
									</div>
									<div>
										<span className="text-sm text-gray-400 px-2 py-1 bg-slate-100 rounded-full">{renderType(itemData.type)}</span>
									</div>
									<div>
										<p>{itemData?.desc}</p>
									</div>
									{itemData?.images?.length > 0 &&
										<div>
											<ul className="space-y-2">
												{itemData?.images?.map(image => (
													<li key={image._id} className="p-2 bg-slate-100 rounded">
														<img src={image.downloadUrl} />
													</li>
												))}
											</ul>
										</div>
									}
								</div>
								<div className="pt-8 md:p-8 border-t">
									{itemData?.comments?.length ? (
										<div className="space-y-4 mb-8">
											{itemData?.comments.map(comment => (
												<div className="space-y-1" key={comment._id}>
													<div className={`flex items-center gap-1 ${comment.role === 'admin' ? 'text-primary/80' : 'text-gray-500'}`}>
														<i className="fas fa-user-circle"></i>
														<span className="text-xs">{comment.role === 'admin' ? 'Admin' : maskEmail(comment.email)}</span>
													</div>
													<div className={`ml-4 p-3 rounded ${comment.role === 'admin' ? 'bg-primary/10' : 'bg-slate-50'}`}>{comment.content}</div>
												</div>
											))}
										</div>
									) : (
										<div className="mb-8">
											<p className="text-gray-300">Be the first to comment</p>
										</div>
									)}
									{!userEmail &&
										<div>
											<form className="gap-2 flex flex-col md:flex-row" onSubmit={e => handleSubmit('userEmail', e)}>
												<input type="email" name="email" className="border rounded p-2" placeholder="Your email" required />
												<button type="submit" className="px-4 py-2 bg-primary/80 text-white font-bold rounded hover:bg-primary transition-colors focus:outline-none">Use Email to Comment</button>
											</form>
										</div>
									}
									{userEmail &&
										<div>
											{(!isComment && !itemData.voters.find(voter => voter.email === userEmail)) &&
												<>
													<h3 className="mb-2">Are you impacted by this?</h3>
													<div className="flex flex-col md:flex-row gap-2">
														<button type="button" className="py-2 w-full rounded font-bold bg-primary/10 hover:bg-primary/30 flex flex-col items-center transition-colors" onClick={() => handleImpactClick(2)}>
															<span className="text-primary/80">Yes. Deeply</span>
														</button>
														<button type="button" className="py-2 w-full rounded font-bold bg-primary/10 hover:bg-primary/30 flex flex-col items-center transition-colors" onClick={() => handleImpactClick(1)}>
															<span className="text-primary/80">Somewhat</span>
														</button>
														<button type="button" className="py-2 w-full rounded font-bold bg-primary/10 hover:bg-primary/30 flex flex-col items-center transition-colors" onClick={() => handleImpactClick(0)}>
															<span className="text-primary/80">Not at all (no upvote)</span>
														</button>
													</div>
												</>
											}
											{(isComment || itemData.voters.find(voter => voter.email === userEmail)) &&
												<form className="space-y-1" onSubmit={e => handleSubmit('comment', e)}>
													<div>
														<textarea className="border rounded w-full p-2" rows={3} placeholder="Leave a comment?" value={commentContent} onChange={e => handleInputChange('comment', 'content', e)} required />
													</div>
													<div className="text-right">
														<button type="submit" className="w-full md:w-auto px-4 py-2 bg-primary/80 text-white font-bold rounded hover:bg-primary transition-colors focus:outline-none">Comment</button>
													</div>
												</form>
											}
										</div>
									}
								</div>
							</>
						)}
					</div>
				</div>
			}
			{isNewModal &&
				<div className="fixed top-0 w-full h-full">
					{/* modal overlay */}
					<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={() => handleModalClose('new')}></div>
					{/* modal content */}
					<div className="relative m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
						<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('new')}><i className="fas fa-times"></i></button>
						<div className="mb-4">
							<h2 className="font-bold text-2xl mb-4">Share your issue or struggle</h2>
						</div>
						{!userEmail &&
							<div>
								<form className="gap-2 flex flex-col md:flex-row" onSubmit={e => handleSubmit('userEmail', e)}>
									<input type="email" name="email" className="border rounded p-2" placeholder="Your email" required />
									<button type="submit" className="px-4 py-2 bg-primary/80 text-white font-bold rounded hover:bg-primary transition-colors focus:outline-none">Use Email to Post</button>
								</form>
							</div>
						}
						{userEmail &&
							<div>
								<form className="space-y-2" onSubmit={e => handleSubmit('new', e)}>
									<div>
										<input type="text" name="title" className="border rounded w-full p-2" placeholder="Your issue or struggle in one simple sentence" onChange={e => handleInputChange('new', 'title', e)} required />
									</div>
									<div>
										<textarea className="border rounded w-full p-2" rows={5} placeholder="Details about your experience" onChange={e => handleInputChange('new', 'desc', e)} required />
									</div>
									<div className="space-y-1">
										<div>
											<h3 className="font-bold">Attach images</h3>
										</div>
										<div>
											<FilePond
												acceptedFileTypes={[
													'image/png',
													'image/gif',
													'image/jpeg',
													'image/jpg',
													'image/webp'
												]}
												labelFileTypeNotAllowed="Format not allowed"
												maxFileSize="10MB"
												allowMultiple={true}
												maxFiles={5}
												server={server}
												labelIdle='Drop your image here or <span class="filepond--label-action">Browse</span> (max 10MB)'
												credits={false}
											/>
										</div>
									</div>
									<div className="space-y-1">
										<div>
											<h3 className="font-bold">Type of feedback</h3>
										</div>
										<div className="flex flex-col md:flex-row gap-2 font-semibold">
											<label htmlFor="bug" className={`${newSubmitType === 'bug' ? 'bg-primary/80 text-white font-medium' : 'text-primary'} cursor-pointer px-4 py-2 rounded-full border border-primary/80`}>
												<input className="hidden" type="radio" name="type" value="bug" id="bug" onChange={e => handleInputChange('new', 'type', e)} checked={newSubmitType === 'bug' ? true : false} required />
												<span>Bug</span>
											</label>
											<label htmlFor="feature" className={`${newSubmitType === 'feature' ? 'bg-primary/80 text-white font-medium' : 'text-primary'} cursor-pointer px-4 py-2 rounded-full border border-primary/80`}>
												<input className="hidden" type="radio" name="type" value="feature" id="feature" onChange={e => handleInputChange('new', 'type', e)} checked={newSubmitType === 'feature' ? true : false} />
												<span>Missing feature</span>
											</label>
											<label htmlFor="improve" className={`${newSubmitType === 'improve' ? 'bg-primary/80 text-white font-medium' : 'text-primary'} cursor-pointer px-4 py-2 rounded-full border border-primary/80`}>
												<input className="hidden" type="radio" name="type" value="improve" id="improve" onChange={e => handleInputChange('new', 'type', e)} checked={newSubmitType === 'improve' ? true : false} />
												<span>Improvement</span>
											</label>
										</div>
									</div>
									<div className="text-right pt-4">
										<button type="submit" className="w-full md:w-auto px-4 py-2 bg-primary/80 text-white font-bold rounded hover:bg-primary transition-colors focus:outline-none">Post</button>
									</div>
								</form>
							</div>
						}
					</div>
				</div>
			}
			{isUserEmailModal &&
				<div className="fixed top-0 w-full h-full">
					{/* modal overlay */}
					<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={() => handleModalClose('userEmail')}></div>
					{/* modal content */}
					<div className="relative md:top-20 m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
						<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('userEmail')}><i className="fas fa-times"></i></button>
						<div className="mb-4">
							<p>Your email is used to remember your posts, upvotes, and comments. You also get notified whenever the topic you care about has an update.</p>
						</div>
						<div>
							<form className="gap-x-2 flex flex-col md:flex-row" onSubmit={e => handleSubmit('userEmail', e)}>
								<input type="email" name="email" className="border rounded p-2" placeholder="Your email" required />
								<button type="submit" className="px-4 py-2 bg-primary/80 text-white font-bold rounded hover:bg-primary transition-colors focus:outline-none">{userEmail ? 'Update Email' : 'Continue as Guest'}</button>
							</form>
						</div>
					</div>
				</div>
			}
			{isWarningModal &&
				<div className="fixed top-0 w-full h-full flex">
					{/* modal overlay */}
					<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full"></div>
					{/* modal content */}
					<div className="relative m-auto p-8 border md:min-w-[300px] md:w-1/4 overflow-y-scroll shadow-lg rounded bg-white">
						<div className="mb-4 space-y-2">
							<h2 className="font-bold text-2xl">Are you sure?</h2>
							<p>You will lose all unsaved content</p>
						</div>
						<div className="flex flex-col md:flex-row md: justify-end gap-2">
							<button className="px-4 py-2 bg-red-400 rounded font-bold text-white" onClick={() => handleModalClose('cancelNew')}>Yes</button>
							<button className="px-4 py-2 bg-slate-200 rounded font-bold" onClick={() => handleModalClose('warning')}>No</button>
						</div>
					</div>
				</div>
			}
		</>
	);
}