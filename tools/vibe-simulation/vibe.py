from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from importlib import import_module
from importlib.metadata import PackageNotFoundError, version as pkg_version
from pathlib import Path
from typing import Any

import mph

try:
    import winreg
except ImportError:  # pragma: no cover
    winreg = None


WORKSPACE_ROOT = Path(__file__).resolve().parent
IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".vscode",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".venv",
    ".venv-comsol",
    "third_party",
    "logs",
    "runs",
    "outputs",
}


def print_section(title: str) -> None:
    print(f"\n[{title}]")


def read_registry_values(path: str) -> dict[str, str]:
    if winreg is None:
        return {}
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
    except OSError:
        return {}

    values: dict[str, str] = {}
    idx = 0
    while True:
        try:
            name, value, _ = winreg.EnumValue(key, idx)
            values[name] = str(value)
            idx += 1
        except OSError:
            break
    return values


def find_comsol_root(version: str = "6.3") -> Path | None:
    key = rf"SOFTWARE\COMSOL\COMSOL{version.replace('.', '')}"
    values = read_registry_values(key)
    root = values.get("COMSOLROOT")
    return Path(root) if root else None


def list_installed_comsol_versions() -> list[tuple[str, str]]:
    if winreg is None:
        return []
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\COMSOL")
    except OSError:
        return []

    values: list[tuple[str, str]] = []
    count = winreg.QueryInfoKey(key)[0]
    for i in range(count):
        try:
            sub_name = winreg.EnumKey(key, i)
        except OSError:
            continue
        sub_values = read_registry_values(rf"SOFTWARE\COMSOL\{sub_name}")
        values.append((sub_name, sub_values.get("COMSOLROOT", "(no COMSOLROOT)")))
    return values


def check_python() -> None:
    print_section("python")
    print(sys.version)
    print(f"executable: {sys.executable}")
    print(f"which python: {shutil.which('python')}")
    print(f"which git: {shutil.which('git')}")
    try:
        import ctypes  # noqa: F401
    except Exception as exc:  # pragma: no cover
        print(f"ctypes: BROKEN ({exc})")
    else:
        print("ctypes: OK")


def check_packages() -> None:
    print_section("python-packages")
    modules = {
        "MPh": "mph",
        "JPype1": "jpype",
        "numpy": "numpy",
    }
    for package, module in modules.items():
        try:
            pkg = pkg_version(package)
        except PackageNotFoundError:
            print(f"{package}: not installed")
            continue
        try:
            import_module(module)
        except Exception as exc:  # pragma: no cover
            print(f"{package}: {pkg} (import FAILED: {exc})")
        else:
            print(f"{package}: {pkg} (import OK)")


def discover_models(root: Path = WORKSPACE_ROOT) -> list[Path]:
    candidates: list[Path] = []
    for path in root.rglob("*.mph"):
        try:
            relative = path.relative_to(root)
        except ValueError:
            continue
        if any(part in IGNORED_DIRS for part in relative.parts):
            continue
        candidates.append(path.resolve())
    return sorted(candidates, key=lambda item: item.as_posix().lower())


def select_default_model(root: Path = WORKSPACE_ROOT) -> Path:
    models = discover_models(root)
    if not models:
        raise FileNotFoundError(
            "No .mph models found in the workspace. Put one in the workspace "
            "root or in a subfolder such as models/."
        )
    if len(models) == 1:
        return models[0]
    lines = "\n".join(f"- {path}" for path in models)
    raise RuntimeError(
        "More than one .mph model was found. Use --model to select one:\n"
        f"{lines}"
    )


def resolve_model(path_text: str | None, root: Path = WORKSPACE_ROOT) -> Path:
    if path_text:
        path = Path(path_text).expanduser()
        if not path.is_absolute():
            path = (root / path).resolve()
        else:
            path = path.resolve()
        if not path.exists():
            raise FileNotFoundError(f"Model does not exist: {path}")
        if path.suffix.lower() != ".mph":
            raise ValueError(f"Expected a .mph file: {path}")
        return path
    return select_default_model(root)


def solution_status(model) -> list[dict[str, Any]]:
    status: list[dict[str, Any]] = []
    for node in model / "solutions":
        try:
            empty = bool(node.java.isEmpty())
        except Exception:
            empty = True
        status.append({"name": node.name(), "computed": not empty})
    return status


def start_client(version: str):
    mph.option("session", "stand-alone")
    return mph.start(version=version)


