import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

import type { Submit, AccountSettings } from "@/utils/types";

const main = {
	backgroundColor: '#FFFFFF',
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

export default function WeeklyReminderEmail({ submits, accountSettings, logoUrl }: { submits: Submit[], accountSettings: AccountSettings, logoUrl: string }) {
	if (submits.length > 0) {
		return (
			<Html>
				<Head />
				<Preview>New feedback for {accountSettings.brand_name} this week</Preview>
				<Tailwind>
					<Body className="text-gray-700" style={main}>
						<Container className="mx-auto p-8">
							<Section className="my-6">
								<Img
									src={logoUrl}
									className="max-w-[160px] max-h-[50px]"
								/>
								<Heading className="text-2xl">New feedback for {accountSettings.brand_name} this week</Heading>
								<Text className="text-base">
									Do you agree with any of them?
								</Text>
								{submits.map((submit, index) => (
									<Text className="text-base">
										<Link href={`https://${accountSettings.brand_url}.ssimple.co/?topic=${submit._id}`} className="text-gray-700 underline">
											{index + 1}. {submit.title}
										</Link>
									</Text>
								))}
							</Section>
							<Hr className="mt-8 border-zinc-200" />
							<Section className="my-6">
								<Text className="text-base mb-6">
									Have other thoughts or ideas for {accountSettings.brand_name}?
								</Text>
								<Link href={`https://${accountSettings.brand_url}.ssimple.co/new`} className="px-6 py-3 bg-zinc-600 rounded-lg font-bold text-white text-base">
									Let Us Know
								</Link>
							</Section>
							<Section className="mt-10">
								<Text className="text-sm text-gray-400">
									You are receiving this email because you previously signed up or provided feedback for {accountSettings.brand_name}. This email is powered by <Link href={'https://ssimple.co'} className="text-gray-400 underline">ssimple.co</Link>
								</Text>
								<Link href={'https://ssimple.co'}>
									<Img
										src={'https://firebasestorage.googleapis.com/v0/b/ssimple-roadmap.appspot.com/o/brand%2Flogo.png?alt=media&token=5ab7c012-757b-4595-a5b8-d485043abf2a'}
										className="max-h-[50px]"
									/>
								</Link>
							</Section>
						</Container>
					</Body>
				</Tailwind>
			</Html>
		);
	} else {
		return (
			<Html>
				<Head />
				<Preview>Let us know what you think of {accountSettings.brand_name}</Preview>
				<Tailwind>
					<Body className="text-gray-700" style={main}>
						<Container className="mx-auto p-8">
							<Section className="my-6">
								<Img
									src={logoUrl}
									className="max-w-[160px] max-h-[50px]"
								/>
								<Heading className="text-2xl">Do you have any feedback for {accountSettings.brand_name}?</Heading>
								<Text className="text-base mb-6">Let us know if you run into any issues, or have suggestions for us to improve.</Text>
								<Link href={`https://${accountSettings.brand_url}.ssimple.co/new`} className="px-6 py-3 bg-zinc-600 rounded-lg font-bold text-white text-base">
									Give Us Feedback
								</Link>
							</Section>
							<Hr className="mt-8 border-zinc-200" />
							<Section className="mt-10">
								<Text className="text-sm text-gray-400">
									You are receiving this email because you previously signed up or provided feedback for {accountSettings.brand_name}. This email is powered by <Link href={'https://ssimple.co'} className="text-gray-400 underline">ssimple.co</Link>
								</Text>
								<Link href={'https://ssimple.co'}>
									<Img
										src={'https://firebasestorage.googleapis.com/v0/b/ssimple-roadmap.appspot.com/o/brand%2Flogo.png?alt=media&token=5ab7c012-757b-4595-a5b8-d485043abf2a'}
										className="max-h-[50px]"
									/>
								</Link>
							</Section>
						</Container>
					</Body>
				</Tailwind>
			</Html>
		);
	}
}
