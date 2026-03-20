# Village Takes Flight: Our TestFlight Launch Guide

> From localhost to real phones. This is how we get Village into the hands of actual humans.

---

## The Big Picture

TestFlight is Apple's official way to distribute beta builds to testers before going live on the App Store. Think of it as a VIP screening before the premiere. We can invite up to **100 internal testers** (our team) and **10,000 external testers** (friends, early adopters, film nerds). Each build stays live for **90 days**, then expires like milk.

Here's the full journey, broken into acts.

---

## Act I: Prerequisites (The Boring-but-Essential Stuff)

### 1. Apple Developer Account

You need a paid **Apple Developer Program** membership ($99/year). The free tier won't cut it — no TestFlight, no App Store, no fun.

- Enroll at [developer.apple.com/programs](https://developer.apple.com/programs)
- Use your personal Apple ID or create a new one for the team
- Approval can take 24-48 hours (sometimes instant, sometimes Apple vibes)

### 2. Fix Our Bundle Identifier

Right now in `app.json` we have:

```json
"bundleIdentifier": "com.anonymous.ville-du-cinema-mobile"
```

That `com.anonymous` is a placeholder. Apple won't accept it for distribution. Pick something real and unique, like:

```json
"bundleIdentifier": "com.villageducinema.app"
```

> Once you pick a bundle ID and submit to Apple, changing it later means creating a whole new app. Choose wisely.

### 3. Install EAS CLI

EAS (Expo Application Services) is Expo's build and submission pipeline. It handles all the Xcode madness so we don't have to.

```bash
npm install -g eas-cli
eas login
```

### 4. Create `eas.json`

This file tells EAS how to build our app. Create it in the project root:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID_EMAIL",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

We'll fill in the real values once the Apple Developer account is set up.

---

## Act II: Register the App on App Store Connect

### 5. Create the App Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** > **+** > **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: `Village` (this is the App Store display name)
   - **Primary Language**: English (or your choice)
   - **Bundle ID**: Select the one matching our `app.json`
   - **SKU**: Something like `village-du-cinema-001`
4. Click **Create**

> This doesn't publish anything. It just reserves our spot and gives us an app record to upload builds to.

---

## Act III: Build and Upload (The Main Event)

### 6. Build for Production

This is the command that packages Village into a real `.ipa` file, signed and ready for Apple:

```bash
eas build --platform ios --profile production
```

What happens behind the scenes:
- EAS spins up a cloud Mac (so you don't need Xcode locally)
- It installs dependencies, runs `expo prebuild`, compiles the native code
- Signs the build with your Apple credentials
- Gives you a download link when done

First time? EAS will walk you through Apple credential setup (certificates, provisioning profiles). Just follow the prompts.

### 7. Submit the Build to App Store Connect

Once the build finishes:

```bash
eas submit --platform ios
```

Or do both in one shot (build + submit):

```bash
eas build --platform ios --profile production --auto-submit
```

The build will appear in App Store Connect under **TestFlight** within a few minutes.

---

## Act IV: TestFlight Setup

### 8. Provide Test Information

In App Store Connect, go to your app > **TestFlight** tab:

- **Beta App Description**: What is Village? A brief pitch for testers.
  > *"Village is a social app for cinema lovers. Browse reviews, follow film enthusiasts, and discover what your friends are watching."*
- **What to Test**: Guide testers on what to focus on.
  > *"Try adding Letterboxd accounts, browsing the feed, and following users. Report any crashes or weird behavior."*
- **Feedback Email**: Where testers send feedback (your email)

### 9. Handle Compliance (Encryption)

Apple will ask: "Does your app use encryption?"

Since Village uses HTTPS (which counts as encryption), select:
- **Yes**
- Then: "Does your app qualify for any of the exemptions?" > **Yes**
- Exemption: "It only uses standard HTTPS/TLS" (this applies to most apps)

This only happens once per app.

### 10. Wait for Beta App Review

The **first build** of your app must pass Apple's Beta App Review. This is lighter than a full App Store review, but Apple still checks that:
- The app doesn't crash immediately
- It doesn't violate any obvious guidelines
- It's not malware (we're good on that front)

Typical wait: **a few hours to 1-2 days**. Subsequent builds usually skip this step.

---

## Act V: Invite the Audience

### 11. Internal Testers (Your Inner Circle)

These are people with App Store Connect accounts on your team.

1. Go to **TestFlight** > **Internal Testing** > **+** to create a group
2. Name it something like "Village Core Team"
3. Add members (they must have App Store Connect access)
4. Assign the build to the group
5. They get an email invitation automatically

**Limit**: 100 internal testers. They get every new build automatically.

### 12. External Testers (The VIP Screening)

These are anyone with an iPhone — no Apple Developer account needed.

**Option A: Email Invitations**
1. Go to **TestFlight** > **External Testing** > **+** to create a group
2. Name it (e.g., "Beta Cinephiles")
3. Add testers by email
4. Select which build to distribute
5. They get an email with a link to install TestFlight + your app

**Option B: Public Link** (the easy way)
1. Create an external group
2. Enable **Public Link**
3. Share the link anywhere — Twitter, Discord, group chat, film forums
4. Anyone who clicks it can join (up to your set limit)
5. You can set a max number of testers to cap enrollment

**Limit**: 10,000 external testers total. More than enough for our premiere.

---

## Act VI: The Tester Experience

Here's what your testers see:

1. They receive an invitation (email or public link)
2. They download the free **TestFlight app** from the App Store
3. They tap "Accept" on the invitation
4. Village installs on their phone — just like a normal app
5. When we push new builds, they get notified and can update
6. They can send feedback + screenshots directly through TestFlight

---

## Act VII: Iterate and Ship

### 13. Push New Builds

Found a bug? Added a feature? Push a new build:

```bash
eas build --platform ios --profile production --auto-submit
```

The `autoIncrement` setting in `eas.json` bumps the build number automatically. Testers with auto-update on will get the new version right away.

### 14. Monitor Feedback

In App Store Connect > **TestFlight**:
- See how many testers installed the build
- View crash reports
- Read tester feedback and screenshots
- Track sessions and engagement

### 15. When You're Ready for the Premiere

Once testing is solid:
1. Go to App Store Connect > **App Store** tab
2. Fill in the full listing (description, screenshots, keywords, etc.)
3. Select the tested build
4. Submit for full **App Store Review**
5. Wait for approval
6. Hit **Release** and pop the champagne

---

## Quick Reference: Our Game Plan Checklist

| Step | Action | Status |
|------|--------|--------|
| 1 | Apple Developer account ($99/year) | |
| 2 | Update `bundleIdentifier` in `app.json` | |
| 3 | Install EAS CLI (`npm i -g eas-cli`) | |
| 4 | Create `eas.json` with build profiles | |
| 5 | Register app on App Store Connect | |
| 6 | Run `eas build --platform ios --profile production` | |
| 7 | Submit build with `eas submit --platform ios` | |
| 8 | Fill in TestFlight test information | |
| 9 | Handle encryption compliance (one-time) | |
| 10 | Pass Beta App Review | |
| 11 | Invite internal testers | |
| 12 | Create public link for external testers | |
| 13 | Iterate: fix, build, submit, repeat | |
| 14 | Monitor feedback and crashes | |
| 15 | Submit to App Store when ready | |

---

## Key Limits to Remember

| What | Limit |
|------|-------|
| Internal testers | 100 |
| External testers | 10,000 |
| Build expiration | 90 days |
| First build review | Required (subsequent ones may skip) |
| Cost | $99/year (Apple Developer Program) |

---

> *"A film is never really good unless the camera is an eye in the head of a poet."* — Orson Welles
>
> Well, our camera is Expo, our eye is TestFlight, and this poet is ready to ship.