def parse_assignments(items: list[str]) -> dict[str, str]:
    params: dict[str, str] = {}
    for item in items:
        if "=" not in item:
            raise ValueError(f'Invalid parameter assignment "{item}".')
        name, value = item.split("=", 1)
        name = name.strip()
        value = value.strip()
        if not name:
            raise ValueError(f'Invalid parameter assignment "{item}".')
        params[name] = value
    return params


def parse_inner(value: str | None) -> str | list[int] | None:
    if value is None:
        return None
    value = value.strip()
    if value in ("first", "last"):
        return value
    parts = [part.strip() for part in value.split(",") if part.strip()]
    if not parts:
        return None
    return [int(part) for part in parts]


def apply_parameters(model, params: dict[str, str]) -> None:
    for name, value in params.items():
        model.parameter(name, value)


def collect_tree(model, max_depth: int | None) -> str:
    root = model / None
    lines: list[str] = []

    def walk(node, prefix: str, is_last: bool, depth: int) -> None:
        if depth == 0:
            lines.append(node.name())
        else:
            branch = "`- " if is_last else "|- "
            lines.append(f"{prefix}{branch}{node.name()}")
        if max_depth is not None and depth >= max_depth:
            return
        children = node.children()
        next_prefix = prefix + ("   " if is_last else "|  ")
        for index, child in enumerate(children):
            walk(child, next_prefix if depth else "", index == len(children) - 1, depth + 1)

    walk(root, "", True, 0)
    return "\n".join(lines)


def to_jsonable(value: Any) -> Any:
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, complex):
        return {"real": value.real, "imag": value.imag}
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def summarize_value(value: Any) -> Any:
    if hasattr(value, "shape") and hasattr(value, "size"):
        size = int(value.size)
        if size == 1 and hasattr(value, "item"):
            return value.item()
        flat = value.reshape(-1)
        sample = flat[: min(5, size)].tolist()
        summary: dict[str, Any] = {
            "shape": list(value.shape),
            "size": size,
            "sample": sample,
        }
        try:
            summary["min"] = flat.min().item()
            summary["max"] = flat.max().item()
        except Exception:
            pass
        return summary
    if isinstance(value, list):
        return [summarize_value(item) for item in value]
    return value


def summarize_model(model, include_tree: bool, tree_depth: int | None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": model.name(),
        "file": str(model.file()),
        "comsol_version": model.version(),
        "modules": model.modules(),
        "parameters": model.parameters(),
        "descriptions": model.descriptions(),
        "components": model.components(),
        "geometries": model.geometries(),
        "physics": model.physics(),
        "materials": model.materials(),
        "meshes": model.meshes(),
        "studies": model.studies(),
        "solutions": model.solutions(),
        "solution_status": solution_status(model),
        "datasets": model.datasets(),
        "plots": model.plots(),
        "exports": model.exports(),
        "problems": model.problems(),
    }
    if include_tree:
        payload["tree"] = collect_tree(model, tree_depth)
    return payload


def print_inspect(payload: dict[str, Any]) -> None:
    print(f'Model: {payload["name"]}')
    print(f'File: {payload["file"]}')
    print(f'COMSOL Version: {payload["comsol_version"]}')
    print(f'Modules: {", ".join(payload["modules"]) or "(none reported)"}')

    print("\nParameters:")
    parameters = payload["parameters"]
    descriptions = payload["descriptions"]
    if parameters:
        for name, value in parameters.items():
            desc = descriptions.get(name, "")
            if desc:
                print(f"  {name} = {value}  # {desc}")
            else:
                print(f"  {name} = {value}")
    else:
        print("  (none)")

    sections = [
        ("Components", payload["components"]),
        ("Geometries", payload["geometries"]),
        ("Physics", payload["physics"]),
        ("Materials", payload["materials"]),
        ("Meshes", payload["meshes"]),
        ("Studies", payload["studies"]),
        ("Solutions", payload["solutions"]),
        ("Datasets", payload["datasets"]),
        ("Plots", payload["plots"]),
        ("Exports", payload["exports"]),
    ]
    for title, items in sections:
        print(f"\n{title}:")
        if items:
            for item in items:
                print(f"  - {item}")
        else:
            print("  (none)")

    print("\nStored Solution State:")
    if payload["solution_status"]:
        for item in payload["solution_status"]:
            state = "computed" if item["computed"] else "empty"
            print(f'  - {item["name"]}: {state}')
    else:
        print("  (none)")

    print("\nProblems:")
    problems = payload["problems"]
    if problems:
        for problem in problems:
            category = problem["category"] or "note"
            print(
                f'  - [{category}] {problem["node"]}: '
                f'{problem["message"]}'
            )
    else:
        print("  (none)")

    if "tree" in payload:
        print("\nTree:")
        print(payload["tree"])


