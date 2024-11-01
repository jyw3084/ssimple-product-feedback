import { useEffect, useState } from "react";

export default function Upvotes({ data, userEmail }) {
	const [upvotes, setUpvotes] = useState(data.votes);
	const [isUpvote, setIsUpvote] = useState(false);

	useEffect(() => {
		setIsUpvote(false);
		setUpvotes(data.votes);
		const foundVote = data.voters.find((voter: { email: string, impact: number }) => voter.email === userEmail);
		if (foundVote) setIsUpvote(true);
	}, [data, userEmail]);

	return (
		<div className={`flex flex-col items-center p-2 rounded-lg w-full md:w-auto min-w-[60px] transition-colors${isUpvote ? ' bg-primary/20 text-primary' : ' bg-slate-50'}`}>
			<i className="fas fa-caret-up"></i>
			<span className="font-medium">{upvotes}</span>
		</div>
	);
}