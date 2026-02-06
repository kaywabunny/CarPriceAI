# Revert to GitHub (origin/main)

**Warning:** On GitHub your repo does **not** have the `frontend/src/components/ui/` folder (no select, tooltip, button, etc.). If you reset to remote, the app will not build until those UI components are restored.

## Option A: Full reset to match GitHub (discard all local changes)

Run in PowerShell from the project root:

```powershell
git fetch origin
git reset --hard origin/main
git clean -fd
```

- You will **lose** all local changes (including the tooltip + select fixes).
- The app will likely **fail to build** because the remote is missing the UI component files.

## Option B: Re-clone into a new folder (fresh copy from GitHub)

```powershell
cd C:\Users\Zenbook\Documents\carpricebkk
Rename-Item carpricebkk carpricebkk-backup
git clone https://github.com/kaywabunny/CarPriceAI.git carpricebkk
cd carpricebkk
```

Same as Option A: you get exactly what’s on GitHub, which is missing the UI components.

## Recommendation

Use **clean-rebuild.ps1** instead to keep your current code and do a full clean rebuild (Docker or local). That way you run the fixed code with a fresh build and avoid cached/old bundles.
