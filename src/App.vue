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



<template>
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

        <!-- Contenedor del flipbook -->
        <div v-if="images.length > 0" class="mt-5">
          <h4 class="text-center mb-3">Tu Libro Digital</h4>
          <div id="flipbook" class="mx-auto">
            <div v-for="(image, index) in images" :key="index" class="page">
              <img :src="'data:image/jpeg;base64,' + image" :alt="'Página ' + (index + 1)" />
            </div>
          </div>
          
          <!-- Controles de navegación -->
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
</script>

<style scoped>
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
</style>
