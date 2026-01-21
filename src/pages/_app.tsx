import { AuthContextProvider } from "@/context/AuthContext";

import '../styles/global.css'
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthContextProvider>
      <Component {...pageProps} />
    </AuthContextProvider>
  );
}
