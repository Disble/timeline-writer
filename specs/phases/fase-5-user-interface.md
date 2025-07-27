# Fase 5: User Interface

**Duración**: 3-4 semanas  
**Objetivo**: Implementar la interfaz de usuario completa e integrada con Obsidian

## Descripción General

Esta fase construye toda la interfaz de usuario del plugin, incluyendo la visualización de timeline, vistas de comparación, panel de configuración, y la integración nativa con Obsidian. El objetivo es crear una experiencia de usuario intuitiva y no intrusiva.

## Tareas Principales

### 5.1 Timeline Visualization Component

#### Core Timeline Component
- [ ] Integrar vis-timeline con React
- [ ] Visualización de nodos y ramas
- [ ] Controles de zoom y navegación
- [ ] Interacciones drag & drop

```typescript
// src/ui/timeline-view/TimelineView.tsx
export const TimelineView: React.FC<TimelineViewProps> = ({
  nodes,
  currentContext,
  onNodeSelect,
  onContextChange,
  onCompareVersions
}) => {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  useEffect(() => {
    // Configuración de vis-timeline
    const items = new DataSet(nodes.map(node => ({
      id: node.id,
      content: node.label,
      start: node.timestamp,
      group: node.contextId,
      type: node.isCheckpoint ? 'point' : 'background',
      className: `timeline-node ${node.isCheckpoint ? 'checkpoint' : 'snapshot'}`
    })));
    
    const options = {
      width: '100%',
      height: '400px',
      stack: true,
      multiselect: true,
      selectable: true,
      zoomKey: 'ctrlKey'
    };
    
    const timelineInstance = new Timeline(timelineRef.current, items, options);
    setTimeline(timelineInstance);
  }, [nodes]);
};
```

#### Interactive Features
- [ ] Selección múltiple para comparación
- [ ] Context switching visual
- [ ] Filtrado por contexto/tipo
- [ ] Search y jump to specific versions

#### Timeline Controls
- [ ] Botones de navegación temporal
- [ ] Creación manual de checkpoints
- [ ] Controles de zoom y pan
- [ ] Export de timeline view

### 5.2 Comparison View Component

#### Side-by-Side Comparison
- [ ] Vista dividida con sincronización de scroll
- [ ] Highlighting de diferencias
- [ ] Navegación entre cambios
- [ ] Herramientas de merge visual

```typescript
// src/ui/comparison-view/ComparisonView.tsx
export const ComparisonView: React.FC<ComparisonViewProps> = ({
  leftVersion,
  rightVersion,
  onMerge,
  onAcceptChange
}) => {
  const [diffs, setDiffs] = useState<DiffResult[]>([]);
  const [currentDiff, setCurrentDiff] = useState(0);
  
  useEffect(() => {
    // Calcular diferencias entre versiones
    const calculateDiffs = async () => {
      const diffResult = await diffEngine.compare(
        leftVersion.content,
        rightVersion.content
      );
      setDiffs(diffResult.diffs);
    };
    
    calculateDiffs();
  }, [leftVersion, rightVersion]);
  
  return (
    <div className="comparison-view">
      <ComparisonHeader 
        leftVersion={leftVersion}
        rightVersion={rightVersion}
        totalDiffs={diffs.length}
        currentDiff={currentDiff}
      />
      <SplitEditor
        leftContent={leftVersion.content}
        rightContent={rightVersion.content}
        diffs={diffs}
        onNavigateDiff={setCurrentDiff}
      />
      <ComparisonControls
        onPreviousDiff={() => setCurrentDiff(Math.max(0, currentDiff - 1))}
        onNextDiff={() => setCurrentDiff(Math.min(diffs.length - 1, currentDiff + 1))}
        onAcceptLeft={() => onAcceptChange('left', diffs[currentDiff])}
        onAcceptRight={() => onAcceptChange('right', diffs[currentDiff])}
      />
    </div>
  );
};
```

#### Diff Visualization
- [ ] Color coding para tipos de cambios
- [ ] Inline vs side-by-side modes
- [ ] Word-level vs line-level diffs
- [ ] Collapse/expand unchanged sections

