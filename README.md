# Visualizador de Fórmulas RRHH

Sistema web para visualizar y explorar las fórmulas de liquidación de sueldos y sus dependencias entre conceptos.

## Requisitos

- **Java 17+** (usar `set-java17.bat` para configurar)
- **Maven 3.6+**
- **Node.js 18+**
- **SQL Server** (base UPCN_RRHH_PRUE)

## Estructura del Proyecto

```
formu3/
├── src/main/java/com/upcn/formu/    # Backend Spring Boot
│   ├── controller/                   # Controllers REST
│   ├── service/                      # Servicios de negocio
│   ├── repository/                   # Repositorios JPA
│   ├── domain/                       # Entidades
│   ├── dto/                          # Objetos de transferencia
│   └── config/                       # Configuración
├── src/main/resources/
│   └── application.yml               # Configuración de la app
├── frontend/                         # Frontend React + Vite
│   ├── src/
│   │   ├── components/               # Componentes React
│   │   ├── App.tsx                   # Componente principal
│   │   ├── api.ts                    # Cliente API
│   │   ├── types.ts                  # Tipos TypeScript
│   │   └── utils.ts                  # Utilidades
│   └── package.json
├── set-java17.bat                    # Configurar Java 17
├── restore-java.bat                  # Restaurar Java anterior
├── run-backend.bat                   # Iniciar backend
└── run-frontend.bat                  # Iniciar frontend
```

## Inicio Rápido

### 1. Configurar Java 17 (si es necesario)
```batch
set-java17.bat
```

### 2. Iniciar Backend
```batch
run-backend.bat
```
El backend estará disponible en `http://localhost:8080`

### 3. Iniciar Frontend (en otra terminal)
```batch
run-frontend.bat
```
El frontend estará disponible en `http://localhost:5173`

## Uso

1. **Buscar concepto**: Escribir código o descripción en el panel izquierdo
2. **Agregar al canvas**: Click en el resultado de búsqueda
3. **Expandir dependencias**: Click en botones ↑ (dependencias) o ↓ (dependientes)
4. **Zoom/Pan**: Scroll para zoom, arrastrar para mover
5. **Cargar liquidación**: Seleccionar año/mes/tipo y click en "Cargar Importes"
6. **Guardar pantalla**: Escribir nombre y click en "Guardar"

## API Endpoints

### Conceptos
- `GET /api/conceptos` - Listar todos
- `GET /api/conceptos/buscar?q=texto` - Buscar
- `GET /api/conceptos/{codigo}` - Detalle con dependencias
- `GET /api/conceptos/rango/{inicio}/{fin}` - Rango de conceptos

### Liquidación
- `GET /api/liquidacion?anio=&mes=&tipo=&legajo=` - Importes
- `GET /api/liquidacion/tipos` - Tipos disponibles

## Configuración

Editar `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:sqlserver://192.168.0.227:1433;database=UPCN_RRHH_PRUE
    username: consultas
    password: Csua2018

app:
  max-rectangles: 50              # Límite de nodos en canvas
  cache:
    expiration-minutes: 60        # Tiempo de caché
```

## Extensibilidad

### Agregar nuevos patrones de variables
Editar `VariableParser.java`, método `initPatterns()`:

```java
singlePatterns.add(new PatronVariable(
    "NUEVO",                              // Prefijo
    Pattern.compile("^NUEVO(\\d{4})$"),   // Regex
    "Texto para {nnnn}"                   // Texto a mostrar
));
```

### Modificar colores
Editar `ColorUtils.java` o `utils.ts` (frontend)

### Agregar campos a conceptos
1. Modificar `Concepto.java` y `ConceptoDTO.java`
2. Actualizar queries en `ConceptoRepository.java`
3. Actualizar `types.ts` y `ConceptNode.tsx` en frontend

## Restaurar Java Anterior
```batch
restore-java.bat
```
