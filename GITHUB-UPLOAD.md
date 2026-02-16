# How to Upload This Project to GitHub

Your folder is already a Git repository connected to:
**https://github.com/Broma0823/fishfarm_database_forecasting.git**

Follow these steps to upload (push) your code.

---

## Step 1: Open terminal in your project folder

```bash
cd "d:\Users\Ken\Documents\School Documents\BISU 4TH YEAR\bfar_database"
```

---

## Step 2: Stage all your files

```bash
git add .
```

---

## Step 3: Commit your changes

```bash
git commit -m "Add BFAR database project with frontend, backend, and migrations"
```

Use any message you like instead of the one above.

---

## Step 4: Push to GitHub

```bash
git push -u origin main
```

If your branch is named `master` instead of `main`:
```bash
git push -u origin master
```

---

## First time? You may be asked to sign in

- **HTTPS:** GitHub may ask for your username and password. Use a **Personal Access Token** instead of your account password. Create one at: GitHub → Settings → Developer settings → Personal access tokens.
- **Or use GitHub Desktop / Git Credential Manager** if you have it installed—it can handle login for you.

---

## If you get "rejected" or "non-fast-forward"

Someone else (or you on another machine) may have pushed to the repo. Pull first, then push:

```bash
git pull origin main --rebase
git push origin main
```

---

## If you want a NEW repository instead

1. On GitHub.com: **New repository** → name it (e.g. `bfar_database`) → **Create repository** (don’t add README if this folder already has content).
2. In your project folder, set the new remote and push:

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_NEW_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_NEW_REPO_NAME` with your GitHub username and new repo name.

---

## Note: `.env` is not uploaded

`server/.env` (with your database password) is in `.gitignore`, so it **won’t be pushed**. That’s intentional. On another PC or for teammates, copy `server/.env` manually or use a template like `env.example` and fill in values locally.
