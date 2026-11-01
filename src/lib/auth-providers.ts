/** Public display metadata only. Provider availability comes from NextAuth. */
export const socialProviderIds = ["google", "apple", "github"] as const;
export type SocialProviderId = (typeof socialProviderIds)[number];

export const socialProviderNames: Record<SocialProviderId, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

/** Accept only app destinations, including NextAuth's absolute callback URLs. */
export function safeSignInDestination(
  callback: string | null,
  origin = "https://local.invalid",
): string {
  if (!callback) return "/documents";
  try {
    const url = new URL(callback, origin);
    if (url.origin !== new URL(origin).origin) return "/documents";
    if (
      url.pathname === "/account" ||
      /^\/documents(?:\/[a-zA-Z0-9_-]+)?$/.test(url.pathname)
    ) return url.pathname;
  } catch {
    // Malformed or external callback URLs never become navigation targets.
  }
  return "/documents";
}

/** Keep provider/server details out of the sign-in error shown to the user. */
export function oauthErrorMessage(error: string): string {
  switch (error) {
    case "OAuthAccountNotLinked":
      return "An account with this email already exists. Sign in with your original method, then open Account settings to connect Google or GitHub.";
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