def print_review(payload: dict[str, Any]) -> None:
    print(f'Model: {payload["name"]}')
    print(f'File: {payload["file"]}')
    print(f'Studies: {", ".join(payload["studies"]) or "(none)"}')
    print(f'Datasets: {", ".join(payload["datasets"]) or "(none)"}')
    print(f'Exports: {", ".join(payload["exports"]) or "(none)"}')

    computed = [item["name"] for item in payload["solution_status"] if item["computed"]]
    empty = [item["name"] for item in payload["solution_status"] if not item["computed"]]
    print(f'Solutions with stored data: {", ".join(computed) or "(none)"}')
    if empty:
        print(f'Solutions without stored data: {", ".join(empty)}')

    problems = payload["problems"]
    if problems:
        print("\nProblems:")
        for problem in problems:
            category = problem["category"] or "note"
            print(
                f'  - [{category}] {problem["node"]}: '
                f'{problem["message"]}'
            )
    else:
        print("\nProblems: none")

    print("\nSuggested next steps:")
    if computed:
        print("  - You can evaluate expressions immediately with `vibe.py eval`.")
    else:
        print("  - Solve a study first with `vibe.py solve --study <name>`.")
    print("  - Use `vibe.py inspect --tree` if you need a deeper structure view.")
    print("  - Use `vibe.py batch` if you want COMSOL batch logs for debugging.")


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(to_jsonable(payload), ensure_ascii=False, indent=2))


def command_doctor(args: argparse.Namespace) -> int:
    check_python()
    check_packages()

    print_section("installed-comsol-versions")
    versions = list_installed_comsol_versions()
    if versions:
        for name, root in versions:
            print(f"{name}: {root}")
    else:
        print("none found")

    print_section("comsol")
    root = find_comsol_root(args.version)
    print(f"requested version: {args.version}")
    print(f"registry root: {root}")
    if root and root.exists():
        bin_dir = root / "bin" / "win64"
        print(f"bin dir: {bin_dir}")
        print(f"bin exists: {bin_dir.exists()}")
        for name in ("comsol.exe", "comsolbatch.exe", "comsolmphserver.exe"):
            exe = bin_dir / name
            print(f"{name}: {'OK' if exe.exists() else 'missing'} -> {exe}")
    else:
        print("status: NOT FOUND")

    print_section("workspace-models")
    models = discover_models(WORKSPACE_ROOT)
    if models:
        for model in models:
            print(model)
        if len(models) == 1:
            print(f"default model: {models[0]}")
    else:
        print("no models found")
    return 0


def command_models(args: argparse.Namespace) -> int:
    models = discover_models(WORKSPACE_ROOT)
    if args.json:
        print_json({"models": models, "count": len(models)})
        return 0
    if not models:
        print("No .mph models found in the workspace.")
        return 0
    print("Discovered models:")
    for model in models:
        print(f"  - {model}")
    if len(models) == 1:
        print(f"\nDefault model: {models[0]}")
    return 0


def command_inspect(args: argparse.Namespace) -> int:
    client = start_client(args.version)
    model = client.load(resolve_model(args.model))
    payload = summarize_model(model, include_tree=args.tree, tree_depth=args.tree_depth)
    if args.json:
        print_json(payload)
    else:
        print_inspect(payload)
    return 0


def command_review(args: argparse.Namespace) -> int:
    client = start_client(args.version)
    model = client.load(resolve_model(args.model))
    payload = summarize_model(model, include_tree=False, tree_depth=None)
    if args.json:
        print_json(payload)
    else:
        print_review(payload)
    return 0


