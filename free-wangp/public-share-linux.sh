#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/WanGP"
if [ ! -f "envs.json" ]; then
  echo "Run ./free-wangp/install-and-run-linux.sh first."
  exit 1
fi
echo "WARNING: anyone with the temporary share link can use your GPU."
cat > scripts/args.txt <<'EOF'
--share
--no-auth
--lock-config
EOF
bash scripts/run.sh
