# Service Display - GitHub Pages Build

This directory contains the optimized production build of the Service Display application, configured for GitHub Pages hosting.

## About This Build

- This is an optimized production build of the React application
- All assets use relative paths to ensure proper functionality on GitHub Pages
- The `.nojekyll` file prevents GitHub from processing the files with Jekyll

## Updating This Build

To update this build with the latest changes from the source code:

1. Make your changes in the `servicedisplay` directory
2. Run the build script: `cd servicedisplay && npm run build:docs`
3. Commit and push the changes to GitHub

## Local Testing

You can test this build locally by running a simple HTTP server in this directory:

```bash
# Using Python
python -m http.server

# Using Node.js
npx serve
```

Then open your browser to http://localhost:8000 (for Python) or the URL provided by serve. 