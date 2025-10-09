# Supabase Integration Setup Guide

This guide will help you set up Supabase for your Attendance System app to enable cloud data storage, user authentication, and multi-device sync.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **React Native Environment**: Ensure your React Native development environment is set up
3. **Existing App**: Your attendance system app should be running locally

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `attendance-system` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for the project to be ready (2-3 minutes)

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Configure Environment Variables

1. Create a `.env` file in your project root (if it doesn't exist):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Update your `react-native-config` setup to load these variables.

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire content from `supabase/schema.sql`
4. Click "Run" to execute the schema
5. Verify tables are created in **Database** → **Tables**

You should see these tables:
- `profiles`
- `classes`
- `members`
- `programs`
- `program_enrollments`
- `attendance_records`
- `attendance_entries`

## Step 5: Configure Row Level Security (RLS)

The schema automatically sets up RLS policies, but verify in **Authentication** → **Policies** that you see policies for each table ensuring users can only access their own data.

## Step 6: Install Required Dependencies

Make sure you have these packages installed:

```bash
npm install @supabase/supabase-js
# or
yarn add @supabase/supabase-js
```

## Step 7: Update App Configuration

1. Verify `supabase-client.js` is configured correctly
2. The file should look like this:

```javascript
import Config from "react-native-config";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY);
```

## Step 8: Wrap Your App with Providers

Update your main App component to include all the context providers:

```javascript
import { AuthProvider } from './components/context/AuthContext';
import { ClassProvider } from './components/context/ClassContext';
import { MemberProvider } from './components/context/MemberContext';
import { ProgramProvider } from './components/context/ProgramContext';
import { AttendanceProvider } from './components/context/AttendanceContext';

export default function App() {
  return (
    <AuthProvider>
      <ClassProvider>
        <MemberProvider>
          <ProgramProvider>
            <AttendanceProvider>
              {/* Your app components */}
            </AttendanceProvider>
          </ProgramProvider>
        </MemberProvider>
      </ClassProvider>
    </AuthProvider>
  );
}
```

## Step 9: Test Authentication

1. Run your app
2. Try signing up with a new email
3. Check Supabase dashboard **Authentication** → **Users** to see the new user
4. Try signing in with the credentials

## Step 10: Data Migration (For Existing Users)

If you have existing local data, the app will automatically detect it and offer to migrate:

1. Sign in to your account
2. If local data is detected, you'll see a migration prompt
3. Choose "Migrate" to transfer your local data to Supabase
4. Local data will be cleared after successful migration

### Manual Migration (if needed)

You can also manually trigger migration using the migration helper:

```javascript
import migrationHelper from './utils/migrationHelper';

// Check for local data
const status = await migrationHelper.showMigrationStatus();

// Perform migration
if (status.needsMigration) {
  const result = await migrationHelper.migrateLocalDataToSupabase();
  console.log(result.message);
}
```

## Step 11: Verify Everything Works

Test the following features:
1. **Authentication**: Sign up, sign in, sign out
2. **Classes**: Add, edit, delete classes
3. **Members**: Add, edit, delete members
4. **Programs**: Create programs and enroll students
5. **Attendance**: Take attendance and view records
6. **Multi-device**: Sign in on another device and verify data syncs

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check your `.env` file has correct SUPABASE_URL and SUPABASE_ANON_KEY
   - Restart your React Native bundler after adding environment variables

2. **"Row Level Security policy violation" error**
   - Ensure you're signed in when trying to access data
   - Check RLS policies are correctly set up in Supabase dashboard

3. **Migration fails**
   - Check console logs for specific errors
   - Ensure you're authenticated before attempting migration
   - Try creating a backup first: `migrationHelper.createBackupOfLocalData()`

4. **Data not syncing**
   - Check internet connection
   - Verify Supabase project is active (not paused)
   - Check browser network tab for API call errors

### Getting Help

1. Check Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
2. Review console logs for detailed error messages
3. Check Supabase dashboard logs in **Logs** section

## Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Use Row Level Security** - Already configured in the schema
3. **Validate user input** - Always validate data before saving
4. **Regular backups** - Supabase handles this, but you can export data if needed

## Features Enabled by Supabase Integration

✅ **User Authentication** - Secure sign up/sign in
✅ **Multi-device Sync** - Data available on all devices
✅ **Real-time Updates** - Changes sync instantly
✅ **Data Persistence** - No more data loss on app uninstall
✅ **Scalability** - Handles growing user base
✅ **Security** - Row-level security ensures data privacy
✅ **Backup & Recovery** - Automatic backups by Supabase

## Next Steps

1. **Deploy your app** with Supabase integration
2. **Monitor usage** in Supabase dashboard
3. **Set up email templates** for password reset (optional)
4. **Configure custom domain** (optional, paid feature)
5. **Set up database backups** (automatic in Supabase)

Your attendance system is now ready for production use with cloud storage and multi-device support!
