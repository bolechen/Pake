import pakeJson from "../src-tauri/pake.json" with { type: "json" };
import tauriJson from "../src-tauri/tauri.conf.json" with { type: "json" };
import windowsJson from "../src-tauri/tauri.windows.conf.json" with { type: "json" };
import macosJson from "../src-tauri/tauri.macos.conf.json" with { type: "json" };
import linuxJson from "../src-tauri/tauri.linux.conf.json" with { type: "json" };

import { writeFileSync, existsSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";
import os from "os";
import sharp from "sharp";
import icongen from "icon-gen";

// Try to import axios, but handle gracefully if it fails
let axios;
try {
  axios = (await import("axios")).default;
} catch (error) {
  console.warn("axios not available, icon download from URL will be disabled");
  axios = null;
}

/**
 * Configuration script for Tauri app generation
 * Sets up platform-specific configurations, icons, and desktop entries
 */

// Environment validation
const requiredEnvVars = ["URL", "NAME", "TITLE", "NAME_ZH"];

function validateEnvironment() {
  const missing = requiredEnvVars.filter((key) => !(key in process.env));

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
    process.exit(1);
  }

  console.log("Environment variables:");
  requiredEnvVars.forEach((key) => {
    console.log(`  ${key}: ${process.env[key]}`);
  });
}

// Configuration constants
const CONFIG = {
  get identifier() {
    return `com.pake.${process.env.NAME}`;
  },
  get productName() {
    return `com-pake-${process.env.NAME}`;
  },

  paths: {
    pakeConfig: "src-tauri/pake.json",
    tauriConfig: "src-tauri/tauri.conf.json",
  },

  platforms: {
    linux: {
      configFile: "src-tauri/tauri.linux.conf.json",
      iconPath: `src-tauri/png/${process.env.NAME}_512.png`,
      defaultIcon: "src-tauri/png/icon_512.png",
      icons: [`png/${process.env.NAME}_512.png`],
      get desktopEntry() {
        return `[Desktop Entry]
Encoding=UTF-8
Categories=Office
Exec=${CONFIG.productName}
Icon=${CONFIG.productName}
Name=${CONFIG.productName}
Name[zh_CN]=${process.env.NAME_ZH}
StartupNotify=true
Terminal=false
Type=Application
`;
      },
      get desktopEntryPath() {
        return `src-tauri/assets/${CONFIG.productName}.desktop`;
      },
      get desktopConfig() {
        return {
          key: `/usr/share/applications/${CONFIG.productName}.desktop`,
          value: `assets/${CONFIG.productName}.desktop`,
        };
      },
    },

    darwin: {
      configFile: "src-tauri/tauri.macos.conf.json",
      iconPath: `src-tauri/icons/${process.env.NAME}.icns`,
      defaultIcon: "src-tauri/icons/icon.icns",
      icons: [`icons/${process.env.NAME}.icns`],
    },

    win32: {
      configFile: "src-tauri/tauri.windows.conf.json",
      // Windows uses a generated multi-size ICO derived from a 512x512 PNG.
      // This mirrors the CLI behavior to ensure RC.EXE receives a valid ICO.
      iconPath: `src-tauri/png/${process.env.NAME}_256.ico`,
      hdIconPath: `src-tauri/png/${process.env.NAME}_256.ico`,
      defaultIcon: "src-tauri/png/icon_256.ico",
      hdDefaultIcon: "src-tauri/png/icon_256.ico",
      icons: [`png/${process.env.NAME}_256.ico`],
      resources: [`png/${process.env.NAME}_256.ico`],
    },
  },
};

