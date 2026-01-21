import { useEffect, useState } from "react";

import type { Submit } from "@/utils/types";

export default function Upvotes({ data, userEmail, primaryColor }: { data: Submit, userEmail: string, primaryColor: string }) {
	const [isVoted, setIsVoted] = useState(false);
	const [isPlural, setIsPlural] = useState(false);

	const [upvotes, setUpvotes] = useState<number | string>(data.votes);

	const renderPlural = (upvoteVal: number | string) => {
		if (typeof upvoteVal === 'number' && upvoteVal > 1) setIsPlural(true);
		if (typeof upvoteVal === 'string' && upvoteVal.length > 1) setIsPlural(true);
		setUpvotes(upvoteVal);
	}

	useEffect(() => {
		setIsVoted(false);
		renderPlural(data.votes);
		const foundVote = data.voters.find((voter: { email: string, impact: number | string }) => voter.email === userEmail);
		if (foundVote) setIsVoted(true);
	}, [data, userEmail]);

	return (
		<div className="text-sm font-medium text-gray-400">
			{upvotes} {isPlural ? 'people' : 'person'} agree{isPlural ? '' : 's'} with this
		</div>
	);
}