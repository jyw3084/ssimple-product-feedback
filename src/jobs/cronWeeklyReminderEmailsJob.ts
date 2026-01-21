import inngestClient from "@/utils/inngestClient";
import { firestore } from "@/config/firebase";
import { collection, doc, getDocs, getDoc, orderBy, query, where } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const storage = getStorage();

const cronWeeklyReminderEmailsJob = inngestClient.createFunction(
	{ id: 'weekly-reminder-load-feedback' },
	{ cron: 'TZ=America/Los_Angeles 0 15 * * 4' },
	async ({ event, step }) => {
		// fetch all feedback in last 7 days
		const submits = await step.run('get-feedback', async () => {
			const sevenDaysAgo = Date.now() - 604800000;
			try {
				const querySnapshot = await getDocs(query(collection(firestore, 'submits'), where('created_at', '>=', sevenDaysAgo), orderBy('created_at', 'desc')));
				const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() }));
				// filter only public feedback
				return foundData.filter(data => data.status !== 'private');
			} catch (error: any) {
				console.error('Error getting feedback: ' + error.message);
			}
		});

		// get account settings
		const accountSettings = await step.run('get-account-settings', async () => {
			try {
				const querySnapshot = await getDoc(doc(firestore, 'account', 'settings'));
				if (querySnapshot.exists()) return querySnapshot.data();
			} catch (error: any) {
				console.error('Error getting account settings: ' + error.message);
			}
		});

		const logoUrl = await step.run('get-logo-url', async () => {
			try {
				return await getDownloadURL(ref(storage, 'brand/logo.png'));
			} catch (error: any) {
				alert('Error getting logo: ' + error.message);
			}
		})

		// fetch all profiles
		const profiles = await step.run('get-profiles', async () => {
			try {
				const querySnapshot = await getDocs(collection(firestore, 'profiles'));
				const foundData = querySnapshot.docs.map(doc => ({ ...doc.data() }));
				return foundData;
			} catch (error: any) {
				console.error('Error getting profile: ' + error.message);
			}
		});

		if (profiles && profiles.length > 0) {
			// for each profile, send an event
			const events = profiles.map(({ email }) => ({
				name: 'mailers/weekly-reminder-email.send',
				data: {
					submits,
					accountSettings,
					logoUrl,
					email,
				},
			}))
			await step.sendEvent('fan-out-weekly-reminder-emails', events);
			return { count: profiles.length }
		} else {
			return 'No data';
		}
	}
)

export default cronWeeklyReminderEmailsJob;