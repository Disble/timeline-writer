# Componentes Específicos - Timeline Writer

## Descripción General

Esta sección detalla los componentes específicos que necesitan implementación, tanto técnicos como de interfaz de usuario.

## Componentes de UI

### [Timeline View Component](./timeline-view.md)
Componente principal de visualización temporal
- Integración con vis-timeline
- Navegación interactiva por versiones
- Visualización de ramas y contextos
- Controles de zoom y filtrado

### [Comparison View Component](./comparison-view.md) 
Vista de comparación entre versiones
- Split view side-by-side
- Highlighting de diferencias
- Herramientas de merge
- Navegación entre cambios

### [Settings Panel Component](./settings-panel.md)
Panel de configuración del plugin
- Gestión de contextos narrativos
- Configuración de sensibilidad de detección
- Settings de performance
- Import/export de configuraciones

## Componentes de Storage

### [Storage Components](./storage-components.md)
Componentes de persistencia y almacenamiento
- SQLite storage engine
- Compression utilities
- Migration system
- Backup and recovery tools

## Estructura de Componentes

```
src/
├── ui/
│   ├── timeline-view/
│   │   ├── TimelineView.tsx          # Componente principal
│   │   ├── TimelineControls.tsx      # Controles de navegación
│   │   ├── NodeRenderer.tsx          # Renderizado de nodos
│   │   └── ContextSwitcher.tsx       # Selector de contextos
│   ├── comparison-view/
│   │   ├── ComparisonView.tsx        # Vista principal
│   │   ├── SplitEditor.tsx           # Editor dividido
│   │   ├── DiffHighlighter.tsx       # Highlighting de diffs
│   │   └── MergeTools.tsx            # Herramientas de merge
│   ├── settings-panel/
│   │   ├── SettingsPanel.tsx         # Panel principal
│   │   ├── ContextSettings.tsx       # Configuración de contextos
│   │   ├── DetectionSettings.tsx     # Configuración de detección
│   │   └── PerformanceSettings.tsx   # Configuración de performance
│   └── components/
│       ├── shared/                   # Componentes compartidos
│       ├── forms/                    # Componentes de formularios
│       └── layout/                   # Componentes de layout
└── core/
    ├── storage/
    │   ├── SQLiteEngine.ts           # Motor SQLite
    │   ├── CompressionEngine.ts      # Motor de compresión
    │   ├── MigrationEngine.ts        # Sistema de migraciones
    │   └── BackupEngine.ts           # Sistema de backup
    └── ...
```

## Patrones de Componentes

### Component Structure
```typescript
interface ComponentProps {
  // Props tipadas estrictamente
}

export const Component: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  onAction
}) => {
  // 1. State management
  const [state, setState] = useState(initialState);
  
  // 2. Effects y lifecycle
  useEffect(() => {
    // Setup y cleanup
  }, [dependencies]);
  
  // 3. Event handlers
  const handleAction = useCallback(() => {
    // Action logic
  }, [dependencies]);
  
  // 4. Render
  return (
    <div className="component-name">
      {/* JSX content */}
    </div>
  );
};
```

### Custom Hooks Pattern
```typescript
// Lógica reutilizable en custom hooks
export const useTimelineData = (fileId: string) => {
  const [timeline, setTimeline] = useState<TimelineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadTimelineData(fileId)
      .then(setTimeline)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fileId]);
  
  return { timeline, loading, error };
};
```

### Error Boundary Pattern
```typescript
export class ComponentErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Component error:', error, errorInfo);
    // Log to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

## Integración con Obsidian

### Plugin Integration Pattern
```typescript
export class ObsidianComponentWrapper {
  private reactRoot: Root;
  
  constructor(
    private containerEl: HTMLElement,
    private app: App,
    private plugin: Plugin
  ) {}
  
  render(component: React.ReactElement) {
    this.reactRoot = createRoot(this.containerEl);
    this.reactRoot.render(
      <ObsidianProvider app={this.app} plugin={this.plugin}>
        <ComponentErrorBoundary>
          {component}
        </ComponentErrorBoundary>
      </ObsidianProvider>
    );
  }
  
