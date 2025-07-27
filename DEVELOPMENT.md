# Development Guide - Timeline Writer

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Obsidian 1.4.16+

### Setup

```bash
# Install dependencies
npm install

# Start development with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Development Commands

| Command                 | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Start development build with watch mode |
| `npm run build`         | Build for production                    |
| `npm test`              | Run test suite                          |
| `npm run test:watch`    | Run tests in watch mode                 |
| `npm run test:coverage` | Run tests with coverage report          |
| `npm run lint`          | Run ESLint                              |
| `npm run lint:fix`      | Fix ESLint issues automatically         |
| `npm run type-check`    | Check TypeScript types                  |
| `npm run clean`         | Clean build artifacts                   |

## Development Workflow

### 0. Pre-Development: Read Specifications

**CRITICAL**: Before writing any code, always read the relevant specifications:

1. Check current development phase in `specs/phases/index.md`
2. Read the specific phase documentation in `specs/phases/fase-X-*.md`
3. Review architecture specs in `specs/architecture/` if implementing core systems
4. Check component specs in `specs/components/` if working on UI components
5. Understand the current phase objectives and deliverables

### 1. Setup Development Environment

1. Clone the repository
2. Install dependencies with `npm install`
3. Start development server with `npm run dev`
4. Open Obsidian and enable the plugin in settings

### 2. Code Structure

```
src/
├── main.ts                    # Plugin entry point
├── core/                      # Business logic
│   ├── context-detection/     # Context detection algorithms
│   ├── version-manager/       # Version management system
│   ├── timeline-engine/       # Timeline navigation
│   └── metadata-engine/       # Metadata processing
├── ui/                        # User interface components
│   ├── timeline-view/         # Timeline visualization
│   ├── comparison-view/       # Version comparison
│   ├── settings-panel/        # Plugin settings
│   └── components/            # Shared components
├── data/                      # Data layer
│   ├── models/                # TypeScript interfaces
│   ├── storage/               # Storage engines
│   └── migrations/            # Data migrations
├── utils/                     # Utility functions
└── __tests__/                 # Test files
```

### 3. Development Phases

Currently in **Phase 1: Setup and Foundation**

#### Completed:

- ✅ Project structure and configuration
- ✅ TypeScript setup with strict rules
- ✅ Build system with esbuild
- ✅ Testing framework with Jest
- ✅ Basic plugin structure
- ✅ Settings system
- ✅ Logging utilities

#### Next Phase: Data Layer

- Implement storage engine
- Create data models
- Setup compression system
- Build migration framework

### 4. Testing Strategy

#### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Test Structure

- Each component should have corresponding `.test.ts` file
- Use Jest with React Testing Library for UI components
- Mock Obsidian API in tests
- Aim for >80% test coverage

#### Example Test

```typescript
import { Logger } from '../utils/logger';

describe('Logger', () => {
  it('should log messages at correct level', () => {
    const logger = Logger.getInstance();
    const consoleSpy = jest.spyOn(console, 'log');

    logger.info('Test message');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message')
    );
  });
});
```

### 5. Code Style Guidelines

#### Specification-Driven Development

- **Always read specs first**: Before implementing any feature, read the relevant specification documents
- **Follow phase objectives**: Ensure your implementation aligns with the current development phase goals
- **Reference architecture docs**: Use `specs/architecture/` as the source of truth for system design
- **Check component specs**: UI components must follow the specifications in `specs/components/`
- **Update specs if needed**: If you discover gaps in specifications, update them before proceeding

#### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use type guards for runtime type checking
- Prefer `const` assertions where appropriate

#### React Components

```typescript
interface ComponentProps {
  data: TimelineNode[];
  onSelect: (id: string) => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onSelect }) => {
  // Component implementation
};
```

#### Error Handling

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  // Handle gracefully
}
```

### 6. Performance Guidelines

#### Memory Management

- Use React.memo for expensive components
- Implement cleanup in useEffect hooks
- Cache expensive calculations with useMemo
- Dispose of event listeners properly

#### Bundle Size

- Import only what you need from libraries
- Use dynamic imports for large dependencies
- Optimize assets and remove unused code

### 7. Debugging

#### Development Mode

- Enable debug mode in plugin settings
- Use browser developer tools
- Check Obsidian's developer console
- Use React Developer Tools extension

#### Logging

```typescript
import { logger } from '@/utils/logger';

logger.debug('Debug information', { data });
logger.info('Operation completed');
logger.warn('Warning message');
logger.error('Error occurred', { error });
```

### 8. Building and Deployment

#### Local Testing

1. Build plugin with `npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` to vault's `.obsidian/plugins/timeline-writer/`
3. Reload Obsidian or restart plugin

#### Production Build

```bash
npm run build
```

Creates optimized bundle in `main.js`

## Common Issues and Solutions

### TypeScript Errors

- Check `tsconfig.json` paths configuration
- Ensure all types are properly imported
- Use `npm run type-check` to verify

### Build Failures

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for syntax errors in source files
- Verify all dependencies are installed

### Test Failures

- Check test setup in `src/__tests__/setup.ts`
- Ensure mocks are properly configured
- Verify test environment matches development

### Performance Issues

- Use React Profiler to identify bottlenecks
- Check memory usage in browser dev tools
- Optimize expensive operations with caching

## Contributing

1. **Read specifications first**: Always consult relevant spec documents before starting work
2. Follow existing code style and patterns
3. Write tests for new functionality
4. Update documentation as needed
5. Run linting and type checking before committing
6. Keep commits focused and descriptive

## Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [ESBuild Documentation](https://esbuild.github.io/)
