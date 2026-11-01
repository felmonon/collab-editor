# Social sign-in setup

This app uses **NextAuth.js v4**, a Prisma account adapter, and JWT sessions. Google, Apple, and GitHub sign-in are optional. A provider appears only when its server-side credentials are configured; Apple also requires a suitable HTTPS `NEXTAUTH_URL`. Email/password sign-in remains available.

## Environment and callbacks

Set these in the Next.js deployment’s secret environment settings, never in `NEXT_PUBLIC_*` variables or committed files. Restart/redeploy after changing them. The socket service does not need OAuth credentials.

| Provider | Environment variables | Exact production callback |
| --- | --- | --- |
| Google | `GOOGLE_ID`, `GOOGLE_SECRET` | `https://collab-editor-sand.vercel.app/api/auth/callback/google` |
| Apple | `APPLE_ID`, `APPLE_SECRET` | `https://collab-editor-sand.vercel.app/api/auth/callback/apple` |
| GitHub | `GITHUB_ID`, `GITHUB_SECRET` | `https://collab-editor-sand.vercel.app/api/auth/callback/github` |

Production `NEXTAUTH_URL` is `https://collab-editor-sand.vercel.app`. Keep a strong, stable `NEXTAUTH_SECRET`; it is separate from provider secrets. Use separate development credentials where practical. Google and GitHub development callbacks replace the origin above with `http://localhost:3000` (or your actual local port). Apple needs a registered HTTPS domain; localhost and IP-address callbacks are not supported. [NextAuth Google setup](https://next-auth.js.org/providers/google), [NextAuth Apple setup](https://next-auth.js.org/providers/apple).

## Google

1. In Google Cloud’s Google Auth Platform, select the intended project. Complete Branding, Audience, and contact information with the app owner’s approved details. Configure test users while the application is in testing, or complete the appropriate publishing requirements before public use.
2. Create an OAuth client of type **Web application**. Register the exact Google callback above under **Authorized redirect URIs**; an authorized JavaScript origin alone is insufficient.
3. Store its client ID in `GOOGLE_ID` and client secret in `GOOGLE_SECRET`.

The app requests only `openid email profile` for identity, email, and basic profile information. It does not request Drive, Gmail, Calendar, or offline access. See Google’s [OpenID Connect setup and scope definitions](https://developers.google.com/identity/openid-connect/openid-connect) and [OAuth client configuration](https://support.google.com/cloud/answer/15549257).

Production registration: Google Cloud project **Collab Editor** (`linen-mapper-513422-v3`), published to production on November 1, 2026. Publishing status, provider credentials, and callback verification must be checked independently of code deployment.

## Apple

1. In the Apple Developer account, enable **Sign in with Apple** on an eligible **primary App ID**. Web authentication requires a **Services ID** associated with that primary App ID; put the Services ID identifier in `APPLE_ID`. Register domain `collab-editor-sand.vercel.app` and the exact Apple return URL above. See Apple’s [web configuration](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web).
2. Create a **Sign in with Apple private key** associated with that primary App ID. Securely retain the downloaded `.p8` file, its **Key ID**, and the developer **Team ID**. These are inputs for signing the secret; they are not additional environment variables consumed by this app. See Apple’s [private-key setup](https://developer.apple.com/help/account/capabilities/create-a-sign-in-with-apple-private-key/).
3. Generate a client-secret JWT with **ES256** using the private key. Header: `alg=ES256`, `kid=Key ID`. Claims: `iss=Team ID`, `sub=Services ID` (exactly `APPLE_ID`), `aud=https://appleid.apple.com`, and Unix-second `iat`/`exp`. Store the resulting signed JWT in `APPLE_SECRET`, not the `.p8` contents. Apple limits expiration to **15,777,000 seconds (six months)** into the future. Use a shorter lifetime and schedule rotation before expiry; replace the environment value and redeploy. See Apple’s [client-secret specification](https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret).

Apple returns the `name email` consent response as a cross-site `form_post`. The app keeps PKCE, state, and nonce validation, and uses separate, short-lived `Secure; HttpOnly; SameSite=None` Apple flow cookies. Session and CSRF cookies keep their normal policy. Do not remove validation or loosen all cookies to troubleshoot a callback. Apple’s first-consent display name is optional; authentication identity comes from the validated token. See Apple’s [web authorization response](https://developer.apple.com/documentation/signinwithapple/configuring-your-webpage-for-sign-in-with-apple).

Production registration: Services ID `com.felmonon.collabeditor.web`, primary App ID `com.felmonon.collabeditor`, key ID `D98AF37747`. The initial client-secret JWT expires April 30, 2027 at 22:56 UTC; renew before then and redeploy. Private keys and signed secrets must stay outside this repository.

## GitHub

Create or edit the OAuth app in GitHub’s developer settings. Set its homepage to the production origin and its authorization callback to the GitHub URL above. Put its client ID and secret in `GITHUB_ID` and `GITHUB_SECRET`. Preserve the app’s existing sanitized token-exchange handler when changing configuration. See GitHub’s [OAuth app registration](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

## Connect another sign-in method

Existing users can open **Account settings → Sign-in methods** from the workspace and connect Google or GitHub while signed in with their original method. Connections are verified against persisted account records before the UI labels them connected. This adds a login method to the existing workspace; it does not merge two existing accounts or move documents.

The authenticated connection request issues a five-minute encrypted intent bound to the current user and selected provider. OAuth's CSRF, state, and PKCE checks remain in place. The callback must still have the initiating session; a missing or changed session cannot attach an identity to a different account. Identities already connected to another account are rejected. Account responses include only provider names and whether password login exists, never access tokens or secrets.

Apple remains available for signup and returning sign-in. Connecting Apple to an existing workspace is not offered: its cross-site POST does not carry the regular Lax session cookie, so the native authenticated linking flow cannot safely identify that workspace. Do not weaken the session cookie policy to bypass this restriction.

## Verify and maintain

- Check `/api/auth/providers`: it should list only configured providers. Then complete a real sign-in, sign-out, and returning-user sign-in for each enabled provider. Provider discovery or a successful redirect alone does not prove a working callback.
- For Apple, verify both first-consent and returning-user flows over HTTPS. Confirm that cancelling consent gives a recoverable error and no session, and that the return location is the app.
- If an email already belongs to an unlinked account, use the **original sign-in method**, then connect Google or GitHub from Account settings. The app deliberately sets `allowDangerousEmailAccountLinking: false`; do not enable automatic same-email linking to bypass `OAuthAccountNotLinked`. [NextAuth’s account-linking rationale](https://next-auth.js.org/faq#when-i-sign-in-with-another-account-with-the-same-email-address-why-are-accounts-not-linked-automatically).
- For redirect errors, compare the complete registered callback and `NEXTAUTH_URL`, including scheme and port. For Apple `invalid_client`, check the JWT expiration, Services ID, Team ID, Key ID, and signature. Keep tokens, private keys, client secrets, and callback bodies out of logs and support reports.
