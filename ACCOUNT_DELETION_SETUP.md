# Enable account deletion

The browser never receives the Supabase service-role key. Account deletion is performed by the authenticated `delete-account` Edge Function, which verifies the caller's access token and deletes only that caller.

## Deploy the function

1. Install the Supabase CLI and sign in: `supabase login`.
2. Link this folder to your project: `supabase link --project-ref YOUR_PROJECT_REF`. Find the project ref in the Supabase project URL; it is the subdomain before `.supabase.co`.
3. Set the function secrets from your Supabase project's API settings:

   ```powershell
   supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" SUPABASE_ANON_KEY="YOUR_PUBLISHABLE_OR_ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="YOUR_SECRET_SERVICE_ROLE_KEY" ALLOWED_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"
   ```

   The service-role key is a server secret. Set it only with the CLI secrets command; never put it in `supabase-config.js` or other browser code.

4. Deploy the function:

   ```powershell
   supabase functions deploy delete-account --no-verify-jwt
   ```

   JWT verification is performed inside the function with `auth.getUser(accessToken)` before any admin operation. `--no-verify-jwt` allows the function to return its controlled CORS/auth errors; it does not make deletion anonymous.

5. Add the exact website origin(s) you use to `ALLOWED_ORIGINS`. For example, if Live Server uses `http://127.0.0.1:5500`, include that origin (no path or trailing slash). Add each development or production origin as a comma-separated entry.
6. Ensure the project URL and publishable (or legacy anon) key in `supabase-config.js` match this same Supabase project.

## Behavior

In the app, open the profile menu, choose **Delete account**, and type `DELETE` to confirm. On success, the function deletes the signed-in Supabase Auth user and the app clears its local session. Deleting the Auth user does not automatically remove related rows in application tables unless those tables are configured with appropriate foreign keys and deletion rules.
