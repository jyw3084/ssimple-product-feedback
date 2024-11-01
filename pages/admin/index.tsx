import { useState, useEffect } from "react";
import { firestore } from "../../config/firebase";
import { OrderByDirection, doc, getDoc, collection, getDocs, orderBy, query } from "firebase/firestore";

import Sidebar from "../../components/Sidebar";
import Loading from "../../components/Loading";
import ProtectedRoute from "../../components/ProtectedRoute";

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
		return 'bug';
	}
	if (type === 'feature') {
		return 'missing feature';
	}
	if (type === 'improve') {
		return 'improvement';
	}
}

const getData = async (collectionName: string, orderByField: string, sort: OrderByDirection, stateSetter: React.Dispatch<React.SetStateAction<Array<Object>>>, isLoadingSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
	const querySnapshot = await getDocs(query(collection(firestore, collectionName), orderBy(orderByField, sort)));
	const foundData = querySnapshot.docs.map(doc => {
		return { ...doc.data() }
	});
	if (collectionName === 'submit_comments') {
		const filteredData = foundData.filter(comment => comment.role === 'user');
		stateSetter(filteredData);
	} else {
		stateSetter(foundData);
	}
	isLoadingSetter(false);
}

export default function Dashboard() {
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitModal, setIsSubmitModal] = useState(false);
	const [isCommentModal, setIsCommentModal] = useState(false);
	const [isFeedbackModal, setIsFeedbackModal] = useState(false);

	const [submits, setSubmits] = useState([]);
	const [submitVotes, setSubmitVotes] = useState([]);
	const [comments, setComments] = useState([]);
	const [feedback, setFeedback] = useState([]);
	const [itemData, setItemData] = useState({});

	useEffect(() => {
		getData('submits', 'created_at', 'desc', setSubmits, setIsLoading);
		getData('submit_comments', 'created_at', 'desc', setComments, setIsLoading);
		getData('submit_votes', 'created_at', 'desc', setSubmitVotes, setIsLoading);
		getData('item_feedback', 'created_at', 'desc', setFeedback, setIsLoading);
	}, []);

	const handleModalOpen = async (type: string, itemId: string) => {
		disableScroll();

		if (type === 'submit') {
			setIsSubmitModal(true);
			const querySnapshot = await getDoc(doc(firestore, 'submits', itemId));
			if (querySnapshot.exists()) {
				setItemData(querySnapshot.data());
			} else {
				alert('Error not found');
			}
		}

		if (type === 'comment') {
			setIsCommentModal(true);
			const querySnapshot = await getDoc(doc(firestore, 'submit_comments', itemId));
			if (querySnapshot.exists()) {
				setItemData(querySnapshot.data());
			} else {
				alert('Error not found');
			}
		}

		if (type === 'feedback') {
			setIsFeedbackModal(true);
			const querySnapshot = await getDoc(doc(firestore, 'item_feedback', itemId));
			if (querySnapshot.exists()) {
				setItemData(querySnapshot.data());
			} else {
				alert('Error not found');
			}
		}
	}

	const handleModalClose = () => {
		setIsSubmitModal(false);
		setIsCommentModal(false);
		setIsFeedbackModal(false);
		setItemData({});
		enableScroll();
	}

	const calcImpact = () => {
		const totalNum = itemData?.voters?.length;
		let deeplyNum = 0;
		let mildlyNum = 0;
		let noneNum = 0;
		itemData?.voters?.forEach(voter => {
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

	return (
		<ProtectedRoute>
			{isLoading ? (<Loading />) : (
				<>
					<Sidebar />
					<div className="md:ml-60 px-4 pb-8 md:py-8 md:px-16">
						<div className="mb-8 md:mb-16">
							<h1 className="text-3xl font-bold">Dashboard</h1>
						</div>
						<div className="space-y-16">
							<div>
								{/* <div className="mb-4">
									<h2 className="text-xl font-bold">Issues/Struggles</h2>
								</div> */}
								<div className="flex flex-col md:flex-row gap-4 mb-4">
									<div className="md:w-1/2 px-4 py-8 md:px-8 bg-slate-100 rounded">
										<div className="flex space-x-4">
											<h3 className="font-bold">New submissions</h3>
											<a href="/admin/submissions" className="text-sky-400 hover:text-sky-500">see all</a>
										</div>
										<hr className="my-4 md:min-w-full" />
										<div className="font-medium">
											<ul className="space-y-3">
												{!isLoading && submits?.slice(0, 5).map(submit => (
													<li key={submit._id}>
														<button type="button" className="w-full text-left bg-white p-3 rounded shadow-sm hover:shadow transition-shadow space-y-2" onClick={() => handleModalOpen('submit', submit._id)}>
															<div className="text-gray-500 hover:text-gray-700 transition-color">
																{submit.title.length < 50 ? submit.title : submit.title.substring(0, 50) + "..."}
															</div>
														</button>
													</li>
												))}
											</ul>
										</div>
									</div>
									<div className="md:w-1/2 px-4 py-8 md:px-8 bg-slate-100 rounded">
										<div className="flex space-x-4">
											<h3 className="font-bold">New upvotes</h3>
										</div>
										<hr className="my-4 md:min-w-full" />
										<div className="font-medium">
											<ul className="space-y-3">
												{!isLoading && submitVotes?.slice(0, 5).map((vote, i) => (
													<li key={vote._id}>
														<button type="button" className="w-full text-left bg-white p-3 rounded shadow-sm hover:shadow transition-shadow space-y-2" onClick={() => handleModalOpen('submit', vote.submit_id)}>
															<div className="text-gray-500 hover:text-gray-700 transition-color space-x-3 truncate">
																{vote.impact === 2 &&
																	<span className="px-2 py-1 text-red-400 text-xs rounded-full bg-red-100">deeply</span>
																}
																{vote.impact === 1 &&
																	<span className="px-2 py-1 text-orange-400 text-xs rounded-full bg-orange-100">somewhat</span>
																}
																{vote.impact === 0 &&
																	<span className="px-2 py-1 text-emerald-400 text-xs rounded-full bg-emerald-100">none</span>
																}
																<span>{vote.submit_title}</span>
															</div>
														</button>
													</li>
												))}
											</ul>
										</div>
									</div>
								</div>
								<div className="px-4 py-8 md:px-8 bg-slate-100 rounded">
									<div className="flex space-x-4">
										<h3 className="font-bold">New comments</h3>
										<a href="/admin/comments" className="text-sky-400 hover:text-sky-500">see all</a>
									</div>
									<hr className="my-4 md:min-w-full" />
									<div className="font-medium">
										<ul className="space-y-3">
											{!isLoading && comments?.slice(0, 5).map((comment, i) => {
												const time = new Date(comment.created_at);
												return (
													<li key={comment._id}>
														<button type="button" className="w-full text-left bg-white p-3 rounded shadow-sm hover:shadow transition-shadow space-y-2" onClick={() => handleModalOpen('comment', comment._id)}>
															<div className="flex justify-between items-center">
																<div className="md:w-3/4 text-xs text-gray-400 truncate">
																	Comment for: {comment.submit_title}
																</div>
																<div className="md:w-1/4 text-right text-xs text-gray-400 space-x-1">
																	{time.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
																</div>
															</div>
															<div className="text-gray-500 hover:text-gray-700 transition-color">
																{comment.content.length < 50 ? comment.content : comment.content.substring(0, 50) + "..."}
															</div>
														</button>
													</li>
												);
											})}
										</ul>
									</div>
								</div>
							</div>
							<div>
								<div className="mb-4">
									<h2 className="text-xl font-bold">Roadmap</h2>
								</div>
								<div>
									<div className="p-8 bg-slate-100 rounded">
										<div className="flex space-x-4">
											<h3 className="font-bold">New feedback</h3>
											<a href="/admin/feedback" className="text-sky-400 hover:text-sky-500">see all</a>
										</div>
										<hr className="my-4 md:min-w-full" />
										<div className="font-medium">
											<ul className="space-y-3">
												{!isLoading && feedback?.slice(0, 5).map((feedback, i) => {
													const time = new Date(feedback.created_at);
													return (
														<li key={feedback._id}>
															<button type="button" className="w-full text-left bg-white p-3 rounded shadow-sm hover:shadow transition-shadow space-y-2" onClick={() => handleModalOpen('feedback', feedback._id)}>
																<div className="flex justify-between items-center">
																	<div className="md:w-3/4 text-xs text-gray-400 truncate">
																		Feedback for: {feedback.item_title}
																	</div>
																	<div className="md:w-1/4 text-right text-xs text-gray-400 space-x-1">
																		{time.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
																	</div>
																</div>
																<div className="text-gray-500 hover:text-gray-700 transition-color">
																	{feedback.content.length < 50 ? feedback.content : feedback.content.substring(0, 50) + "..."}
																</div>
															</button>
														</li>
													);
												})}
											</ul>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					{isSubmitModal &&
						<div className="fixed top-0 w-full h-full z-20">
							{/* modal overlay */}
							<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={handleModalClose}></div>
							{/* modal content */}
							<div className="relative m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
								<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={handleModalClose}><i className="fas fa-times"></i></button>
								{itemData &&
									<>
										<div className="space-y-2 mb-4">
											<h2 className="font-bold text-2xl">{itemData.title}</h2>
											<div>
												<span className="text-sm text-gray-400 px-2 py-1 bg-slate-100 rounded-full">{renderType(itemData.type)}</span>
											</div>
											<div>
												<p>{itemData.desc}</p>
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
										<div className="pt-4 border-t space-y-2">
											<div className="md:flex md:space-x-2 mb-8">
												<div>Submitted by:</div>
												<div>{itemData.email}</div>
											</div>
											<div className="space-y-12">
												<div className="space-y-2">
													<div className="font-bold">Impact sentiment</div>
													<div className="flex text-center text-xs font-medium">
														{calcImpact()}
													</div>
												</div>
												<div className="space-y-2">
													<div className="flex space-x-2">
														<span className="font-bold">Upvotes</span>
														<span className="text-gray-500">{itemData.votes}</span>
													</div>
													<ul>
														{itemData.voters?.map(voter => (
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
													<div className="font-bold">Comments</div>
													{itemData.comments?.length === 0 &&
														<div className="text-gray-400 bg-slate-50 p-3 rounded">No comments</div>
													}
													<ul className="space-y-2">
														{itemData.comments?.length > 0 && itemData.comments?.map(comment => (
															<li key={comment._id} className="space-y-1">
																<div className={`flex items-center gap-1 ${comment.role === 'admin' ? 'text-sky-500' : 'text-gray-500'}`}>
																	<i className="fas fa-user-circle"></i>
																	<span className="text-xs">{comment.role === 'admin' ? 'Admin' : comment.email}</span>
																</div>
																<div className={`ml-4 p-3 rounded ${comment.role === 'admin' ? 'bg-sky-50 border border-sky-300' : 'bg-slate-50'}`}>{comment.content}</div>
															</li>
														))}
													</ul>
												</div>
											</div>
										</div>
									</>
								}
							</div>
						</div>
					}
					{isCommentModal &&
						<div className="fixed top-0 w-full h-full z-20">
							{/* modal overlay */}
							<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={handleModalClose}></div>
							{/* modal content */}
							<div className="relative md:top-20 m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
								<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={handleModalClose}><i className="fas fa-times"></i></button>
								{itemData &&
									<>
										<div className="mb-4">
											<p>{itemData.content}</p>
										</div>
										<div className="pt-4 border-t space-y-2">
											<div className="md:flex md:space-x-2">
												<div>Commented by:</div>
												<div>{itemData.email}</div>
											</div>
											<div className="md:flex md:space-x-2">
												<div>Title:</div>
												<div>{itemData.submit_title}</div>
											</div>
										</div>
									</>
								}
							</div>
						</div>
					}
					{isFeedbackModal &&
						<div className="fixed top-0 w-full h-full z-20">
							{/* modal overlay */}
							<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={handleModalClose}></div>
							{/* modal content */}
							<div className="relative md:top-20 m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
								<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={handleModalClose}><i className="fas fa-times"></i></button>
								{itemData &&
									<>
										<div className="mb-4">
											<p>{itemData.content}</p>
										</div>
										<div className="pt-4 border-t space-y-2">
											<div className="flex space-x-2">
												<div>Given by:</div>
												<div>{itemData.email}</div>
											</div>
											<div className="flex space-x-2">
												<div>Title:</div>
												<div>{itemData.item_title}</div>
											</div>
											<div className="flex space-x-2">
												<div>Stage:</div>
												<div>{itemData.item_stage}</div>
											</div>
										</div>
									</>
								}
							</div>
						</div>
					}
				</>
			)}
		</ProtectedRoute>
	);
}