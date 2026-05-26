# Instrucciones para Claude Code — Comparador de IA por `config.json`

## 0. Contexto del proyecto

Estamos trabajando en el repositorio/carpeta **COMPARADOR-IA**. La estructura actual tiene, entre otras cosas:

```text
COMPARADOR-IA/
  .claude/
    skills/frontend-design/SKILL.md
    settings.local.json
  models-config-contrast/
    modelo-gpt-oss-120b.json
    modelo-Qwen3.6-35B-A3B.json
  models-config-test/
    modelo-Llama-4-Maverick-17B-128E-...
    modelo-Mistral-Small-3.2-24B-Instruct-...
```

La carpeta importante para la aplicación es:

```text
models-config-contrast/
```

La aplicación debe leer y comparar **siempre** los modelos que existan en esa carpeta. Los archivos `.json` de esa carpeta son la fuente principal para construir las métricas, gráficos y comparativas.

Antes de diseñar la UI, revisa obligatoriamente:

```bash
cat .claude/skills/frontend-design/SKILL.md
```

Usa ese skill como guía visual principal.

---

## 1. Objetivo general

Construir un **comparador gráfico de modelos de IA** basado en archivos `config.json` descargados desde Hugging Face.

La aplicación debe permitir:

1. Descargar automáticamente archivos `config.json` de modelos seleccionados.
2. Guardarlos dentro de `models-config-contrast/` con nombres consistentes.
3. Levantar una aplicación web local en el puerto **5050**.
4. Mostrar gráficas comparativas inspiradas en páginas de lanzamiento de modelos como Anthropic, pero sin copiar su diseño literalmente.
5. Comparar un modelo seleccionado contra un modelo base/default.
6. Generar una explicación en español sobre en qué gana y en qué pierde el modelo seleccionado contra el modelo default.
7. Permitir pegar manualmente un nuevo `config.json` desde la UI para previsualizarlo, compararlo y exportarlo.
8. Dejar el proyecto listo para Vercel.
9. Ejecutar validaciones, commit y push al finalizar.

---

## 2. Reglas no negociables

- No descargar pesos del modelo.
- No descargar archivos `.safetensors`, `.bin`, `.gguf`, `.pt`, `.onnx` ni similares.
- Descargar únicamente `config.json` y, si es estrictamente necesario, pequeños archivos de metadata como `README.md`, pero el foco debe ser `config.json`.
- No modificar ni borrar archivos dentro de `models-config-test/` salvo que sea estrictamente necesario y esté justificado.
- La carpeta oficial para comparar debe ser `models-config-contrast/`.
- La aplicación no debe inventar benchmarks reales si no existen en los `config.json`.
- Las gráficas deben mostrar **atributos arquitectónicos derivados del config**, no desempeño real en MMLU, SWE-Bench, GPQA, etc., salvo que se cree explícitamente un archivo separado de benchmarks manuales.
- Cualquier afirmación de “mejor” o “peor” debe estar explicada como inferencia arquitectónica, no como benchmark empírico.
- La aplicación desplegada en Vercel no puede escribir directamente en el repositorio. Para modelos pegados desde la UI, debe usar `localStorage` y opción de exportar/descargar JSON.
- El commit y push se hacen solo después de que build/lint/validaciones pasen.

---

## 3. Modelos que deben quedar sí o sí en `models-config-contrast/`

Crear o completar esta lista de modelos. Para cada uno, descargar el `config.json` desde Hugging Face usando la ruta:

```text
https://huggingface.co/<repo-id>/resolve/main/config.json
```

Usar estos repositorios preferentes:

| Nombre visible | Repo Hugging Face preferente | Archivo destino sugerido |
|---|---|---|
| Gemma 4 31B-IT | `google/gemma-4-31B-it` | `modelo-gemma-4-31b-it.json` |
| Qwen3.6-27B VL | `Qwen/Qwen3.6-27B` | `modelo-qwen3-6-27b.json` |
| Llama 4 Scout | `meta-llama/Llama-4-Scout-17B-16E` | `modelo-llama-4-scout-17b-16e.json` |
| GPT-OSS-120B | `openai/gpt-oss-120b` | `modelo-gpt-oss-120b.json` |
| DeepSeek V4-Flash | `deepseek-ai/DeepSeek-V4-Flash` | `modelo-deepseek-v4-flash.json` |
| Qwen3.5-397B-A17B | `Qwen/Qwen3.5-397B-A17B` | `modelo-qwen3-5-397b-a17b.json` |
| GLM-5.1 | `zai-org/GLM-5.1` | `modelo-glm-5-1.json` |
| DeepSeek V4-Pro | `deepseek-ai/DeepSeek-V4-Pro` | `modelo-deepseek-v4-pro.json` |