#### Merge Tools
- [ ] Accept change buttons
- [ ] Manual editing capabilities
- [ ] Conflict resolution helpers
- [ ] Preview merged result

### 5.3 Settings Panel Component

#### Context Management
- [ ] CRUD para definiciones de contexto
- [ ] Color picker para contextos
- [ ] Keywords editor
- [ ] Context hierarchy management

```typescript
// src/ui/settings-panel/ContextSettings.tsx
export const ContextSettings: React.FC<ContextSettingsProps> = ({
  contexts,
  onUpdateContext,
  onCreateContext,
  onDeleteContext
}) => {
  const [editingContext, setEditingContext] = useState<ContextDefinition | null>(null);
  
  return (
    <div className="context-settings">
      <ContextList
        contexts={contexts}
        onEdit={setEditingContext}
        onDelete={onDeleteContext}
      />
      {editingContext && (
        <ContextEditor
          context={editingContext}
          onSave={(updated) => {
            onUpdateContext(updated);
            setEditingContext(null);
          }}
          onCancel={() => setEditingContext(null)}
        />
      )}
      <CreateContextButton
        onClick={() => setEditingContext(createEmptyContext())}
      />
    </div>
  );
};
```

#### Detection Settings
- [ ] Sensitivity sliders para cada tipo de señal
- [ ] Umbrales de confianza configurables
- [ ] Enable/disable automático por contexto
- [ ] Frequency settings para snapshots

#### Performance Settings
- [ ] Memory usage limits
- [ ] Storage retention policies
- [ ] Background processing toggles
- [ ] Debug mode enablement

### 5.4 Obsidian Integration UI

#### Sidebar Panel
- [ ] Timeline overview en sidebar
- [ ] Quick context switching
- [ ] Recent versions list
- [ ] Status indicators

```typescript
// src/ui/obsidian-integration/SidebarPanel.tsx
export class TimelineSidebarView extends ItemView {
  getViewType(): string {
    return 'timeline-sidebar';
  }
  
  getDisplayText(): string {
    return 'Timeline Writer';
  }
  
  async onOpen() {
    const root = createRoot(this.containerEl.children[1]);
    root.render(
      <SidebarPanel
        app={this.app}
        plugin={this.plugin}
        onNodeSelect={this.handleNodeSelect.bind(this)}
      />
    );
  }
  
  private async handleNodeSelect(nodeId: string) {
    // Navegación desde sidebar
    await this.plugin.navigateToNode(nodeId);
  }
}
```

#### Command Palette Integration
- [ ] Commands para navegación temporal
- [ ] Quick context switching
- [ ] Checkpoint creation
- [ ] Comparison tools

#### Ribbon Buttons
- [ ] Timeline view toggle
- [ ] Quick checkpoint creation
- [ ] Context indicator
- [ ] Settings access

#### Status Bar
- [ ] Current context indicator
- [ ] Version count display
- [ ] Last snapshot time
- [ ] System status

### 5.5 Advanced UI Components

#### Context Visualizer
- [ ] Graph view de relaciones entre contextos
- [ ] Estadísticas de uso por contexto
- [ ] Timeline overview con métricas
- [ ] Export capabilities

#### Version History Browser
- [ ] Tree view de versiones
- [ ] Search and filter capabilities
- [ ] Bulk operations
- [ ] Export/import tools

```typescript
// src/ui/components/VersionHistoryBrowser.tsx
export const VersionHistoryBrowser: React.FC<HistoryBrowserProps> = ({
  fileHistory,
  onSelectVersion,
  onCompareVersions
}) => {
  const [filter, setFilter] = useState<HistoryFilter>({});
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  
  const filteredVersions = useMemo(() => 
    applyHistoryFilter(fileHistory.versions, filter),
    [fileHistory, filter]
  );
  
  return (
    <div className="version-history-browser">
      <HistoryFilter
        filter={filter}
        onChange={setFilter}
      />
      <VersionTree
        versions={filteredVersions}
        selectedVersions={selectedVersions}
        onSelectionChange={setSelectedVersions}
        onDoubleClick={onSelectVersion}
      />
      <HistoryActions
        selectedVersions={selectedVersions}
        onCompare={() => onCompareVersions(selectedVersions)}
        onRestore={onSelectVersion}
      />
    </div>
  );
};
```