def command_solve(args: argparse.Namespace) -> int:
    client = start_client(args.version)
    model = client.load(resolve_model(args.model))
    params = parse_assignments(args.params)
    apply_parameters(model, params)
    model.solve(args.study)

    saved_to = None
    if args.save_as:
        saved_to = str((WORKSPACE_ROOT / args.save_as).resolve())
        model.save(saved_to)
    elif args.save:
        model.save()
        saved_to = str(model.file())

    payload = {
        "action": "solve",
        "file": str(model.file()),
        "study": args.study or "(all studies)",
        "parameters_changed": params,
        "saved_to": saved_to,
        "problems": model.problems(),
    }
    if args.json:
        print_json(payload)
    else:
        print(f'Solved: {payload["study"]}')
        print(f'File: {payload["file"]}')
        if params:
            print("Changed parameters:")
            for name, value in params.items():
                print(f"  {name} = {value}")
        if saved_to:
            print(f"Saved to: {saved_to}")
        if payload["problems"]:
            print("Problems:")
            for problem in payload["problems"]:
                category = problem["category"] or "note"
                print(
                    f'  [{category}] {problem["node"]}: '
                    f'{problem["message"]}'
                )
        else:
            print("Problems: none")
    return 0


def command_eval(args: argparse.Namespace) -> int:
    client = start_client(args.version)
    model = client.load(resolve_model(args.model))
    params = parse_assignments(args.params)
    apply_parameters(model, params)
    if args.study:
        model.solve(args.study)
    try:
        result = model.evaluate(
            args.expression,
            args.unit,
            args.dataset,
            parse_inner(args.inner),
            args.outer,
        )
    except RuntimeError as exc:
        if "not been computed" in str(exc) and not args.study:
            raise RuntimeError(
                f'{exc} Try adding --study <study-name> to solve before evaluation.'
            ) from exc
        raise
    payload = {
        "action": "eval",
        "file": str(model.file()),
        "expression": args.expression,
        "unit": args.unit,
        "dataset": args.dataset,
        "inner": parse_inner(args.inner),
        "outer": args.outer,
        "study_solved": args.study,
        "parameters_changed": params,
        "result": result,
    }
    if args.json:
        print_json(payload)
    else:
        print(f'Expression: {args.expression}')
        if args.dataset:
            print(f'Dataset: {args.dataset}')
        if args.unit:
            print(f'Unit: {args.unit}')
        print(f"Result: {to_jsonable(summarize_value(result))}")
    return 0


def command_export(args: argparse.Namespace) -> int:
    client = start_client(args.version)
    model = client.load(resolve_model(args.model))
    if args.node:
        model.export(args.node, args.file)
        exports_run = [args.node]
    else:
        if args.file:
            raise ValueError("--file requires --node.")
        model.export()
        exports_run = model.exports()
    payload = {
        "action": "export",
        "file": str(model.file()),
        "exports_run": exports_run,
        "output_override": args.file,
    }
    if args.json:
        print_json(payload)
    else:
        print(f'Exported from: {payload["file"]}')
        print(f'Nodes: {", ".join(exports_run)}')
        if args.file:
            print(f'Output override: {args.file}')
    return 0


def build_batch_command(
    exe: Path,
    model: Path,
    output: Path,
    log: Path,
    study: str | None,
    np_value: str,
    keep_licenses: bool,
    continue_run: bool,
) -> list[str]:
    command = [
        str(exe),
        "-inputfile",
        str(model),
        "-outputfile",
        str(output),
        "-batchlog",
        str(log),
        "-batchlogout",
        "-np",
        np_value,
        "-error",
        "on",
    ]
    if study:
        command.extend(["-study", study])
    if keep_licenses:
        command.extend(["-keeplicenses", "on"])
    if continue_run:
        command.append("-continue")
    return command


def command_batch(args: argparse.Namespace) -> int:
    model = resolve_model(args.model)
    output = (WORKSPACE_ROOT / args.output).resolve() if args.output else model.with_suffix(".out.mph")
    if args.log:
        log = (WORKSPACE_ROOT / args.log).resolve()
    else:
        log_dir = WORKSPACE_ROOT / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        log = log_dir / f"{stamp}-{model.stem}.log"

    root = find_comsol_root(args.version)
    if not root:
        raise RuntimeError(f"Could not find COMSOL {args.version} in the Windows registry.")
    exe = root / "bin" / "win64" / "comsolbatch.exe"
    if not exe.exists():
        raise RuntimeError(f"Could not find comsolbatch.exe: {exe}")

    command = build_batch_command(
        exe=exe,
        model=model,
        output=output,
        log=log,
        study=args.study,
        np_value=str(args.np),
        keep_licenses=args.keep_licenses,
        continue_run=args.continue_run,
    )
    completed = subprocess.run(command)
    payload = {
        "action": "batch",
        "command": command,
        "exit_code": completed.returncode,
        "model": str(model),
        "study": args.study,
        "log": str(log),
        "output": str(output),
    }
    if args.json:
        print_json(payload)
    else:
        print("Running COMSOL batch:")
        print(" ".join(f'"{part}"' if " " in part else part for part in command))
        print(f"\nExit code: {completed.returncode}")
        print(f"Log file: {log}")
        print(f"Output file: {output}")
    return completed.returncode


