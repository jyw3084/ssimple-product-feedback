import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { uid } from "uid";
import { firestore } from "@/config/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL, uploadBytesResumable, deleteObject, uploadString } from "firebase/storage";
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

import type { AccountSettings, File, Voter, Submit } from "@/utils/types";
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
	status: 'private',
	progress: 'open',
	device_info: '',
	created_at: 0,
}

export default function Widget() {
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitActive, setIsSubmitActive] = useState(true);
	const [hasFiles, setHasFiles] = useState(false);
	const [isThankYou, setIsThankYou] = useState(false);
	const [isBug, setIsBug] = useState(false);
	const [isSuggest, setIsSuggest] = useState(false);
	const [isExpand, setIsExpand] = useState(false);

	const [accountId, setAccountId] = useState('');
	// const [logoUrl, setLogoUrl] = useState('');
	const [userEmail, setUserEmail] = useState('');
	const [adminEmail, setAdminEmail] = useState('');
	const [primaryColor, setPrimaryColor] = useState('#1E293B');
	const [brandUrl, setBrandUrl] = useState('');
	const [brandName, setBrandName] = useState('');
	const [submitType, setSubmitType] = useState('bug');
	const [submitTitle, setSubmitTitle] = useState('');
	const [submitDesc, setSubmitDesc] = useState('');
	const [submitStatus, setSubmitStatus] = useState('private');
	const [submitData, setSubmitData] = useState(defaultSubmitData);
	const [files, setFiles] = useState<File[]>([]);
	const [bugScreenshot, setBugScreenshot] = useState('');
	const [consoleLog, setConsoleLog] = useState([]);

	const router = useRouter();
	const server: { process: ProcessServerConfigFunction, revert: RevertServerConfigFunction } = {
		process: (fieldName, file, metadata, load, error, progress, abort) => {
			const id = uid(16);
			const storageRef = ref(storage, 'uploads/topics/' + id);
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
							account_id: '',
							type: fileType,
							parent_type: 'topic',
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
					subject: "New Feedback Submission Received",
					html: submitStatus === 'public' ? "<p>Link to new submitted post: <a href='https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "' target='_blank'>https://" + brandUrl + ".ssimple.co/?topic=" + topicId + "</a></p>" : "<p>You received a new private feedback. Please view it in your <a href='https://" + brandUrl + ".ssimple.co/admin' target='_blank'>admin dashboard</a>.</p>"
				})
			});
			return response.json();
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
		const url = window.location.href.split(':3000')[0].split('http://')[1];
		try {
			const querySnapshot = await getDoc(doc(firestore, 'accounts', url));
			if (querySnapshot.exists()) {
				const data = querySnapshot.data() as AccountSettings;
				setPrimaryColor(data.primary_color);
				setAccountId(data.account_id);
				setAdminEmail(data.admin_email);
				setBrandUrl(data.brand_url);
				setBrandName(data.brand_name);
			}
		} catch (error: any) {
			console.error('Error getting account data: ' + error.message);
		}
	}

	const getLogoFile = async () => {
		try {
			const url = await getDownloadURL(ref(storage, 'brand/' + accountId + '.png'));
			// setLogoUrl(url);
		} catch (error: any) {
			console.error('Error getting logo: ' + error.message);
		}
	}

	const getData = async () => {
		await getAccountData();
		if (accountId) {
			await getLogoFile();
		}
		setIsLoading(false);
	}

	const handleChange = (field: string, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (field === 'email') setUserEmail(e.target.value);
		if (field === 'title') setSubmitTitle(e.target.value);
		if (field === 'desc') setSubmitDesc(e.target.value);
		if (field === 'submitPublic') {
			const eventTarget = e.target as HTMLInputElement;
			setSubmitStatus(eventTarget.checked ? 'public' : 'private');
		}
	}

	const handleAddFileStart = () => {
		setHasFiles(true);
		setIsSubmitActive(false);
	}

	const onRecordVideoClick = () => {
		window.parent.postMessage('record', '*');
	}

	const onCaptureScreenshotClick = () => {
		if (bugScreenshot) {
			setBugScreenshot('');
			setConsoleLog([]);
		} else {
			window.parent.postMessage('capture', '*');
		}
	}

	const handleSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setHasFiles(false);

		const newSubmitId = uid(16);
		const newVoterId = uid(16);
		const newVoter = {
			_id: newVoterId,
			account_id: accountId,
			uid: '',
			name: '',
			email: userEmail,
			impact: 2,
			submit_id: newSubmitId,
			submit_title: submitTitle,
			created_at: Date.now(),
		} as Voter;
		const newBugFiles = [];

		if (submitType === 'bug' && bugScreenshot) {
			try {
				const newId = uid(16);
				const storageRef = ref(storage, 'uploads/topics/' + newId);
				await uploadString(storageRef, bugScreenshot, 'data_url', { contentType: 'image/png' });
				const downloadUrl = await getDownloadURL(storageRef);
				const newUploadObj = {
					_id: newId,
					account_id: accountId,
					type: 'image',
					parent_type: 'topic',
					parent_id: newSubmitId,
					status: 'published',
					download_url: downloadUrl,
					created_at: Date.now()
				} as File;
				await setDoc(doc(firestore, 'uploads', newId), newUploadObj)
				newBugFiles.push(newUploadObj);
			} catch (err: any) {
				console.error('Error uploading bug screenshot: ' + err.message);
			}
		}

		try {
			const publishedFiles = await Promise.all(files.map(async file => {
				file.status = 'published';
				file.parent_id = newSubmitId;
				await setDoc(doc(firestore, 'uploads', file._id), file);
				return file;
			}));

			const newData = {
				...submitData,
				_id: newSubmitId,
				account_id: accountId,
				type: submitType,
				email: userEmail,
				title: submitTitle,
				desc: submitDesc,
				status: submitStatus,
				voters: [newVoter],
				files: publishedFiles,
				bug_files: newBugFiles,
				console_log: consoleLog,
				device_info: submitType === 'bug' ? window.navigator.userAgent : '',
				created_at: Date.now(),
			} as Submit;

			await setDoc(doc(firestore, 'submit_votes', newVoterId), newVoter);
			await setDoc(doc(firestore, 'submits', newSubmitId), newData);
			// sendEmail('newSubmitNotifyUser', userEmail, newSubmitId);
			sendEmail('newSubmitNotifyAdmin', adminEmail, newSubmitId, submitStatus);
			setFiles([]);
			setSubmitData(defaultSubmitData);
			setSubmitType('bug');
			setSubmitTitle('');
			setSubmitDesc('');
			setSubmitStatus('private');
			setBugScreenshot('');
			setIsThankYou(true);
		} catch (error: any) {
			console.error('Error submitting: ' + error.message);
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
		window.addEventListener('message', e => {
			if (e.data.type === 'bug') {
				setBugScreenshot(e.data.payload.screenshot);
				setConsoleLog(e.data.payload.console);
			}
		})
	}, []);

	useEffect(() => {
		getData();
	}, [isLoading, accountId]);

	return (
		<div className="space-y-10">
			<div className="shadow-lg p-8 border rounded-lg pb-14 min-h-screen font-medium">
				{!isThankYou && !isBug && !isSuggest &&
					<div>
						<div className="mb-4">
							{/* {isLoading ? (
								<div className="w-[160px] h-[50px] bg-zinc-200 animate-pulse rounded"></div>
							) : (
								<>
									{logoUrl && <img src={logoUrl} alt="logo" className="max-w-[160px] max-h-[50px]" />}
								</>
							)} */}
							<p>{`Provide feedback for ${brandName}`}</p>
						</div>
						<div className="space-y-2">
							<div>
								<button
									type="button"
									className="w-full text-left px-4 py-4 flex justify-between border rounded-lg bg-white"
									onClick={() => {
										setIsBug(true);
										setSubmitType('bug');
									}}
								>
									<span className="text-gray-600">Report Issue <i className="fas fa-exclamation-triangle"></i></span>
									<span className="text-gray-400"><i className="fas fa-chevron-right"></i></span>
								</button>
							</div>
							<div>
								<button
									type="button"
									className="w-full text-left px-4 py-4 flex justify-between border rounded-lg bg-white"
									onClick={() => {
										setIsSuggest(true);
										setSubmitType('improve');
									}}
								>
									<span className="text-gray-600">Suggest Improvement <i className="fas fa-lightbulb"></i></span>
									<span className="text-gray-400"><i className="fas fa-chevron-right"></i></span>
								</button>
							</div>
						</div>
					</div>
				}
				{!isThankYou && isBug &&
					<div>
						<div className="mb-8">
							<button type="button" className="font-bold text-gray-400" onClick={() => {
								setIsBug(false);
								setIsExpand(false);
								setSubmitType('bug');
								setSubmitTitle('');
								setSubmitDesc('');
								setSubmitStatus('public');
								setBugScreenshot('');
								setConsoleLog([]);
							}}>
								<i className="fas fa-arrow-left"></i> Back</button>
						</div>
						<div className="space-y-6 mb-6">
							<div className="flex gap-2">
								<div className="w-1/2 border rounded-lg p-6">
									<button type="button"
										className="w-full md:w-auto px-4 py-2 font-bold rounded-lg transition-colors focus:outline-none text-white bg-zinc-500 hover:bg-zinc-600"
										onClick={() => onRecordVideoClick()}
									>Record Video</button>
								</div>
								<div className="w-1/2 border rounded-lg p-6">
									<button type="button"
										className={`w-full md:w-auto px-4 py-2 font-bold rounded-lg transition-colors focus:outline-none ${bugScreenshot ? 'text-red-400 bg-red-50 hover:bg-red-100' : 'text-white bg-zinc-500 hover:bg-zinc-600'}`}
										onClick={() => onCaptureScreenshotClick()}
									>{bugScreenshot ? 'Remove Screenshot' : 'Capture Screenshot'}</button>
								</div>
							</div>
							<div>
								{bugScreenshot && <div>
									<img src={bugScreenshot} />
								</div>}
							</div>
						</div>
						<form className="space-y-2" onSubmit={e => handleSubmit(e)}>
							<div className="space-y-2">
								<div>
									<input
										type="text"
										name="title"
										className="border rounded-lg w-full p-2"
										placeholder="Briefly describe the issue you encountered"
										value={submitTitle}
										onChange={e => handleChange('title', e)}
										onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
										maxLength={2000}
										required
									/>
								</div>
								<div>
									<textarea
										className="border rounded-lg w-full p-2"
										rows={3}
										placeholder="Details"
										value={submitDesc}
										onChange={e => handleChange('desc', e)}
										onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
										maxLength={10000}
									/>
								</div>
							</div>
							{/* <div className="space-y-2">
								<div>
									<div className="border rounded-lg p-4 space-y-4">
										<div className="space-y-2">
											<div><h4 className="font-medium">Bug screenshot & console logs</h4></div>
											{bugScreenshot && <div>
												<img src={bugScreenshot} />
											</div>}
											<div>
												<button
													type="button"
													className={`w-full md:w-auto px-4 py-2 font-bold rounded-lg transition-colors focus:outline-none ${bugScreenshot ? 'text-red-400 bg-red-50 hover:bg-red-100' : 'text-white bg-zinc-500 hover:bg-zinc-600'}`}
													onClick={() => onCaptureScreenshotClick()}
												>{bugScreenshot ? 'Remove' : 'Capture'}</button>
											</div>
										</div>
										<div className="space-y-2">
											<div><h4 className="font-medium">Your device info</h4></div>
											<div>{window.navigator.userAgent}</div>
										</div>
									</div>
								</div>
							</div> */}
							<div className="space-x-2">
								<input type="checkbox" id="submitPublic" onChange={e => handleChange('submitPublic', e)} required />
								<label htmlFor="submitPublic" className="font-medium text-gray-400 text-sm">We collect your device info, console logs, and network requests on our site only to help us better understand this issue</label>
							</div>
							<div>
								<input
									type="email"
									name="email"
									className="border rounded-lg w-full p-2"
									placeholder="Your email"
									onChange={e => handleChange('email', e)}
									onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
									maxLength={320}
									required
								/>
							</div>
							<div>
								<button
									type="submit"
									className="w-full md:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
									style={isSubmitActive ? { backgroundColor: primaryColor + 'CC' } : { backgroundColor: '#E2E8F0' }}
									onMouseOver={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor : undefined}
									onMouseLeave={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor + 'CC' : undefined}
									disabled={isSubmitActive ? false : true}
								>Submit Issue Report</button>
							</div>
						</form>
					</div>
				}
				{!isThankYou && isSuggest &&
					<div>
						<div className="mb-8">
							<button type="button" className="font-bold text-gray-400" onClick={() => {
								setIsSuggest(false);
								setSubmitType('bug');
								setSubmitTitle('');
								setSubmitDesc('');
							}}>
								<i className="fas fa-arrow-left"></i> Back</button>
						</div>
						<div>
							<form className="space-y-6" onSubmit={e => handleSubmit(e)}>
								<div className="space-y-2">
									<div>
										<input
											type="text"
											name="title"
											className="border rounded-lg w-full p-2"
											placeholder="Your feedback in one simple sentence"
											value={submitTitle}
											onChange={e => handleChange('title', e)}
											onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
											maxLength={2000}
											required
										/>
									</div>
									<div>
										<textarea
											className="border rounded-lg w-full p-2"
											rows={3}
											placeholder="Details"
											value={submitDesc}
											onChange={e => handleChange('desc', e)}
											onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
											maxLength={10000}
											required
										/>
									</div>
								</div>
								<div className="space-y-2">
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
								<div>
									<input
										type="email"
										name="email"
										className="border rounded-lg w-full p-2"
										placeholder="Your email"
										onChange={e => handleChange('email', e)}
										onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }}
										maxLength={320}
										required
									/>
								</div>
								<div className="space-x-2">
									<input type="checkbox" id="submitPublic" onChange={e => handleChange('submitPublic', e)} />
									<label htmlFor="submitPublic" className="font-medium text-gray-400">Submit publicly to <a className="underline" href={`https://${brandUrl}.ssimple.co`} target="_blank">feedback board</a></label>
								</div>
								<div>
									<button
										type="submit"
										className="w-full md:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors focus:outline-none"
										style={isSubmitActive ? { backgroundColor: primaryColor + 'CC' } : { backgroundColor: '#E2E8F0' }}
										onMouseOver={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor : undefined}
										onMouseLeave={isSubmitActive ? e => e.currentTarget.style.backgroundColor = primaryColor + 'CC' : undefined}
										disabled={isSubmitActive ? false : true}
									>Submit Feature Request</button>
								</div>
							</form>
						</div>
					</div>
				}
				{isThankYou &&
					<div className="pt-[180px] flex flex-col justify-center text-center space-y-4">
						<div>
							<h1 className="font-bold text-xl">{submitType === 'bug' ? 'Thanks for letting us know' : 'Thanks for your feedback'}</h1>
						</div>
						{submitType === 'bug' && <div>
							We will investigate this issue and get back to you as soon as possible.
						</div>}
						<div className="space-y-2">
							<div>
								<button
									className="font-bold transition-colors"
									style={{ color: primaryColor + 'CC' }}
									onMouseOver={e => e.currentTarget.style.color = primaryColor}
									onMouseLeave={e => e.currentTarget.style.color = primaryColor + 'CC'}
									onClick={() => {
										setIsThankYou(false);
										setIsBug(false);
										setIsSuggest(false);
									}}
								>Go Back</button>
							</div>
						</div>
					</div>
				}
			</div>
			<div className="fixed bottom-0 text-center bg-zinc-100 w-full py-1 rounded-b-lg">
				<span className="text-sm font-bold text-gray-500 hover:text-gray-500 transition-colors"><a href="https://ssimple.co" target="_blank">Powered by  ssimple</a></span>
			</div>
		</div>
	);
}