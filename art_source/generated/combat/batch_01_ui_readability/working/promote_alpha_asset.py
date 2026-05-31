from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("input image has no visible alpha pixels")
    return bbox


def fit_alpha_asset(
    source: Path,
    output: Path,
    size: tuple[int, int],
    padding: int,
    fit_mode: str,
) -> dict[str, object]:
    with Image.open(source) as source_image:
        image = source_image.convert("RGBA")

    bbox = alpha_bbox(image)
    cropped = image.crop(bbox)
    max_width = max(1, size[0] - padding * 2)
    max_height = max(1, size[1] - padding * 2)
    if fit_mode == "stretch":
        fitted_size = (max_width, max_height)
    else:
        scale = min(max_width / cropped.width, max_height / cropped.height)
        fitted_size = (
            max(1, round(cropped.width * scale)),
            max(1, round(cropped.height * scale)),
        )
    fitted = cropped.resize(fitted_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    offset = ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2)
    canvas.alpha_composite(fitted, offset)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output)

    final_bbox = alpha_bbox(canvas)
    corner_alpha = [
        canvas.getpixel((0, 0))[3],
        canvas.getpixel((size[0] - 1, 0))[3],
        canvas.getpixel((0, size[1] - 1))[3],
        canvas.getpixel((size[0] - 1, size[1] - 1))[3],
    ]

    return {
        "source": str(source),
        "output": str(output),
        "size": {"width": size[0], "height": size[1]},
        "sourceVisibleBounds": {"left": bbox[0], "top": bbox[1], "right": bbox[2], "bottom": bbox[3]},
        "fitMode": fit_mode,
        "fittedSize": {"width": fitted_size[0], "height": fitted_size[1]},
        "finalVisibleBounds": {
            "left": final_bbox[0],
            "top": final_bbox[1],
            "right": final_bbox[2],
            "bottom": final_bbox[3],
        },
        "cornerAlpha": corner_alpha,
        "hasTransparentCorners": all(value == 0 for value in corner_alpha),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Fit a generated alpha PNG into an exact runtime asset size.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--width", required=True, type=int)
    parser.add_argument("--height", required=True, type=int)
    parser.add_argument("--padding", type=int, default=0)
    parser.add_argument("--fit-mode", choices=["contain", "stretch"], default="contain")
    parser.add_argument("--validation-out", type=Path)
    args = parser.parse_args()

    result = fit_alpha_asset(
        source=args.input,
        output=args.out,
        size=(args.width, args.height),
        padding=args.padding,
        fit_mode=args.fit_mode,
    )

    if args.validation_out is not None:
        args.validation_out.parent.mkdir(parents=True, exist_ok=True)
        args.validation_out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
