import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // You can add additional validation here if needed
            return true;
        },
        async session({ session, token }) {
            // Pass any additional data to the session
            return session;
        },
        async jwt({ token, account }) {
            // Persist the OAuth access_token to the token right after signin
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        }
    },
    pages: {
        signIn: '/', // Redirect to your home page
        error: '/', // Redirect errors to home page
    },
})

export { handler as GET, handler as POST};