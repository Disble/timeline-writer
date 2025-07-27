# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions to replicate and extend the validations performed by Husky pre-commit hooks. The CI/CD pipeline ensures code quality and consistency across all contributions while following best practices for speed and parallelization.

## Workflows

### 1. PR Validation (Husky Equivalent)

**File**: `.github/workflows/pr-validation.yml`

This workflow exactly replicates the Husky pre-commit hook validations with optimized parallel execution:

#### Triggers

- Pull requests to `main` or `develop` branches

#### Optimizations

- **Parallel Matrix Strategy**: Type-check, lint, and format run in parallel
- **Fail-Fast Disabled**: All checks run even if one fails for better feedback
- **Smart Caching**: npm cache with package-lock.json dependency path
- **Timeout Limits**: 5-12 minute timeouts to prevent hanging jobs

#### Validations

1. **Quick Checks (Parallel)**: Type-check, lint, and format run simultaneously
2. **Lint Staged**: Runs on changed files only
3. **Build and Test**: Depends on quick checks completion

### 2. Full CI/CD Pipeline

**File**: `.github/workflows/ci.yml`

Comprehensive pipeline with advanced optimizations and parallel execution:

#### Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

#### Performance Optimizations

- **Parallel Job Execution**: Type-check, lint, format, and security run simultaneously
- **Matrix Strategy**: Tests run on Node.js 18 and 20 for compatibility
- **Smart Dependencies**: Build jobs wait only for essential validations
- **Optimized npm**: Uses `--prefer-offline --no-audit` for faster installs
- **Timeout Management**: Each job has specific timeout limits

#### Jobs

1. **Type Check**: Fast TypeScript validation (5 min timeout)
2. **Lint**: Code quality checks (5 min timeout)
3. **Format**: Biome formatting validation (3 min timeout)
4. **Security**: Dependency audit (10 min timeout)
5. **Build and Test**: Matrix testing on Node 18/20 (15 min timeout)
6. **Lint Staged**: PR-specific file validation (5 min timeout)
7. **Build Artifacts**: Release packaging (10 min timeout)

### 3. Quick Validation

**File**: `.github/workflows/quick-validate.yml`

Ultra-fast validation for development branches with parallel execution:

#### Triggers

- Push to any branch except `main` or `develop`
- Pull requests to any branch except `main` or `develop`

#### Speed Optimizations

- **Matrix Parallelization**: All checks run simultaneously
- **Fail-Fast Disabled**: Complete feedback even with failures
- **Minimal Dependencies**: No job dependencies for maximum speed
- **Optimized npm**: Fast install with offline preference

#### Validations (Parallel)

- Type checking
- Linting
- Format checking
- Tests

## Performance Optimizations

### Speed Best Practices Implemented

#### 1. Parallel Execution

- **Matrix Strategy**: Multiple checks run simultaneously
- **Independent Jobs**: No unnecessary dependencies
- **Fail-Fast Disabled**: Complete feedback even with failures

#### 2. Smart Caching

- **npm Cache**: Package-lock.json based caching
- **Dependency Path**: Precise cache invalidation
- **Offline Preference**: Faster installs with `--prefer-offline`

#### 3. Optimized npm Commands

```bash
# Fast install with optimizations
npm ci --prefer-offline --no-audit

# Production-only audit (faster)
npm audit --audit-level=moderate --production
```

#### 4. Timeout Management

- **Type Check**: 5 minutes
- **Lint/Format**: 3-5 minutes
- **Security**: 10 minutes
- **Build/Test**: 12-15 minutes

#### 5. Conditional Execution

- **Lint Staged**: Only on changed files
- **Build Artifacts**: Only on main branch
- **Coverage Upload**: Only on primary Node version

### Performance Metrics

- **Parallel Jobs**: 3-4 jobs run simultaneously
- **Cache Hit Rate**: ~80% for dependencies
- **Total Time**: 8-15 minutes vs 20-30 minutes sequential
- **Feedback Speed**: First failures visible in 3-5 minutes

## Local Development

### Husky Hooks

The project uses Husky for local pre-commit validation:

```bash
# Install Husky hooks
npm run prepare

# Manual validation (same as CI)
npm run validate

# Pre-commit validation (same as Husky)
npm run pre-commit
```

### lint-staged Configuration

The `lint-staged` configuration in `package.json` automatically formats staged files:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json}": ["biome check --write"]
  }
}
```

## Validation Commands

### Type Checking

```bash
npm run type-check
```

Runs TypeScript compiler in no-emit mode to check types without generating output files.

### Linting

```bash
npm run lint
```

Runs Biome linting on all files in the `src` directory.

### Formatting

```bash
npm run format
```

Checks if all files are properly formatted with Biome.

### Building

```bash
npm run build
```

Compiles the project using esbuild for production.

### Testing

```bash
npm test
```

Runs Jest tests with coverage reporting.

## Coverage Requirements

The project aims for:

- **Test Coverage**: >80% overall
- **Critical Paths**: >95% for core functionality
- **New Features**: 100% coverage required

## Security

### Dependency Audit

The CI pipeline includes:

- `npm audit --audit-level=moderate`: Checks for known vulnerabilities
- `npm outdated`: Identifies outdated packages

### Recommendations

- Update dependencies regularly
- Review security advisories
- Use `npm audit fix` when possible

## Troubleshooting

### Common Issues

#### TypeScript Errors

```bash
# Check specific file
npx tsc --noEmit src/path/to/file.ts

# Check with verbose output
npx tsc --noEmit --listFiles
```

#### Linting Issues

```bash
# Fix auto-fixable issues
npm run lint:fix

# Check specific file
npm run lint src/path/to/file.ts
```

#### Biome Issues

```bash
# Fix formatting and linting
npm run check:fix

# Check specific file
npm run check src/path/to/file.ts
```

### CI Debugging

#### View Workflow Logs

1. Go to GitHub repository
2. Click "Actions" tab
3. Select the workflow run
4. Click on the failing job
5. Review step logs

#### Local Reproduction

```bash
# Run the same commands as CI
npm ci
npm run type-check
npm run lint
npm run format
npm run build
npm test
```

## Best Practices

### Before Committing

1. Run `npm run validate` locally
2. Ensure all tests pass
3. Check that code is properly formatted
4. Verify TypeScript compilation

### Before Creating PR

1. Update branch with latest main
2. Run full validation suite
3. Ensure coverage requirements are met
4. Review security audit results

### Code Quality

- Write self-documenting code
- Add tests for new functionality
- Follow TypeScript best practices
- Use meaningful commit messages

## Configuration Files

### Linting (Legacy Reference)

- **Previous tool**: ESLint (now replaced by Biome)
- **Current tool**: See Biome section above

### Biome

- **File**: `biome.json`
- **Purpose**: Code linting, formatting, and import organization
- **Integration**: All-in-one tool replacing ESLint + Prettier

### TypeScript

- **File**: `tsconfig.json`
- **Purpose**: TypeScript compilation settings
- **Mode**: Strict mode enabled

### Jest

- **File**: `jest.config.js`
- **Purpose**: Test configuration
- **Coverage**: Enabled with HTML and LCOV reports