  cleanup() {
    this.reactRoot?.unmount();
  }
}
```

### Context Provider Pattern
```typescript
const ObsidianContext = React.createContext<{
  app: App;
  plugin: TimelineWriterPlugin;
} | null>(null);

export const useObsidian = () => {
  const context = useContext(ObsidianContext);
  if (!context) {
    throw new Error('useObsidian must be used within ObsidianProvider');
  }
  return context;
};
```

## Performance Optimization

### Memoization Strategy
```typescript
// Memoización de componentes costosos
export const ExpensiveComponent = React.memo<Props>(({
  data,
  onAction
}) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison logic
  return prevProps.data.id === nextProps.data.id;
});

// Memoización de cálculos costosos
const processedData = useMemo(() => {
  return expensiveDataProcessing(rawData);
}, [rawData]);
```

### Virtual Scrolling
```typescript
// Para listas grandes de versiones o nodos
export const VirtualizedTimeline: React.FC<Props> = ({
  nodes,
  onNodeSelect
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  const visibleNodes = useMemo(() => 
    nodes.slice(visibleRange.start, visibleRange.end),
    [nodes, visibleRange]
  );
  
  return (
    <VirtualScrollContainer
      totalItems={nodes.length}
      onRangeChange={setVisibleRange}
    >
      {visibleNodes.map(node => (
        <TimelineNode key={node.id} node={node} onClick={onNodeSelect} />
      ))}
    </VirtualScrollContainer>
  );
};
```

## Testing Strategy

### Component Testing
```typescript
// Testing con React Testing Library
describe('TimelineView', () => {
  test('renders timeline nodes correctly', () => {
    const mockNodes = createMockTimelineNodes(5);
    
    render(
      <TimelineView
        nodes={mockNodes}
        currentContext="test-context"
        onNodeSelect={jest.fn()}
        onContextChange={jest.fn()}
      />
    );
    
    expect(screen.getAllByRole('timeline-node')).toHaveLength(5);
  });
  
  test('handles node selection', async () => {
    const onNodeSelect = jest.fn();
    const mockNodes = createMockTimelineNodes(3);
    
    render(<TimelineView nodes={mockNodes} onNodeSelect={onNodeSelect} />);
    
    await user.click(screen.getByTestId('node-1'));
    expect(onNodeSelect).toHaveBeenCalledWith('node-1');
  });
});
```

### Integration Testing
```typescript
// Testing de integración con Obsidian
describe('Plugin Integration', () => {
  let testApp: App;
  let plugin: TimelineWriterPlugin;
  
  beforeEach(async () => {
    testApp = await createTestApp();
    plugin = new TimelineWriterPlugin(testApp, testManifest);
    await plugin.onload();
  });
  
  test('creates timeline view on command', async () => {
    await plugin.executeCommand('timeline-writer:open-timeline');
    
    const timelineView = testApp.workspace.getLeavesOfType('timeline-view')[0];
    expect(timelineView).toBeDefined();
  });
});
```

## Accessibility

### ARIA Support
```typescript
export const AccessibleTimelineNode: React.FC<Props> = ({
  node,
  isSelected,
  onSelect
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Timeline node: ${node.label}`}
      aria-selected={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect();
        }
      }}
    >
      {node.label}
    </div>
  );
};
```

### Keyboard Navigation
```typescript
export const useKeyboardNavigation = (nodes: TimelineNode[]) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setSelectedIndex(Math.max(0, selectedIndex - 1));
          break;
        case 'ArrowDown':
          setSelectedIndex(Math.min(nodes.length - 1, selectedIndex + 1));
          break;
        case 'Enter':
          onNodeSelect(nodes[selectedIndex]);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, nodes]);
  
  return selectedIndex;
};
```

Cada componente específico tiene su propia documentación detallada en los archivos individuales de esta sección.