def add_model_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--model",
        help="Path to the .mph model. If omitted, Vibe Simulation auto-detects a single workspace model.",
    )


def add_version_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--version",
        default="6.3",
        help="COMSOL version to use, default: 6.3",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Vibe Simulation: COMSOL workflows for local .mph models."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    doctor_parser = subparsers.add_parser("doctor", help="Check the local Python and COMSOL setup.")
    add_version_argument(doctor_parser)

    models_parser = subparsers.add_parser("models", help="List discoverable .mph models in the workspace.")
    models_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    inspect_parser = subparsers.add_parser("inspect", help="Inspect a model and print its structure.")
    add_model_argument(inspect_parser)
    add_version_argument(inspect_parser)
    inspect_parser.add_argument("--tree", action="store_true", help="Include a text dump of the model tree.")
    inspect_parser.add_argument("--tree-depth", type=int, help="Optional max depth for --tree output.")
    inspect_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    review_parser = subparsers.add_parser("review", help="Summarize the model state and suggest next steps.")
    add_model_argument(review_parser)
    add_version_argument(review_parser)
    review_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    solve_parser = subparsers.add_parser("solve", help="Optionally change parameters, then solve one or all studies.")
    add_model_argument(solve_parser)
    add_version_argument(solve_parser)
    solve_parser.add_argument("--study", help="Study name to solve. If omitted, solve all studies.")
    solve_parser.add_argument("--set", dest="params", action="append", default=[], metavar="NAME=VALUE", help="Set a parameter before solving.")
    solve_parser.add_argument("--save", action="store_true", help="Save the model in place after solving.")
    solve_parser.add_argument("--save-as", help="Save the solved model to a new relative or absolute path.")
    solve_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    eval_parser = subparsers.add_parser("eval", help="Evaluate an expression on the current model results.")
    add_model_argument(eval_parser)
    add_version_argument(eval_parser)
    eval_parser.add_argument("expression", help="Expression to evaluate, for example es.normE")
    eval_parser.add_argument("--unit", help="Optional unit, for example pF")
    eval_parser.add_argument("--dataset", help="Dataset name to evaluate on")
    eval_parser.add_argument("--inner", help='Inner solution selector: "first", "last", or "1,2,3"')
    eval_parser.add_argument("--outer", type=int, help="Outer solution index")
    eval_parser.add_argument("--study", help="Optional study to solve before evaluation")
    eval_parser.add_argument("--set", dest="params", action="append", default=[], metavar="NAME=VALUE", help="Set a parameter before evaluation.")
    eval_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    export_parser = subparsers.add_parser("export", help="Run one export node or all export nodes.")
    add_model_argument(export_parser)
    add_version_argument(export_parser)
    export_parser.add_argument("--node", help="Export node name. If omitted, run all export nodes.")
    export_parser.add_argument("--file", help="Optional override output path for a single export node.")
    export_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    batch_parser = subparsers.add_parser("batch", help="Run COMSOL batch mode and capture a readable log.")
    add_model_argument(batch_parser)
    add_version_argument(batch_parser)
    batch_parser.add_argument("--study", help="Optional study tag to run, for example std1")
    batch_parser.add_argument("--output", help="Optional output .mph path. Defaults to <model>.out.mph")
    batch_parser.add_argument("--log", help="Optional batch log path. Defaults to logs/<timestamp>-<model>.log")
    batch_parser.add_argument("--np", default="auto", help="Number of cores for COMSOL, default: auto")
    batch_parser.add_argument("--keep-licenses", action="store_true", help="Pass -keeplicenses on to COMSOL")
    batch_parser.add_argument("--continue-run", action="store_true", help="Pass -continue to COMSOL")
    batch_parser.add_argument("--json", action="store_true", help="Print JSON output.")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "doctor":
        return command_doctor(args)
    if args.command == "models":
        return command_models(args)
    if args.command == "inspect":
        return command_inspect(args)
    if args.command == "review":
        return command_review(args)
    if args.command == "solve":
        return command_solve(args)
    if args.command == "eval":
        return command_eval(args)
    if args.command == "export":
        return command_export(args)
    if args.command == "batch":
        return command_batch(args)
    raise RuntimeError(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
