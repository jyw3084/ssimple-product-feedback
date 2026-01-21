import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { FormProvider, useForm } from "react-hook-form";

export default function Login() {
	const methods = useForm({ mode: "onBlur" });
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = methods;

	const { logIn } = useAuth();
	const router = useRouter();

	const onSubmit = async (data) => {
		try {
			const user = await logIn(data.email, data.password);
			router.push('/admin');
		} catch (error) {
			// console.log(error.message);
			alert('Error logging in');
		}
	}

	return (
		<FormProvider {...methods}>
			<div className="w-screen h-screen flex justify-center items-center">
				<div className="w-[400px] border rounded-lg shadow-lg p-8">
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="">
							<input
								type="email"
								name="email"
								{...register("email", { required: "Email is required" })}
								className="w-full border rounded p-2"
								placeholder="Email"
							/>
							{errors.email && <p className="text-sm font-medium text-red-400">{errors.email.message}</p>}
						</div>
						<div className="">
							<input
								type="password"
								name="password"
								{...register("password", { required: "Password is required" })}
								className="w-full border rounded p-2"
								placeholder="Password"
							/>
							{errors.password && <p className="text-sm font-medium text-red-400">{errors.password.message}</p>}
						</div>
						<div className="">
							<button className="w-full bg-sky-500 px-4 py-2 rounded text-white font-bold" type="submit">Login</button>
						</div>
					</form>
				</div>
			</div>
		</FormProvider>
	)
}