<!-- <script setup lang="ts">
import { ref } from 'vue'

const pdfFile = ref<File | null>(null)
const loading = ref(false)
const cantidad = ref(20)

// Captura el archivo PDF seleccionado
const handleFileChange = (event: any) => {
  const file = event.target.files[0]
  if (file) {
    pdfFile.value = file
  }
}

// Función que llama a la API /api/convertPdfToJpg
const crearLibro = async () => {
  if (!pdfFile.value) {
    console.error('No se ha seleccionado un archivo PDF.')
    return
  }

  loading.value = true
  try {
    // Preparamos el archivo para enviarlo al backend
    const formData = new FormData()
    formData.append('file', pdfFile.value)
    formData.append('calidad', cantidad.value.toString())

    // Llamada al endpoint de Vercel
    const response = await fetch('/api/convertPdfToJpg', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) throw new Error('Error en la conversión')

    const data = await response.json()
    console.log('✅ Imágenes generadas:', data.images)

    // Ejemplo: mostrar la primera imagen en base64
    // (solo si quieres ver el resultado en el navegador)
    const img = document.createElement('img')
    img.src = `data:image/jpeg;base64,${data.images[0]}`
    document.body.appendChild(img)
  } catch (error) {
    console.error('Error al convertir el PDF:', error)
  } finally {
    loading.value = false
  }
}
</script>





<template>

  <div class="container mt-5">
    <div>
      <img src="../logo.png" class="logo" />
    </div>
    <div class="row">
      <div class="col-md-5 mx-auto">
        <h3 class="text-center mb-4" style="font-size:larger;">Caja de Introducción de PDF</h3>
        <form>
          <div class="form-group">
            <label for="pdfFile">Seleccionar archivo PDF</label>
            <div>
              <input type="file" class="form-control" id="pdfFile" accept=".pdf" @change="handleFileChange" />
            </div>
          </div>
          <div class="form-group">
            <label for="cantidad">Calidad del documento:</label>
            <div class="range-slider">
              <span class="range-value">{{ cantidad }}</span>
              <input type="range" class="form-control-range" id="cantidad" v-model="cantidad" min="1" max="100" />
            </div>
          </div>

          <button type="button" class="btn btn-primary" @click="crearLibro" v-if="!loading && pdfFilePath">Crear
            libro</button>
        </form>

        <div v-if="loading" class="flex-center">
          <div>
            <h1>Creando libro</h1>
          </div>
          <div class="lds-spinner">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  </div>




</template> -->


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
            <label for="cantidad">Calidad del documento:</label>
            <div class="range-slider">
              <span class="range-value">{{ cantidad }}</span>
              <input type="range" class="form-control-range" v-model="cantidad" min="1" max="100" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-3" :disabled="loading || !pdfFile">
            {{ loading ? 'Creando libro...' : 'Crear libro' }}
          </button>
        </form>

        <div v-if="loading" class="flex-center mt-3">
          <div>
            <h4>Procesando PDF...</h4>
          </div>
        </div>

        <div id="flipbook" class="mt-4"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

const pdfFile = ref<File | null>(null);
const loading = ref(false);
const cantidad = ref(20);

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  pdfFile.value = file;
};

const crearLibro = async () => {
  if (!pdfFile.value) return alert('Selecciona un PDF primero.');

  loading.value = true;

  try {
    const formData = new FormData();
    formData.append('file', pdfFile.value);
    formData.append('calidad', cantidad.value.toString());

    const res = await fetch('/api/convertPdfToJpg', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Error al convertir PDF');

    const { images } = await res.json();

    // Montar Turn.js / template3
    await nextTick();
    const flipbook = document.getElementById('flipbook');
    if (!flipbook) return;

    flipbook.innerHTML = ''; // limpiar

    images.forEach((b64: string) => {
      const page = document.createElement('div');
      const img = document.createElement('img');
      img.src = `data:image/jpeg;base64,${b64}`;
      img.style.width = '100%';
      page.appendChild(img);
      flipbook.appendChild(page);
    });

    // Inicializa Turn.js (asegúrate de que esté importado globalmente)
    // @ts-ignore
    $(flipbook).turn({
      width: 800,
      height: 600,
      autoCenter: true
    });

  } catch (err) {
    console.error(err);
    alert('Error al crear el libro');
  } finally {
    loading.value = false;
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
</style>
