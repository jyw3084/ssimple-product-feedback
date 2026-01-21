import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="ssimple" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="76x76" href="apple-icon.png" />
      </Head>
      <body className="bg-zinc-50 text-gray-700 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
