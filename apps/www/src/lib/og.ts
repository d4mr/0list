import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const SITE_URL = "https://0list.d4mr.com";

// Render at 2x for higher quality
const SCALE = 2;
const WIDTH = 1200;
const HEIGHT = 630;

// Cache fonts in memory
let fontsLoaded: { semiBold: Buffer; bold: Buffer } | null = null;

async function loadFonts(): Promise<{ semiBold: Buffer; bold: Buffer }> {
  if (fontsLoaded) return fontsLoaded;

  const cacheDir = join(process.cwd(), "node_modules", ".cache", "og-fonts");
  const fontPath = join(cacheDir, "DMSans-SemiBold.ttf");
  const fontBoldPath = join(cacheDir, "DMSans-Bold.ttf");

  if (existsSync(fontPath) && existsSync(fontBoldPath)) {
    fontsLoaded = {
      semiBold: readFileSync(fontPath),
      bold: readFileSync(fontBoldPath),
    };
    return fontsLoaded;
  }

  mkdirSync(cacheDir, { recursive: true });

  // DM Sans from Google Fonts (TTF format)
  const semiBoldUrl = "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAfJthTg.ttf";
  const boldUrl = "https://fonts.gstatic.com/s/dmsans/v17/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARZthTg.ttf";

  console.log("Downloading DM Sans fonts...");

  const [semiBoldRes, boldRes] = await Promise.all([
    fetch(semiBoldUrl),
    fetch(boldUrl),
  ]);

  if (!semiBoldRes.ok || !boldRes.ok) {
    throw new Error(`Failed to download fonts: ${semiBoldRes.status} ${boldRes.status}`);
  }

  const semiBold = Buffer.from(await semiBoldRes.arrayBuffer());
  const bold = Buffer.from(await boldRes.arrayBuffer());

  writeFileSync(fontPath, semiBold);
  writeFileSync(fontBoldPath, bold);

  fontsLoaded = { semiBold, bold };
  return fontsLoaded;
}

// Cache screenshot
let screenshotBase64: string | null = null;

async function loadScreenshot(): Promise<string> {
  if (screenshotBase64) return screenshotBase64;

  const screenshotPath = join(process.cwd(), "public", "screenshot-0list.webp");

  try {
    // Load at 2x the display size for crisp rendering
    const pngBuffer = await sharp(screenshotPath)
      .resize(680 * SCALE, null, { fit: "inside" })
      .png()
      .toBuffer();
    screenshotBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    return screenshotBase64;
  } catch (e) {
    console.warn("Could not load screenshot:", e);
    return "";
  }
}

// Cache logo
let logoBase64: string | null = null;

async function loadLogo(): Promise<string> {
  if (logoBase64) return logoBase64;

  const logoPath = join(process.cwd(), "public", "favicon.svg");

  try {
    // Convert SVG to PNG at 2x size for crisp rendering
    const pngBuffer = await sharp(logoPath, { density: 300 })
      .resize(56 * SCALE, 56 * SCALE)
      .png()
      .toBuffer();
    logoBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    return logoBase64;
  } catch (e) {
    console.warn("Could not load logo:", e);
    return "";
  }
}

interface OgImageOptions {
  title: string;
  subtitle?: string;
  showScreenshot?: boolean;
  type?: "landing" | "docs";
}

