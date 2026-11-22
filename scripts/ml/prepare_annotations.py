"""Generate annotation contracts and the Vietnamese annotation guide; no image inference."""
import argparse
import json
from pathlib import Path

from annotation_contract import ASSETS, prepare
from dataset_common import DEFAULT_RAW, ROOT

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--assets", type=Path, default=ASSETS)
    parser.add_argument("--guide", type=Path, default=ROOT / "docs/ANNOTATION_GUIDE.md")
    args = parser.parse_args()
    print(json.dumps(prepare(args.raw, args.assets, args.guide), ensure_ascii=False, indent=2))
