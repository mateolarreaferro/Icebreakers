"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
    const handleSignOut = () => {
        const previousPage = sessionStorage.getItem("previousPage") || "/";
        signOut({ callbackUrl: previousPage });
      };
       
  return (
    <button 
      onClick={handleSignOut} 
      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
    >
      Sign Out
    </button>
  );
}