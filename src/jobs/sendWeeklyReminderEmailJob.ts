import inngestClient from "@/utils/inngestClient";

import weeklyReminderMailer from "@/mailers/weeklyReminderMailer";

const sendWeeklyReminderEmailJob = inngestClient.createFunction(
	{ id: "send-weekly-reminder-email" },
	{ event: "mailers/weekly-reminder-email.send" },
	async ({ event, step }) => {
		const { data: { submits, accountSettings, logoUrl, email } } = event;

		const emailRes = await step.run('generate-email-html', async () => weeklyReminderMailer(submits, accountSettings, logoUrl, email));
		return { event, emailRes };
	},
);

export default sendWeeklyReminderEmailJob;