# Security Check Script

## Purpose

The `security_check.sh` script is a security tool that scans your codebase to detect and prevent accidentally committing sensitive credentials and API keys to version control.

## What It Checks

### 1. Credential Detection
Scans tracked files for:
- **MongoDB connection strings** with embedded credentials.
- **API keys and secrets** in various formats.
  - Variables ending in `_API_KEY`, `_SECRET`, `_PASSWORD`, `_TOKEN`, etc.

**Note:** The script respects `.gitignore` and only checks files that are tracked by git or staged for commit.

### 2. .gitignore Validation
Verifies that essential security entries are present and active in `.gitignore`:
- `.env`
- `.venv`
- `env/`
- `venv/`
- `ENV/`
- `env.bak/`
- `venv.bak/`

Warns if entries are missing or commented out.

## Prerequisites

Before running the script, ensure it has execute permissions:

```bash
chmod +x security_check.sh
```

## How to Run

### Manual Execution

```bash
# Basic check
./security_check.sh

# Verbose output (shows masked credentials)
./security_check.sh --verbose
# or
./security_check.sh -v
```

### Using Makefile

```bash
# Basic check
make security_check

# Verbose output
make security_check_verbose
```

## How It Works

1. **Pattern Matching**: Uses regex patterns to detect credential patterns in code
2. **File Filtering**: Only checks files tracked by git (respects `.gitignore`)
3. **Reporting**: Provides clear error messages if issues are found

## Example Output

### ✅ Success
```
🔒 Running security check for credentials and API keys...

✅ All security checks passed!
```

### ❌ Failure (Credentials Found)
```
🔒 Running security check for credentials and API keys...

❌ SECURITY ISSUE FOUND:
   File: ./backend/your_script.py
   Matches:
   Line 8 (API Key/Secret): # KEY="****"

🚨 SECURITY CHECK FAILED!
⚠️  Credentials or API keys detected in source files.
⚠️  Please remove credentials and use environment variables instead.
```

### ❌ Failure (.gitignore Issues)
```
🔒 Running security check for credentials and API keys...

❌ .gitignore security issues found:
   Missing entries:
     - .env
     - venv/
   Commented out entries (should be active):
     - env.bak/

🚨 SECURITY CHECK FAILED!
⚠️  .gitignore file is missing essential entries or has them commented out.
```

## Best Practices

1. **Use environment variables**: `process.env.MONGODB_URI` or `os.getenv('MONGODB_URI')`
2. **Store secrets in `.env` files**: Already in `.gitignore`
3. **Never commit credentials**: Even in comments or test files
4. **Keep `.gitignore` updated**: Ensure all environment-related entries are active

## Configuration

The script checks these essential `.gitignore` entries by default. To add more entries, edit the `essential_entries` array in `security_check.sh`:

```bash
local essential_entries=(
    ".env"
    ".venv"
    # Add your custom entries here
)
```

## Troubleshooting

**Q: Script is too strict, catching false positives?**
- The script only checks tracked files. Ensure sensitive files are in `.gitignore`
- Use `--verbose` to see exactly what's being flagged

**Q: Want to check before committing?**
- Run `./security_check.sh` manually before staging files
- Or use `make security_check` for convenience

## Files

- `security_check.sh` - Main security check script
- `makefile` - Contains `security_check` and `security_check_verbose` targets

## Next Steps

### Pre-commit Hook Integration (Not Yet Implemented)

To automatically run the security check before each commit, you can set up a git pre-commit hook:

1. Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
"$REPO_ROOT/security_check.sh"
exit $?
```

2. Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

Once configured, the security check will run automatically on `git commit` and block commits if issues are found.

**Note:** This feature is not currently implemented in the repository but can be added manually as shown above.

