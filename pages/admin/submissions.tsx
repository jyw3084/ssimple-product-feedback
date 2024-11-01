import { useState, useEffect } from "react";
import { uid } from "uid";
import { firestore } from "../../config/firebase";
import { doc, setDoc, collection, getDocs, orderBy, query, deleteDoc } from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import Router from "next/router";

import Sidebar from "../../components/Sidebar";
import Loading from "../../components/Loading";
import SingleTableRow from "../../components/SingleTableRow";
import ProtectedRoute from "../../components/ProtectedRoute";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const storage = getStorage();

export default function Submissions() {
	const [isLoading, setIsLoading] = useState(true);
	const [isModal, setIsModal] = useState(false);
	const [isWarningModal, setIsWarningModal] = useState(false);

	const [submits, setSubmits] = useState([]);
	const [modalData, setModalData] = useState(null);
	const [interactionsModalData, setInteractionsModalData] = useState(null);
	const [commentContent, setCommentContent] = useState('');
	const [deleteId, setDeleteId] = useState('');

	const getSubmitsData = async () => {
		const querySnapshot = await getDocs(query(collection(firestore, "submits"), orderBy("created_at", "desc")));
		const foundSubmits = querySnapshot.docs.map(doc => {
			return { ...doc.data() }
		});
		setSubmits(foundSubmits);
		setIsLoading(false);
	}

	useEffect(() => {
		getSubmitsData();
	}, []);

	const handleModalOpen = (type: string, id: string) => {
		const foundData = submits.find(data => data._id === id);
		if (type === 'submit') {
			setIsModal(true);
			setModalData(foundData);
		}

		if (type === 'interactions') {
			setIsModal(true);
			setInteractionsModalData(foundData);
		}

		if (type === 'warning') {
			setIsWarningModal(true);
			setDeleteId(id);
		}
	}

	const handleModalClose = (type: string) => {
		if (type === 'modal') {
			setIsModal(false);
			setModalData(null);
			setInteractionsModalData(null);
		}

		if (type === 'warning') {
			setIsWarningModal(false);
			setDeleteId('');
		}
	}

	const handleDelete = async (id: string) => {
		try {
			const foundData = submits.find(data => data._id === id);
			await Promise.all(foundData.comments.map(comment => deleteDoc(doc(firestore, 'submit_comments', comment._id))));
			await Promise.all(foundData.voters.map(voter => deleteDoc(doc(firestore, 'submit_votes', voter._id))));
			await Promise.all(foundData.images.map(async (image) => {
				const storageRef = ref(storage, 'uploads/topics/' + image._id);
				await deleteObject(storageRef);
				await deleteDoc(doc(firestore, 'uploads', image._id));
			}));
			await deleteDoc(doc(firestore, 'submits', id));
			Router.reload();
		} catch (error) {
			alert('Something went wrong: ' + error.message);
		}
	}

	const calcImpact = (data) => {
		const totalNum = data?.voters?.length;
		let deeplyNum = 0;
		let mildlyNum = 0;
		let noneNum = 0;
		data?.voters?.forEach(voter => {
			if (voter.impact === 2) {
				deeplyNum += 1;
			}
			if (voter.impact === 1) {
				mildlyNum += 1;
			}
			if (voter.impact === 0) {
				noneNum += 1;
			}
		});

		const showPercentage = (num: number) => {
			return Math.round((num / totalNum) * 100);
		}

		return (
			<>
				{deeplyNum !== 0 && <div style={{ width: showPercentage(deeplyNum) + '%' }} className="py-1 bg-red-100 text-red-400 overflow-hidden">deeply impacted {showPercentage(deeplyNum)}%</div>}
				{mildlyNum !== 0 && <div style={{ width: showPercentage(mildlyNum) + '%' }} className="py-1 bg-orange-100 text-orange-400 overflow-hidden">somewhat impacted {showPercentage(mildlyNum)}%</div>}
				{noneNum !== 0 && <div style={{ width: showPercentage(noneNum) + '%' }} className="py-1 bg-emerald-100 text-emerald-400 overflow-hidden">not impacted {showPercentage(noneNum)}%</div>}
			</>
		);
	}

	const handleInputChange = (type: string, field: string, e: React.SyntheticEvent) => {
		if (type === 'adminComment') {
			setCommentContent(e.target.value);
		}
	}

	const handleSubmit = async (type: string, e: React.SyntheticEvent) => {
		e.preventDefault();
		const newId = uid(16);
		if (type === 'adminComment') {
			const newComment = {
				role: 'admin',
				_id: newId,
				uid: '',
				name: '',
				email: adminEmail,
				content: commentContent,
				submit_id: interactionsModalData._id,
				submit_title: interactionsModalData.title,
				created_at: Date.now(),
			}
			const newCommentArr = interactionsModalData.comments;
			newCommentArr.push(newComment);
			const newItemData = {
				...interactionsModalData,
				comments: newCommentArr
			}
			await setDoc(doc(firestore, 'submit_comments', newId), newComment);
			await setDoc(doc(firestore, 'submits', interactionsModalData._id), newItemData);
			setCommentContent('');
		}
	}

	return (
		<ProtectedRoute>
			{isLoading ? (<Loading />) : (
				<>
					<Sidebar />
					<div className="md:ml-60 px-4 pb-8 md:py-8 md:px-16">
						<div className="mb-8 md:mb-16">
							<h1 className="text-3xl font-bold">Submissions</h1>
						</div>
						<div className="overflow-x-scroll">
							<table className="w-full table-auto md:table-fixed text-left border-collapse">
								<thead>
									<tr>
										<th>Upvotes/Comments</th>
										<th>Type</th>
										<th>Topic</th>
										<th>Description</th>
										<th>Email</th>
										<th>Time Received</th>
										<th></th>
									</tr>
								</thead>
								<tbody>
									{submits?.map(submit => (
										<SingleTableRow
											key={submit._id}
											type={'submit'}
											data={submit}
											handleModalOpen={handleModalOpen}
										/>
									))}
								</tbody>
							</table>
						</div>
					</div>
					{isModal &&
						<div className="fixed top-0 w-full h-full z-20">
							{/* modal overlay */}
							<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={() => handleModalClose('modal')}></div>
							{/* modal content */}
							<div className="relative m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
								<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={() => handleModalClose('modal')}><i className="fas fa-times"></i></button>
								{modalData &&
									<div>
										<p>{modalData.desc}</p>
									</div>
								}
								{interactionsModalData &&
									<div className="space-y-12">
										<div className="space-y-2">
											<div className="font-bold">
												Impact Sentiment
											</div>
											<div className="flex text-center text-xs font-medium">
												{calcImpact(interactionsModalData)}
											</div>
										</div>
										<div className="space-y-2">
											<div className="font-bold">
												Upvotes
											</div>
											<ul>
												{interactionsModalData.voters?.map(voter => (
													<li key={voter._id}>
														<div className="space-x-2">
															{voter.impact === 2 &&
																<span className="px-2 py-1 text-red-400 text-xs rounded-full bg-red-100">deeply impacted</span>
															}
															{voter.impact === 1 &&
																<span className="px-2 py-1 text-orange-400 text-xs rounded-full bg-orange-100">somewhat impacted</span>
															}
															{voter.impact === 0 &&
																<span className="px-2 py-1 text-emerald-400 text-xs rounded-full bg-emerald-100">not impacted</span>
															}
															<span className="text-gray-400">{voter.email}</span>
														</div>
													</li>
												))}
											</ul>
										</div>
										<div className="space-y-4">
											<div className="font-bold">
												Comments
											</div>
											{interactionsModalData.comments?.length === 0 &&
												<div className="text-gray-400 bg-slate-50 p-3 rounded">No comments</div>
											}
											<ul className="space-y-2">
												{interactionsModalData.comments?.length > 0 && interactionsModalData.comments?.map(comment => (
													<li key={comment._id} className="space-y-1">
														<div className={`flex items-center gap-1 ${comment.role === 'admin' ? 'text-sky-500' : 'text-gray-500'}`}>
															<i className="fas fa-user-circle"></i>
															<span className="text-xs">{comment.role === 'admin' ? 'Admin' : comment.email}</span>
														</div>
														<div className={`ml-4 p-3 rounded ${comment.role === 'admin' ? 'bg-sky-50 border border-sky-300' : 'bg-slate-50'}`}>{comment.content}</div>
													</li>
												))}
											</ul>
											<div>
												<form className="space-y-1" onSubmit={e => handleSubmit('adminComment', e)}>
													<div>
														<textarea className="border rounded w-full p-2" rows={3} placeholder="Reply as admin" value={commentContent} onChange={e => handleInputChange('adminComment', 'content', e)} required />
													</div>
													<div className="text-right">
														<button type="submit" className="w-full md:w-auto px-4 py-2 bg-sky-500 text-white font-bold rounded hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300">Reply</button>
													</div>
												</form>
											</div>
										</div>
									</div>
								}
							</div>
						</div>
					}
					{isWarningModal &&
						<div className="fixed top-0 w-full h-full flex z-20">
							{/* modal overlay */}
							<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full"></div>
							{/* modal content */}
							<div className="relative m-auto p-8 border md:min-w-[300px] md:w-1/4 overflow-y-scroll shadow-lg rounded bg-white">
								<div className="mb-4 space-y-2">
									<h2 className="font-bold text-2xl">Delete submission?</h2>
									<p>All comments, voters, and impact sentiment data related to this submission will be deleted forever.</p>
								</div>
								<div className="flex flex-col md:flex-row md: justify-end gap-2">
									<button className="px-4 py-2 bg-red-400 rounded font-bold text-white" onClick={() => handleDelete(deleteId)}>Delete</button>
									<button className="px-4 py-2 bg-slate-200 rounded font-bold" onClick={() => handleModalClose('warning')}>Cancel</button>
								</div>
							</div>
						</div>
					}
				</>
			)}
		</ProtectedRoute>
	);
}