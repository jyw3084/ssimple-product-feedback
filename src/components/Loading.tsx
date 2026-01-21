import { useState, useEffect } from 'react';

const message = ["Loading", "Almost done!", "Finalizing..."];

export default function Loading() {
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		if (currentIndex === message.length - 1) return;
		const intervalId = setInterval(() => {
			const newIndex = currentIndex + 1;
			setCurrentIndex(newIndex);
		}, 5000);

		return () => clearInterval(intervalId);
	}, [currentIndex]);

	return (
		<div className="flex flex-col items-center justify-center h-screen">
			<i className="fas fa-circle-notch fa-lg fa-pulse"></i>
		</div>
	)
};