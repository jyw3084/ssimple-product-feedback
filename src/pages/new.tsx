import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { uid } from "uid";
import { firestore } from "@/config/firebase";
import { doc, getDoc, setDoc, deleteDoc, getDocs, query, where, collection } from "firebase/firestore";
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

import Loading from "@/components/Loading";

import type { AccountSettings, File, Submit, Profile } from "@/utils/types";
import type { ProcessServerConfigFunction, RevertServerConfigFunction } from "filepond";

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginMediaPreview, FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

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
	files: [],
	bug_files: [],
	console_log: [],
	status: 'public',
	progress: 'open',
	device_info: '',
	created_at: 0,
}

export default function New() {
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitActive, setIsSubmitActive] = useState(true);
	const [isUpdateEmail, setIsUpdateEmail] = useState(false);
	const [hasFiles, setHasFiles] = useState(false);
	const [isExpand, setIsExpand] = useState(false);

	const [accountId, setAccountId] = useState('');
	const [logoUrl, setLogoUrl] = useState('');
	const [userEmail, setUserEmail] = useState('');
	const [adminEmail, setAdminEmail] = useState('');
	const [primaryColor, setPrimaryColor] = useState('#1E293B');
	const [brandName, setBrandName] = useState('');
	const [brandUrl, setBrandUrl] = useState('');
	const [submitType, setSubmitType] = useState('bug');
	const [submitTitle, setSubmitTitle] = useState('');
	const [submitDesc, setSubmitDesc] = useState('');
	const [submitStatus, setSubmitStatus] = useState('public');
	const [submitData, setSubmitData] = useState<Submit>(defaultSubmitData);
	const [files, setFiles] = useState<File[]>([]);

	const router = useRouter();
	const server: { process: ProcessServerConfigFunction, revert: RevertServerConfigFunction } = {
		process: (fieldName, file, metadata, load, error, progress, abort) => {
			// const id = uid(16);
			// const storageRef = ref(storage, 'uploads/topics/' + id);
			// const uploadTask = uploadBytesResumable(storageRef, file);
			// const fileType = file.type.split('/')[0];

			// uploadTask.on('state_changed',
			// 	snapshot => {
			// 		progress(true, snapshot.bytesTransferred, snapshot.totalBytes);
			// 	},
			// 	err => {
			// 		error(err.message);
			// 	},
			// 	() => {
			// 		load(id);
			// 		getDownloadURL(storageRef).then(url => {
			// 			const newUploadObj = {
			// 				_id: id,
			// 				account_id: accountId,
			// 				type: fileType,
			// 				parent_type: 'topic',
			// 				parent_id: '',
			// 				status: 'pending',
			// 				download_url: url,
			// 				created_at: Date.now()
			// 			}
			// 			setDoc(doc(firestore, 'uploads', id), newUploadObj).then(() => {
			// 				const newFiles = files;
			// 				newFiles.push(newUploadObj);
			// 				setFiles(newFiles);
			// 				setIsSubmitActive(true);
			// 			}).catch(err => error(err));
			// 		});
			// 	}
			// );

			// return {
			// 	abort: () => {
			// 		uploadTask.cancel();
			// 		deleteDoc(doc(firestore, 'uploads', id)).then(() => {
			// 			const newFiles = files;
			// 			newFiles.pop();
			// 			setFiles(newFiles);
			// 			abort();
			// 		}).catch(err => error(err));
			// 	}
			// }
		},
		revert: (uniqueFileId, load, error) => {
			// const currentFiles = files;
			// const newFiles = currentFiles.filter(({ _id }) => _id !== uniqueFileId);
			// setFiles(newFiles);
			// if (newFiles.length === 0) setHasFiles(false);
			// const storageRef = ref(storage, 'uploads/topics/' + uniqueFileId);
			// deleteObject(storageRef).then(() => {
			// 	deleteDoc(doc(firestore, 'uploads', uniqueFileId)).then(() => {
			// 		load();
			// 	}).catch(err => error(err));
			// }).catch(err => {
			// 	error(err.message);
			// });
		}
	}

	const sendEmail = async (type: string, email: string, topicId: string, submitStatus: string) => {
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
					subject: "New feedback received",
					html: submitStatus === 'public' ? "<p>Link to new submitted post: <a href='https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "' target='_blank'>https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "</a></p>" : "<p>You received a new private feedback. Please view it in your <a href='https://" + brandUrl + ".ssimple.co/admin' target='_blank'>admin dashboard</a>.</p>"
				})
			});
			return response.json();
		}
	}

	const handleStyle = (active: boolean) => {
		if (active) return { color: '#FFFFFF', backgroundColor: primaryColor };
		else return { color: primaryColor, backgroundColor: primaryColor + '1A' };
	}

	const handleMouseOver = (e: React.MouseEvent<HTMLLabelElement>, active?: boolean) => {
		if (!active) {
			e.currentTarget.style.color = primaryColor;
			e.currentTarget.style.backgroundColor = primaryColor + '4D';
		}
	}

	const handleMouseLeave = (e: React.MouseEvent<HTMLLabelElement>, active?: boolean) => {
		if (!active) {
			e.currentTarget.style.color = primaryColor;
			e.currentTarget.style.backgroundColor = primaryColor + '1A';
		}
	}

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
				setAdminEmail(data.admin_email);
				setBrandName(data.brand_name);
				setAccountId(data.account_id);
				setBrandUrl(data.brand_url);
			}
		} catch (error: any) {
			console.error('Error getting account data: ' + error.message);
		}
	}

	const getLogoFile = async () => {
		try {
			const url = await getDownloadURL(ref(storage, 'brand/' + accountId + '.png'));
			setLogoUrl(url);
		} catch (error: any) {
			console.error('Error getting logo: ' + error.message);
		}
	}

	const getData = async () => {
		await getAccountData();
		// if (accountId) await getLogoFile();
		setIsLoading(false);
	}

	const handleChange = (field: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (field === 'email') setUserEmail(e.target.value);
		if (field === 'title') setSubmitTitle(e.target.value);
		if (field === 'desc') setSubmitDesc(e.target.value);
		if (field === 'submitPrivate') {
			const eventTarget = e.target as HTMLInputElement;
			setSubmitStatus(eventTarget.checked ? 'private' : 'public');
		}
	}

	const handleAddFileStart = () => {
		setHasFiles(true);
		// setIsSubmitActive(false);
	}

	const handleSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		const newId = uid(16);
		setHasFiles(false);

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
				await setDoc(doc(firestore, 'profiles', newId), newProfile);
			}

			const newVoter = {
				_id: newId,
				account_id: accountId,
				uid: '',
				name: '',
				email: userEmail,
				impact: 2,
				submit_id: newId,
				submit_title: submitTitle,
				created_at: Date.now(),
			}

			const publishedFiles = await Promise.all(files.map(async file => {
				file.status = 'published';
				file.parent_id = newId;
				await setDoc(doc(firestore, 'uploads', file._id), file);
				return file;
			}));

			const newData = {
				...submitData,
				_id: newId,
				account_id: accountId,
				type: submitType,
				email: userEmail,
				title: submitTitle,
				desc: submitDesc,
				status: submitStatus,
				voters: [newVoter],
				files: publishedFiles,
				device_info: submitType === 'bug' ? window.navigator.userAgent : '',
				created_at: Date.now(),
			}

			// await setDoc(doc(firestore, 'submit_votes', newId), newVoter);
			// await setDoc(doc(firestore, 'submits', newId), newData);
			// sendEmail('newSubmitNotifyUser', userEmail, newSubmitId);
			// sendEmail('newSubmitNotifyAdmin', adminEmail, newId, submitStatus);
			setFiles([]);
			setSubmitData(defaultSubmitData);
			router.push('/');
		} catch (error: any) {
			throw ('Error submitting: ' + error.message);
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
			if (email) setUserEmail(email);
			else setIsUpdateEmail(true);
		}
	}, []);

	useEffect(() => {
		getData();
	}, [accountId, isLoading]);

	return (
		<>
			{isLoading ? (<Loading />) : (
				<>
					<Head>
						<title>{brandName} – New Feedback</title>
					</Head>
					<div className="px-4 py-8 sm:px-8 max-w-2xl m-auto mb-8">
						<div className="mb-4 sm:mb-8">
							<Link href="/" className="font-bold text-sm text-gray-400 hover:text-gray-500 transition-colors"><i className="fas fa-arrow-left"></i> Back to feedback board</Link>
						</div>
						<div className="space-y-8">
							<div className="flex justify-center gap-2 font-medium text-center text-sm sm:text-base">
								<div className="sm:w-1/2">
									<button type="button"
										className={`w-full sm:w-auto p-2 transition-colors${submitType === 'bug' ? ' border-b-2 border-gray-600' : ' text-gray-400 hover:text-gray-500'}`}
										onClick={() => setSubmitType('bug')}
									>Report Issue</button>
								</div>
								<div className="sm:w-1/2">
									<button type="button"
										className={`w-full sm:w-auto p-2 transition-colors${submitType === 'improve' ? ' border-b-2 border-gray-600' : ' text-gray-400 hover:text-gray-500'}`}
										onClick={() => {
											setSubmitType('improve');
											setIsExpand(false);
										}}
									>Suggest Improvement</button>
								</div>
							</div>
							<div>
								<form className="space-y-8" onSubmit={e => handleSubmit(e)}>
									<div className="space-y-2">
										<div>
											<input
												type="text"
												name="title"
												className="border rounded-lg w-full p-2"
												placeholder={submitType === 'bug' ? "Briefly describe the issue you encountered" : "Your suggestion in one simple sentence"}
												onChange={e => handleChange('title', e)}
												onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
												maxLength={2000}
												required
											/>
										</div>
										<div>
											<textarea
												className="border rounded-lg w-full p-2"
												rows={5}
												placeholder="Details"
												value={submitDesc}
												onChange={e => handleChange('desc', e)}
												onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
												maxLength={10000}
												required
											/>
										</div>
									</div>
									<div className="space-y-1">
										<div>
											<h3 className="font-medium">Supporting images/gifs/videos</h3>
											<small className="text-xs font-medium text-gray-400">Supported file types: PNG, JPEG, JPG, WEBP, GIF, MP4, WEBM. Max 5 files (10MB each)</small>
										</div>
										<div>
											<FilePond
												acceptedFileTypes={[
													'image/png',
													'image/gif',
													'image/jpeg',
													'image/jpg',
													'image/webp',
													'video/mp4',
													'video/webm',
												]}
												labelFileTypeNotAllowed="Format not allowed"
												maxFileSize="10MB"
												allowMultiple={true}
												maxFiles={5}
												server={server}
												onaddfilestart={() => handleAddFileStart()}
												onprocessfilerevert={() => setIsSubmitActive(false)}
												onremovefile={() => setIsSubmitActive(true)}
												labelIdle='Drop your file(s) here or <span class="filepond--label-action">Browse</span>'
												credits={false}
											/>
										</div>
									</div>
									<div className="space-y-1">
										<label htmlFor="email" className="font-medium">Email</label>
										<input
											type="email"
											name="email"
											className="border rounded-lg w-full p-2"
											value={userEmail}
											placeholder="Your email"
											onChange={e => handleChange('email', e)}
											onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
											maxLength={320}
											required
										/>
									</div>
									<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
										<div className="space-x-2">
											<input type="checkbox" id="submitPrivate" onChange={e => handleChange('submitPrivate', e)} />
											<label htmlFor="submitPrivate" className="font-medium text-gray-400">This is a demo. No submit will be made</label>
										</div>
										<div>
											<button type="submit"
												className="w-full sm:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
												style={isSubmitActive ? { backgroundColor: primaryColor + 'CC' } : { backgroundColor: '#E2E8F0' }}
												onMouseOver={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor : undefined}
												onMouseLeave={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor + 'CC' : undefined}
												disabled={isSubmitActive ? false : true}
											>Submit {submitType === 'bug' ? 'Issue' : 'Suggestion'}</button>
										</div>
									</div>
								</form>
							</div>
						</div>
					</div>
					{/* <div className="fixed right-2 sm:right-8 bottom-2 sm:bottom-6 px-3 pt-0.5 pb-1 border border-zinc-400 rounded-full bg-white">
						<span className="font-bold text-sm text-gray-400 hover:text-gray-500 transition-colors"><a href="https://ssimple.co" target="_blank">Powered by ssimple</a></span>
					</div> */}
				</>
			)}
		</>
	);
}