# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Timeline Writer** project - an Obsidian plugin for temporal versioning designed for fiction writers. The plugin implements a three-layer system: narrative checkpoints, automatic snapshots, and contextual metadata with intelligent temporal change detection.

## Architecture

### Core Components
- **Context Detection Engine**: Analyzes semantic shifts, keywords, temporal patterns, and behavioral patterns to automatically detect when writers switch narrative contexts
- **Hybrid Version Manager**: Combines checkpoints (full content) with compressed diffs for efficient storage
- **Timeline Engine**: Manages branching timelines and temporal navigation
- **Storage Engine**: SQLite-based persistence with compressed snapshots

### Technology Stack
- TypeScript with strict typing
- React for UI components
- Obsidian API v1.4.16
- SQLite (sql.js) for metadata indexing
- vis-timeline for timeline visualization
- Natural language processing libraries (natural.js, ml-matrix)
- Compression (pako) and diffing (diff-match-patch)

### Directory Structure
```
src/
├── core/                   # Business logic
│   ├── context-detection/  # Context change detection
│   ├── version-manager/    # Version control system
│   ├── timeline-engine/    # Timeline management
│   └── metadata-engine/    # Dynamic metadata system
├── ui/                     # React components
├── data/                   # Data models and storage
├── utils/                  # Utilities and helpers
└── tests/                  # Test suite
```

## Development Guidelines

### Code Patterns
- Use TypeScript interfaces for all data models
- Implement React components with strict prop typing
- Follow separation of concerns between UI and business logic
- Use custom hooks for reusable logic
- Implement proper error boundaries and graceful error handling

### Key Algorithms
- **Semantic Analysis**: TF-IDF vectorization with cosine similarity for context detection
- **Context Detection**: Multi-signal fusion (semantic, keyword, temporal, behavioral) with weighted confidence scoring
- **Version Storage**: Hybrid approach using full snapshots for checkpoints and compressed diffs for automatic saves
- **Timeline Navigation**: Branching timeline support with node-based navigation

### Performance Requirements
- Context detection: < 100ms for 10,000-word documents
- Storage operations: < 50ms for average snapshots
- Startup time: < 500ms for vaults with 10,000 files
- Storage efficiency: < 20% overhead vs original files

### Integration Points
- Obsidian Vault API for file operations
- Obsidian Workspace API for UI integration
- Plugin settings system for user configuration
- Compatible with Obsidian Sync

## Technical Specifications

### Data Models
Key interfaces include `TimelineNode`, `VersionSnapshot`, `ContextDefinition`, and `ContextShiftDetection`. All models use strict TypeScript typing with comprehensive metadata support.

### Context Detection
The system uses multiple signals to detect narrative context changes:
- Semantic shifts via TF-IDF analysis
- Keyword pattern matching
- Temporal editing patterns
- User behavioral analysis

### Storage Architecture
Hybrid storage combining:
- Visible markdown files in filesystem
- SQLite database for metadata and indices
- Compressed snapshot files for version history

This plugin is designed to be invisible to writers while providing powerful temporal versioning capabilities for complex fiction projects with multiple narrative threads, character arcs, and timeline branches.

## Development Status Tracking

**IMPORTANT**: Always maintain and update the current development status in `STATUS.md` file. This file serves as the single source of truth for development progress and should be updated whenever work is completed or phases change.

### Required Status Information
- Current phase and week number
- Completed tasks from current phase
- Next immediate tasks
- Blockers or issues encountered
- Last updated timestamp

### Status File Location
Check and update `STATUS.md` in the project root. If it doesn't exist, create it with the current development state.

### Development Phase Reference
Refer to `specs/phases/index.md` for complete phase breakdown and `specs/index.md` for overall project timeline. Each phase has detailed specifications in `specs/phases/fase-N-*.md`.