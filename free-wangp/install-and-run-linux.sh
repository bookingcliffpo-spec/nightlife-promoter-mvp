#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================================="
echo "CLIFF FREE CINEMATIC STUDIO - POWERED BY WANGP"
echo "No API credits. Generation runs on this computer."
echo "=========================================================="

echo "[1/4] Loading the official WanGP components..."
git submodule update --init --recursive

echo "[2/4] Installing the Cliff Studio plugin..."
mkdir -p "$ROOT/WanGP/plugins/wan2gp-cliff-studio"
cp -R "$ROOT/free-wangp/wan2gp-cliff-studio/." "$ROOT/WanGP/plugins/wan2gp-cliff-studio/"

cd "$ROOT/WanGP"

if [ ! -f "envs.json" ]; then
  echo "[3/4] WanGP is not installed yet. Starting the official installer..."
  chmod +x scripts/install.sh scripts/run.sh
  bash scripts/install.sh
else
  echo "[3/4] Existing WanGP installation found."
fi

echo "Enabling Cliff Studio plugin..."
python3 - <<'PY'
import json
from pathlib import Path
p = Path("wgp_config.json")
data = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
enabled = data.setdefault("enabled_plugins", [])
if "wan2gp-cliff-studio" not in enabled:
    enabled.append("wan2gp-cliff-studio")
p.write_text(json.dumps(data, indent=2), encoding="utf-8")
PY

cat > scripts/args.txt <<'EOF'
--listen
--server-port 7860
--no-auth
--open-browser
EOF

echo "[4/4] Starting the full WanGP interface with Cliff Studio..."
bash scripts/run.sh
