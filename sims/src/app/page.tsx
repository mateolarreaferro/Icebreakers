'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the icebreaker home page
        router.push("/home");
    }, [router]);
    
    return (
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="text-6xl mb-4">🧊</div>
                <h1 className="text-2xl font-bold text-white mb-2">Icebreaker Chat</h1>
                <p className="text-blue-200">Redirecting...</p>
            </div>
        </div>
    );
}