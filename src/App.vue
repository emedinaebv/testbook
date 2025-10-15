<!-- 
<template>
  <div class="container mt-5">
    <div>
      <img src="../logo.png" class="logo"/>
    </div>

    <div class="row">
      <div class="col-md-5 mx-auto">
        <h3 class="text-center mb-4" style="font-size:larger;">Caja de Introducción de PDF</h3>
        
        <form @submit.prevent="crearLibro">
          <div class="form-group">
            <label for="pdfFile">Seleccionar archivo PDF</label>
            <input type="file" class="form-control" id="pdfFile" accept=".pdf" @change="handleFileChange" />
          </div>

          <div class="form-group mt-3">
            <label for="calidad">Calidad del documento:</label>
            <div class="range-slider">
              <span class="range-value">{{ calidad }}</span>
              <input type="range" class="form-control-range" v-model="calidad" min="1" max="100" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-3" :disabled="loading || !pdfFile">
            {{ loading ? 'Creando libro...' : 'Crear libro' }}
          </button>
        </form>

        <div v-if="loading" class="flex-center mt-3">
          <div class="lds-spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <h4>Procesando PDF... {{ progreso }}</h4>
        </div>

        <div v-if="error" class="alert alert-danger mt-3">
          {{ error }}
        </div>

        <div id="flipbook" class="mt-4"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';

const pdfFile = ref<File | null>(null);
const loading = ref(false);
const calidad = ref(80);
const error = ref('');
const progreso = ref('');
const pdfjsLib = ref<any>(null);

// Configurar PDF.js correctamente
onMounted(async () => {
  try {
    // Importar pdfjs-dist con la versión correcta
    pdfjsLib.value = await import('pdfjs-dist');
    
    // Usar la versión compatible del worker
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min?url');
    pdfjsLib.value.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    
    console.log('PDF.js cargado correctamente');
  } catch (err) {
    console.error('Error cargando PDF.js:', err);
    error.value = 'Error al cargar el visor de PDF';
  }
});

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  pdfFile.value = file;
  error.value = '';
};

const crearLibro = async () => {
  if (!pdfFile.value) {
    error.value = 'Selecciona un PDF primero.';
    return;
  }

  if (!pdfjsLib.value) {
    error.value = 'PDF library no cargada. Recarga la página.';
    return;
  }

  loading.value = true;
  error.value = '';
  progreso.value = '';

  try {
    const arrayBuffer = await pdfFile.value.arrayBuffer();
    
    // Cargar el PDF
    const pdf = await pdfjsLib.value.getDocument({ 
      data: arrayBuffer,
      // Opciones para mejor compatibilidad
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true
    }).promise;
    
    const numPages = pdf.numPages;
    const images: string[] = [];

    console.log(`Procesando ${numPages} páginas...`);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      progreso.value = `Página ${pageNum} de ${numPages}`;
      
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Mayor escala para mejor calidad
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo obtener el contexto del canvas');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Convertir a JPEG con la calidad seleccionada
            const imageData = canvas.toDataURL('image/jpeg', calidad.value / 100);
            const parts = imageData.split(',');
            if (parts.length < 2) {
              throw new Error('Formato de imagen inesperado al convertir a base64');
            }
            const base64 = parts[1];
            if (!base64) {
              throw new Error('Formato de imagen inesperado: base64 vacío');
            }
            images.push(base64); // Solo el base64

      // Limpiar canvas
      canvas.width = 0;
      canvas.height = 0;
    }

    await mostrarLibro(images);
    
  } catch (err: any) {
    console.error('Error procesando PDF:', err);
    error.value = `Error al procesar PDF: ${err.message}`;
  } finally {
    loading.value = false;
    progreso.value = '';
  }
};

