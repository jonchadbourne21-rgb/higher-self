#!/usr/bin/env python3
"""
Generate native app icons and splash screens for iOS and Android.

Capacitor scaffolds both platforms with its own placeholder artwork (a blue "C"
on a white grid). Shipping that is an automatic App Store rejection, so this
script rebuilds every icon and splash from the Mirrored brand emblem.

Source art:  client/public/mirrored-emblem-logo.png  (gold arch + luminous figure
             on white; the script lifts the arch off the white background and
             recomposites it on the brand indigo)

Run:         python3 scripts/generate-app-assets.py
Requires:    pip install Pillow
Then:        npx cap sync

Re-run this whenever the brand art changes. If a designer supplies a purpose-made
1024x1024 icon, point ICON_OVERRIDE at it and the arch extraction is skipped.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

SOURCE_EMBLEM = ROOT / "client/public/mirrored-emblem-logo.png"
# Set to a Path to use a designer-supplied square icon instead of the emblem crop.
ICON_OVERRIDE = None

# Brand indigo — matches background_color/theme_color in client/public/manifest.json
BRAND_BG = (15, 10, 46)

# Fraction of the icon canvas the arch occupies. Leaves breathing room so the
# mark survives iOS's rounded-rect mask and Android's circular mask.
ICON_ART_SCALE = 0.74
# Android adaptive icons crop to the central 66%; keep the art well inside it.
ADAPTIVE_ART_SCALE = 0.40
SPLASH_ART_SCALE = 0.34


def extract_arch(emblem_path: Path) -> Image.Image:
    """Crop the emblem down to the arch, discarding the white page around it."""
    im = Image.open(emblem_path).convert("RGBA")
    px = im.load()
    w, h = im.size

    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # Content = opaque and not near-white
            if a > 20 and (r + g + b) < 720:
                if x < min_x:
                    min_x = x
                if x > max_x:
                    max_x = x
                if y < min_y:
                    min_y = y
                if y > max_y:
                    max_y = y

    if max_x < 0:
        raise SystemExit(f"No non-white content found in {emblem_path}")

    arch = im.crop((min_x, min_y, max_x + 1, max_y + 1))

    # The arch interior is opaque white from the source page. Knock it out so the
    # brand indigo shows through behind the figure instead of a white slab.
    arch = arch.convert("RGBA")
    ap = arch.load()
    aw, ah = arch.size
    for y in range(ah):
        for x in range(aw):
            r, g, b, a = ap[x, y]
            if a > 0 and r > 235 and g > 235 and b > 235:
                ap[x, y] = (r, g, b, 0)
    return arch


def compose(art: Image.Image, size: int, art_scale: float, opaque: bool) -> Image.Image:
    """Center `art` on a square brand-coloured canvas of `size`x`size`."""
    canvas = Image.new("RGBA", (size, size), BRAND_BG + (255,))
    target_h = max(1, int(size * art_scale))
    ratio = target_h / art.height
    target_w = max(1, int(art.width * ratio))
    scaled = art.resize((target_w, target_h), Image.LANCZOS)
    canvas.alpha_composite(scaled, ((size - target_w) // 2, (size - target_h) // 2))
    # iOS rejects icons containing an alpha channel.
    return canvas.convert("RGB") if opaque else canvas


def compose_rect(art: Image.Image, w: int, h: int) -> Image.Image:
    """Center `art` on a brand-coloured canvas of arbitrary aspect (splashes)."""
    canvas = Image.new("RGB", (w, h), BRAND_BG)
    target_h = max(1, int(min(w, h) * SPLASH_ART_SCALE))
    ratio = target_h / art.height
    target_w = max(1, int(art.width * ratio))
    scaled = art.resize((target_w, target_h), Image.LANCZOS)
    canvas.paste(scaled, ((w - target_w) // 2, (h - target_h) // 2), scaled)
    return canvas


def write(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")
    print(f"  {path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}")


def main() -> None:
    if ICON_OVERRIDE:
        art = Image.open(ICON_OVERRIDE).convert("RGBA")
        print(f"Using override icon: {ICON_OVERRIDE}")
    else:
        print(f"Extracting arch from {SOURCE_EMBLEM.relative_to(ROOT)} ...")
        art = extract_arch(SOURCE_EMBLEM)
        print(f"  arch extracted: {art.size[0]}x{art.size[1]}")

    # ── iOS ──────────────────────────────────────────────────────────────────
    # Modern Xcode asset catalogs take a single 1024x1024 marketing icon and
    # derive the rest. No alpha channel allowed.
    print("\niOS app icon:")
    write(
        compose(art, 1024, ICON_ART_SCALE, opaque=True),
        ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
    )

    print("\niOS splash:")
    ios_splash = compose(art, 2732, SPLASH_ART_SCALE, opaque=True)
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        write(ios_splash, ROOT / "ios/App/App/Assets.xcassets/Splash.imageset" / name)

    # ── Android launcher icons ───────────────────────────────────────────────
    # Legacy square/round icons plus the adaptive-icon foreground layer.
    print("\nAndroid launcher icons:")
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    adaptive = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    res = ROOT / "android/app/src/main/res"

    for density, size in legacy.items():
        icon = compose(art, size, ICON_ART_SCALE, opaque=False)
        write(icon, res / f"mipmap-{density}/ic_launcher.png")
        write(icon, res / f"mipmap-{density}/ic_launcher_round.png")

    for density, size in adaptive.items():
        # Foreground layer stays transparent; the background layer is a solid
        # colour supplied by res/values/ic_launcher_background.xml.
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        target_h = max(1, int(size * ADAPTIVE_ART_SCALE))
        ratio = target_h / art.height
        target_w = max(1, int(art.width * ratio))
        scaled = art.resize((target_w, target_h), Image.LANCZOS)
        canvas.alpha_composite(scaled, ((size - target_w) // 2, (size - target_h) // 2))
        write(canvas, res / f"mipmap-{density}/ic_launcher_foreground.png")

    # ── Android splash screens ───────────────────────────────────────────────
    print("\nAndroid splash screens:")
    port = {"mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280),
            "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920)}
    for density, (w, h) in port.items():
        write(compose_rect(art, w, h), res / f"drawable-port-{density}/splash.png")
        write(compose_rect(art, h, w), res / f"drawable-land-{density}/splash.png")
    write(compose_rect(art, 480, 320), res / "drawable/splash.png")

    # ── Play Store / Galaxy Store listing icon ───────────────────────────────
    print("\nStore listing icon (upload manually to Play Console / Galaxy Store):")
    write(compose(art, 512, ICON_ART_SCALE, opaque=True), ROOT / "store-assets/play-store-icon-512.png")

    print("\nDone. Run `npx cap sync` to propagate into the native projects.")


if __name__ == "__main__":
    main()