Notas:

- Para **Qwen3.6-27B VL**, primero verifica si existe un repositorio exacto tipo `Qwen/Qwen3.6-27B-VL`. Si no existe, usar `Qwen/Qwen3.6-27B`, que parece ser el repositorio oficial más cercano.
- Para **Llama 4 Scout**, puede haber repositorios gated o con permisos. Intentar primero `meta-llama/Llama-4-Scout-17B-16E`. Si falla por permisos, dejar el error documentado y usar como fallback `unsloth/Llama-4-Scout-17B-16E-Instruct`, pero marcando en metadata que es fallback.
- Si un archivo ya existe, no sobrescribir silenciosamente. Comparar contenido o crear backup antes de reemplazar.

---

## 4. Script de descarga de configs

Crear un script, idealmente:

```text
scripts/download-model-configs.mjs
```

Debe:

1. Tener una lista declarativa de modelos con:
   - `displayName`
   - `repoId`
   - `fallbackRepoId`, si aplica
   - `outputFile`
   - `sourceUrl`
2. Descargar solo `config.json`.
3. Validar que la respuesta sea JSON válido.
4. Guardar cada archivo en `models-config-contrast/`.
5. Crear o actualizar un archivo de metadata separado, por ejemplo:

```text
models-config-contrast/_model_sources.json
```

Ese archivo puede contener:

```json
{
  "models": [
    {
      "displayName": "GPT-OSS-120B",
      "repoId": "openai/gpt-oss-120b",
      "file": "modelo-gpt-oss-120b.json",
      "sourceUrl": "https://huggingface.co/openai/gpt-oss-120b/resolve/main/config.json",
      "downloadedAt": "...",
      "status": "ok"
    }
  ]
}
```

Agregar comandos en `package.json`:

```json
{
  "scripts": {
    "download:configs": "node scripts/download-model-configs.mjs"
  }
}
```

El script debe ser idempotente y mostrar una tabla final con modelos descargados, omitidos o fallidos.

---

## 5. Normalización de métricas desde los `config.json`

Crear un script:

```text
scripts/build-model-index.mjs
```

Este script debe leer todos los `.json` dentro de:

```text
models-config-contrast/
```

Excluir archivos auxiliares como:

```text
_model_sources.json
_model_index.json
```

Debe generar un índice para la UI, por ejemplo:

```text
src/data/generated/model-index.json
```

O, si la app es puramente estática:

```text
public/model-index.json
```

El índice debe contener tanto:

1. Datos raw relevantes.
2. Métricas normalizadas comparables.
3. Metadata de origen.
4. Alertas cuando una métrica no existe en un modelo.

### 5.1 Campos a extraer

Los modelos tienen estructuras distintas. Implementar helpers tipo:

```js
getFirst(config, [
  "text_config.hidden_size",
  "hidden_size",
  "model.hidden_size"
])
```

Extraer, cuando exista:

- `architectures`
- `model_type`
- `torch_dtype`
- `transformers_version`
- `hidden_size`
- `num_hidden_layers`
- `num_attention_heads`
- `num_key_value_heads`
- `head_dim`
- `intermediate_size`
- `intermediate_size_mlp`
- `vocab_size`
- `max_position_embeddings`
- `attention_chunk_size`
- `rope_theta`
- `rope_scaling`
- `num_local_experts`
- `num_experts_per_tok`
- `interleave_moe_layer_step`
- `router_aux_loss_coef`
- `vision_config.hidden_size`
- `vision_config.num_hidden_layers`
- `vision_config.image_size`
- `vision_config.patch_size`
- existencia de `vision_config`

### 5.2 Métricas derivadas sugeridas

Crear métricas comparables, por ejemplo:

```json
{
  "contextWindowTokens": 1048576,
  "layers": 48,
  "hiddenSize": 5120,
  "attentionHeads": 40,
  "kvHeads": 8,
  "headDim": 128,
  "vocabSize": 202048,
  "hasVision": true,
  "isMoE": true,
  "totalExperts": 128,
  "activeExpertsPerToken": 1,
  "dtype": "bfloat16"
}
```

