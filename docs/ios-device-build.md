# Building & Running on a Physical iPhone

Quick reference for building this dev-client app onto a real iPhone (not the Simulator), checking dependency health after time away from the project, and pitfalls specific to running these commands unattended (scripted or agentic).

This project uses a **dev client** (`expo-dev-client`), not Expo Go — `ios/`/`android/` are gitignored and regenerated via `expo prebuild`, not committed.

## Daily workflow

```bash
# 1. iPhone reachable — plugged in via USB (unlocked, "Trust this computer" accepted),
#    or already paired for wireless debugging on the same Wi-Fi. Check with:
xcrun devicectl list devices   # paired wireless devices show "available (paired)"

# 2. Build + install the dev client (only needed when native code changed).
#    Name the device if more than one is connected:
npx expo run:ios --device "<device name>"

# 3. Day-to-day after that, just start Metro — JS changes hot-reload, no rebuild:
npx expo start --dev-client
```

## Dependency health check (do this after any time away from the project)

```bash
npx expo install --check   # lists packages behind the installed SDK's expected version
npx expo-doctor             # broader check — also catches missing peer deps `--check` won't show
npx expo install <package>  # installs one missing SDK-compatible peer dep
npx expo install --fix      # aligns every listed package to its SDK-expected version at once
npx tsc --noEmit             # typecheck — do this before a rebuild, not after
npx jest                     # run the test suite
```

**Gotchas hit in practice:**
- `expo-doctor` can flag a **missing peer dependency** (e.g. `react-native-worklets`, required by `react-native-reanimated` 4 outside Expo Go) as a real crash risk, not just a version-mismatch nit — don't skip past that finding.
- `expo install --fix` can move `jest`/`@types/jest` *down* to the SDK template's expected version. If tests then fail with `'ts-node' is required for the TypeScript configuration files`, install it: `npm install --save-dev ts-node` (jest's older major needs it to parse `jest.config.ts`).
- If a dependency bump changes a patched package's version, `patch-package` will warn about a filename mismatch on every install even though the patch still applies. Rename the file under `patches/` to match, e.g. `mv patches/react-native+0.83.2.patch patches/react-native+0.83.10.patch`.
- After any native-module change, do a clean prebuild (below) before running on device — the existing `ios/` folder won't have the new module linked into the Xcode project.

## Clean rebuild — from least to most nuclear

```bash
# 1. Clear Metro/JS cache — fixes most "stale JS" / weird import errors
npx expo start --dev-client -c

# 2. Clean iOS native build — pods feel off, or bundle compiles but app crashes on launch
rm -rf ios/build ~/Library/Developer/Xcode/DerivedData
cd ios && pod deintegrate && pod install && cd ..

# 3. Reinstall node_modules — lockfile drifted, imports resolve weirdly
rm -rf node_modules package-lock.json && npm install
cd ios && pod install && cd ..

# 4. Full nuke — regenerate ios/ and android/ from app.json + config plugins.
#    Confirm `git status` is clean first; this can overwrite manual native tweaks.
npx expo prebuild --clean
npm install
```

After any step, rerun `npx expo run:ios --device "<name>"`.

## Running builds unattended (scripted or agentic)

- **Don't manually background a long build with a trailing `&`/`disown` when the runner already has its own "background" option.** Doing both means the runner's process tracker sees the wrapper shell exit immediately (since it just launched a detached job) and reports the task "complete" while the real `xcodebuild`/`expo run:ios` process is still compiling for another 10–20 minutes. Redirect output to a log file if you want (`npx expo run:ios --device "<name>" > build.log 2>&1`), but let the runner's own backgrounding manage the process — don't add `&` yourself.
- **Poll instead of trusting a premature "done" signal**: `ps aux | grep xcodebuild` to confirm it's still running, `tail -n 30 build.log` for incremental progress (xcodebuild's output is line-buffered per compiled file).
- **A clean `prebuild --clean` build compiles every native pod from scratch (~15–20 min); an incremental JS/TSX-only rebuild is under 2 min.** Size your polling interval to which one you're doing.
- **`expo run:ios` reuses an already-running Metro bundler on port 8081** instead of starting its own (logs `› Skipping dev server` when it finds one) — there is only one Metro serving the device across invocations. Check `lsof -i :8081` before killing any leftover `node .../expo` process; you may be killing the live JS server the already-installed app depends on to load anything. If that happens, restart it: `npx expo start --dev-client`.

## Related

- `docs/changelog.md` — feature-by-feature build history and per-migration setup notes.
