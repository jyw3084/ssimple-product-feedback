import type { NextApiRequest, NextApiResponse } from 'next';

import surveyDemoMailer from '@/mailers/surveyDemoMailer';

export default async (req: NextApiRequest, res: NextApiResponse) => {
	if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });
	try {
		const { createdAt, data } = req.body;
		const email = data.fields[0].value;
		const resData = surveyDemoMailer(email);
		res.status(200).json(resData);
	} catch (error: any) {
		throw new Error(error);
		// res.status(400).json(error);
	}
}