#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================================="
echo "CLIFF FREE AI STUDIO - POWERED BY WANGP"
echo "No API credits. Generation runs on this computer."
echo "=========================================================="

git submodule update --init --recursive
cd "$ROOT/WanGP"

if [ ! -f "envs.json" ]; then
  echo "WanGP is not installed yet. Starting the official installer..."
  chmod +x scripts/install.sh scripts/run.sh
  bash scripts/install.sh
fi

cat > scripts/args.txt <<'EOF'
--listen
--server-port 7860
--no-auth
--open-browser
EOF

echo "Starting the full WanGP interface..."
bash scripts/run.sh
