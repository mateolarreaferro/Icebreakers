'use client'
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        // once sign-in complete, nav to home page
        if (session) {
            router.push("/home");
        }
    }, [session, router]);
    
    return (

    <div className="bg-violet-100 min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-8 p-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <h1 className="text-6xl font-bold font-serif text-violet-400 dark:text-white">
            StoryLine
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
            Design your own adventure
        </p>

        {!session ? (
              <div className="space-y-6 flex flex-col items-center">
                <button
                  onClick={() => signIn('google')}
                  className="group relative inline-flex items-center justify-center px-8 py-4 overflow-hidden rounded-lg bg-white text-black shadow-md transition duration-300 ease-out hover:scale-105"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600 to-violet-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ease-out"></span>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  By continuing, you agree to our <Link href="/terms" className="text-blue-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>
                </div>
              </div>
            ) : (
              <div className="text-lg text-gray-700 dark:text-gray-200">
                Redirecting to your personal dashboard...
              </div>
            )}
    </div>
    </div>
  );
}


// export default function Home() {
//     return (
//       <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
//         <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
//           <Image
//             className="dark:invert"
//             src="/next.svg"
//             alt="Next.js logo"
//             width={180}
//             height={38}
//             priority
//           />
//           <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
//             <li className="mb-2 tracking-[-.01em]">
//               Get started by editing{" "}
//               <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
//                 src/app/page.tsx
//               </code>
//               .
//             </li>
//             <li className="tracking-[-.01em]">
//               Save and see your changes instantly.
//             </li>
//           </ol>
  
//           <div className="flex gap-4 items-center flex-col sm:flex-row">
//             <a
//               className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
//               href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               target="_blank"
//               rel="noopener noreferrer"
//             >
//               <Image
//                 className="dark:invert"
//                 src="/vercel.svg"
//                 alt="Vercel logomark"
//                 width={20}
//                 height={20}
//               />
//               Deploy now
//             </a>
//             <a
//               className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
//               href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//               target="_blank"
//               rel="noopener noreferrer"
//             >
//               Read our docs
//             </a>
//           </div>
//         </main>
//         <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
//           <a
//             className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//             href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               aria-hidden
//               src="/file.svg"
//               alt="File icon"
//               width={16}
//               height={16}
//             />
//             Learn
//           </a>
//           <a
//             className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//             href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               aria-hidden
//               src="/window.svg"
//               alt="Window icon"
//               width={16}
//               height={16}
//             />
//             Examples
//           </a>
//           <a
//             className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//             href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               aria-hidden
//               src="/globe.svg"
//               alt="Globe icon"
//               width={16}
//               height={16}
//             />
//             Go to nextjs.org →
//           </a>
//         </footer>
//       </div>
//     );
//   }
  