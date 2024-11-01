import { useState } from "react";

export default function Sidebar() {
	const [collapseShow, setCollapseShow] = useState("hidden");

	return (
		<>
			<nav className="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden border-r bg-white flex flex-wrap items-center justify-between relative md:w-60 z-10 py-6 md:py-4 px-2 md:px-6">
				<div className="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-row-reverse flex-wrap items-center justify-between w-full mx-auto">
					<div className="flex">
						<div className="brand-logo">
							{/* toggler */}
							<button
								className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
								type="button"
								onClick={() => setCollapseShow("bg-white p-6")}
							>
								<i className="fas fa-bars"></i>
							</button>
							{/* brand */}
							<a href="/admin" className="hidden md:block text-left md:pb-2 mr-0 whitespace-nowrap uppercase font-bold p-4 px-0">
								ssimple
							</a>
						</div>
					</div>
					{/* collapse */}
					<div className={
						"md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-screen items-center flex-1 rounded " +
						collapseShow
					}>
						{/* mobile header */}
						<div className="md:min-w-full md:hidden block pb-4 mb-4">
							<div className="flex justify-between items-center">
								<div>
									{/* brand */}
									<a href="/admin" className="md:block text-left md:pb-2 mr-0 whitespace-nowrap uppercase font-bold">
										ssimple
									</a>
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
						{/* divider */}
						<hr className="my-4 md:min-w-full" />
						{/* navigation */}
						<ul className="md:flex-col md:min-w-full flex flex-col list-none md:mb-4 grow">
							<li className="">
								<div className="text-zinc-300 text-sm block py-2 no-underline font-semibold">
									Issues/Struggles
								</div>
								<ul>
									<li className="ml-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-700 transition-colors">
										<a href="/admin/submissions">Submissions</a>
									</li>
									<li className="ml-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-700 transition-colors">
										<a href="/admin/comments">Comments</a>
									</li>
								</ul>
							</li>
							{/* <li className="">
								<div className="text-zinc-300 text-sm block py-2 no-underline font-semibold">
									Roadmap
								</div>
								<ul>
									<li className="ml-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-700 transition-colors">
										<a href="/admin/feedback">Feedback</a>
									</li>
								</ul>
							</li> */}
							{/* <li className="">
								<a href="/admin/settings" className="text-zinc-400 hover:text-zinc-700 text-sm block py-2 no-underline font-semibold">
									Settings
								</a>
							</li> */}
						</ul>
						{/* <div>
							<a className={`text-zinc-400 hover:text-zinc-700 text-sm block my-2 no-underline font-semibold`}>
								Log Out
							</a>
						</div> */}
					</div>
				</div>
			</nav>
		</>
	);
}
