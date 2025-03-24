# service_display
A browser based application to facilitate displaying streamed service videos to groups of remote viewers

## GitHub Pages
This project is set up for GitHub Pages hosting. The optimized build is available in the `docs` folder.
- Live site: https://[your-username].github.io/service_display/
- GitHub Actions workflow is configured for automatic deployment

### Manual Rebuild
If you want to manually rebuild the site:
```bash
npm run build:docs
```

### Deploy Process
The site is automatically deployed to GitHub Pages when:
1. Changes are pushed to the main branch
2. The GitHub Actions workflow runs successfully
3. The built files in the docs folder are updated

TODO:
* Fix YouTube video id settings
* Correct the names of the component files to match current state
* Popout fullscreen behavior is still buggy
* Possible server component to allow centralized configuration
* In the piano, add startAt setting for each key because not every key starts at the same time
* Audio nudge
