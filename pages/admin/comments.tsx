import { useState, useEffect } from "react";
import { firestore } from "../../config/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

import Sidebar from "../../components/Sidebar";
import Loading from "../../components/Loading";
import SingleTableRow from "../../components/SingleTableRow";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function Comments() {
	const [isLoading, setIsLoading] = useState(true);
	const [isModal, setIsModal] = useState(false);

	const [comments, setComments] = useState([]);
	const [modalData, setModalData] = useState(null);

	const getCommentsData = async () => {
		const querySnapshot = await getDocs(query(collection(firestore, "submit_comments"), orderBy("created_at", "desc")));
		const foundComments = querySnapshot.docs.map(doc => {
			return { ...doc.data() }
		});
		setComments(foundComments);
		setIsLoading(false);
	}

	useEffect(() => {
		getCommentsData();
	}, []);

	const handleModalOpen = (type: string, id: string) => {
		setIsModal(true);
		const foundData = comments.find(data => data._id === id);
		if (type === 'comment') {
			setModalData(foundData);
		}
	}

	const handleModalClose = () => {
		setIsModal(false);
		setModalData(null);
	}

	return (
		<ProtectedRoute>
			{isLoading ? (<Loading />) : (
				<>
					<Sidebar />
					<div className="md:ml-60 px-4 pb-8 md:py-8 md:px-16">
						<div className="mb-8 md:mb-16">
							<h1 className="text-3xl font-bold">User Comments</h1>
						</div>
						<div className="overflow-x-scroll">
							<table className="w-full table-auto md:table-fixed text-left border-collapse">
								<thead>
									<tr>
										<th>Comment</th>
										<th>Email</th>
										<th>Topic</th>
										<th>Time Received</th>
									</tr>
								</thead>
								<tbody>
									{comments?.map(comment => {
										if (comment.role === 'user') {
											return (
												<SingleTableRow
													key={comment._id}
													type={'comment'}
													data={comment}
													handleModalOpen={handleModalOpen}
												/>
											);
										}
									})}
								</tbody>
							</table>
						</div>
					</div>
					{isModal &&
						<div className="fixed top-0 w-full h-full z-20">
							{/* modal overlay */}
							<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={handleModalClose}></div>
							{/* modal content */}
							<div className="relative md:top-20 m-8 md:mx-auto p-8 border md:min-w-[600px] md:w-1/2 max-h-[calc(100%-4rem)] overflow-y-scroll shadow-lg rounded bg-white">
								<button type="button" className="absolute right-4 top-4 opacity-50 hover:opacity-100" onClick={handleModalClose}><i className="fas fa-times"></i></button>
								{modalData &&
									<div>
										<p>{modalData.content}</p>
									</div>
								}
							</div>
						</div>
					}
				</>
			)}
		</ProtectedRoute>
	);
}