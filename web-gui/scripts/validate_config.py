#!/usr/bin/env python3
"""
Validate Pi configuration file
"""
import sys
import json
import argparse
import os

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from config_loader import validate_pi_config
    from utils import load_config
except ImportError:
    from .config_loader import validate_pi_config
    from .utils import load_config


def main():
    parser = argparse.ArgumentParser(description="Validate Pi configuration")
    parser.add_argument(
        "--config",
        type=str,
        help="Path to configuration file (default: pi-config.json in project root)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed validation information",
    )

    args = parser.parse_args()

    try:
        if args.config:
            # Override default config path
            config = load_config(args.config)
        else:
            config = load_config()

        is_valid, errors = validate_pi_config(config)

        if is_valid:
            if args.verbose:
                pi_count = len(config.get("raspberry_pis", {}))
                print(json.dumps({
                    "success": True,
                    "valid": True,
                    "pi_count": pi_count,
                    "message": f"Configuration is valid ({pi_count} Pi(s) configured)",
                }, indent=2))
            else:
                print(json.dumps({"success": True, "valid": True}))
            sys.exit(0)
        else:
            if args.verbose:
                print(json.dumps({
                    "success": False,
                    "valid": False,
                    "errors": errors,
                    "error_count": len(errors),
                }, indent=2))
            else:
                print(json.dumps({
                    "success": False,
                    "valid": False,
                    "errors": errors,
                }))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "valid": False,
            "error": str(e),
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