const mostrarLibro = async (images: string[]) => {
  await nextTick();
  const flipbook = document.getElementById('flipbook');
  if (!flipbook) {
    error.value = 'No se encontró el contenedor del libro';
    return;
  }

  flipbook.innerHTML = '';

  images.forEach((b64: string, index: number) => {
    const page = document.createElement('div');
    page.className = 'page';
    page.style.background = 'white';
    page.style.border = '1px solid #ccc';
    page.style.padding = '10px';
    
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${b64}`;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxWidth = '100%';
    img.alt = `Página ${index + 1}`;
    
    page.appendChild(img);
    flipbook.appendChild(page);
  });

  // Inicializar Turn.js si está disponible
  if (typeof window !== 'undefined' && (window as any).$ && (window as any).$.fn.turn) {
    (window as any).$(flipbook).turn({
      width: 800,
      height: 600,
      autoCenter: true,
      elevation: 50,
      gradients: true,
      duration: 1000
    });
  } else {
    console.warn('Turn.js no está disponible. Mostrando páginas simples.');
    // Estilo alternativo si Turn.js no está disponible
    flipbook.style.display = 'flex';
    flipbook.style.flexDirection = 'column';
    flipbook.style.gap = '10px';
  }
};
</script>





<style>
body {
  display: block;
  position: fixed;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;

}


.logo {
  height: 9em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;


}

.lds-spinner {
  color: official;
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}

.lds-spinner div {
  transform-origin: 40px 40px;
  animation: lds-spinner 1.2s linear infinite;
}

.lds-spinner div:after {
  content: " ";
  display: block;
  position: absolute;
  top: 3px;
  left: 37px;
  width: 6px;
  height: 18px;
  border-radius: 20%;
  background: #fff;
}

.lds-spinner div:nth-child(1) {
  transform: rotate(0deg);
  animation-delay: -1.1s;
}

.lds-spinner div:nth-child(2) {
  transform: rotate(30deg);
  animation-delay: -1s;
}

.lds-spinner div:nth-child(3) {
  transform: rotate(60deg);
  animation-delay: -0.9s;
}

.lds-spinner div:nth-child(4) {
  transform: rotate(90deg);
  animation-delay: -0.8s;
}

.lds-spinner div:nth-child(5) {
  transform: rotate(120deg);
  animation-delay: -0.7s;
}

.lds-spinner div:nth-child(6) {
  transform: rotate(150deg);
  animation-delay: -0.6s;
}

.lds-spinner div:nth-child(7) {
  transform: rotate(180deg);
  animation-delay: -0.5s;
}

.lds-spinner div:nth-child(8) {
  transform: rotate(210deg);
  animation-delay: -0.4s;
}

.lds-spinner div:nth-child(9) {
  transform: rotate(240deg);
  animation-delay: -0.3s;
}

.lds-spinner div:nth-child(10) {
  transform: rotate(270deg);
  animation-delay: -0.2s;
}

.lds-spinner div:nth-child(11) {
  transform: rotate(300deg);
  animation-delay: -0.1s;
}

.lds-spinner div:nth-child(12) {
  transform: rotate(330deg);
  animation-delay: 0s;
}

@keyframes lds-spinner {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

.range-slider {
  position: relative;
}

.range-value {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem;
  background-color: #007bff;
  color: #fff;
  border-radius: 5px;
}

.form-control-range {
  width: 100%;
}
</style> -->



<!-- <template>
  <div class="container mt-5">
    <div>
      <img src="../logo.png" class="logo"/>
    </div>

    <div class="row">
      <div class="col-md-8 mx-auto">
        <h3 class="text-center mb-4" style="font-size:larger;">Convertidor PDF a Libro Digital</h3>
        
        <form @submit.prevent="crearLibro">
          <div class="form-group mb-3">
            <label for="pdfFile" class="form-label">Seleccionar archivo PDF</label>
            <input type="file" class="form-control" id="pdfFile" accept=".pdf" @change="handleFileChange" />
          </div>

          <div class="form-group mb-3">
            <label for="calidad" class="form-label">Calidad del documento: {{ calidad }}%</label>
            <input type="range" class="form-range" v-model="calidad" min="1" max="100" />
          </div>

          <button type="submit" class="btn btn-primary w-100" :disabled="loading || !pdfFile">
            {{ loading ? 'Procesando...' : 'Crear Libro Digital' }}
          </button>
        </form>

        <div v-if="loading" class="text-center mt-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <p class="mt-2">{{ progreso }}</p>
        </div>

        <div v-if="error" class="alert alert-danger mt-3" role="alert">
          {{ error }}
        </div>

      
        <div v-if="images.length > 0" class="mt-5">
          <h4 class="text-center mb-3">Tu Libro Digital</h4>
          <div id="flipbook" class="mx-auto">
            <div v-for="(image, index) in images" :key="index" class="page">
              <img :src="'data:image/jpeg;base64,' + image" :alt="'Página ' + (index + 1)" />
            </div>
          </div>
          
  
          <div class="text-center mt-3">
            <button @click="previousPage" class="btn btn-outline-primary me-2" :disabled="currentPage <= 1">
              Anterior
            </button>
            <span class="mx-3">Página {{ currentPage }} de {{ images.length }}</span>
            <button @click="nextPage" class="btn btn-outline-primary ms-2" :disabled="currentPage >= images.length">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const pdfFile = ref<File | null>(null);
const loading = ref(false);
const calidad = ref(80);
const error = ref('');
const progreso = ref('');
const images = ref<string[]>([]);
const currentPage = ref(1);
const turnJsLoaded = ref(false);

// Cargar Turn.js dinámicamente
onMounted(async () => {
  await loadTurnJS();
});

const loadTurnJS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).$ && (window as any).$.fn.turn) {
      turnJsLoaded.value = true;
      resolve();
      return;
    }

    // Cargar jQuery si no existe
    if (typeof window !== 'undefined' && !(window as any).jQuery) {
      const jqueryScript = document.createElement('script');
      jqueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      jqueryScript.onload = () => {
        loadTurnCore();
      };
      jqueryScript.onerror = () => {
        console.warn('No se pudo cargar jQuery, usando modo simple');
        resolve();
      };
      document.head.appendChild(jqueryScript);
    } else {
      loadTurnCore();
    }

    function loadTurnCore() {
      const turnScript = document.createElement('script');
      turnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/turn.js/4.1.1/turn.min.js';
      turnScript.onload = () => {
        turnJsLoaded.value = true;
        console.log('Turn.js cargado correctamente');
        resolve();
      };
      turnScript.onerror = () => {
        console.warn('No se pudo cargar Turn.js, usando modo simple');
        resolve();
      };
      document.head.appendChild(turnScript);
    }
  });
};

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  pdfFile.value = file;
  error.value = '';
  images.value = [];
};

const crearLibro = async () => {
  if (!pdfFile.value) {
    error.value = 'Selecciona un PDF primero.';
    return;
  }

  loading.value = true;
  error.value = '';
  images.value = [];

  try {
    const arrayBuffer = await pdfFile.value.arrayBuffer();
    
    // Usar PDF.js directamente desde CDN para evitar problemas de versión
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer 
    }).promise;
    
    const numPages = pdf.numPages;
    const convertedImages: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      progreso.value = `Procesando página ${pageNum} de ${numPages}`;
      
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo obtener el contexto del canvas');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvas,
        viewport
      }).promise;

      const imageData = canvas.toDataURL('image/jpeg', calidad.value / 100);
      const parts = imageData.split(',');
      if (parts.length < 2 || !parts[1]) {
        throw new Error('Formato de imagen inesperado al convertir a base64');
      }
      convertedImages.push(parts[1]);
    }

    images.value = convertedImages;
    await nextTick();
    await initializeFlipbook();
    
  } catch (err: any) {
    console.error('Error procesando PDF:', err);
    error.value = `Error al procesar PDF: ${err.message}`;
  } finally {
    loading.value = false;
    progreso.value = '';
  }
};

const initializeFlipbook = async () => {
  const flipbook = document.getElementById('flipbook');
  if (!flipbook) return;

  // Esperar a que Turn.js esté cargado
  if (!turnJsLoaded.value) {
    await loadTurnJS();
  }

  if (turnJsLoaded.value && (window as any).$ && (window as any).$.fn.turn) {
    try {
      (window as any).$(flipbook).turn({
        width: 800,
        height: 600,
        autoCenter: true,
        duration: 1000,
        when: {
          turning: (event: any, page: number) => {
            currentPage.value = page;
          }
        }
      });
      console.log('Flipbook inicializado con Turn.js');
    } catch (err) {
      console.warn('Error inicializando Turn.js:', err);
      setupSimpleView();
    }
  } else {
    setupSimpleView();
  }
};

const setupSimpleView = () => {
  console.log('Usando vista simple de páginas');
  const flipbook = document.getElementById('flipbook');
  if (flipbook) {
    flipbook.style.display = 'grid';
    flipbook.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
    flipbook.style.gap = '10px';
    flipbook.style.padding = '20px';
  }
};

const nextPage = () => {
  if (currentPage.value < images.value.length) {
    currentPage.value++;
    navigateToPage(currentPage.value);
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    navigateToPage(currentPage.value);
  }
};

const navigateToPage = (pageNumber: number) => {
  const flipbook = document.getElementById('flipbook');
  if (flipbook && (window as any).$ && (window as any).$.fn.turn) {
    (window as any).$(flipbook).turn('page', pageNumber);
  }
};
</script> -->

<!-- <style scoped>
.logo {
  height: 9em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

#flipbook {
  width: 800px;
  height: 600px;
  margin: 0 auto;
  background: #f0f0f0;
  border: 1px solid #ccc;
  box-shadow: 0 0 20px rgba(0,0,0,0.2);
}

.page {
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page img {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
}

/* Estilos para el modo simple (sin Turn.js) */
#flipbook[style*="grid"] .page {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
  background: white;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

/* Responsive */
@media (max-width: 768px) {
  #flipbook {
    width: 100%;
    height: 400px;
  }
}
</style> -->


<template>
  <div class="container mt-5">
    <div class="text-center mb-4">
      <img src="../logo.png" class="logo" alt="Logo" />
    </div>

    <div class="row">
      <div class="col-md-8 mx-auto">
        <h3 class="text-center mb-4" style="font-size: larger;">Convertidor PDF a Libro Digital</h3>
        
        <form @submit.prevent="crearLibro" class="card p-4 shadow-sm">
          <div class="form-group mb-3">
            <label for="pdfFile" class="form-label fw-bold">Seleccionar archivo PDF</label>
            <input 
              type="file" 
              class="form-control" 
              id="pdfFile" 
              accept=".pdf" 
              @change="handleFileChange"
              :disabled="loading"
            />
            <div class="form-text">Selecciona un archivo PDF para convertirlo en libro digital</div>
          </div>

          <div class="form-group mb-4">
            <label for="calidad" class="form-label fw-bold">
              Calidad del documento: <span class="text-primary">{{ calidad }}%</span>
            </label>
            <input 
              type="range" 
              class="form-range" 
              v-model="calidad" 
              min="30" 
              max="100" 
              :disabled="loading"
            />
            <div class="d-flex justify-content-between text-muted small">
              <span>Baja calidad</span>
              <span>Alta calidad</span>
            </div>
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-100 py-2 fw-bold" 
            :disabled="loading || !pdfFile"
          >
            <span v-if="loading">
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
              Procesando PDF...
            </span>
            <span v-else>
              🎨 Crear Libro Digital
            </span>
          </button>
        </form>

        <!-- Indicador de progreso -->
        <div v-if="loading" class="alert alert-info mt-3 text-center">
          <div class="spinner-border text-primary me-2" role="status"></div>
          <strong>{{ progreso }}</strong>
        </div>

        <!-- Mensaje de error -->
        <div v-if="error" class="alert alert-danger mt-3" role="alert">
          <strong>Error:</strong> {{ error }}
        </div>

        <!-- Vista del libro digital -->
        <div v-if="images.length > 0" class="mt-5">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="text-primary mb-0">Tu Libro Digital</h4>
            <span class="badge bg-primary fs-6">{{ images.length }} página{{ images.length !== 1 ? 's' : '' }}</span>
          </div>
          
          <!-- Navegación principal -->
          <div class="navigation-controls mb-4">
            <button 
              @click="previousPage" 
              class="btn btn-outline-primary btn-lg" 
              :disabled="currentPage <= 1"
            >
              ‹‹ Anterior
            </button>
            
            <div class="page-indicator">
              <span class="fw-bold fs-5">{{ currentPage }} / {{ images.length }}</span>
            </div>
            
            <button 
              @click="nextPage" 
              class="btn btn-outline-primary btn-lg" 
              :disabled="currentPage >= images.length"
            >
              Siguiente ››
            </button>
          </div>

          <!-- Área de visualización de páginas -->
          <div class="flipbook-simple">
            <div 
              v-for="(image, index) in images" 
              :key="index" 
              class="page-simple"
              :class="{ 
                'active': currentPage === index + 1,
                'page-even': (index + 1) % 2 === 0,
                'page-odd': (index + 1) % 2 === 1
              }"
              :id="'page-' + (index + 1)"
            >
              <div class="page-header">
                <span class="page-number">Página {{ index + 1 }}</span>
                <span class="document-title">{{ pdfFileName }}</span>
              </div>
              <div class="page-content">
                <img 
                  :src="'data:image/jpeg;base64,' + image" 
                  :alt="'Página ' + (index + 1)"
                  @load="onImageLoad"
                  @error="onImageError"
                />
              </div>
              <div class="page-footer">
                <small class="text-muted">Generado con PDF to Flipbook</small>
              </div>
            </div>
          </div>

          <!-- Navegación inferior -->
          <div class="navigation-controls mt-4">
            <button 
              @click="firstPage" 
              class="btn btn-outline-secondary" 
              :disabled="currentPage <= 1"
            >
              Primera
            </button>
            
            <button 
              @click="previousPage" 
              class="btn btn-outline-primary" 
              :disabled="currentPage <= 1"
            >
              ‹ Anterior
            </button>
            
            <div class="page-indicator">
              <span class="fw-bold">{{ currentPage }} de {{ images.length }}</span>
            </div>
            
            <button 
              @click="nextPage" 
              class="btn btn-outline-primary" 
              :disabled="currentPage >= images.length"
            >
              Siguiente ›
            </button>
            
            <button 
              @click="lastPage" 
              class="btn btn-outline-secondary" 
              :disabled="currentPage >= images.length"
            >
              Última
            </button>
          </div>

          <!-- Miniaturas -->
          <div class="thumbnails-section mt-5">
            <h6 class="text-center mb-3 text-muted">Navegación rápida</h6>
            <div class="thumbnails">
              <div 
                v-for="(image, index) in images" 
                :key="'thumb-' + index"
                class="thumbnail"
                :class="{ 
                  'active': currentPage === index + 1,
                  'viewed': viewedPages.includes(index + 1)
                }"
                @click="goToPage(index + 1)"
              >
                <div class="thumbnail-image-container">
                  <img 
                    :src="'data:image/jpeg;base64,' + image" 
                    :alt="'Página ' + (index + 1)"
                    loading="lazy"
                  />
                  <div class="thumbnail-overlay">
                    <span class="thumbnail-number">{{ index + 1 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="action-buttons mt-4 text-center">
            <button @click="descargarImagen" class="btn btn-success me-2">
              📥 Descargar Página Actual
            </button>
            <button @click="reiniciar" class="btn btn-outline-secondary">
              🔄 Nuevo PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Variables reactivas
const pdfFile = ref<File | null>(null);
const pdfFileName = ref<string>('');
const loading = ref(false);
const calidad = ref(80);
const error = ref('');
const progreso = ref('');
const images = ref<string[]>([]);
const currentPage = ref(1);
const viewedPages = ref<number[]>([]);
const pdfjsLib = ref<any>(null);

// Inicializar PDF.js
onMounted(async () => {
  try {
    // Cargar PDF.js dinámicamente
    pdfjsLib.value = await import('pdfjs-dist');
    const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min?url');
    pdfjsLib.value.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    console.log('PDF.js inicializado correctamente');
  } catch (err) {
    console.error('Error cargando PDF.js:', err);
    error.value = 'Error al inicializar el visor de PDF';
  }
});

// Manejar selección de archivo
const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  if (file && file.type === 'application/pdf') {
    pdfFile.value = file;
    pdfFileName.value = file.name.replace('.pdf', '');
    error.value = '';
    images.value = [];
    currentPage.value = 1;
    viewedPages.value = [];
  } else if (file) {
    error.value = 'Por favor, selecciona un archivo PDF válido.';
  }
};

// Crear libro digital
const crearLibro = async () => {
  if (!pdfFile.value) {
    error.value = 'Selecciona un PDF primero.';
    return;
  }

  if (!pdfjsLib.value) {
    error.value = 'El visor de PDF no está cargado. Recarga la página.';
    return;
  }

  loading.value = true;
  error.value = '';
  images.value = [];
  currentPage.value = 1;
  viewedPages.value = [1];

  try {
    const arrayBuffer = await pdfFile.value.arrayBuffer();
    
    // Cargar documento PDF
    const pdf = await pdfjsLib.value.getDocument({ 
      data: arrayBuffer 
    }).promise;
    
    const numPages = pdf.numPages;
    const convertedImages: string[] = [];

    console.log(`Procesando PDF con ${numPages} páginas...`);

    // Procesar cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      progreso.value = `Procesando página ${pageNum} de ${numPages}`;
      
      const page = await pdf.getPage(pageNum);
      
      // Calcular escala para buena calidad
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('No se pudo obtener el contexto del canvas');
      }

      // Configurar canvas
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Renderizar página en canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convertir a JPEG con calidad configurada
      const quality = calidad.value / 100;
      const imageData = canvas.toDataURL('image/jpeg', quality);
      const parts = imageData.split(',');
      if (parts.length < 2 || !parts[1]) {
        throw new Error('Formato de imagen inesperado al convertir a base64');
      }
      convertedImages.push(parts[1]); // Extraer solo base64

      // Limpiar
      canvas.width = 0;
      canvas.height = 0;
    }

    images.value = convertedImages;
    console.log(`PDF convertido exitosamente: ${convertedImages.length} páginas`);
    
  } catch (err: any) {
    console.error('Error procesando PDF:', err);
    error.value = `Error al procesar PDF: ${err.message}`;
  } finally {
    loading.value = false;
    progreso.value = '';
  }
};

// Navegación
const nextPage = () => {
  if (currentPage.value < images.value.length) {
    currentPage.value++;
    markPageAsViewed(currentPage.value);
    scrollToCurrentPage();
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    markPageAsViewed(currentPage.value);
    scrollToCurrentPage();
  }
};

const firstPage = () => {
  currentPage.value = 1;
  markPageAsViewed(1);
  scrollToCurrentPage();
};

const lastPage = () => {
  currentPage.value = images.value.length;
  markPageAsViewed(images.value.length);
  scrollToCurrentPage();
};

const goToPage = (page: number) => {
  currentPage.value = page;
  markPageAsViewed(page);
  scrollToCurrentPage();
};

const scrollToCurrentPage = () => {
  const element = document.getElementById(`page-${currentPage.value}`);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }
};

const markPageAsViewed = (page: number) => {
  if (!viewedPages.value.includes(page)) {
    viewedPages.value.push(page);
  }
};

// Eventos de imagen
const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.log(`Imagen cargada: ${img.naturalWidth} x ${img.naturalHeight}`);
};

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  console.error('Error cargando imagen:', img.src.substring(0, 100));
  error.value = 'Error cargando una de las páginas';
};

// Acciones
const descargarImagen = () => {
  if (images.value.length === 0) return;

  const currentImage = images.value[currentPage.value - 1];
  const link = document.createElement('a');
  link.href = `data:image/jpeg;base64,${currentImage}`;
  link.download = `pagina-${currentPage.value}-${pdfFileName.value}.jpg`;
  link.click();
};

const reiniciar = () => {
  pdfFile.value = null;
  pdfFileName.value = '';
  images.value = [];
  currentPage.value = 1;
  viewedPages.value = [];
  error.value = '';
  
  // Reset file input
  const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
  if (fileInput) {
    fileInput.value = '';
  }
};
</script>

<style scoped>
.logo {
  height: 120px;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

/* Contenedor principal del flipbook */
.flipbook-simple {
  display: flex;
  flex-direction: column;
  gap: 25px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 25px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 15px;
  border: 3px solid #e9ecef;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

/* Estilos de página individual */
.page-simple {
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  margin: 0 auto;
  max-width: 800px;
  min-height: 500px;
  position: relative;
  transition: all 0.3s ease;
  border-left: 8px solid #007bff;
}

.page-simple.active {
  border-color: #007bff;
  box-shadow: 0 12px 35px rgba(0, 123, 255, 0.25);
  transform: translateY(-5px);
}

.page-simple.page-odd {
  border-left-color: #28a745;
}

.page-simple.page-even {
  border-left-color: #6f42c1;
}

/* Encabezado de página */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  margin-bottom: 20px;
  border-bottom: 2px solid #f8f9fa;
}

.page-number {
  background: #007bff;
  color: white;
  padding: 6px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}

.document-title {
  color: #6c757d;
  font-size: 14px;
  font-style: italic;
}

/* Contenido de página */
.page-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.page-content img {
  max-width: 100%;
  max-height: 500px;
  height: auto;
  display: block;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* Pie de página */
.page-footer {
  text-align: center;
  padding-top: 15px;
  margin-top: 20px;
  border-top: 1px solid #f8f9fa;
}

/* Controles de navegación */
.navigation-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.page-indicator {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  padding: 8px 20px;
  border-radius: 25px;
  font-weight: bold;
  min-width: 100px;
  text-align: center;
}

/* Sección de miniaturas */
.thumbnails-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.thumbnails {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 15px;
  justify-content: flex-start;
  scrollbar-width: thin;
  scrollbar-color: #007bff #f8f9fa;
}

.thumbnails::-webkit-scrollbar {
  height: 8px;
}

.thumbnails::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 10px;
}

.thumbnails::-webkit-scrollbar-thumb {
  background: #007bff;
  border-radius: 10px;
}

/* Miniaturas individuales */
.thumbnail {
  width: 70px;
  height: 100px;
  border: 3px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.thumbnail:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 123, 255, 0.3);
}

.thumbnail.active {
  border-color: #007bff;
  box-shadow: 0 0 0 2px #007bff;
}

.thumbnail.viewed:not(.active) {
  border-color: #28a745;
}

.thumbnail-image-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-number {
  background: #007bff;
  color: white;
  border-radius: 50%;
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

/* Botones de acción */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 10px;
  }

  .flipbook-simple {
    padding: 15px;
    gap: 15px;
  }

  .page-simple {
    padding: 15px;
    margin: 0 5px;
    min-height: 400px;
  }

  .page-content {
    min-height: 300px;
  }

  .page-content img {
    max-height: 350px;
  }

  .navigation-controls {
    flex-direction: column;
    gap: 10px;
  }

  .thumbnails {
    justify-content: flex-start;
    padding: 10px;
  }

  .thumbnail {
    width: 60px;
    height: 85px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .btn {
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .page-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .page-content img {
    max-height: 250px;
  }

  .thumbnail {
    width: 50px;
    height: 70px;
  }
}

/* Animaciones */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-simple {
  animation: fadeIn 0.5s ease-out;
}

/* Estados de carga */
.spinner-border {
  width: 1rem;
  height: 1rem;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Mejoras visuales adicionales */
.card {
  border: none;
  border-radius: 15px;
}

.form-range::-webkit-slider-thumb {
  background: #007bff;
}

.form-range::-moz-range-thumb {
  background: #007bff;
}

.badge {
  font-size: 0.9em;
}

.text-primary {
  color: #007bff !important;
}

.btn-primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  border: none;
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 123, 255, 0.4);
}
</style>