// Core configuration functions
function updateBaseConfigs() {
  console.log("Updating base configurations...");
  console.log(`URL: ${process.env.URL}`);
  console.log(`NAME: ${process.env.NAME}`);
  console.log(`TITLE: ${process.env.TITLE}`);
  console.log(`WIDTH: ${process.env.WIDTH}`);
  console.log(`HEIGHT: ${process.env.HEIGHT}`);
  console.log(`HIDE_TITLE_BAR: ${process.env.HIDE_TITLE_BAR}`);
  console.log(`SHOW_SYSTEM_TRAY: ${process.env.SHOW_SYSTEM_TRAY}`);
  console.log(
    `FORCE_INTERNAL_NAVIGATION: ${process.env.FORCE_INTERNAL_NAVIGATION}`,
  );
  console.log(`ICON: ${process.env.ICON}`);

  // Update pake.json
  pakeJson.windows[0].url = process.env.URL;

  // Update window configuration
  if (process.env.WIDTH) {
    const width = parseInt(process.env.WIDTH);
    pakeJson.windows[0].width = width;
    console.log(`Set window width to: ${width}`);
  }
  if (process.env.HEIGHT) {
    const height = parseInt(process.env.HEIGHT);
    pakeJson.windows[0].height = height;
    console.log(`Set window height to: ${height}`);
  }
  if (process.env.FULLSCREEN) {
    const fullscreen = process.env.FULLSCREEN === "true";
    pakeJson.windows[0].fullscreen = fullscreen;
    console.log(`Set fullscreen to: ${fullscreen}`);
  }
  if (process.env.HIDE_TITLE_BAR) {
    const hideTitleBar = process.env.HIDE_TITLE_BAR === "true";
    pakeJson.windows[0].hide_title_bar = hideTitleBar;
    console.log(`Set hide_title_bar to: ${hideTitleBar}`);
  }
  if (process.env.FORCE_INTERNAL_NAVIGATION) {
    const forceInternalNav = process.env.FORCE_INTERNAL_NAVIGATION === "true";
    pakeJson.windows[0].force_internal_navigation = forceInternalNav;
    console.log(`Set force_internal_navigation to: ${forceInternalNav}`);
  }

  // Update system tray configuration
  if (process.env.SHOW_SYSTEM_TRAY) {
    const showTray = process.env.SHOW_SYSTEM_TRAY === "true";
    pakeJson.system_tray.macos = showTray;
    pakeJson.system_tray.linux = showTray;
    pakeJson.system_tray.windows = showTray;
    console.log(`Set system tray to: ${showTray} for all platforms`);
  }

  // Update system tray icon path in pake.json
  if (pakeJson.system_tray_path) {
    pakeJson.system_tray_path = `icons/${process.env.NAME}.png`;
    console.log(`Set system tray icon path to: ${pakeJson.system_tray_path}`);
  }

  // Update tauri.conf.json
  tauriJson.productName = process.env.TITLE;
  tauriJson.identifier = CONFIG.identifier;
  console.log(`Set product name to: ${process.env.TITLE}`);
  console.log(`Set identifier to: ${CONFIG.identifier}`);

  // Update tray icon path in tauri.conf.json
  if (tauriJson.app && tauriJson.app.trayIcon) {
    tauriJson.app.trayIcon.iconPath = `png/${process.env.NAME}_512.png`;
    console.log(
      `Set tauri tray icon path to: ${tauriJson.app.trayIcon.iconPath}`,
    );
  }
}

