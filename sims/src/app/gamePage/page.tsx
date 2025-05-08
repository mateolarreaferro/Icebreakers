import StartCard from "../components/StartCard";
import Chat from "../components/Chat";
import Link from 'next/link';

export default function GamePage() {
    return (
        <div className="bg-sky-100 min-h-screen">
            <header className="p-4"> 
                <Link href="/home" className="text-blue-600 hover:text-blue-800 transition-colors">
                ← Back to Home
                </Link>
            </header>
        <div className="bg-sky-100 min-h-screen flex justify-center">
            <StartCard></StartCard>
        </div>
        </div>
    );
}