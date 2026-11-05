#!/usr/bin/env bash
# Génère FERNET_KEY et SECRET_KEY pour .env (stdlib Python uniquement)
set -euo pipefail

echo "# Coller dans .env :"
python3 - <<'PY'
import base64
import os
import secrets

# Clé Fernet = 32 octets aléatoires, encodés en URL-safe base64
fernet_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
print(f"FERNET_KEY={fernet_key}")
print(f"SECRET_KEY={secrets.token_hex(32)}")
PY