async function downloadIcon(url, destinationPath) {
  if (!axios) {
    console.error("Cannot download icon: axios not available");
    return false;
  }

  try {
    console.log(`Downloading icon from ${url} to ${destinationPath}`);
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Ensure the directory exists
    const dir = join(destinationPath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    let buffer = Buffer.from(response.data);

    // Convert the icon to ensure it's in a valid format.
    // For ICO targets we keep the original binary data so that
    // Windows RC.EXE sees a real ICO (3.00 format), not a PNG
    // with a .ico extension.
    try {
      const isIco = destinationPath.endsWith(".ico");
      const isPng = destinationPath.endsWith(".png");

      if (isPng) {
        buffer = await sharp(buffer)
          .resize(512, 512, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png({ compressionLevel: 9 })
          .toBuffer();
      } else if (!isIco) {
        buffer = await sharp(buffer)
          .resize(512, 512, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer();
      }
    } catch (conversionError) {
      console.warn(
        `Icon conversion failed, using original: ${conversionError.message}`,
      );
    }

    writeFileSync(destinationPath, buffer);
    console.log(
      `Icon downloaded and processed successfully to ${destinationPath}`,
    );
    return true;
  } catch (error) {
    console.error(`Failed to download icon from ${url}: ${error.message}`);
    return false;
  }
}

async function ensureRgbaPng(iconPath) {
  try {
    const buffer = await sharp(iconPath)
      .ensureAlpha()
      .png({ force: true })
      .toBuffer();
    writeFileSync(iconPath, buffer);
  } catch (error) {
    console.warn(`Failed to normalize ${iconPath} to RGBA: ${error.message}`);
  }
}

async function ensureIconExists(
  iconPath,
  defaultPath,
  description = "icon",
  ensureRgba = false,
) {
  let iconCreated = false;

  if (!existsSync(iconPath)) {
    // Check if we have a custom icon URL
    if (process.env.ICON && process.env.ICON.startsWith("http")) {
      console.log(
        `Attempting to download custom icon from ${process.env.ICON}`,
      );
      const downloaded = await downloadIcon(process.env.ICON, iconPath);
      if (downloaded) {
        console.log(`Successfully downloaded ${description} from URL`);
        iconCreated = true;
      } else {
        console.warn(
          `Failed to download ${description}, trying fallback options`,
        );
      }
    }

    // If icon still doesn't exist, try to create it from a source
    if (!existsSync(iconPath)) {
      // Try to find any existing icon as source
      const possibleSources = [
        "src-tauri/icons/icon.icns",
        "src-tauri/png/icon_512.png",
        "src-tauri/png/icon_32.ico",
        defaultPath,
      ];

      let sourceFound = false;
      for (const source of possibleSources) {
        if (existsSync(source)) {
          console.log(
            `Found source icon at ${source}, generating ${description}`,
          );
          try {
            const isPng = iconPath.endsWith(".png");
            const isIco = iconPath.endsWith(".ico");

            if (isIco) {
              // For ICO files, copy the ICO binary directly so RC.EXE
              // gets a valid 3.00 format icon instead of PNG data.
              copyFileSync(source, iconPath);
            } else {
              const size = isPng ? 512 : 256;

              let buffer = await sharp(source)
                .resize(size, size, {
                  fit: "contain",
                  background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .toBuffer();

              if (isPng) {
                buffer = await sharp(buffer)
                  .png({ compressionLevel: 9 })
                  .toBuffer();
              }

              writeFileSync(iconPath, buffer);
            }

            console.log(`Generated ${description} from ${source}`);
            iconCreated = true;
            sourceFound = true;
            break;
          } catch (error) {
            console.warn(
              `Failed to generate ${description} from ${source}: ${error.message}`,
            );
          }
        }
      }

      // Final fallback - copy default icon
      if (!sourceFound && existsSync(defaultPath)) {
        console.warn(`Using default icon for ${description}`);
        copyFileSync(defaultPath, iconPath);
        iconCreated = true;
      }
    }
  } else {
    iconCreated = true;
  }

  // Additional processing for PNG icons
  if (
    ensureRgba &&
    iconCreated &&
    existsSync(iconPath) &&
    iconPath.endsWith(".png")
  ) {
    try {
      await ensureRgbaPng(iconPath);
    } catch (error) {
      console.warn(`Failed to normalize PNG to RGBA: ${error.message}`);
    }
  }

  // Final validation
  if (!existsSync(iconPath) && process.env.PAKE_CREATE_APP !== "1") {
    console.error(`Failed to create ${description} at ${iconPath}`);
  }
}

function updatePlatformConfig(platformConfig, platformVars) {
  // Ensure bundle object exists
  if (!platformConfig.bundle) {
    platformConfig.bundle = {};
  }

  platformConfig.bundle.icon = platformVars.icons;
  platformConfig.identifier = CONFIG.identifier;
  platformConfig.productName = process.env.TITLE;
}

// Platform-specific handlers
const platformHandlers = {
  linux: async (config) => {
    await ensureIconExists(
      config.iconPath,
      config.defaultIcon,
      "Linux icon",
      true,
    );

    // Update desktop entry
    linuxJson.bundle.linux.deb.files = {
      [config.desktopConfig.key]: config.desktopConfig.value,
    };
    writeFileSync(config.desktopEntryPath, config.desktopEntry);

    updatePlatformConfig(linuxJson, config);
  },

  darwin: async (config) => {
    await ensureIconExists(config.iconPath, config.defaultIcon, "macOS icon");

    // Generate additional macOS icon sizes if needed
    const macosIcons = [
      "src-tauri/png/icon_128.png",
      "src-tauri/png/icon_256.png",
      "src-tauri/png/icon_512.png",
    ];

    // Find a source icon to generate from
    let sourceIcon = null;
    const possibleSources = [
      config.iconPath,
      "src-tauri/png/icon_512.png",
      "src-tauri/png/icon_256.png",
      "src-tauri/png/icon_128.png",
      config.defaultIcon,
    ];

    for (const source of possibleSources) {
      if (existsSync(source)) {
        sourceIcon = source;
        break;
      }
    }

    if (sourceIcon) {
      for (const iconPath of macosIcons) {
        if (!existsSync(iconPath)) {
          try {
            const size = parseInt(iconPath.match(/(\d+)\.png$/)[1]);
            console.log(`Generating macOS icon size ${size}x${size}`);
            const buffer = await sharp(sourceIcon)
              .resize(size, size, {
                fit: "contain",
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              })
              .png({ compressionLevel: 9 })
              .toBuffer();
            writeFileSync(iconPath, buffer);
            console.log(`Generated macOS icon: ${iconPath}`);
          } catch (error) {
            console.warn(`Failed to generate ${iconPath}: ${error.message}`);
          }
        }
      }
    }

    updatePlatformConfig(macosJson, config);
  },

  win32: async (config) => {
    // Ensure a base 512x512 PNG exists for this app
    const basePngPath = `src-tauri/png/${process.env.NAME}_512.png`;
    await ensureIconExists(
      basePngPath,
      "src-tauri/png/icon_512.png",
      "Windows base icon PNG",
      true,
    );

    // Generate a multi-size ICO from the base PNG using icon-gen
    if (!existsSync(config.iconPath)) {
      try {
        console.log(
          `Generating Windows ICO from ${basePngPath} -> ${config.iconPath}`,
        );
        await icongen(basePngPath, "src-tauri/png", {
          report: false,
          ico: {
            name: `${process.env.NAME}_256`,
            sizes: [16, 32, 48, 64, 128, 256],
          },
        });
      } catch (error) {
        console.warn(`Failed to generate Windows ICO: ${error.message}`);
        if (existsSync(config.defaultIcon)) {
          console.warn("Falling back to default Windows icon");
          copyFileSync(config.defaultIcon, config.iconPath);
        }
      }
    }

    // Update both bundle.icon and bundle.resources for Windows
    windowsJson.bundle.resources = config.resources;
    updatePlatformConfig(windowsJson, config);
  },
};

function saveConfigurations() {
  const configs = [
    { path: CONFIG.paths.pakeConfig, data: pakeJson },
    { path: CONFIG.paths.tauriConfig, data: tauriJson },
    { path: CONFIG.platforms.linux.configFile, data: linuxJson },
    { path: CONFIG.platforms.darwin.configFile, data: macosJson },
    { path: CONFIG.platforms.win32.configFile, data: windowsJson },
  ];

  configs.forEach(({ path, data }) => {
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  });
}

// Main execution
async function main() {
  try {
    validateEnvironment();
    updateBaseConfigs();

    const platform = os.platform();
    const platformConfig = CONFIG.platforms[platform];

    if (!platformConfig) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const handler = platformHandlers[platform];
    if (handler) {
      await handler(platformConfig);
    }

    saveConfigurations();
    console.log(`✅ Tauri configuration complete for ${platform}`);
  } catch (error) {
    console.error("❌ Configuration failed:", error.message);
    process.exit(1);
  }
}

main();
