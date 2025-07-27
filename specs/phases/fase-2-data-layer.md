# Fase 2: Data Layer

**Duración**: 2-3 semanas  
**Objetivo**: Implementar el sistema completo de persistencia y modelos de datos

## Descripción General

Esta fase construye la fundación de datos del plugin, implementando todos los modelos de datos, el storage engine, y los sistemas de persistencia. Es crítica para el resto del desarrollo ya que define cómo se almacenan y manejan todas las versiones y metadatos.

## Tareas Principales

### 2.1 Modelos de Datos TypeScript

#### Interfaces Core
- [ ] Implementar `TimelineNode` interface
- [ ] Implementar `VersionSnapshot` interface  
- [ ] Implementar `ContextDefinition` interface
- [ ] Implementar `FileVersionHistory` interface
- [ ] Crear validadores para cada interface

```typescript
// src/data/models/core.ts
export interface TimelineNode {
  id: string;
  timestamp: Date;
  parentIds: string[];
  childIds: string[];
  contextId: string;
  label: string;
  description?: string;
  isCheckpoint: boolean;
  metadata: NodeMetadata;
}

export interface VersionSnapshot {
  id: string;
  fileId: string;
  nodeId: string;
  contentHash: string;
  diffFromParent?: CompressedDiff;
  fullContent?: string;
  size: number;
  metadata: FileMetadata;
}
```

#### Modelos de Análisis
- [ ] Implementar `ContextSignal` interface
- [ ] Implementar `ContextShiftDetection` interface
- [ ] Implementar `SemanticAnalysis` interface
- [ ] Crear tipos para diferentes tipos de señales

#### Sistema de Validación
- [ ] Crear validators con Zod o similar
- [ ] Implementar validación en runtime
- [ ] Sistema de error handling tipado
- [ ] Tests exhaustivos para validaciones

### 2.2 Storage Engine SQLite

#### Configuración Base
- [ ] Integrar sql.js con configuración optimizada
- [ ] Crear schema de base de datos
- [ ] Implementar sistema de conexiones
- [ ] Setup de indexes para performance

```sql
-- Schema principal
CREATE TABLE timeline_nodes (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  parent_ids TEXT, -- JSON array
  child_ids TEXT,  -- JSON array
  context_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_checkpoint BOOLEAN NOT NULL,
  metadata TEXT    -- JSON
);

CREATE TABLE version_snapshots (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  diff_data BLOB,
  full_content TEXT,
  size INTEGER NOT NULL,
  metadata TEXT
);
```

#### Operaciones CRUD
- [ ] Implementar `saveSnapshot()`
- [ ] Implementar `getVersionHistory()`
- [ ] Implementar `restoreVersion()`
- [ ] Implementar `queryByContext()`
- [ ] Batch operations para performance

#### Sistema de Migraciones
- [ ] Framework de migraciones de schema
- [ ] Versionado de base de datos
- [ ] Rollback automático en errores
- [ ] Tests de migración

### 2.3 Sistema de Compresión y Diff

#### Diff Engine
- [ ] Integrar diff-match-patch optimizado
- [ ] Implementar algoritmo de diff inteligente
- [ ] Optimización para archivos markdown
- [ ] Manejo de archivos binarios

```typescript
// src/core/version-manager/DiffEngine.ts
export class DiffEngine {
  createDiff(oldContent: string, newContent: string): Diff {
    // Implementación optimizada para markdown
  }
  
  applyDiff(content: string, diff: Diff): string {
    // Aplicación robusta con error recovery
  }
  
  validateDiff(content: string, diff: Diff, expected: string): boolean {
    // Validación de integridad
  }
}
```

#### Compression Engine
- [ ] Integrar pako para compresión gzip
- [ ] Algoritmos adaptativos según tamaño
- [ ] Compresión específica para diffs
- [ ] Métricas de ratio de compresión

### 2.4 Storage Manager Principal

#### Hybrid Storage Strategy
- [ ] Combinar archivos + SQLite + compresión
- [ ] Estrategia de checkpoints vs snapshots
- [ ] Limpieza automática de versiones antiguas
- [ ] Optimización de espacio en disco

