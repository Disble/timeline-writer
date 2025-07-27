# Fase 1: Setup y Fundación

**Duración**: 1-2 semanas  
**Objetivo**: Establecer la infraestructura técnica base para el desarrollo del plugin

## Descripción General

Esta fase establece todos los elementos fundamentales necesarios para un desarrollo eficiente y profesional del plugin Timeline Writer. Se centra en la configuración del entorno, herramientas de desarrollo, y la estructura básica del proyecto.

## Tareas Principales

### 1.1 Setup Inicial del Proyecto

#### Inicialización Base
- [ ] Clonar template oficial de Obsidian plugin
- [ ] Configurar repositorio Git con estructura apropiada
- [ ] Configurar package.json con metadata del proyecto
- [ ] Setup de licencia y README inicial

#### Configuración TypeScript
- [ ] Configurar tsconfig.json con reglas estrictas
- [ ] Setup de tipos para Obsidian API
- [ ] Configurar path mapping para imports limpios
- [ ] Habilitar strict mode y todas las validaciones

#### Dependencias Principales
```json
{
  "dependencies": {
    "obsidian": "^1.4.16",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "vis-timeline": "^7.7.3",
    "diff-match-patch": "^1.0.5",
    "pako": "^2.1.0",
    "sql.js": "^1.8.0",
    "ml-matrix": "^6.10.4",
    "natural": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.1.0",
    "@types/react": "^18.2.0",
    "@types/diff-match-patch": "^1.0.5",
    "@types/pako": "^2.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@biomejs/biome": "^2.1.0"
  }
}
```

### 1.2 Sistema de Build

#### Configuración esbuild
- [ ] Configurar esbuild.config.mjs para desarrollo y producción
- [ ] Setup de hot reload para desarrollo rápido
- [ ] Configurar source maps para debugging
- [ ] Optimización para bundle size

#### Scripts de Desarrollo
```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs --watch",
    "build": "node esbuild.config.mjs --production",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "biome lint src",
    "lint:fix": "biome lint src --write",
    "format": "biome format src",
    "format:fix": "biome format src --write",
    "check": "biome check src",
    "check:fix": "biome check src --write",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist"
  }
}
```

### 1.3 Testing Framework

#### Configuración Jest
- [ ] Setup de Jest con TypeScript support
- [ ] Configurar mocks para Obsidian API
- [ ] Setup de test utilities y helpers
- [ ] Configurar coverage reporting

#### Test Structure
```
src/
├── __tests__/
│   ├── setup.ts
│   ├── mocks/
│   └── utils/
└── **/__tests__/
    └── *.test.ts
```

### 1.4 Estructura del Proyecto

#### Directorios Principales
```
timeline-writer/
├── src/
│   ├── core/                 # Lógica de negocio
│   │   ├── context-detection/
│   │   ├── version-manager/
│   │   ├── timeline-engine/
│   │   └── metadata-engine/
│   ├── ui/                   # Componentes React
│   │   ├── timeline-view/
│   │   ├── comparison-view/
│   │   ├── settings-panel/
│   │   └── components/
│   ├── data/                 # Modelos y persistencia
│   │   ├── models/
│   │   ├── storage/
│   │   └── migrations/
│   ├── utils/                # Utilidades
│   └── assets/               # Recursos estáticos
├── specs/                    # Especificaciones
├── docs/                     # Documentación
├── tests/                    # Tests e2e
└── scripts/                  # Scripts de utilidad
```

### 1.5 Herramientas de Desarrollo

#### VSCode Configuration
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome"
}
```

#### Biome Setup
- [ ] Configurar Biome para linting, formatting e import organization
- [ ] Setup de reglas de código consistentes
- [ ] Configurar pre-commit hooks con husky
- [ ] Integrar con editor para desarrollo fluido

### 1.6 Configuración de Obsidian

#### Manifest del Plugin
```json
{
  "id": "timeline-writer",
  "name": "Timeline Writer",
  "version": "0.1.0",
  "minAppVersion": "1.4.16",
  "description": "Temporal versioning for fiction writers with intelligent context detection",
  "author": "Timeline Writer Team",
  "authorUrl": "",
  "fundingUrl": "",
  "isDesktopOnly": false
}
```

#### Plugin Principal
- [ ] Crear clase principal del plugin
- [ ] Setup de lifecycle hooks básicos
- [ ] Configurar logging y error handling
- [ ] Preparar estructura para settings

## Entregables

### Código
- [ ] Proyecto base funcional con build system
- [ ] Estructura de directorios completa
- [ ] Configuración de herramientas de desarrollo
- [ ] Plugin básico que carga en Obsidian

### Documentación
- [ ] README con instrucciones de setup
- [ ] Documentación de estructura del proyecto
- [ ] Guía de contribución
- [ ] Configuración de development environment

### Testing
- [ ] Framework de testing operativo
- [ ] Tests básicos funcionando
- [ ] Coverage reporting configurado
- [ ] CI/CD básico (opcional para esta fase)

## Criterios de Aceptación

- [ ] El proyecto compila sin errores con TypeScript estricto
- [ ] El plugin se carga correctamente en Obsidian
- [ ] Todos los scripts de package.json funcionan
- [ ] Tests básicos pasan al 100%
- [ ] Biome no reporta errores de linting o formato
- [ ] Hot reload funciona para desarrollo
- [ ] Documentación básica está completa

## Métricas de Éxito

- **Build time**: < 5 segundos para desarrollo
- **Test execution**: < 10 segundos para suite básica
- **Plugin load time**: < 100ms en Obsidian
- **Zero errors**: En lint, type-check, y tests

## Riesgos y Mitigaciones

### Riesgos
- Incompatibilidades entre dependencias
- Configuración compleja de herramientas
- Problemas con Obsidian API types

### Mitigaciones
- Usar versiones específicas probadas
- Documentar cada paso de configuración
- Crear mocks robustos para testing
- Setup de fallbacks para desarrollo offline

## Próximos Pasos

Una vez completada esta fase:
1. Iniciar Fase 2: Data Layer
2. Comenzar diseño de interfaces TypeScript
3. Planificar arquitectura de storage
4. Setup de documentación técnica continua