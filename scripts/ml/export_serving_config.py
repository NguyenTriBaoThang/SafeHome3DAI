"""Port the locked structured recipe to serving without running any image or changing Stage 4."""
import json
from pathlib import Path

from annotation_contract import prompt_for
from dataset_common import DEFAULT_RAW, ROOT, sha256_file, write_json
from experiment_stage4 import inference_schema, unseal
from stage2_common import RISK_IDS, digest, load_definitions, load_taxonomy


def serving_schema(value):
    if isinstance(value, list):
        return [serving_schema(item) for item in value]
    if isinstance(value, dict):
        return {key: serving_schema(item) for key, item in value.items() if key not in {"minLength", "maxItems"}}
    return value


def build():
    winner = unseal(ROOT / "data/processed/stage4/exploratory/winner.json")
    protocol = unseal(ROOT / "data/processed/stage4/exploratory/protocol.json")
    plan = json.loads((ROOT / "scripts/ml/stage4_plan.json").read_text(encoding="utf-8"))
    selected = next(item for item in plan["experiments"] if item["id"] == winner["winner"])
    if selected["id"] != "structured" or selected["strategy"] != "combined":
        raise ValueError("This exporter only ports the locked combined structured recipe")
    categories, definitions = load_taxonomy(), load_definitions(DEFAULT_RAW)
    rooms = {}
    for room in ("bedroom", "bathroom", "hallway", "living_room"):
        rooms[room] = {"prompt": prompt_for(categories, definitions, room),
            "schema": serving_schema(inference_schema(categories, definitions, room, RISK_IDS, True)),
            "applicable": {item["risk_id"]: room in item["registry_rooms"] for item in definitions}}
    result = {"recipe_id": "structured-serving-v1", "reference_config_id": winner["config_id"],
        "reference_winner": selected["id"], "seed": plan["seed"], "temperature": plan["temperature"],
        "object_threshold": selected["object_threshold"], "max_output_tokens": 10000,
        "registry_sha256": sha256_file(ROOT / "src/lib/risk/riskRuleRegistry.ts"),
        "model_at_reference": protocol["config"]["model"], "rooms": rooms,
        "scope": "Serving port of recipe; not a rerun or a new accuracy measurement. Living-room variant was not evaluated."}
    return {**result, "content_sha256": digest(result)}


if __name__ == "__main__":
    destination = ROOT / "src/lib/vision/providers/structuredConfig.json"
    write_json(destination, build())
    print(str(destination))