También crear scores normalizados de 0 a 100 solo para visualización:

- `contextScore`
- `widthScore`
- `depthScore`
- `attentionScore`
- `moeScore`
- `multimodalScore`
- `deploymentComplexityScore`

Aclaración importante: estos scores son heurísticos para comparar arquitectura, no benchmark real.

---

## 6. Aplicación web local en puerto 5050

Si el proyecto no tiene frontend todavía, crear una app con:

- React
- TypeScript
- Vite
- Tailwind
- Recharts
- Framer Motion, si aporta valor visual
- shadcn/ui si ya está instalado o si conviene incorporarlo sin sobrecomplicar

Configurar Vite para puerto 5050:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    port: 5050,
    host: "0.0.0.0"
  }
})
```

Agregar scripts:

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5050",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0 --port 5050",
    "download:configs": "node scripts/download-model-configs.mjs",
    "build:model-index": "node scripts/build-model-index.mjs",
    "generate:explanations": "node scripts/generate-model-explanations.mjs",
    "prepare:data": "npm run download:configs && npm run build:model-index && npm run generate:explanations"
  }
}
```

---

## 7. Diseño UI esperado

Usar el skill de diseño disponible en:

```text
.claude/skills/frontend-design/SKILL.md
```

La UI debe sentirse como una herramienta moderna de análisis técnico, no como una tabla plana.

Inspiración visual:

- Página de lanzamiento de modelos tipo Anthropic.
- Gráficos limpios.
- Tarjetas amplias.
- Jerarquía visual clara.
- Secciones tipo “Benchmark / Architecture / Trade-offs”.
- Animaciones sutiles, no excesivas.

No copiar branding de Anthropic.

### 7.1 Pantalla principal

Debe incluir:

1. Header:
   - Título: `Comparador IA`
   - Subtítulo: `Análisis arquitectónico desde config.json`
   - Botón o texto indicando `localhost:5050`

2. Selector de modelo base/default:
   - Default sugerido: `GPT-OSS-120B`
   - Permitir cambiarlo.

3. Selector de modelo a comparar:
   - Debe listar todos los modelos encontrados en `models-config-contrast/`.

4. Cards resumen:
   - Familia/model type.
   - Arquitectura.
   - Context window.
   - Capas.
   - Hidden size.
   - Attention heads.
   - KV heads.
   - MoE sí/no.
   - Vision sí/no.
   - Dtype.

5. Gráficos:
   - Barras comparativas base vs seleccionado.
   - Radar chart de scores normalizados.
   - Gráfico de “perfil arquitectónico”.
   - Tabla comparativa compacta.
   - Sección de advertencias por campos faltantes.

6. Explicación textual:
   - `Dónde gana`
   - `Dónde pierde`
   - `Empate o diferencia menor`
   - `Cuidado metodológico`

7. Vista raw:
   - Botón para ver/ocultar el `config.json` original del modelo seleccionado.

### 7.2 Estilo sugerido

- Modo dark preferente.
- Fondo sobrio, con gradientes muy suaves.
- Cards con borde fino.
- Uso de acentos azules/celestes/violetas, sin saturar.
- Tipografía limpia.
- No sobrecargar la pantalla con texto.
- Mobile responsive.

---

## 8. Gráficas requeridas

Implementar al menos estas gráficas:

### 8.1 Comparación directa

Bar chart horizontal o vertical para:

- `contextWindowTokens`
- `layers`
- `hiddenSize`
- `attentionHeads`
- `kvHeads`
- `vocabSize`
- `totalExperts`
- `activeExpertsPerToken`

### 8.2 Radar arquitectónico

Radar chart con:

- Contexto
- Profundidad
- Ancho
- Atención
- MoE
- Multimodalidad
- Complejidad de despliegue

### 8.3 Perfil de arquitectura

Un gráfico o layout tipo “stack” que muestre:

- Texto
- Visión
- MoE
- Attention/KV
- Context window

### 8.4 Tabla técnica

Tabla con columnas:

```text
Métrica | Modelo base | Modelo seleccionado | Lectura simple
```

Ejemplo de lectura simple:

