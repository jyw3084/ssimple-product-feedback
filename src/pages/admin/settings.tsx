import { useState, useEffect } from "react";
import { firestore } from "@/config/firebase";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import Router from "next/router";
import { useAuth } from "@/context/AuthContext";

import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

import type { AccountSettings } from "@/utils/types";
// import InputEmail from "@/components/account/InputEmail";

export default function Settings() {
	// @ts-ignore
	const { user } = useAuth();

	const [isLoading, setIsLoading] = useState(true);
	// const [isEditing, setIsEditing] = useState(false);
	// const [isAddingEmail, setIsAddingEmail] = useState(false);

	const [accountId, setAccountId] = useState('');
	const [adminEmail, setAdminEmail] = useState('');
	const [primaryColor, setPrimaryColor] = useState('');
	const [homeUrl, setHomeUrl] = useState('');
	const [brandName, setBrandName] = useState('');
	const [brandUrl, setBrandUrl] = useState('');
	const [boardTitle, setBoardTitle] = useState('');
	const [accountType, setAccountType] = useState('free');
	// const [notifyEmails, setNotifyEmails] = useState(['test@test', 'test2@test']);
	// const [addEmail, setAddEmail] = useState('');

	const getAccountData = async () => {
		if (user.uid) setAccountId(user.uid);
		try {
			const querySnapshot = await getDocs(query(collection(firestore, 'accounts'), where('account_id', '==', user.uid)));
			const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() }));
			const data = foundData[0] as AccountSettings;
			setAdminEmail(data.admin_email);
			setPrimaryColor(data.primary_color);
			setHomeUrl(data.home_url);
			setBrandUrl(data.brand_url);
			setBrandName(data.brand_name);
			setBoardTitle(data.board_title);
			setAccountType(data.type);
		} catch (error: any) {
			console.error('Error getting account data: ' + error.message);
		}
	}

	const getData = async () => {
		await getAccountData();
		setIsLoading(false);
	}

	// const handleAddEmailOkClick = () => {
	// 	if (addEmail === '') {
	// 		alert('Email required');
	// 		return;
	// 	}
	// 	const newEmails = notifyEmails;
	// 	newEmails.push(addEmail);
	// 	setNotifyEmails(newEmails);
	// 	setAddEmail('');
	// 	setIsAddingEmail(false);
	// 	setIsEditing(false);
	// 	console.log(notifyEmails);
	// }

	// const handleAddEmailCancelClick = () => {
	// 	setAddEmail('');
	// 	setIsAddingEmail(false);
	// 	setIsEditing(false);
	// }

	// const handleEditEmailOkClick = (emailValue: string, index: number) => {
	// 	const newEmails = notifyEmails;
	// 	newEmails[index] = emailValue;
	// 	setNotifyEmails(newEmails);
	// 	setIsEditing(false);
	// 	console.log(notifyEmails);
	// }

	const handleInputChange = (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === 'adminEmail') setAdminEmail(e.target.value);
		if (type === 'primaryColor') setPrimaryColor(e.target.value);
		if (type === 'homeUrl') setHomeUrl(e.target.value);
		if (type === 'boardTitle') setBoardTitle(e.target.value);
		// if (type === 'addEmail') setAddEmail(e.target.value);
	}

	const handleSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		const newAccountSettings = {
			account_id: accountId,
			admin_email: adminEmail,
			brand_name: brandName,
			brand_url: brandUrl,
			primary_color: primaryColor,
			home_url: homeUrl,
			board_title: boardTitle,
			updated_at: Date.now(),
		}
		await setDoc(doc(firestore, 'account', 'settings'), newAccountSettings);
		Router.reload();
	}

	useEffect(() => {
		getData();
	}, [isLoading]);

	return (
		<ProtectedRoute>
			<Head>
				<title>Settings – {brandName}</title>
			</Head>
			<Sidebar />
			<div className="md:ml-60 px-4 pt-24 pb-8 md:p-16 md:pt-24 space-y-8">
				<div>
					<div className="mb-8 md:mb-16">
						<h1 className="text-xl md:text-3xl font-bold">Settings</h1>
					</div>
					<div>
						<form className="space-y-4" onSubmit={e => handleSubmit(e)}>
							<div className="flex flex-col lg:flex-row gap-4">
								{accountType !== 'free' && <div className="lg:w-1/2 px-4 py-8 md:px-8 bg-white rounded-lg space-y-1">
									<div>
										<h2 className="font-medium">Primary color (HEX code, include '#')</h2>
									</div>
									<div>
										<input type="text" name="primaryColor" className="border rounded-lg p-2 w-full" value={primaryColor} placeholder="#000000" onChange={e => handleInputChange('primaryColor', e)} onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }} />
									</div>
								</div>}
								<div className="lg:w-1/2 px-4 py-8 md:px-8 bg-white rounded-lg space-y-1">
									<div>
										<h2 className="font-medium">Visit homepage link URL (optional)</h2>
									</div>
									<div>
										<input type="url" name="homeUrl" className="border rounded-lg p-2 w-full" value={homeUrl} placeholder="https://ssimple.co/" onChange={e => handleInputChange('homeUrl', e)} onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }} />
									</div>
								</div>
							</div>
							<div className="px-4 py-8 md:px-8 bg-white rounded-lg space-y-1">
								<div>
									<h2 className="font-medium">Feedback board title</h2>
								</div>
								<div>
									<input type="text" name="boardTitle" className="border rounded-lg p-2 w-full" value={boardTitle} placeholder="Your board title" onChange={e => handleInputChange('boardTitle', e)} onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }} />
								</div>
							</div>
							<div className="flex flex-col lg:flex-row gap-4 lg:gap-16 px-4 py-8 md:px-8 bg-white rounded-lg">
								<div className="w-96 space-y-1">
									<div>
										<h2 className="font-medium">Admin email</h2>
									</div>
									<div>
										<input type="email" name="adminEmail" className="border rounded-lg p-2 w-full" value={adminEmail} placeholder="youremail@ssimple.co" onChange={e => handleInputChange('adminEmail', e)} onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }} />
									</div>
								</div>
								{/* <div className="lg:w-1/2 space-y-4">
									<div>
										<h2 className="font-bold">Additional emails to receive new feedback notifications</h2>
									</div>
									<div>
										<ul className="space-y-4 mb-4">
											{notifyEmails && notifyEmails.length > 0 && notifyEmails.map((email, index) => (
												<li key={index}>
													<InputEmail
														index={index}
														email={email}
														handleEditEmailOkClick={handleEditEmailOkClick}
													/>
												</li>
											))}
										</ul>
										{isAddingEmail && <div className="flex gap-2">
											<input type="email" className="border rounded-lg p-2 w-full" value={addEmail} placeholder="email@example.com" onChange={e => handleInputChange('addEmail', e)} onKeyDown={e => { e.key === 'Enter' && e.preventDefault() }} />
											<button type="button" className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors" onClick={handleAddEmailOkClick}><i className="fas fa-check"></i></button>
											<button type="button" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-lg transition-colors" onClick={handleAddEmailCancelClick}><i className="fas fa-times"></i></button>
										</div>}
										{!isAddingEmail && <button type="button" className="px-4 py-2 border border-slate-400 hover:border-slate-500 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-500 transition-colors" onClick={() => { setIsAddingEmail(true); setIsEditing(true); }}><i className="fas fa-plus"></i> Add</button>}
									</div>
								</div> */}
							</div>
							<div className="text-right">
								<button type="submit" className="w-full md:w-auto px-4 py-2 text-white font-bold rounded-lg transition-colors bg-zinc-500 hover:bg-zinc-600">Save Settings</button>
							</div>
						</form>
					</div>
				</div>
				<div className="space-y-2">
					<div>
						<h2 className="text-xl font-bold">Embed Widget</h2>
					</div>
					<div className="px-4 py-8 md:px-8 bg-white rounded-lg space-y-6">
						<div className="space-y-1">
							<div>
								<p>Add the following snippet to any page you would like to show the feedback widget:</p>
							</div>
							<div>
								<code className="block text-sm text-left bg-gray-800 text-white rounded-lg p-4 pl-6 break-all">
									<span>{`!function(e,t){e.ssimple={};var s=t.createElement("script");s.type="text/javascript",s.async=!0,s.src="https://cdn.jsdelivr.net/gh/ssimpleCo/sdk@latest/ssimpleSdk.js";var n=t.getElementsByTagName("script")[0];n.parentNode.insertBefore(s,n),s.onload=function(){ssimple.init({`}</span>
									<span>appId:"{brandUrl}",</span>
									<span className="text-indigo-300">btnColor:"{primaryColor}"</span>,
									<span className="text-indigo-300">hideBtn:false</span>
									<span>{`})}}(window,document);`}</span>
								</code>
							</div>
						</div>
						<div>
							<p>Customize the color of your widget button by changing <span className="font-bold text-indigo-400">btnColor</span>.</p>
						</div>
						<div className="space-y-1">
							<div>
								<p>To open feedback widget via a button on your page instead of a floating icon in the bottom right corner, simply add <code className="font-bold text-indigo-400">data-ssimple-widget</code> as an attribute to a button and set <span className="font-bold text-indigo-400">hideBtn</span> as <span>true</span> in the snippet.</p>
							</div>
							<div className="flex space-x-2">
								<code className="block text-sm bg-gray-800 text-white rounded-lg p-4">
									{`<button`}<span className="text-indigo-300"> data-ssimple-widget</span>{`>Example Button</button>`}
								</code>
								<button type="button" className="px-4 py-2 font-bold rounded-lg bg-zinc-200 hover:bg-zinc-300 transition-colors" data-ssimple-widget>Example Button</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}