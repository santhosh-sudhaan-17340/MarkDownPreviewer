# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy your Markdown Previewer to GitHub Pages.

## 📋 Prerequisites

- GitHub repository: `santhosh-sudhaan-17340/MarkDownPreviewer`
- Admin access to the repository

## 🔧 Deployment Steps

### Step 1: Merge the Deployment Workflow

The GitHub Actions workflow has been added to your branch. You need to merge it to `main`:

**Option A: Via GitHub Web Interface (Recommended)**
1. Go to your repository: https://github.com/santhosh-sudhaan-17340/MarkDownPreviewer
2. Click on "Pull requests" tab
3. Create a new pull request from `claude/markdown-previewer-app-011CUvg7ZHaMMVFXSnoNXt6k` to `main`
4. Review the changes (should include `.github/workflows/deploy.yml`)
5. Click "Merge pull request"
6. Confirm the merge

**Option B: Via Command Line**
```bash
git checkout main
git pull origin main
git merge claude/markdown-previewer-app-011CUvg7ZHaMMVFXSnoNXt6k
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top navigation)
3. Scroll down and click on **Pages** (left sidebar)
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - This will use our custom workflow file

### Step 3: Wait for Deployment

1. Go to the **Actions** tab in your repository
2. You should see a workflow run called "Deploy to GitHub Pages"
3. Wait for it to complete (usually takes 1-2 minutes)
4. Once completed, you'll see a green checkmark

### Step 4: Access Your Site

Your site will be available at:
```
https://santhosh-sudhaan-17340.github.io/MarkDownPreviewer/
```

## 🔄 Automatic Deployments

From now on, every time you push to the `main` branch, GitHub Actions will automatically:
1. Build your site
2. Deploy it to GitHub Pages
3. Make it available at the URL above

## 🛠️ Manual Deployment

You can also trigger a manual deployment:
1. Go to the **Actions** tab
2. Click on "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button
4. Select `main` branch
5. Click "Run workflow"

## ✅ Verification

To verify your deployment is working:

1. Visit: https://santhosh-sudhaan-17340.github.io/MarkDownPreviewer/
2. You should see the Markdown Previewer application
3. Try typing some Markdown and verify the preview works
4. Test the theme toggle, export features, etc.

## 🐛 Troubleshooting

### Deployment Failed
- Check the Actions tab for error messages
- Ensure GitHub Pages is enabled in Settings
- Verify the workflow file is in `.github/workflows/deploy.yml`

### 404 Error
- Wait a few minutes after first deployment
- Check if the workflow completed successfully
- Verify the repository is public (or you have GitHub Pro for private repos)

### Site Not Updating
- Clear your browser cache
- Check if the latest commit triggered a workflow
- Verify the workflow completed successfully

## 📝 Notes

- The site is deployed from the `main` branch
- All static files (HTML, CSS, JS) are served directly
- No build step required - it's a vanilla JavaScript app
- The site uses CDN resources for Marked.js, Highlight.js, and html2pdf.js

## 🔒 Custom Domain (Optional)

To use a custom domain:

1. In repository Settings > Pages
2. Enter your custom domain
3. Update your DNS settings:
   - Add a CNAME record pointing to: `santhosh-sudhaan-17340.github.io`
4. Wait for DNS propagation (can take up to 24 hours)

## 🎉 Success!

Once deployed, share your Markdown Previewer with:
- Direct link: `https://santhosh-sudhaan-17340.github.io/MarkDownPreviewer/`
- QR code for mobile access
- Embed in documentation or portfolio

---

**Need help?** Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
