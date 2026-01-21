import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method === 'POST') {
		const { email, subject, html } = req.body;
		try {
			const data = await resend.emails.send({
				from: 'ssimple notification <noreply@ssimple.co>',
				to: [email],
				subject,
				html,
			});

			res.status(200).json(data);
		} catch (error) {
			res.status(400).json(error);
		}
	}
}