from __future__ import annotations

import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[5]
BATCH_ROOT = ROOT / "art_source" / "generated" / "combat" / "batch_01_ui_readability"
RAW_DIR = BATCH_ROOT / "raw"
WORKING_DIR = BATCH_ROOT / "working"
RUNTIME_ROOT = ROOT / "public" / "assets" / "combat"
SOURCE_IMAGE = Path(
    r"C:\Users\fol2h\.codex\generated_images\019e7670-8fd5-7c23-8f40-6235f65c924d\ig_0c85e053dd64c4c4016a1a3a2ea3108191af9e05a1f552e341.png"
)

SCALE = 3


Colour = tuple[int, int, int, int]


PARCHMENT = (226, 192, 139, 255)
DARK_PAPER = (42, 39, 38, 245)
INK = (31, 26, 24, 255)
EMBER = (242, 111, 42, 255)
EMBER_GLOW = (255, 181, 91, 180)
BRASS = (178, 130, 61, 255)
ASH = (86, 92, 102, 230)
COOL_SHADOW = (24, 30, 42, 235)
GREEN = (78, 172, 129, 255)
GOLD = (231, 181, 75, 255)
TEAL = (79, 177, 165, 255)
RED = (205, 82, 66, 255)
BLUE = (83, 154, 210, 255)
PURPLE = (134, 91, 176, 255)


@dataclass(frozen=True)
class Asset:
    key: str
    path: str
    size: tuple[int, int]
    kind: str
    variant: str


def runtime(path: str) -> Path:
    return RUNTIME_ROOT / path.removeprefix("assets/combat/")