### 5.6 Responsive Design y Accessibility

#### Responsive Layout
- [ ] Adaptive layout para diferentes tamaños
- [ ] Mobile-friendly interactions
- [ ] Collapsible panels
- [ ] Keyboard navigation

#### Accessibility Features
- [ ] ARIA labels y roles
- [ ] Keyboard shortcuts
- [ ] Screen reader compatibility
- [ ] High contrast mode support

#### Theme Integration
- [ ] Obsidian theme compatibility
- [ ] Dark/light mode support
- [ ] Custom CSS variables
- [ ] Color scheme adaptation

## Entregables

### Core Components
- [ ] Timeline visualization completa
- [ ] Comparison view funcional
- [ ] Settings panel integrado
- [ ] Sidebar panel para Obsidian

### Integration Features
- [ ] Command palette commands
- [ ] Ribbon buttons
- [ ] Status bar indicators
- [ ] Hotkeys y shortcuts

### Advanced Features
- [ ] Context visualizer
- [ ] Version history browser
- [ ] Export/import tools
- [ ] Batch operations

### Polish & UX
- [ ] Responsive design
- [ ] Accessibility compliance
- [ ] Theme integration
- [ ] Smooth animations

## Criterios de Aceptación

- [ ] Todas las vistas son completamente funcionales
- [ ] Integración nativa con Obsidian workspace
- [ ] Performance fluida sin lag perceptible
- [ ] Accesibilidad completa
- [ ] Theme compatibility al 100%
- [ ] Mobile-friendly (responsive)

## Métricas de Éxito

### Performance
- **Component render time**: <16ms (60fps)
- **Timeline load time**: <500ms para 1000 nodos
- **Comparison view**: <200ms para archivos de 10K palabras
- **Memory usage**: <50MB para UI completa

### Usability
- **Learning curve**: <10 minutos para features básicas
- **Task completion**: >95% éxito en tests de usuario
- **Error rate**: <2% en interacciones
- **Satisfaction**: NPS >80

### Accessibility
- **WCAG compliance**: AA level
- **Keyboard navigation**: 100% funcional
- **Screen reader**: Compatible
- **Color contrast**: >4.5:1 ratio

## Casos de Uso Principales

### 1. Visualización de Timeline
```typescript
// Usuario abre timeline view y navega por versiones
<TimelineView
  nodes={timelineNodes}
  currentContext="arco-1"
  onNodeSelect={handleNodeSelect}
  onContextChange={handleContextChange}
/>
```

### 2. Comparación de Versiones
```typescript
// Usuario selecciona dos versiones para comparar
<ComparisonView
  leftVersion={version1}
  rightVersion={version2}
  onMerge={handleMerge}
/>
```

### 3. Configuración de Contextos
```typescript
// Usuario configura nuevos contextos narrativos
<ContextSettings
  contexts={availableContexts}
  onUpdateContext={handleUpdate}
  onCreateContext={handleCreate}
/>
```

## Riesgos y Mitigaciones

### Riesgos Técnicos
- **Performance con muchos nodos**: Virtualización y lazy loading
- **Complejidad de vis-timeline**: Implementación incremental
- **Integración con React**: Setup cuidadoso de lifecycles
- **Theme compatibility**: Testing exhaustivo

### Mitigaciones
- Implementar virtualización para listas grandes
- Crear abstraction layer sobre vis-timeline
- Testing riguroso de integración React/Obsidian
- Theme testing automatizado

## Integración con Fases Anteriores

### Dependencias
- **Fase 2**: APIs de storage para datos
- **Fase 3**: Context detection para estado
- **Fase 4**: Version management para operaciones

### APIs Requeridas
- Timeline data access
- Version comparison utilities
- Context management operations
- Settings persistence

## Próximos Pasos

Al completar esta fase:
1. User testing con escritores reales
2. Performance optimization basada en feedback
3. Iniciar Fase 6: Testing y Optimización
4. Preparar documentación de usuario