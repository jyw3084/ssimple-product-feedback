import { useState, useEffect } from "react";
import { firestore } from "@/config/firebase";
import { collection, getDocs, orderBy, query, limit, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

import Link from "next/link";
import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

import { AccountSettings, Submit } from "@/utils/types";

export default function Dashboard() {
	// @ts-ignore
	const { user } = useAuth();

	const [isLoading, setIsLoading] = useState(true);

	const [accountId, setAccountId] = useState('');
	const [submits, setSubmits] = useState<Submit[]>([]);
	const [accountData, setAccountData] = useState<AccountSettings>();
	const [count, setCount] = useState(0);

	const getAccountData = async () => {
		if (user.uid) setAccountId(user.uid);
		try {
			const querySnapshot = await getDocs(query(collection(firestore, 'accounts'), where('account_id', '==', user.uid)));
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() as AccountSettings }));
			setAccountData(foundData[0]);
		} catch (error: any) {
			console.error('Error getting account data: ' + error.message);
		}
	}

	const getSubmits = async () => {
		try {
			const querySnapshot = await getDocs(query(collection(firestore, 'submits'), where('account_id', '==', accountId), orderBy('created_at', 'desc'), limit(5)));
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() as Submit }));
			setSubmits(foundData);
			setIsLoading(false);
		} catch (error: any) {
			console.error('Error getting feedback: ' + error.message);
		}
	}

	const calcNewFeedbackReceived = () => {
		const lastSevenDayTime = Date.now() - 604800000;
		let newCount = 0;
		submits.map(submit => {
			if (submit.created_at > lastSevenDayTime) newCount++;
		});
		setCount(newCount);
	}

	const getData = async () => {
		await getAccountData();
		await getSubmits();
		calcNewFeedbackReceived();
	}

	useEffect(() => {
		getData();
	}, [isLoading, accountId, submits]);

	return (
		<ProtectedRoute>
			<Head>
				<title>Dashboard – {accountData?.brand_name}</title>
			</Head>
			<Sidebar />
			<div className="md:ml-60 px-4 pt-24 pb-8 md:p-16 font-medium">
				<div className="mb-8 md:mb-16">
					<h1 className="text-xl md:text-3xl font-bold">Welcome back {accountData?.brand_name}</h1>
				</div>
				<div className="space-y-8">
					<div className="w-full px-2 py-4 md:px-8 md:py-8 bg-white rounded-lg">
						<h3 className="font-medium space-x-2"><span className="text-3xl">{isLoading ? '' : count}</span><span>new feedback received in the last 7 days</span></h3>
					</div>
					<div className="w-full px-2 py-4 md:px-8 md:py-8 bg-white rounded-lg space-y-8">
						<div className="flex gap-4 justify-between items-center">
							<div>
								<h3 className="font-medium">Latest feedback</h3>
							</div>
							<div>
								<a href="/admin/feedback" className="font-bold text-gray-400 hover:text-gray-500">View all feedback</a>
							</div>
						</div>
						<div className="overflow-x-scroll">
							<table className="w-full table-fixed">
								<tbody>
									{isLoading ? (
										<tr>
											<td className="w-96 md:w-4/5">
												<div className="h-4 bg-zinc-200 animate-pulse rounded"></div>
											</td>
											<td className="w-52 md:w-1/5">
												<div className="h-4 bg-zinc-200 animate-pulse rounded"></div>
											</td>
										</tr>
									) : (
										<>{submits.map(submit => {
											const time = new Date(submit.created_at);
											return (
												<tr key={submit._id} className="border-y">
													<td className="w-96 md:w-4/5">
														<div className="font-bold text-gray-400 hover:text-gray-500 transition-colors"><Link href={`/admin/feedback?topic=${submit._id}`}>{submit.title}</Link></div>
													</td>
													<td className="w-52 md:w-1/5 py-4 text-right">
														<div>
															{time.toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
														</div>
													</td>
												</tr>
											)
										})}</>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}