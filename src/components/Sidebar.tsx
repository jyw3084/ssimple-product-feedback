import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

export default function Sidebar() {
	const [collapseShow, setCollapseShow] = useState('hidden');
	const [activePage, setActivePage] = useState('');
	const pathname = usePathname();
	const active = pathname.split('admin/')[1];

	useEffect(() => {
		setActivePage(active);
	}, []);

	return (
		<>
			<Script>{`
				(function(window, document) {
					window.ssimple = {};
					var elt = document.createElement('script');
					elt.type = "text/javascript";
					elt.async = true;
					elt.src = "https://cdn.jsdelivr.net/gh/ssimpleCo/widget-dev@main/ssimpleSdk90.js";
					var before = document.getElementsByTagName('script')[0];
					before.parentNode.insertBefore(elt, before);
					elt.onload = function() {
						ssimple.init({
							appId: 'feedback',
							btnColor: '#0EA5E9',
							hideBtn: false,
						});
					}
				})(window, document, undefined);
			`}</Script>
			<nav className="md:left-0 md:flex-col fixed md:top-0 md:bottom-0 border-b md:border-b-0 md:border-r bg-white flex items-strech justify-between md:w-60 z-10 p-2 md:py-6 font-medium w-screen">
				<div className="w-full flex justify-between items-center">
					{/* brand */}
					<div className="h-[50px]">
						<img src="https://firebasestorage.googleapis.com/v0/b/ssimple-app.appspot.com/o/brand%2FTm80AQwbD2YesQKGEUY5quvSxU53.png?alt=media&token=da92f866-ca17-4ec1-9c1c-98a3337df3c5" alt="logo" className="max-w-[160px] max-h-[50px]" />
					</div>
					{/* toggler */}
					<div>
						<button
							className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
							type="button"
							onClick={() => setCollapseShow("bg-white")}
						>
							<i className="fas fa-bars"></i>
						</button>
					</div>
				</div>
				{/* collapse */}
				<div className={"md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-screen md:h-auto items-center flex-1 space-y-8 p-2 md:p-0 " + collapseShow}>
					{/* mobile header */}
					<div className="md:min-w-full md:hidden block">
						<div className="flex justify-between items-center">
							{/* brand */}
							<div className="h-[50px]">
								<img src="https://firebasestorage.googleapis.com/v0/b/ssimple-app.appspot.com/o/brand%2FTm80AQwbD2YesQKGEUY5quvSxU53.png?alt=media&token=da92f866-ca17-4ec1-9c1c-98a3337df3c5" alt="logo" className="max-w-[160px] max-h-[50px]" />
							</div>
							<div>
								<button
									type="button"
									className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
									onClick={() => setCollapseShow("hidden")}
								>
									<i className="fas fa-times"></i>
								</button>
							</div>
						</div>
					</div>
					<div className="md:flex md:flex-col md:flex-grow justify-between">
						<ul className="md:flex-col md:min-w-full flex flex-col md:mb-4 space-y-2 flex-grow p-2">
							<li>
								<a href="/admin">
									<div className={`p-2 ${!activePage ? 'font-bold text-gray-600 bg-zinc-100 rounded-lg' : 'text-gray-500 hover:text-gray-600 hover:bg-zinc-50'} transition-colors`}>Dashboard</div>
								</a>
							</li>
							<li>
								<a href="/admin/feedback">
									<div className={`p-2 ${activePage === 'feedback' ? 'font-bold text-gray-600 bg-zinc-100 rounded-lg' : 'text-gray-500 hover:text-gray-600 hover:bg-zinc-50'} transition-colors`}>Feedback</div>
								</a>
							</li>
							<li>
								<a href="/admin/settings">
									<div className={`p-2 ${activePage === 'settings' ? 'font-bold text-gray-600 bg-zinc-100 rounded-lg' : 'text-gray-500 hover:text-gray-600 hover:bg-zinc-50'} transition-colors`}>Settings</div>
								</a>
							</li>
						</ul>
						<div className="px-4">
							<a href="/" className="text-gray-500 hover:text-gray-600 transition-colors">
								<div className="py-2"><i className="fas fa-arrow-left"></i> My feedback board</div>
							</a>
						</div>
					</div>
				</div>
			</nav>
		</>
	);
}