export async function generateOgImage(options: OgImageOptions): Promise<Buffer> {
  const { title, subtitle, showScreenshot = false, type = "landing" } = options;

  const fonts = await loadFonts();
  const screenshot = showScreenshot ? await loadScreenshot() : "";
  const logo = await loadLogo();

  const html = {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0a",
        position: "relative",
        fontFamily: "DM Sans",
      },
      children: [
        // Gradient orb top-right
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: "-150px",
              right: "-50px",
              width: "500px",
              height: "500px",
              background: "radial-gradient(circle, rgba(251, 146, 60, 0.2) 0%, transparent 70%)",
              borderRadius: "50%",
            },
          },
        },
        // Content
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "56px",
              flex: 1,
              position: "relative",
            },
            children: [
              // Header
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "32px",
                  },
                  children: [
                    // Logo
                    ...(logo ? [{
                      type: "img",
                      props: {
                        src: logo,
                        style: {
                          width: "56px",
                          height: "56px",
                          borderRadius: "14px",
                        },
                      },
                    }] : [{
                      type: "div",
                      props: {
                        style: {
                          width: "56px",
                          height: "56px",
                          background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)",
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        children: [{
                          type: "span",
                          props: {
                            style: { fontSize: "32px", fontWeight: 700, color: "#0a0a0a" },
                            children: "0",
                          },
                        }],
                      },
                    }]),
                    {
                      type: "span",
                      props: {
                        style: { fontSize: "36px", fontWeight: 700, color: "#fafaf9" },
                        children: "0list",
                      },
                    },
                    ...(type === "docs" ? [{
                      type: "div",
                      props: {
                        style: {
                          background: "rgba(251, 146, 60, 0.15)",
                          color: "#fb923c",
                          fontSize: "18px",
                          fontWeight: 600,
                          padding: "6px 16px",
                          borderRadius: "20px",
                        },
                        children: "Docs",
                      },
                    }] : []),
                  ],
                },
              },
              // Main content
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flex: 1,
                    gap: "48px",
                    alignItems: "center",
                  },
                  children: [
                    // Text
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          flex: showScreenshot && screenshot ? "0 0 420px" : 1,
                          justifyContent: "center",
                        },
                        children: [
                          {
                            type: "h1",
                            props: {
                              style: {
                                fontSize: showScreenshot ? "54px" : "64px",
                                fontWeight: 700,
                                color: "#fafaf9",
                                lineHeight: 1.1,
                                margin: 0,
                                marginBottom: subtitle ? "16px" : "24px",
                                letterSpacing: "-0.025em",
                              },
                              children: title,
                            },
                          },
                          ...(subtitle ? [{
                            type: "p",
                            props: {
                              style: {
                                fontSize: "26px",
                                color: "#a3a3a3",
                                lineHeight: 1.45,
                                margin: 0,
                              },
                              children: subtitle,
                            },
                          }] : []),
                          // Feature pills
                          ...(type === "landing" ? [{
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                gap: "8px",
                                marginTop: "24px",
                              },
                              children: ["Open Source", "Edge-Native", "Self-Hosted"].map((f) => ({
                                type: "div",
                                props: {
                                  style: {
                                    background: "rgba(255, 255, 255, 0.08)",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    color: "#d4d4d4",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                  },
                                  children: f,
                                },
                              })),
                            },
                          }] : []),
                        ],
                      },
                    },
                    // Screenshot
                    ...(showScreenshot && screenshot ? [{
                      type: "div",
                      props: {
                        style: {
                          flex: 1,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          position: "relative",
                        },
                        children: [
                          // Glow
                          {
                            type: "div",
                            props: {
                              style: {
                                position: "absolute",
                                width: "100%",
                                height: "100%",
                                background: "radial-gradient(ellipse at center, rgba(251, 146, 60, 0.25) 0%, transparent 60%)",
                              },
                            },
                          },
                          // Frame
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                flexDirection: "column",
                                borderRadius: "12px",
                                overflow: "hidden",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.5), 0 0 60px rgba(251, 146, 60, 0.2)",
                              },
                              children: [
                                // Title bar
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      height: "32px",
                                      background: "#1a1a1a",
                                      display: "flex",
                                      alignItems: "center",
                                      paddingLeft: "12px",
                                      gap: "6px",
                                    },
                                    children: [
                                      { type: "div", props: { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" } } },
                                      { type: "div", props: { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" } } },
                                      { type: "div", props: { style: { width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" } } },
                                    ],
                                  },
                                },
                                // Image
                                {
                                  type: "img",
                                  props: {
                                    src: screenshot,
                                    style: { width: "680px", display: "block" },
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    }] : []),
                  ],
                },
              },
              // Footer - just URL, no "Built for" text
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    marginTop: "auto",
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: { fontSize: "22px", color: "#525252" },
                        children: SITE_URL.replace("https://", ""),
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  // Render at 1x in satori, then scale up with resvg for crisp output
  const svg = await satori(html as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "DM Sans", data: fonts.semiBold, weight: 600, style: "normal" },
      { name: "DM Sans", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });

  // Render SVG at 2x resolution for crisp output
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH * SCALE } });
  const pngBuffer = resvg.render().asPng();

  // Convert to WebP for smaller file size
  const webpBuffer = await sharp(pngBuffer)
    .webp({ quality: 90 })
    .toBuffer();

  return webpBuffer;
}
