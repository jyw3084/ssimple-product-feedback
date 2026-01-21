import { serve } from "inngest/next";
import inngestClient from "@/utils/inngestClient";

import cronWeeklyReminderEmailsJob from "@/jobs/cronWeeklyReminderEmailsJob";
import sendWeeklyReminderEmailJob from "@/jobs/sendWeeklyReminderEmailJob";

export default serve({
	client: inngestClient,
	functions: [
		// cronWeeklyReminderEmailsJob,
		// sendWeeklyReminderEmailJob,
	],
});
