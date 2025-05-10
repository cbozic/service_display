# Service Display Electron App

This is the Electron wrapper for the Service Display web application. It allows you to run Service Display as a native desktop application on Windows, macOS, and Linux.

## Development

To start the app in development mode:

```bash
npm run electron:start
```

This will start both the React development server and the Electron app. The app will automatically reload if you make changes to the code.

## Building

To build the application for your current platform:

```bash
npm run electron:build
```

### Platform-specific builds

- Windows: `npm run electron:build:win`
- macOS: `npm run electron:build:mac`
- Linux: `npm run electron:build:linux`

### Unsigned builds

On macOS, code signing is required for distribution. If you don't have a valid code signing certificate or just want to test the build process, you can use:

```bash
npm run electron:build:unsigned
```

Before building, you might want to clean any resource forks and Finder information:

```bash
rm -rf dist/ 
xattr -cr .
``` 

This will skip the code signing step and create an unsigned application that can be used for testing.

The built applications will be available in the `dist` directory.

## Icon Generation

To generate icons for all platforms from the source icon:

```bash
node electron/icons.js
```

Note: This requires ImageMagick to be installed on your system. For a production app, consider using tools like `electron-icon-maker` instead.

## Notes

- The app uses the logo files from the `public` directory for its icons.
- Cross-platform support is provided by Electron and electron-builder.
- The app can be configured further by editing the `electron/main.js` file and the `build` section in `package.json`. 