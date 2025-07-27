# Timeline Writer

Un plugin de Obsidian para versionado temporal inteligente diseñado especialmente para escritores de ficción.

## 🎯 Descripción

Timeline Writer permite a los escritores de ficción gestionar múltiples contextos narrativos (personajes, arcos argumentales, líneas temporales) con detección automática de cambios de contexto y versionado temporal sin interrumpir el flujo de escritura.

### Características Principales

- **Detección Automática de Contexto**: IA que identifica cuándo cambias de personaje, arco narrativo o línea temporal
- **Versionado Temporal**: Sistema híbrido de snapshots automáticos y checkpoints manuales
- **Timeline Ramificado**: Navegación visual por diferentes líneas narrativas y versiones
- **Navegación Temporal**: Viaja entre versiones sin perder el contexto
- **Comparación Visual**: Vista side-by-side para comparar versiones y mergear cambios

## 🚀 Estado del Proyecto

**Estado Actual**: Pre-Development (Planning Complete)  
**Progreso General**: 0% implementado (100% planificado)

### Cronograma de Desarrollo

| Fase | Duración | Estado | Descripción |
|------|----------|--------|-------------|
| **Fase 1**: Setup y Fundación | 1-2 semanas | 🔄 Ready | Infraestructura base y herramientas |
| **Fase 2**: Data Layer | 2-3 semanas | ⏳ Pending | Storage engine y modelos de datos |
| **Fase 3**: Context Detection | 3-4 semanas | ⏳ Pending | Motor de IA para detección de contexto |
| **Fase 4**: Version Management | 2-3 semanas | ⏳ Pending | Sistema de versionado temporal |
| **Fase 5**: User Interface | 3-4 semanas | ⏳ Pending | UI completa e integración con Obsidian |
| **Fase 6**: Testing & Optimization | 2-3 semanas | ⏳ Pending | Pulido final y optimización |

**Tiempo estimado total**: 16-19 semanas (~4-5 meses)

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **TypeScript** con tipado estricto
- **React** para componentes de UI
- **Obsidian API** v1.4.16
- **SQLite** (sql.js) para metadatos
- **vis-timeline** para visualización
- **Natural.js** y **ml-matrix** para análisis semántico
- **pako** (compresión) y **diff-match-patch** (diferencias)

### Componentes Principales
- **Context Detection Engine**: Análisis semántico, keywords, patrones temporales
- **Hybrid Version Manager**: Checkpoints completos + diffs comprimidos
- **Timeline Engine**: Navegación temporal y ramificación
- **Storage Engine**: Persistencia híbrida SQLite + archivos

## 📋 Casos de Uso

### Para Escritores de Ficción
- Escribir sobre **Personaje A** → cambiar a **Personaje B** → snapshot automático
- Explorar **líneas narrativas alternativas** sin perder versiones anteriores
- **Comparar versiones** de un capítulo para ver evolución del personaje
- **Navegar temporalmente** para revisar cómo era un arco hace 5 versiones
- **Crear checkpoints manuales** antes de grandes cambios narrativos

### Workflows Típicos
1. **Escritura Multi-Contexto**: Cambiar entre personajes/arcos con detección automática
2. **Exploración Narrativa**: Crear ramas para explorar direcciones alternativas
3. **Revisión Temporal**: Comparar evolución de personajes o tramas
4. **Recuperación de Versiones**: Restaurar versiones específicas sin perder trabajo actual

## 🎨 Capturas de Pantalla (Mockups)

*Las capturas se añadirán durante el desarrollo de la UI*

## 🛠️ Desarrollo

### Requisitos Previos
- Node.js 18+
- Obsidian 1.4.16+
- Git

### Setup de Desarrollo
```bash
# Clonar el repositorio
git clone <repository-url>
cd timeline-writer

# Instalar dependencias (cuando esté implementado)
npm install

# Desarrollo con hot reload
npm run dev

# Tests
npm test

# Build para producción
npm run build
```

### Estructura del Proyecto
```
timeline-writer/
├── specs/                    # 📋 Especificaciones detalladas
│   ├── phases/              # Fases de desarrollo
│   ├── architecture/        # Arquitectura del sistema
│   └── components/          # Especificaciones de componentes
├── src/                     # 💻 Código fuente (por implementar)
│   ├── core/               # Lógica de negocio
│   ├── ui/                 # Componentes React
│   ├── data/               # Modelos y storage
│   └── utils/              # Utilidades
├── CLAUDE.md               # 🤖 Guía para Claude Code
├── STATUS.md               # 📊 Estado actual de desarrollo
└── README.md               # 📖 Este archivo
```

## 📊 Métricas Objetivo

### Performance
- **Detección de contexto**: < 100ms para documentos de 10K palabras
- **Operaciones de storage**: < 50ms promedio
- **Tiempo de inicio**: < 500ms para vaults de 10K archivos
- **Eficiencia de storage**: < 20% overhead vs archivos originales

### Calidad
- **Precisión de detección**: > 85%
- **Falsos positivos**: < 10%
- **Cobertura de tests**: > 95%
- **Zero data loss**: En todos los escenarios

## 🤝 Contribución

Este proyecto está en desarrollo activo. Las contribuciones serán bienvenidas una vez que se complete la implementación base.

### Roadmap Futuro
- **v2.0**: Integración con IA para sugerencias de escritura
- **v2.1**: Colaboración en tiempo real entre escritores
- **v2.2**: Export a plataformas de publicación
- **v2.3**: App móvil companion

## 📄 Licencia

[Licencia por definir]

## 🔗 Enlaces

- **Documentación Completa**: `specs/index.md`
- **Arquitectura**: `specs/architecture/index.md`
- **Plan de Desarrollo**: `specs/phases/index.md`
- **Estado Actual**: `STATUS.md`

---

**Timeline Writer** - Haciendo que el versionado temporal sea invisible para que puedas enfocarte en crear historias extraordinarias.

*Desarrollado con ❤️ para la comunidad de escritores de Obsidian*