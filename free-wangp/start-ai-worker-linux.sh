#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=========================================================="
echo "CLIFF AI VIDEO - LOCAL GPU WORKER"
echo "This connects the public website to your WanGP computer."
echo "=========================================================="

cd "$ROOT"
git submodule update --init --recursive

cd "$ROOT/WanGP"
if [ ! -f "envs.json" ]; then
  echo "WanGP is not installed yet. Starting the official installer..."
  chmod +x scripts/install.sh
  bash scripts/install.sh
fi

ENV_INFO="$(python setup.py get_env_info 2>/dev/null || true)"
ENV_TYPE="$(printf "%s" "$ENV_INFO" | awk -F'|' '/ENV_INFO/{print $2; exit}')"
ENV_PATH="$(printf "%s" "$ENV_INFO" | awk -F'|' '/ENV_INFO/{print $3; exit}')"

if [ "$ENV_TYPE" = "venv" ] || [ "$ENV_TYPE" = "uv" ]; then
  source "$ENV_PATH/bin/activate"
elif [ "$ENV_TYPE" = "conda" ]; then
  source "$(conda info --base)/etc/profile.d/conda.sh"
  conda activate "$ENV_PATH"
fi

echo
echo "Worker is ON."
echo "Keep this terminal open while you generate from your phone or computer."
echo

python "$ROOT/free-wangp/cloud_worker.py" --root "$ROOT/WanGP"
