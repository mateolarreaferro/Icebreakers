'use client'
import SignOutButton from "../components/SignOutButton";
import Link from 'next/link';
import { useSession } from "next-auth/react";


export default function SettingsPage() {
    const { data: session } = useSession();

    return (
        <div className="bg-violet-100">
            <header className="p-4"> 
                <Link href="/home" className="text-blue-600 hover:text-blue-800 transition-colors">
                ← Back to Home
                </Link>
            </header>

        { /* Body */ }
        <div className="flex flex-col items-center justify-center h-screen">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Account Settings</h2>
            <div id="acount_info p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>

            <div className="p-4">
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1 text-gray-900">{session.user?.name}</p>
            </div>
            
            <div className="p-4">
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1 text-gray-900">{session.user?.email}</p>
            </div>
            
            <div className="p-4">
                <p className="text-sm text-gray-500 mb-2">Sign out from your account</p>
                <SignOutButton />
            </div>   
            </div>

        </div>
    </div>

    );   
}