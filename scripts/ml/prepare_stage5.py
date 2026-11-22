"""Check Stage 5 readiness; export only complete human-verified training inputs."""
import argparse
import json
from pathlib import Path

from dataset_common import DEFAULT_RAW, DEFAULT_REVIEW, ROOT
from import_verified import VERIFIED
from stage2_common import STAGE2, PipelineBlocked
from stage5_common import HOME, PLAN, REPORTS, export_bundle, inspect, write_readiness


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["check", "export"])
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--review", type=Path, default=DEFAULT_REVIEW)
    parser.add_argument("--frozen", type=Path, default=STAGE2 / "frozen")
    parser.add_argument("--verified", type=Path, default=VERIFIED)
    parser.add_argument("--stage4", type=Path, default=ROOT / "reports/experiments.json")
    parser.add_argument("--reports", type=Path, default=REPORTS)
    parser.add_argument("--plan", type=Path, default=PLAN)
    parser.add_argument("--output", type=Path, default=HOME / "training_bundle")
    args = parser.parse_args()
    try:
        protected = [args.raw, args.review, args.frozen]
        if any(args.reports.resolve().is_relative_to(p.resolve()) or args.output.resolve().is_relative_to(p.resolve()) for p in protected):
            raise PipelineBlocked("Stage 5 outputs cannot overwrite raw/review/frozen sources")
        report, context = inspect(args.raw, args.review, args.frozen, args.verified, args.stage4, plan_path=args.plan)
        write_readiness(report, args.reports)
        if args.action == "export":
            export_bundle(report, context, args.raw, args.output)
        print(json.dumps({key: report[key] for key in ["status", "training_permitted", "human_scene_eligible_images",
            "verified_train_images", "verified_val_images", "eligible_classes", "blockers"]}, ensure_ascii=False, indent=2))
        raise SystemExit(0 if report["training_permitted"] else 2)
    except (ValueError, OSError, KeyError) as error:
        print(json.dumps({"status": "blocked", "error": str(error), "training_runs": 0}))
        raise SystemExit(2)
