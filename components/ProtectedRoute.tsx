import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
	const router = useRouter();
	const { user } = useAuth();

	useEffect(() => {
		if (!user.uid) {
			router.push("/login");
		}
	}, [router, user]);

	return (
		<div>
			{user ? children : null}
		</div>
	);
}