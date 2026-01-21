import { render } from '@react-email/render';
import { Resend } from "resend";

import WeeklyReminderEmail from './templates/WeeklyReminderEmail';

import type { Submit, AccountSettings } from '@/utils/types';

const resend = new Resend(process.env.RESEND_API_KEY);

const weeklyReminderMailer = async (submits: Submit[], accountSettings: AccountSettings, logoUrl: string, email: string) => {
	const emailHtml = render(
		<WeeklyReminderEmail
			submits={submits}
			accountSettings={accountSettings}
			logoUrl={logoUrl}
		/>, {
		pretty: true,
	});

	try {
		const data = await resend.emails.send({
			from: 'ssimple notification <noreply@ssimple.co>',
			to: [email],
			subject: submits.length === 0 ? 'Do you have any feedback for ' + accountSettings.brand_name + '?' : 'Do you agree with these feedback for ' + accountSettings.brand_name + '?',
			html: emailHtml,
		});

		return data;
	} catch (error: any) {
		console.error(error.message);
	}
}

export default weeklyReminderMailer;