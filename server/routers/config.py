"""
Config Router
=============

API endpoints for browsing and editing Claude configuration files
(.claude directory: commands, skills, agents, templates, and guidance files).
"""

import logging
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/config", tags=["config"])

# Root directory of the application (where .claude folder is located)
ROOT_DIR = Path(__file__).parent.parent.parent


# ============================================================================
# Schemas
# ============================================================================


class ConfigFile(BaseModel):
    """A configuration file entry."""
    name: str
    path: str  # Relative path from project root
    description: str
    category: str


class ClaudeConfig(BaseModel):
    """Response containing all Claude configuration files organized by category."""
    guidance: list[ConfigFile]
    commands: list[ConfigFile]
    skills: list[ConfigFile]
    agents: list[ConfigFile]
    templates: list[ConfigFile]


class ConfigFileContent(BaseModel):
    """Response containing a config file's content."""
    name: str
    path: str
    content: str
    category: str


class ConfigFileUpdate(BaseModel):
    """Request schema for updating a config file."""
    content: str


# ============================================================================
# Helper Functions
# ============================================================================


def extract_description_from_markdown(content: str) -> str:
    """
    Extract a description from a markdown file.

    Looks for:
    1. First heading
    2. First paragraph after heading
    3. First line if no heading
    """
    lines = content.strip().split('\n')
    description = ""

    for i, line in enumerate(lines):
        stripped = line.strip()
        # Skip empty lines at the start
        if not stripped:
            continue
        # If it's a heading, try to get the next non-empty line
        if stripped.startswith('#'):
            # Look for next non-empty, non-heading line
            for j in range(i + 1, min(i + 5, len(lines))):
                next_line = lines[j].strip()
                if next_line and not next_line.startswith('#'):
                    description = next_line
                    break
            if not description:
                # Use the heading text
                description = stripped.lstrip('#').strip()
            break
        else:
            # First non-heading, non-empty line
            description = stripped
            break

    # Truncate if too long
    if len(description) > 100:
        description = description[:97] + "..."

    return description or "No description available"


