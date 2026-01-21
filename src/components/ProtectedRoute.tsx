import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { firestore } from "@/config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function ProtectedRoute({ children }: { children: any }) {
	const router = useRouter();
	// @ts-ignore
	const { user } = useAuth();

	const getAccountId = async () => {
		if (!user.uid) router.push("/login");
		try {
			const querySnapshot = await getDocs(query(collection(firestore, 'accounts'), where('account_id', '==', user.uid)));
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() }));
			if (foundData && foundData.length === 0) router.push("/login");
		} catch (error: any) {
			console.error('Error verifying account: ' + error.message);
		}
	}

	useEffect(() => {
		getAccountId();
	}, [router, user]);

	return (
		<div>
			{user ? children : null}
		</div>
	);
}