```typescript
// src/data/storage/StorageManager.ts
export class StorageManager {
  async saveVersion(
    file: TFile, 
    context: ContextDefinition,
    isCheckpoint: boolean = false
  ): Promise<VersionSnapshot> {
    // Lógica híbrida de storage
  }
  
  async getFileHistory(filePath: string): Promise<FileVersionHistory> {
    // Recuperación eficiente de historial
  }
  
  async cleanup(retentionPolicy: RetentionPolicy): Promise<CleanupReport> {
    // Limpieza inteligente de versiones
  }
}
```

#### Transaction Management
- [ ] Sistema de transacciones ACID
- [ ] Rollback automático en errores
- [ ] Locking para operaciones concurrentes
- [ ] Recovery en caso de crash

### 2.5 Sistema de Backup y Recovery

#### Backup Strategy
- [ ] Export completo de datos
- [ ] Backup incremental
- [ ] Formato portable (JSON + archivos)
- [ ] Programación automática de backups

#### Recovery System
- [ ] Import de backups
- [ ] Verificación de integridad
- [ ] Recovery parcial de archivos específicos
- [ ] Merge de backups múltiples

### 2.6 Performance y Optimización

#### Database Optimization
- [ ] Indexes optimizados para queries frecuentes
- [ ] Query optimization y profiling
- [ ] Connection pooling
- [ ] Lazy loading de datos grandes

#### Memory Management
- [ ] Streaming para archivos grandes
- [ ] Cache inteligente con LRU
- [ ] Garbage collection de objetos temporales
- [ ] Memory profiling y monitoring

## Entregables

### Código
- [ ] Storage engine completo y funcional
- [ ] Todas las interfaces TypeScript implementadas
- [ ] Sistema de validación robusto
- [ ] Operaciones CRUD optimizadas

### Testing
- [ ] Tests unitarios para todos los modelos
- [ ] Tests de integración para storage
- [ ] Tests de performance y stress
- [ ] Tests de recovery y corrupción de datos

### Documentación
- [ ] Documentación de API completa
- [ ] Guía de schema de base de datos
- [ ] Documentación de backup/recovery
- [ ] Performance benchmarks

## Criterios de Aceptación

- [ ] Todas las operaciones de storage funcionan correctamente
- [ ] Performance cumple con métricas objetivo (<50ms writes)
- [ ] Zero data loss en tests de stress
- [ ] Sistema de migraciones funciona correctamente
- [ ] Backup y recovery operativos
- [ ] Tests de coverage >90% para data layer

## Métricas de Éxito

### Performance
- **Write operations**: < 50ms promedio
- **Read operations**: < 20ms promedio
- **Database startup**: < 200ms
- **Memory usage**: < 50MB para 1000 archivos

### Reliability
- **Data integrity**: 100% en tests
- **Recovery success**: >99.9%
- **Backup validity**: 100% verificable
- **Zero data loss**: En todos los escenarios

## Riesgos y Mitigaciones

### Riesgos Técnicos
- **Complejidad de SQLite en browser**: Testing exhaustivo
- **Performance con archivos grandes**: Streaming y chunking
- **Corrupción de datos**: Checksums y validación
- **Concurrencia**: Locking y transacciones

### Mitigaciones
- Implementar fallbacks para cada operación crítica
- Sistema robusto de logging para debugging
- Tests automatizados para todos los edge cases
- Monitoreo de performance en desarrollo

## Integración con Fases Siguientes

### Para Fase 3 (Context Detection)
- Interfaces de `ContextSignal` y análisis listos
- Storage optimizado para queries de contexto
- Sistema de metadata extensible

### Para Fase 4 (Version Management)
- APIs de storage completamente funcionales
- Sistema de diff y compresión optimizado
- Framework de transacciones preparado

## Próximos Pasos

Al completar esta fase:
1. Validar performance con datasets realistas
2. Iniciar Fase 3: Context Detection Engine
3. Preparar datos de prueba para algoritmos de detección
4. Documentar APIs para el resto del equipo