def get_config_files_in_directory(
    dir_path: Path,
    category: str,
    extensions: tuple[str, ...] = ('.md', '.txt')
) -> list[ConfigFile]:
    """Get all config files in a directory."""
    files = []

    if not dir_path.exists():
        return files

    for file_path in sorted(dir_path.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() in extensions:
            try:
                content = file_path.read_text(encoding='utf-8')
                description = extract_description_from_markdown(content)
            except Exception:
                description = "Unable to read file"

            # Use relative path from ROOT_DIR
            relative_path = file_path.relative_to(ROOT_DIR).as_posix()

            files.append(ConfigFile(
                name=file_path.name,
                path=relative_path,
                description=description,
                category=category,
            ))

    return files


def get_skill_files(skills_dir: Path) -> list[ConfigFile]:
    """Get skill files from subdirectories."""
    files = []

    if not skills_dir.exists():
        return files

    for skill_dir in sorted(skills_dir.iterdir()):
        if skill_dir.is_dir():
            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                try:
                    content = skill_file.read_text(encoding='utf-8')
                    description = extract_description_from_markdown(content)
                except Exception:
                    description = "Unable to read skill file"

                relative_path = skill_file.relative_to(ROOT_DIR).as_posix()

                files.append(ConfigFile(
                    name=f"{skill_dir.name}/SKILL.md",
                    path=relative_path,
                    description=description,
                    category="skills",
                ))

    return files


# ============================================================================
# Endpoints
# ============================================================================


@router.get("", response_model=ClaudeConfig)
async def get_claude_config():
    """
    Get all Claude configuration files organized by category.

    Categories:
    - guidance: CLAUDE.md and other root guidance files
    - commands: .claude/commands/*.md
    - skills: .claude/skills/*/SKILL.md
    - agents: .claude/agents/*.md
    - templates: .claude/templates/*.md, *.txt
    """
    claude_dir = ROOT_DIR / ".claude"

    # Guidance files (root level markdown files like CLAUDE.md)
    guidance_files = []
    claude_md = ROOT_DIR / "CLAUDE.md"
    if claude_md.exists():
        try:
            content = claude_md.read_text(encoding='utf-8')
            description = extract_description_from_markdown(content)
        except Exception:
            description = "Project guidance for Claude"

        guidance_files.append(ConfigFile(
            name="CLAUDE.md",
            path="CLAUDE.md",
            description=description,
            category="guidance",
        ))

    # Commands
    commands_files = get_config_files_in_directory(
        claude_dir / "commands",
        "commands"
    )

    # Skills (nested structure)
    skills_files = get_skill_files(claude_dir / "skills")

    # Agents
    agents_files = get_config_files_in_directory(
        claude_dir / "agents",
        "agents"
    )

    # Templates
    templates_files = get_config_files_in_directory(
        claude_dir / "templates",
        "templates",
        extensions=('.md', '.txt')
    )

    return ClaudeConfig(
        guidance=guidance_files,
        commands=commands_files,
        skills=skills_files,
        agents=agents_files,
        templates=templates_files,
    )


@router.get("/file", response_model=ConfigFileContent)
async def get_config_file(category: str, filename: str):
    """
    Get the content of a specific config file.

    Args:
        category: One of: guidance, commands, skills, agents, templates
        filename: The filename (for skills, use format: skill-name/SKILL.md)
    """
    # Validate category
    valid_categories = {"guidance", "commands", "skills", "agents", "templates"}
    if category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )

    # Determine file path based on category
    if category == "guidance":
        file_path = ROOT_DIR / filename
    elif category == "skills":
        # Skills have nested structure
        file_path = ROOT_DIR / ".claude" / "skills" / filename
    else:
        file_path = ROOT_DIR / ".claude" / category / filename

    # Security: Ensure path is within expected directories
    try:
        resolved = file_path.resolve()
        # Check it's within ROOT_DIR
        resolved.relative_to(ROOT_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=403,
            detail="Access denied: path traversal detected"
        )

    # Check file exists
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Config file not found: {filename}"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"Not a file: {filename}"
        )

    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        logger.error(f"Failed to read config file {file_path}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read file: {e}"
        )

    relative_path = file_path.relative_to(ROOT_DIR).as_posix()

    return ConfigFileContent(
        name=filename,
        path=relative_path,
        content=content,
        category=category,
    )


@router.put("/file")
async def update_config_file(category: str, filename: str, update: ConfigFileUpdate):
    """
    Update the content of a specific config file.

    Args:
        category: One of: guidance, commands, skills, agents, templates
        filename: The filename (for skills, use format: skill-name/SKILL.md)
        update: The new file content
    """
    # Validate category
    valid_categories = {"guidance", "commands", "skills", "agents", "templates"}
    if category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )

    # Determine file path based on category
    if category == "guidance":
        file_path = ROOT_DIR / filename
    elif category == "skills":
        file_path = ROOT_DIR / ".claude" / "skills" / filename
    else:
        file_path = ROOT_DIR / ".claude" / category / filename

    # Security: Ensure path is within expected directories
    try:
        resolved = file_path.resolve()
        resolved.relative_to(ROOT_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=403,
            detail="Access denied: path traversal detected"
        )

    # Check file exists (we don't create new files via this endpoint)
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Config file not found: {filename}"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"Not a file: {filename}"
        )

    # Check write permission
    if not os.access(file_path, os.W_OK):
        raise HTTPException(
            status_code=403,
            detail="No write permission for this file"
        )

    try:
        file_path.write_text(update.content, encoding='utf-8')
        logger.info(f"Updated config file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to write config file {file_path}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write file: {e}"
        )

    return {
        "success": True,
        "message": f"Updated {filename}",
        "path": file_path.relative_to(ROOT_DIR).as_posix(),
    }