def canvas(size: tuple[int, int]) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    image = Image.new("RGBA", (size[0] * SCALE, size[1] * SCALE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def finish(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = image.resize((image.width // SCALE, image.height // SCALE), Image.Resampling.LANCZOS)
    image.save(path)


def sc(value: int | float) -> int:
    return int(round(value * SCALE))


def rounded(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], radius: int, fill: Colour, outline: Colour | None = None, width: int = 1) -> None:
    scaled = tuple(sc(v) for v in box)
    draw.rounded_rectangle(scaled, radius=sc(radius), fill=fill, outline=outline, width=sc(width))


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], fill: Colour, outline: Colour | None = None, width: int = 1) -> None:
    scaled = tuple(sc(v) for v in box)
    draw.ellipse(scaled, fill=fill, outline=outline, width=sc(width))


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: Colour, width: int = 2) -> None:
    draw.line([(sc(x), sc(y)) for x, y in points], fill=fill, width=sc(width), joint="curve")


def polygon(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: Colour, outline: Colour | None = None) -> None:
    draw.polygon([(sc(x), sc(y)) for x, y in points], fill=fill)
    if outline:
        draw.line([(sc(x), sc(y)) for x, y in [*points, points[0]]], fill=outline, width=sc(2), joint="curve")


def glow(size: tuple[int, int], draw_fn: Callable[[ImageDraw.ImageDraw], None], blur: int = 8) -> Image.Image:
    layer = Image.new("RGBA", (size[0] * SCALE, size[1] * SCALE), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(sc(blur)))


def draw_paw(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float, fill: Colour = EMBER, outline: Colour = INK) -> None:
    ellipse(draw, (cx - 13 * scale, cy - 4 * scale, cx + 13 * scale, cy + 17 * scale), fill, outline, 2)
    for dx, dy in [(-14, -13), (-5, -18), (5, -18), (14, -13)]:
        ellipse(draw, (cx + (dx - 5) * scale, cy + (dy - 5) * scale, cx + (dx + 5) * scale, cy + (dy + 5) * scale), fill, outline, 1)


def draw_flame(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float, fill: Colour = EMBER) -> None:
    polygon(draw, [
        (cx, cy - 28 * scale),
        (cx + 18 * scale, cy - 6 * scale),
        (cx + 7 * scale, cy + 23 * scale),
        (cx - 14 * scale, cy + 18 * scale),
        (cx - 20 * scale, cy - 5 * scale),
    ], fill, INK)
    polygon(draw, [
        (cx, cy - 20 * scale),
        (cx + 10 * scale, cy - 2 * scale),
        (cx + 2 * scale, cy + 17 * scale),
        (cx - 9 * scale, cy + 10 * scale),
        (cx - 6 * scale, cy - 6 * scale),
    ], (255, 185, 76, 255))


def draw_shield(draw: ImageDraw.ImageDraw, cx: float, cy: float, scale: float, fill: Colour = BLUE) -> None:
    polygon(draw, [
        (cx, cy - 30 * scale),
        (cx + 24 * scale, cy - 18 * scale),
        (cx + 18 * scale, cy + 18 * scale),
        (cx, cy + 32 * scale),
        (cx - 18 * scale, cy + 18 * scale),
        (cx - 24 * scale, cy - 18 * scale),
    ], fill, INK)
    polygon(draw, [
        (cx, cy - 21 * scale),
        (cx + 15 * scale, cy - 12 * scale),
        (cx + 10 * scale, cy + 12 * scale),
        (cx, cy + 22 * scale),
        (cx - 10 * scale, cy + 12 * scale),
        (cx - 15 * scale, cy - 12 * scale),
    ], (fill[0], fill[1], fill[2], 255))


def draw_frame(asset: Asset) -> None:
    w, h = asset.size
    image, draw = canvas(asset.size)
    if "overlay" in asset.variant.lower():
        colour = {
            "hoverOverlay": (255, 223, 145, 130),
            "selectedOverlay": (255, 178, 72, 180),
            "unplayableOverlay": (23, 29, 40, 150),
        }[asset.variant]
        image.alpha_composite(glow(asset.size, lambda gd: rounded(gd, (14, 14, w - 14, h - 14), 28, colour, colour, 7), 10))
        if asset.variant == "unplayableOverlay":
            rounded(draw, (18, 18, w - 18, h - 18), 24, (14, 18, 26, 122), colour, 3)
            for i in range(8):
                line(draw, [(40 + i * 42, 40), (18 + i * 42, h - 38)], (104, 113, 130, 88), 3)
        else:
            rounded(draw, (16, 16, w - 16, h - 16), 24, (0, 0, 0, 0), colour, 5)
        finish(image, runtime(asset.path))
        return

    fill = DARK_PAPER if asset.variant in {"petCommand", "futurePower"} else PARCHMENT
    accent = {
        "normal": BRASS,
        "petCommand": EMBER,
        "petSupport": (214, 159, 94, 255),
        "keeperSignal": TEAL,
        "futurePower": GOLD,
        "temporary": ASH,
    }.get(asset.variant, BRASS)
    rounded(draw, (16, 12, w - 16, h - 12), 26, fill, INK, 5)
    rounded(draw, (27, 25, w - 27, h - 25), 18, (0, 0, 0, 0), accent, 3)
    rounded(draw, (24, 60, 94, 128), 16, (23, 24, 28, 210), accent, 3)
    rounded(draw, (42, 140, w - 42, 305), 12, (245, 217, 169, 90) if fill == DARK_PAPER else (45, 49, 58, 85), accent, 2)
    rounded(draw, (42, 318, w - 42, 360), 10, (18, 22, 30, 115), accent, 1)
    rounded(draw, (42, 374, w - 42, 474), 12, (18, 22, 30, 115), accent, 1)
    for x in (56, 105, 154, 203, 252, 301):
        ellipse(draw, (x, h - 49, x + 23, h - 26), (20, 26, 34, 190), accent, 1)
    if asset.variant in {"petCommand", "petSupport"}:
        draw_paw(draw, w / 2, 43, 0.9, EMBER, INK)
        line(draw, [(w - 62, 74), (w - 36, 110), (w - 58, 145)], EMBER, 3)
    elif asset.variant == "keeperSignal":
        ellipse(draw, (w / 2 - 18, 25, w / 2 + 18, 61), (0, 0, 0, 0), TEAL, 4)
        line(draw, [(w / 2 - 24, 72), (w / 2, 58), (w / 2 + 24, 72)], TEAL, 3)
    elif asset.variant == "futurePower":
        draw_flame(draw, w / 2, 48, 0.85, GOLD)
    elif asset.variant == "temporary":
        for i in range(8):
            line(draw, [(26 + i * 18, h - 70 - i * 4), (44 + i * 18, h - 43 - i * 2)], (126, 129, 132, 120), 2)
    else:
        polygon(draw, [(w / 2, 25), (w / 2 + 20, 47), (w / 2, 69), (w / 2 - 20, 47)], BRASS, INK)
    finish(image, runtime(asset.path))


def draw_icon(asset: Asset) -> None:
    w, h = asset.size
    image, draw = canvas(asset.size)
    cx, cy = w / 2, h / 2
    base = {
        "starter": ASH,
        "common": BRASS,
        "uncommon": GREEN,
        "rare": GOLD,
        "special": PURPLE,
        "unique": EMBER,
        "attack": RED,
        "defend": BLUE,
        "buff": GREEN,
        "debuff": PURPLE,
        "specialIntent": GOLD,
        "charging": EMBER,
        "obscured": ASH,
        "burn": EMBER,
        "block": BLUE,
        "guard": TEAL,
        "empowered": GOLD,
        "marked": RED,
        "ready": GREEN,
        "commanded": EMBER,
        "scoped": TEAL,
        "revealed": GOLD,
        "bound": PURPLE,
        "overflow": ASH,
        "fallback": ASH,
    }.get(asset.variant, BRASS)
    ellipse(draw, (16, 16, w - 16, h - 16), (base[0], base[1], base[2], 50), INK, 4)
    if asset.kind in {"rarity", "source", "family", "tag", "status", "intent", "marker"}:
        if asset.variant == "fox":
            polygon(draw, [
                (cx, cy - 34),
                (cx + 28, cy - 4),
                (cx + 18, cy + 28),
                (cx, cy + 17),
                (cx - 18, cy + 28),
                (cx - 28, cy - 4),
            ], EMBER, INK)
            polygon(draw, [(cx - 18, cy - 10), (cx - 34, cy - 34), (cx - 4, cy - 24)], BRASS, INK)
            polygon(draw, [(cx + 18, cy - 10), (cx + 34, cy - 34), (cx + 4, cy - 24)], BRASS, INK)
        elif asset.variant in {"petCommand", "petBound", "commanded"}:
            draw_paw(draw, cx, cy + 5, 1.35 if w >= 160 else 0.8, EMBER, INK)
        elif asset.variant in {"burn", "rare", "charging", "empowered"}:
            draw_flame(draw, cx, cy + 2, 1.2 if w >= 160 else 0.72, EMBER)
        elif asset.variant in {"block", "guard", "defend", "keeperSkill"}:
            draw_shield(draw, cx, cy, 1.15 if w >= 160 else 0.72, BLUE if asset.variant != "guard" else TEAL)
        elif asset.variant in {"attack", "keeperAttack"}:
            line(draw, [(cx - 26, cy + 24), (cx + 26, cy - 24)], base, 8)
            line(draw, [(cx + 5, cy - 24), (cx + 26, cy - 24), (cx + 26, cy - 3)], base, 8)
        elif asset.variant in {"draw", "fetch"}:
            rounded(draw, (cx - 27, cy - 20, cx + 14, cy + 25), 5, (236, 205, 152, 255), INK, 3)
            line(draw, [(cx + 2, cy - 29), (cx + 31, cy - 3), (cx + 11, cy - 2)], EMBER, 5)
        elif asset.variant in {"mark", "scoped", "scope"}:
            ellipse(draw, (cx - 30, cy - 30, cx + 30, cy + 30), (0, 0, 0, 0), base, 5)
            ellipse(draw, (cx - 10, cy - 10, cx + 10, cy + 10), base, INK, 2)
            line(draw, [(cx, cy - 36), (cx, cy - 22), (cx, cy + 22), (cx, cy + 36)], base, 3)
        elif asset.variant in {"unknown", "obscured", "obscure"}:
            for i in range(4):
                ellipse(draw, (cx - 38 + i * 17, cy - 16 + i % 2 * 7, cx + 2 + i * 17, cy + 16 + i % 2 * 7), (ASH[0], ASH[1], ASH[2], 185), None)
        elif asset.variant in {"keeper", "classBound", "universalPlayer"}:
            polygon(draw, [(cx, cy - 34), (cx + 30, cy), (cx, cy + 34), (cx - 30, cy)], BRASS, INK)
            ellipse(draw, (cx - 12, cy - 12, cx + 12, cy + 12), COOL_SHADOW, EMBER, 2)
        elif asset.variant in {"signal", "keeperSignal", "scout", "reveal", "revealed"}:
            ellipse(draw, (cx - 34, cy - 18, cx + 34, cy + 18), (0, 0, 0, 0), TEAL, 5)
            ellipse(draw, (cx - 9, cy - 9, cx + 9, cy + 9), TEAL, INK, 2)
        elif asset.variant in {"combo", "petSupport"}:
            ellipse(draw, (cx - 38, cy - 18, cx - 2, cy + 18), (0, 0, 0, 0), GOLD, 6)
            ellipse(draw, (cx + 2, cy - 18, cx + 38, cy + 18), (0, 0, 0, 0), EMBER, 6)
        elif asset.variant in {"locked", "bound"}:
            ellipse(draw, (cx - 30, cy - 8, cx + 30, cy + 23), (0, 0, 0, 0), PURPLE, 7)
            rounded(draw, (cx - 22, cy - 30, cx + 22, cy + 12), 10, (0, 0, 0, 0), PURPLE, 6)
        elif asset.variant in {"roughLow", "roughMedium", "roughHigh"}:
            count = {"roughLow": 1, "roughMedium": 2, "roughHigh": 3}[asset.variant]
            for i in range(count):
                draw_flame(draw, cx + (i - (count - 1) / 2) * 20, cy + 7, 0.45, EMBER)
        elif asset.variant == "multiHit":
            for i in range(3):
                line(draw, [(cx - 31 + i * 22, cy + 24), (cx - 6 + i * 22, cy - 22)], EMBER, 6)
        elif asset.variant == "adaptive":
            line(draw, [(cx - 34, cy), (cx - 8, cy - 24), (cx + 26, cy - 14)], GREEN, 6)
            line(draw, [(cx + 34, cy), (cx + 8, cy + 24), (cx - 26, cy + 14)], GREEN, 6)
        elif asset.variant == "changedPulse":
            for radius in (16, 28, 40):
                ellipse(draw, (cx - radius, cy - radius, cx + radius, cy + radius), (0, 0, 0, 0), EMBER, 3)
        elif asset.variant == "temporary":
            for i in range(5):
                line(draw, [(cx - 32 + i * 14, cy - 28), (cx - 18 + i * 14, cy + 30)], ASH, 3)
        elif asset.variant == "legacy":
            rounded(draw, (cx - 34, cy - 24, cx + 34, cy + 24), 8, (54, 59, 68, 255), ASH, 4)
            line(draw, [(cx - 20, cy - 9), (cx + 20, cy - 9)], (122, 132, 148, 255), 3)
            line(draw, [(cx - 20, cy + 9), (cx + 20, cy + 9)], (122, 132, 148, 255), 3)
        elif asset.variant == "eventOnly":
            polygon(draw, [(cx, cy - 34), (cx + 24, cy - 10), (cx + 14, cy + 30), (cx - 20, cy + 20), (cx - 26, cy - 12)], PURPLE, INK)
        elif asset.variant == "encounterReward":
            polygon(draw, [(cx, cy - 34), (cx + 35, cy), (cx, cy + 34), (cx - 35, cy)], GOLD, INK)
            draw_flame(draw, cx, cy + 3, 0.55, EMBER)
        else:
            polygon(draw, [(cx, cy - 34), (cx + 29, cy - 4), (cx + 18, cy + 31), (cx - 18, cy + 31), (cx - 29, cy - 4)], base, INK)
    finish(image, runtime(asset.path))


def draw_panel(asset: Asset) -> None:
    w, h = asset.size
    image, draw = canvas(asset.size)
    if asset.variant == "clickBlockerTint":
        rounded(draw, (0, 0, w, h), 0, (0, 0, 0, 125))
        finish(image, runtime(asset.path))
        return
    fill = DARK_PAPER if any(token in asset.variant for token in ["bottom", "event", "pause"]) else PARCHMENT
    accent = EMBER if "button" in asset.variant.lower() or "endTurn" in asset.variant else BRASS
    rounded(draw, (6, 6, w - 6, h - 6), min(34, max(8, min(w, h) // 8)), fill, INK, 5)
    rounded(draw, (16, 16, w - 16, h - 16), min(28, max(6, min(w, h) // 10)), (0, 0, 0, 0), accent, 2)
    if w > 220:
        line(draw, [(34, h - 34), (w * 0.34, h - 20), (w * 0.72, h - 32), (w - 34, h - 18)], (EMBER[0], EMBER[1], EMBER[2], 110), 3)
    if "hp" in asset.variant.lower():
        rounded(draw, (8, h * 0.28, w - 8, h * 0.72), max(5, h // 5), (120, 46, 42, 180), INK, 2)
    if "block" in asset.variant.lower():
        draw_shield(draw, w / 2, h / 2, min(w, h) / 95, BLUE)
    if "portrait" in asset.variant.lower():
        ellipse(draw, (12, 12, w - 12, h - 12), (0, 0, 0, 0), accent, 5)
    finish(image, runtime(asset.path))


def draw_control(asset: Asset) -> None:
    if asset.variant == "energyOrb":
        image, draw = canvas(asset.size)
        w, h = asset.size
        image.alpha_composite(glow(asset.size, lambda gd: ellipse(gd, (36, 36, w - 36, h - 36), EMBER_GLOW, EMBER_GLOW, 10), 16))
        ellipse(draw, (40, 40, w - 40, h - 40), (67, 39, 22, 240), INK, 6)
        ellipse(draw, (78, 78, w - 78, h - 78), (255, 178, 72, 135), GOLD, 4)
        finish(image, runtime(asset.path))
    elif asset.variant in {"drawPile", "discardPile"}:
        image, draw = canvas(asset.size)
        w, h = asset.size
        for i in range(3):
            rounded(draw, (28 + i * 8, 18 + i * 10, w - 42 + i * 8, h - 26 + i * 10), 14, DARK_PAPER if asset.variant == "drawPile" else PARCHMENT, BRASS, 3)
        finish(image, runtime(asset.path))
    else:
        draw_panel(asset)


def draw_slot(asset: Asset) -> None:
    w, h = asset.size
    image, draw = canvas(asset.size)
    if "Glow" in asset.variant:
        image.alpha_composite(glow(asset.size, lambda gd: ellipse(gd, (30, 30, w - 30, h - 30), EMBER_GLOW, EMBER_GLOW, 9), 20))
    if "enemyHpBar" in asset.variant:
        draw_panel(asset)
        return
    if "BlockBadge" in asset.variant:
        draw_icon(Asset(asset.key, asset.path, asset.size, "status", "block"))
        return
    if "StatusTray" in asset.variant:
        rounded(draw, (18, h * 0.28, w - 18, h * 0.72), max(10, h // 6), DARK_PAPER, BRASS, 3)
    elif "emberChargePip" in asset.variant:
        draw_flame(draw, w / 2, h / 2, min(w, h) / 95, EMBER)
    else:
        ellipse(draw, (28, 28, w - 28, h - 28), (0, 0, 0, 0), BRASS if "pet" in asset.variant else RED, 8)
        ellipse(draw, (58, 58, w - 58, h - 58), (0, 0, 0, 0), EMBER if "pet" in asset.variant else GOLD, 3)
        if "pet" in asset.variant:
            draw_paw(draw, w / 2, h - 60, 1.0, EMBER, INK)
    finish(image, runtime(asset.path))


def make_contact_sheet(name: str, assets: list[Asset]) -> None:
    thumb_size = 96
    columns = 8
    rows = math.ceil(len(assets) / columns)
    sheet = Image.new("RGBA", (columns * thumb_size, rows * thumb_size), (0, 0, 0, 0))
    for index, asset in enumerate(assets):
        path = runtime(asset.path)
        if not path.exists():
            continue
        with Image.open(path) as item:
            item.thumbnail((thumb_size - 12, thumb_size - 12), Image.Resampling.LANCZOS)
            x = (index % columns) * thumb_size + (thumb_size - item.width) // 2
            y = (index // columns) * thumb_size + (thumb_size - item.height) // 2
            sheet.alpha_composite(item, (x, y))
    sheet.save(WORKING_DIR / f"{name}_working_contact_sheet.png")


ASSETS: list[Asset] = [
    Asset("combat.cardFrame.normal", "assets/combat/cards/frames/combat_card_frame_normal.png", (384, 536), "frame", "normal"),
    Asset("combat.cardFrame.petCommand", "assets/combat/cards/frames/combat_card_frame_pet_command.png", (384, 536), "frame", "petCommand"),
    Asset("combat.cardFrame.petSupport", "assets/combat/cards/frames/combat_card_frame_pet_support.png", (384, 536), "frame", "petSupport"),
    Asset("combat.cardFrame.keeperSignal", "assets/combat/cards/frames/combat_card_frame_keeper_signal.png", (384, 536), "frame", "keeperSignal"),
    Asset("combat.cardFrame.futurePower", "assets/combat/cards/frames/combat_card_frame_future_power.png", (384, 536), "frame", "futurePower"),
    Asset("combat.cardFrame.temporary", "assets/combat/cards/frames/combat_card_frame_temporary.png", (384, 536), "frame", "temporary"),
    Asset("combat.cardFrame.hoverOverlay", "assets/combat/cards/frames/combat_card_frame_hover_overlay.png", (384, 536), "frame", "hoverOverlay"),
    Asset("combat.cardFrame.selectedOverlay", "assets/combat/cards/frames/combat_card_frame_selected_overlay.png", (384, 536), "frame", "selectedOverlay"),
    Asset("combat.cardFrame.unplayableOverlay", "assets/combat/cards/frames/combat_card_frame_unplayable_overlay.png", (384, 536), "frame", "unplayableOverlay"),
    Asset("combat.cardFrame.artWindowPlaceholder", "assets/combat/cards/frames/combat_card_art_window_placeholder.png", (320, 180), "panel", "artWindowPlaceholder"),
]


def add_icons(prefix: str, folder: str, names: list[str], kind: str, size: tuple[int, int]) -> None:
    file_prefix = {
        "combat.cardRarity": "combat_card_rarity",
        "combat.cardSource": "combat_card_source",
        "combat.cardFamily": "combat_card_family",
    }[prefix]
    for name in names:
        file_name = name[0].lower() + name[1:]
        snake = "".join([f"_{ch.lower()}" if ch.isupper() else ch for ch in file_name])
        ASSETS.append(Asset(f"{prefix}.{file_name}", f"assets/combat/{folder}/{file_prefix}_{snake}.png", size, kind, file_name))


add_icons("combat.cardRarity", "cards/rarity", ["starter", "common", "uncommon", "rare", "special", "unique"], "rarity", (192, 192))
add_icons("combat.cardSource", "cards/source_badges", ["universalPlayer", "classBound", "petBound", "petSupport", "encounterReward", "eventOnly", "temporary", "legacy"], "source", (192, 192))
add_icons("combat.cardFamily", "cards/family_badges", ["keeperAttack", "keeperSkill", "keeperSignal", "petCommand", "petSupport", "power", "temporary"], "family", (192, 192))

ASSETS.extend([
    Asset("combat.intentToken.frame", "assets/combat/icons/intent/combat_intent_token_frame.png", (280, 184), "panel", "intentToken"),
])
for name in ["unknown", "attack", "defend", "buff", "debuff", "special", "charging", "obscured"]:
    ASSETS.append(Asset(f"combat.icon.intent.{name}", f"assets/combat/icons/intent/combat_icon_intent_{name}.png", (192, 192), "intent", "specialIntent" if name == "special" else name))
for name in ["scoped", "locked", "adaptive", "changedPulse", "multiHit", "roughLow", "roughMedium", "roughHigh"]:
    snake = "".join([f"_{ch.lower()}" if ch.isupper() else ch for ch in name])
    ASSETS.append(Asset(f"combat.intentMarker.{name}", f"assets/combat/icons/intent/combat_intent_marker_{snake}.png", (128, 128), "marker", name))
for name in ["burn", "block", "guard", "empowered", "marked", "ready", "commanded", "obscured", "scoped", "revealed", "bound", "overflow", "fallback"]:
    ASSETS.append(Asset(f"combat.icon.status.{name}", f"assets/combat/icons/status/combat_icon_status_{name}.png", (128, 128), "status", "mark" if name == "marked" else name))
for name in ["petCommand", "fox", "burn", "guard", "block", "draw", "mark", "attack", "setup", "combo", "keeper", "signal", "scout", "fetch", "reveal", "scope", "obscure", "rare", "fallback"]:
    snake = "".join([f"_{ch.lower()}" if ch.isupper() else ch for ch in name])
    ASSETS.append(Asset(f"combat.icon.tag.{name}", f"assets/combat/icons/tags/combat_icon_tag_{snake}.png", (128, 128), "tag", name))

PANELS = [
    ("combat.ui.bottomHudPlate", "assets/combat/ui/hud/combat_ui_bottom_hud_plate.png", (5120, 640), "bottomHud"),
    ("combat.ui.playerHudFrame", "assets/combat/ui/hud/combat_ui_player_hud_frame.png", (704, 480), "playerHud"),
    ("combat.ui.playerPortraitFrame", "assets/combat/ui/hud/combat_ui_player_portrait_frame.png", (256, 256), "playerPortrait"),
    ("combat.ui.playerHpBarTrack", "assets/combat/ui/hud/combat_ui_player_hp_bar_track.png", (512, 96), "playerHpBarTrack"),
    ("combat.ui.playerHpBarFillMask", "assets/combat/ui/hud/combat_ui_player_hp_bar_fill_mask.png", (512, 96), "playerHpBarFillMask"),
    ("combat.ui.playerBlockBadge", "assets/combat/ui/hud/combat_ui_player_block_badge.png", (192, 192), "playerBlockBadge"),
    ("combat.ui.playerStatusTray", "assets/combat/ui/hud/combat_ui_player_status_tray.png", (512, 128), "playerStatusTray"),
    ("combat.ui.playerHoverFrame", "assets/combat/ui/hud/combat_ui_player_hover_frame.png", (704, 480), "playerHoverFrame"),
    ("combat.ui.tooltipPanel", "assets/combat/ui/panels/combat_ui_tooltip_panel.png", (704, 320), "tooltipPanel"),
    ("combat.ui.detailPanel", "assets/combat/ui/panels/combat_ui_detail_panel.png", (1280, 880), "detailPanel"),
    ("combat.ui.cardDetailSidebar", "assets/combat/ui/panels/combat_ui_card_detail_sidebar.png", (512, 880), "cardDetailSidebar"),
    ("combat.ui.cardDetailKeywordRow", "assets/combat/ui/panels/combat_ui_card_detail_keyword_row.png", (640, 96), "cardDetailKeywordRow"),
    ("combat.ui.cardDetailTagTray", "assets/combat/ui/panels/combat_ui_card_detail_tag_tray.png", (640, 128), "cardDetailTagTray"),
    ("combat.ui.detailCloseButton", "assets/combat/ui/panels/combat_ui_detail_close_button.png", (160, 160), "detailCloseButton"),
    ("combat.ui.clickBlockerTint", "assets/combat/ui/panels/combat_ui_click_blocker_tint.png", (64, 64), "clickBlockerTint"),
    ("combat.ui.pausePanel", "assets/combat/ui/panels/combat_ui_pause_panel.png", (960, 640), "pausePanel"),
    ("combat.ui.eventLogPanel", "assets/combat/ui/panels/combat_ui_event_log_panel.png", (768, 512), "eventLogPanel"),
]
ASSETS.extend(Asset(key, path, size, "panel", variant) for key, path, size, variant in PANELS)
CONTROLS = [
    ("combat.control.energyOrb", "assets/combat/ui/hud/combat_control_energy_orb.png", (320, 320), "energyOrb"),
    ("combat.control.drawPile", "assets/combat/ui/hud/combat_control_draw_pile.png", (232, 328), "drawPile"),
    ("combat.control.discardPile", "assets/combat/ui/hud/combat_control_discard_pile.png", (232, 328), "discardPile"),
    ("combat.control.endTurnButton", "assets/combat/ui/hud/combat_control_end_turn_button.png", (496, 224), "endTurn"),
    ("combat.control.menuButton", "assets/combat/ui/hud/combat_control_menu_button.png", (160, 160), "menuButton"),
]
ASSETS.extend(Asset(key, path, size, "control", variant) for key, path, size, variant in CONTROLS)
SLOTS = [
    ("combat.slot.petRing", "assets/combat/ui/slots/combat_slot_pet_ring.png", (472, 472), "petRing"),
    ("combat.slot.petCommandGlow", "assets/combat/ui/slots/combat_slot_pet_command_glow.png", (472, 472), "petCommandGlow"),
    ("combat.slot.emberChargePip", "assets/combat/ui/slots/combat_slot_ember_charge_pip.png", (128, 128), "emberChargePip"),
    ("combat.slot.petStatusTray", "assets/combat/ui/slots/combat_slot_pet_status_tray.png", (384, 104), "petStatusTray"),
    ("combat.slot.inactivePetSlot", "assets/combat/ui/slots/combat_slot_inactive_pet_slot.png", (472, 472), "inactivePetSlot"),
    ("combat.slot.enemyTargetRing", "assets/combat/ui/slots/combat_slot_enemy_target_ring.png", (472, 472), "enemyTargetRing"),
    ("combat.slot.enemyHpBarTrack", "assets/combat/ui/slots/combat_slot_enemy_hp_bar_track.png", (512, 96), "enemyHpBarTrack"),
    ("combat.slot.enemyHpBarFillMask", "assets/combat/ui/slots/combat_slot_enemy_hp_bar_fill_mask.png", (512, 96), "enemyHpBarFillMask"),
    ("combat.slot.enemyBlockBadge", "assets/combat/ui/slots/combat_slot_enemy_block_badge.png", (192, 192), "enemyBlockBadge"),
    ("combat.slot.enemyStatusTray", "assets/combat/ui/slots/combat_slot_enemy_status_tray.png", (384, 104), "enemyStatusTray"),
]
ASSETS.extend(Asset(key, path, size, "slot", variant) for key, path, size, variant in SLOTS)


DRAWERS: dict[str, Callable[[Asset], None]] = {
    "frame": draw_frame,
    "rarity": draw_icon,
    "source": draw_icon,
    "family": draw_icon,
    "intent": draw_icon,
    "marker": draw_icon,
    "status": draw_icon,
    "tag": draw_icon,
    "panel": draw_panel,
    "control": draw_control,
    "slot": draw_slot,
}


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    WORKING_DIR.mkdir(parents=True, exist_ok=True)
    if SOURCE_IMAGE.exists():
        shutil.copy2(SOURCE_IMAGE, RAW_DIR / "combat_asset_batch_01_ui_readability_raw_sheet.png")
    for asset in ASSETS:
        DRAWERS[asset.kind](asset)
    for group_name in sorted({asset.kind for asset in ASSETS}):
        make_contact_sheet(group_name, [asset for asset in ASSETS if asset.kind == group_name])
    manifest = {
        "batch": "batch-01-ui-readability",
        "rawSourceImage": str(SOURCE_IMAGE),
        "rawArchive": str(RAW_DIR / "combat_asset_batch_01_ui_readability_raw_sheet.png"),
        "assetCount": len(ASSETS),
        "assets": [asset.__dict__ for asset in ASSETS],
        "notes": [
            "Runtime assets are transparent PNGs with no baked gameplay text or numbers.",
            "The imagegen raw sheet establishes the Ember Journal visual language; exported runtime assets are deterministic clean variants for contract-safe Phaser ingestion.",
        ],
    }
    (WORKING_DIR / "batch_01_generation_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
