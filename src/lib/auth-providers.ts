/** Public display metadata only. Provider availability comes from NextAuth. */
export const socialProviderIds = ["google", "apple", "github"] as const;
export type SocialProviderId = (typeof socialProviderIds)[number];

export const socialProviderNames: Record<SocialProviderId, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

/** Keep provider/server details out of the sign-in error shown to the user. */
export function oauthErrorMessage(error: string): string {
  switch (error) {
    case "OAuthAccountNotLinked":
      return "An account with this email already exists. Sign in with the method you originally used. For your security, we don’t automatically link different sign-in methods.";
    case "AccessDenied":
      return "Sign-in permission wasn’t granted. Try again and allow access, or use your original sign-in method.";
    case "OAuthSignin":
      return "We couldn’t start social sign-in. Please try again, or use your email and password.";
    case "OAuthCallback":
    case "Callback":
      return "We couldn’t finish signing you in with that provider. Please try again, or use your original sign-in method.";
    case "OAuthCreateAccount":
      return "We couldn’t create your account with that provider. Please try again, or create an account with your email.";
    default:
      return "We couldn’t complete sign-in. Please try again, or use your original sign-in method.";
  }
}