```text
Context window | 131072 | 1048576 | El modelo seleccionado acepta más contexto teórico según config.
```

---

## 9. Explicaciones generadas una vez y guardadas

Crear un script:

```text
scripts/generate-model-explanations.mjs
```

Debe generar explicaciones en español para cada modelo comparado contra el default.

Salida sugerida:

```text
src/data/generated/explanations.json
```

Estructura sugerida:

```json
{
  "baselineSlug": "gpt-oss-120b",
  "items": {
    "gemma-4-31b-it": {
      "wins": ["..."],
      "losses": ["..."],
      "ties": ["..."],
      "summary": "...",
      "methodologyWarning": "Esta lectura se basa en config.json, no en benchmarks empíricos."
    }
  }
}
```

La explicación debe cumplir:

- Español claro.
- Tono técnico, pero entendible.
- No inventar resultados de benchmarks.
- Explicar que el análisis se basa en arquitectura declarada en `config.json`.
- Si faltan campos, decirlo explícitamente.
- Si el modelo tiene `vision_config`, explicar que hay soporte multimodal declarado.
- Si tiene MoE, explicar expertos totales y expertos activos por token cuando esté disponible.

---

## 10. Evaluar un nuevo modelo desde la UI

Agregar una sección o modal:

```text
Agregar modelo por config.json
```

Debe permitir:

1. Pegar el contenido de un `config.json` en un textarea.
2. Validar JSON.
3. Ingresar nombre visible del modelo.
4. Generar slug/filename sugerido.
5. Previsualizar métricas extraídas.
6. Compararlo inmediatamente contra el modelo default.
7. Guardarlo en `localStorage` para la sesión del navegador.
8. Exportar/descargar el JSON como archivo.

Importante:

- En local/Vercel, la UI no debe prometer que puede hacer commit automático al repo.
- Mostrar una instrucción simple para agregarlo definitivamente:

```bash
# Guardar el archivo descargado o copiado en:
models-config-contrast/modelo-nuevo-modelo.json

npm run build:model-index
npm run generate:explanations
npm run dev
```

---

## 11. Vercel

Preparar el proyecto para Vercel.

Si es Vite React, normalmente basta con:

```text
Build command: npm run build
Output directory: dist
```

Crear `vercel.json` si aporta claridad:

```json
{
  "buildCommand": "npm run prepare:data && npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Validar que la app funcione sin depender de lectura dinámica del filesystem en producción. Por eso el índice de modelos debe quedar generado antes del build.

---

## 12. Validaciones obligatorias

Antes del commit:

```bash
npm install
npm run prepare:data
npm run build
```

Si existe lint:

```bash
npm run lint
```

Probar local:

```bash
npm run dev
```

Debe levantar en:

```text
http://localhost:5050
```

Verificar visualmente:

- Aparecen los modelos de `models-config-contrast/`.
- GPT-OSS-120B queda disponible como default.
- Se puede cambiar el modelo base.
- Se puede seleccionar otro modelo.
- Los gráficos cambian.
- La explicación cambia.
- Se puede pegar un nuevo `config.json`.
- El JSON pegado se valida.
- El modelo pegado se puede comparar temporalmente.
- La app compila para producción.

---

## 13. Commit y push

Cuando todo esté listo:

```bash
git status
git add .
git commit -m "feat: add AI model config comparator"
git push
```

Si no estás en una rama adecuada, crear una:

```bash
git checkout -b feature/ai-model-config-comparator
```

No hacer merge automático.

---

## 14. Entregable esperado

Al finalizar, entregar un resumen con:

1. Archivos creados/modificados.
2. Modelos descargados correctamente.
3. Modelos que fallaron y razón.
4. URL local de prueba.
5. Estado de build.
6. Estado de commit/push.
7. Instrucciones para desplegar/ver en Vercel.

---

## 15. Criterios de aceptación

El trabajo está terminado solo si:

- Existe una app interactiva funcionando en `localhost:5050`.
- La app compara modelos desde `models-config-contrast/`.
- Los 8 modelos solicitados están descargados o se documentó claramente por qué alguno no pudo descargarse.
- Existen gráficos comparativos.
- Existe explicación textual de ventajas/desventajas contra modelo default.
- Se puede pegar un nuevo `config.json` desde la UI.
- El proyecto queda listo para Vercel.
- `npm run build` pasa.
- Se hizo commit y push.

