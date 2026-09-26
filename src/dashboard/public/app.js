document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const btnBrowse = document.getElementById('btn-browse');
  const videoFileInput = document.getElementById('video-file-input');
  const fileInfo = document.getElementById('file-info');
  const fileNameDisplay = document.getElementById('file-name');
  const fileSizeDisplay = document.getElementById('file-size');

  const contextPromptInput = document.getElementById('context-prompt');
  const categorySelect = document.getElementById('category-select');
  const languageSelect = document.getElementById('language-select');
  const btnGenerateMetadata = document.getElementById('btn-generate-metadata');

  const titleInput = document.getElementById('title-input');
  const descInput = document.getElementById('desc-input');
  const tagsInput = document.getElementById('tags-input');

  const themeSelect = document.getElementById('theme-select');
  const btnGenerateThumbnail = document.getElementById('btn-generate-thumbnail');
  const thumbnailPreviewImg = document.getElementById('thumbnail-preview-img');
  const thumbnailPlaceholder = document.getElementById('thumbnail-placeholder');
  const thumbnailProductImgInput = document.getElementById('thumbnail-product-img-input');
  const customThumbnailInput = document.getElementById('custom-thumbnail-input');

  // Video details info elements
  const videoDetailsInfo = document.getElementById('video-details-info');
  const videoDimensions = document.getElementById('video-dimensions');
  const videoDuration = document.getElementById('video-duration');
  const videoTypeBadge = document.getElementById('video-type-badge');
  const videoFormatTip = document.getElementById('video-format-tip');

  const privacySelect = document.getElementById('privacy-select');
  const dryRunCheckbox = document.getElementById('dry-run-checkbox');
  const btnUpload = document.getElementById('btn-upload');

  const progressBarFill = document.getElementById('progress-bar-fill');
  const consoleLog = document.getElementById('console-log');
  const resultCard = document.getElementById('result-card');
  const resultVideoId = document.getElementById('result-video-id');
  const resultVideoUrl = document.getElementById('result-video-url');

  let selectedFile = null;
  let generatedThumbnailUrl = '';      // URL path for display
  let generatedThumbnailDataUrl = '';  // base64 dataUrl for YouTube upload
  let loadedProductImage = null; // Store product image element for rendering

  // Utility: Append to console log
  function log(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${message}`;
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  // Utility: Update Progress Bar
  function setProgress(percent) {
    progressBarFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }

  // Drag & Drop File Handling
  btnBrowse.addEventListener('click', () => videoFileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  videoFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    fileSizeDisplay.textContent = `${sizeMb} MB`;
    fileInfo.classList.remove('hidden');
    log(`Archivo seleccionado: ${file.name} (${sizeMb} MB)`, 'info');

    if (!contextPromptInput.value.trim()) {
      contextPromptInput.value = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    }

    // Analyze video dimensions & duration
    analyzeVideo(file);
  }

  function analyzeVideo(file) {
    const videoEl = document.createElement('video');
    videoEl.preload = 'auto';
    videoEl.muted = true;
    const objectUrl = URL.createObjectURL(file);
    videoEl.src = objectUrl;

    videoEl.addEventListener('loadedmetadata', () => {
      const w = videoEl.videoWidth;
      const h = videoEl.videoHeight;
      const durSec = videoEl.duration;

      // Format duration
      const mins = Math.floor(durSec / 60);
      const secs = Math.floor(durSec % 60);
      const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      // Determine video type
      const isVertical = h > w;
      const isShortDuration = durSec <= 60;
      const isShort = isVertical && isShortDuration;

      // Display info
      videoDimensions.textContent = `${w} × ${h} px`;
      videoDuration.textContent = durStr;

      if (isShort) {
        videoTypeBadge.textContent = '📱 YouTube Short';
        videoTypeBadge.style.background = 'rgba(255, 0, 80, 0.2)';
        videoTypeBadge.style.color = '#ff4d6d';
        videoTypeBadge.style.border = '1px solid rgba(255, 0, 80, 0.4)';
        videoFormatTip.innerHTML = '✅ Formato vertical detectado (≤60s). Se subirá como <strong>YouTube Short</strong>.<br>📐 Dimensión ideal para Shorts: <strong>1080 × 1920 px</strong> (9:16)';
      } else if (isVertical) {
        videoTypeBadge.textContent = '📱 Video Vertical';
        videoTypeBadge.style.background = 'rgba(255, 165, 0, 0.2)';
        videoTypeBadge.style.color = '#ffb347';
        videoTypeBadge.style.border = '1px solid rgba(255, 165, 0, 0.4)';
        videoFormatTip.innerHTML = '⚠️ Video vertical pero duración mayor a 60s — se subirá como <strong>video normal</strong> (no Short).<br>📐 Para Shorts: máximo 60 segundos. Para video normal horizontal: <strong>1920 × 1080 px</strong> (16:9)';
      } else {
        videoTypeBadge.textContent = '🖥️ Video Normal (Horizontal)';
        videoTypeBadge.style.background = 'rgba(0, 180, 130, 0.2)';
        videoTypeBadge.style.color = '#00cc99';
        videoTypeBadge.style.border = '1px solid rgba(0, 180, 130, 0.4)';
        videoFormatTip.innerHTML = '✅ Formato horizontal estándar para YouTube.<br>📐 Dimensión ideal: <strong>1920 × 1080 px</strong> (Full HD 16:9) o <strong>3840 × 2160 px</strong> (4K)';
      }

      videoDetailsInfo.classList.remove('hidden');
      log(`📐 Video: ${w}×${h} px | ⏱ ${durStr} | ${isShort ? '📱 SHORT' : isVertical ? '📱 VERTICAL' : '🖥️ HORIZONTAL'}`, 'info');

      // Auto-capture frames for AI analysis
      captureFramesAndAnalyze(videoEl, durSec, objectUrl);
    });

    videoEl.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      videoDetailsInfo.classList.add('hidden');
    });
  }

  /**
   * Captures 3 frames from the video at 10%, 40%, and 70% of duration,
   * sends them to Gemini Vision API, and auto-fills all metadata fields.
   */
  async function captureFramesAndAnalyze(videoEl, durSec, objectUrl) {
    log('🤖 Analizando contenido del video con Gemini Vision AI...', 'info');
    btnGenerateMetadata.disabled = true;
    btnGenerateMetadata.textContent = '🤖 IA Analizando Video...';

    const timestamps = [
      Math.max(1, durSec * 0.10),  // 10% - intro/beginning
      Math.max(2, durSec * 0.40),  // 40% - middle content
      Math.max(3, durSec * 0.70)   // 70% - later content
    ];

    const frames = [];

    for (const ts of timestamps) {
      try {
        const frame = await captureFrameAtTime(videoEl, ts);
        if (frame) frames.push(frame);
      } catch (e) {
        // Skip frames that fail to capture
      }
    }

    URL.revokeObjectURL(objectUrl);

    if (frames.length === 0) {
      log('⚠️ No se pudieron capturar frames del video para análisis IA.', 'warning');
      btnGenerateMetadata.disabled = false;
      btnGenerateMetadata.textContent = '✨ Generar Metadatos con Gemini AI';
      return;
    }

    log(`📸 ${frames.length} frame(s) capturados. Enviando a Gemini Vision AI...`, 'info');

    try {
      const lang = languageSelect.value || 'es';
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, language: lang })
      });

      const data = await response.json();

      if (data.success) {
        // Auto-fill all fields
        contextPromptInput.value = data.contextPrompt || '';
        titleInput.value = data.title || '';
        descInput.value = data.description || '';
        tagsInput.value = (data.tags || []).join(', ');

        // Auto-select category if detected
        if (data.category) {
          const options = categorySelect.options;
          for (let i = 0; i < options.length; i++) {
            if (options[i].value.toLowerCase().includes(data.category.toLowerCase()) ||
                data.category.toLowerCase().includes(options[i].value.toLowerCase())) {
              categorySelect.selectedIndex = i;
              break;
            }
          }
        }

        log(`✅ ¡Análisis IA completado! Todos los campos fueron generados automáticamente.`, 'success');
        log(`📝 Título: "${data.title}"`, 'info');
        log(`🏷️ Etiquetas: ${(data.tags || []).join(', ')}`, 'info');
      } else {
        log(`⚠️ Análisis IA no disponible: ${data.error}. Usa "Generar Metadatos" manualmente.`, 'warning');
      }
    } catch (err) {
      log(`⚠️ Error de conexión con IA: ${err.message}. Usa "Generar Metadatos" manualmente.`, 'warning');
    } finally {
      btnGenerateMetadata.disabled = false;
      btnGenerateMetadata.textContent = '✨ Generar Metadatos con Gemini AI';
    }
  }

  /**
   * Captures a single frame from a video element at the specified time (seconds).
   * Returns a base64 JPEG dataUrl.
   */
  function captureFrameAtTime(videoEl, timeSec) {
    return new Promise((resolve, reject) => {
      videoEl.currentTime = timeSec;
      videoEl.addEventListener('seeked', function onSeeked() {
        videoEl.removeEventListener('seeked', onSeeked);
        try {
          const canvas = document.createElement('canvas');
          // Cap resolution to save bandwidth
          const scale = Math.min(1, 640 / Math.max(videoEl.videoWidth, videoEl.videoHeight));
          canvas.width = Math.round(videoEl.videoWidth * scale);
          canvas.height = Math.round(videoEl.videoHeight * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      }, { once: true });

      // Timeout fallback
      setTimeout(() => reject(new Error('Frame capture timeout')), 5000);
    });
  }

  // Custom Thumbnail Upload Handler
  customThumbnailInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La miniatura no puede pesar más de 2 MB. Por favor selecciona una imagen más pequeña.');
      customThumbnailInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;

      // Check image dimensions
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        if (w < 640 || h < 360) {
          log(`⚠️ Miniatura muy pequeña (${w}×${h}). Mínimo recomendado: 640×360 px.`, 'warning');
        }
        if (Math.abs((w / h) - (16 / 9)) > 0.1) {
          log(`⚠️ Proporción ${w}×${h} no es 16:9. YouTube puede recortarla.`, 'warning');
        }
        log(`📷 Miniatura personalizada cargada: ${file.name} (${w}×${h} px, ${(file.size/1024).toFixed(0)} KB)`, 'success');
      };
      img.src = dataUrl;

      // Store for upload and show preview
      generatedThumbnailDataUrl = dataUrl;
      generatedThumbnailUrl = dataUrl;
      thumbnailPreviewImg.src = dataUrl;
      thumbnailPreviewImg.classList.remove('hidden');
      thumbnailPlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });

  // Handler 1: Generate Metadata via Gemini AI API
  btnGenerateMetadata.addEventListener('click', async () => {
    const prompt = contextPromptInput.value.trim();
    btnGenerateMetadata.disabled = true;
    btnGenerateMetadata.textContent = '⌛ Generando metadatos con Gemini...';
    log('Solicitando metadatos SEO a Google Gemini API...', 'info');

    try {
      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextPrompt: prompt,
          category: categorySelect.value,
          language: languageSelect.value
        })
      });

      const data = await response.json();
      if (data.success && data.metadata) {
        titleInput.value = data.metadata.title || '';
        descInput.value = data.metadata.description || '';
        tagsInput.value = Array.isArray(data.metadata.tags) ? data.metadata.tags.join(', ') : (data.metadata.tags || '');
        log('✅ Metadatos SEO generados exitosamente con IA.', 'success');
      } else {
        log(`⚠️ Error al generar metadatos: ${data.error || 'Respuesta vacía'}`, 'warning');
      }
    } catch (err) {
      log(`❌ Error de conexión al servidor: ${err.message}`, 'error');
    } finally {
      btnGenerateMetadata.disabled = false;
      btnGenerateMetadata.textContent = '✨ Generar Metadatos con Gemini AI';
    }
  });

  // Listener: Handle Product Image Upload for Thumbnail compositing
  thumbnailProductImgInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          loadedProductImage = img;
          log(`Foto de producto cargada: ${file.name}. Regenerando vista previa...`, 'success');
          
          // Instantly update preview with the image included
          const titleText = titleInput.value.trim() || contextPromptInput.value.trim() || 'Aguamarina Joyería';
          const clientDataUrl = drawThumbnailOnClient(titleText, themeSelect.value);
          generatedThumbnailUrl = clientDataUrl;
          thumbnailPreviewImg.src = clientDataUrl;
          thumbnailPreviewImg.classList.remove('hidden');
          thumbnailPlaceholder.classList.add('hidden');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Helper: Draw Thumbnail using Canvas on the Client Side
  function drawThumbnailOnClient(titleText, styleTheme) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    // 1. Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    if (styleTheme === 'luxury_gold') {
      gradient.addColorStop(0, '#1c150c');
      gradient.addColorStop(0.5, '#0d0a06');
      gradient.addColorStop(1, '#000000');
    } else { // glassmorphic
      gradient.addColorStop(0, '#004b5a');
      gradient.addColorStop(0.5, '#051b24');
      gradient.addColorStop(1, '#02070a');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);

    // 2. Draw Decorative Orbs / Sparkles
    if (styleTheme === 'glassmorphic') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const orb1 = ctx.createRadialGradient(200, 200, 50, 200, 200, 300);
      orb1.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
      orb1.addColorStop(1, 'rgba(0, 242, 254, 0)');
      ctx.fillStyle = orb1;
      ctx.beginPath();
      ctx.arc(200, 200, 300, 0, Math.PI * 2);
      ctx.fill();

      const orb2 = ctx.createRadialGradient(1000, 500, 50, 1000, 500, 400);
      orb2.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
      orb2.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = orb2;
      ctx.beginPath();
      ctx.arc(1000, 500, 400, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 1280;
        const y = Math.random() * 720;
        const r = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Draw Gold Border (16px)
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#D4AF37';
    ctx.strokeRect(8, 8, 1280 - 16, 720 - 16);

    // 4. Draw Right Side Composite (Product Image or Vector Diamond)
    const cx = 950;
    const cy = 360;

    if (loadedProductImage) {
      // Draw a glassmorphic background plate for the product image
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = styleTheme === 'luxury_gold' ? 'rgba(30, 25, 20, 0.35)' : 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 230, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Fit and Draw Product Image
      const maxW = 400;
      const maxH = 400;
      let imgW = loadedProductImage.width;
      let imgH = loadedProductImage.height;
      const scale = Math.min(maxW / imgW, maxH / imgH);
      imgW = imgW * scale;
      imgH = imgH * scale;
      const imgX = cx - imgW / 2;
      const imgY = cy - imgH / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(loadedProductImage, imgX, imgY, imgW, imgH);
      ctx.restore();

      // Draw Gold Quality Seal Badge
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(cx + 160, cy - 130, 48, 0, Math.PI * 2);
      ctx.fill();

      // Gold badge inner line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 160, cy - 130, 42, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JOYERÍA', cx + 160, cy - 142);
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('18K', cx + 160, cy - 120);
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText('GARANTIZADA', cx + 160, cy - 105);
      ctx.restore();
    } else {
      // Fallback: Draw Branded Glowing Vector Diamond
      ctx.save();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      // Top flat edge
      ctx.moveTo(cx - 100, cy - 60);
      ctx.lineTo(cx + 100, cy - 60);
      // Slants
      ctx.lineTo(cx + 150, cy);
      ctx.lineTo(cx, cy + 130);
      ctx.lineTo(cx - 150, cy);
      ctx.closePath();
      ctx.stroke();

      // Inner facets
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 100, cy - 60);
      ctx.lineTo(cx - 60, cy);
      ctx.lineTo(cx, cy + 130);
      ctx.lineTo(cx + 60, cy);
      ctx.lineTo(cx + 100, cy - 60);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 150, cy);
      ctx.lineTo(cx - 60, cy);
      ctx.lineTo(cx, cy - 60);
      ctx.lineTo(cx + 60, cy);
      ctx.lineTo(cx + 150, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - 60);
      ctx.lineTo(cx, cy + 130);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Logo Branded Header (Left Side)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText('💎 AGUAMARINA JOYERÍA', 80, 100);
    ctx.restore();

    // 6. Draw Title Text with word wrapping (Restricted to Left Side width 640px)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 60px system-ui, -apple-system, sans-serif';

    const words = titleText.split(' ');
    let line = '';
    let y = 240;
    const maxWidth = 620; // Bound to left half to prevent product image overlapping
    const lineHeight = 76;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, 80, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, y);
    ctx.restore();

    // 7. Draw Branded Category Badge (Dynamic position under text)
    ctx.save();
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';

    ctx.fillStyle = styleTheme === 'luxury_gold' ? 'rgba(30, 25, 20, 0.8)' : 'rgba(10, 30, 42, 0.6)';
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.lineWidth = 2;
    
    const badgeX = 80;
    const badgeY = y + 50 < 600 ? y + 50 : 580;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, 380, 50, [10]);
    } else {
      ctx.rect(badgeX, badgeY, 380, 50);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('COLECCIÓN EXCLUSIVA 2026', badgeX + 40, badgeY + 32);
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  // Handler 2: Generate Thumbnail
  btnGenerateThumbnail.addEventListener('click', async () => {
    const titleText = titleInput.value.trim() || contextPromptInput.value.trim() || 'Aguamarina Joyería';
    btnGenerateThumbnail.disabled = true;
    btnGenerateThumbnail.textContent = '⌛ Renderizando...';
    log(`Generando miniatura HD 1280x720 (Estilo: ${themeSelect.value})...`, 'info');

    try {
      // 1. Render thumbnail on client using HTML5 Canvas (will include uploaded image if selected)
      const clientDataUrl = drawThumbnailOnClient(titleText, themeSelect.value);

      // 2. Upload the rendered thumbnail data URL to server
      const response = await fetch('/api/generate-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleText,
          styleTheme: themeSelect.value,
          dataUrl: clientDataUrl
        })
      });

      const data = await response.json();
      if (data.success && (data.thumbnailUrl || data.dataUrl)) {
        // Store the base64 dataUrl for YouTube upload (not the server path)
        generatedThumbnailDataUrl = data.dataUrl || clientDataUrl;  // base64 PNG for upload
        generatedThumbnailUrl = data.thumbnailUrl || data.dataUrl;  // path for display
        thumbnailPreviewImg.src = data.dataUrl || data.thumbnailUrl;
        thumbnailPreviewImg.classList.remove('hidden');
        thumbnailPlaceholder.classList.add('hidden');
        log('✅ Miniatura luxury 1280x720 generada correctamente.', 'success');
      } else {
        log(`⚠️ Error en generación de miniatura: ${data.error}`, 'warning');
      }
    } catch (err) {
      log(`❌ Error de conexión: ${err.message}`, 'error');
    } finally {
      btnGenerateThumbnail.disabled = false;
      btnGenerateThumbnail.textContent = '🖼️ Generar Miniatura';
    }
  });

  // Handler 3: Upload Video to YouTube (using FormData multipart)
  btnUpload.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    if (!title) {
      alert('Por favor genera o ingresa un título para el video.');
      log('⚠️ Error: Título requerido para iniciar la carga.', 'warning');
      return;
    }
    if (!selectedFile && !dryRunCheckbox.checked) {
      alert('Por favor selecciona un archivo de video antes de subir.');
      log('⚠️ Error: Ningún archivo de video seleccionado.', 'warning');
      return;
    }
    btnUpload.disabled = true;
    btnUpload.textContent = '⌛ Subiendo a YouTube...';
    resultCard.classList.add('hidden');
    setProgress(10);
    log('Iniciando conexión con YouTube Data API v3...', 'info');
    try {
      const isMock = dryRunCheckbox.checked;
      // Build FormData: sends video file as binary + metadata as text fields
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', descInput.value.trim());
      formData.append('tags', tagsInput.value);
      formData.append('privacyStatus', privacySelect.value);
      formData.append('isMock', isMock ? 'true' : 'false');
      // Attach thumbnail as base64 dataUrl if it was generated
      if (generatedThumbnailDataUrl && generatedThumbnailDataUrl.startsWith('data:image')) {
        formData.append('thumbnailDataUrl', generatedThumbnailDataUrl);
        log('🖼️ Miniatura lista para adjuntar al video...', 'info');
      }
      // Attach the actual video file binary
      if (selectedFile) {
        formData.append('videoFile', selectedFile, selectedFile.name);
        log(`📦 Adjuntando video: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB)...`, 'info');
      }
      setProgress(30);
      log('📡 Enviando video a YouTube... (puede tardar varios minutos)...', 'info');
      // DO NOT set Content-Type header - browser sets multipart boundary automatically
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setProgress(100);
        log(`🎉 ¡Video subido exitosamente! ID: ${data.videoId}`, 'success');
        if (data.thumbnailUploaded) log('🖼️ Miniatura asignada correctamente al video.', 'success');
        resultVideoId.textContent = `ID: ${data.videoId} ${data.isMock ? '(Modo Simulación)' : ''}`;
        resultVideoUrl.href = data.youtubeUrl;
        resultVideoUrl.textContent = data.youtubeUrl;
        resultCard.classList.remove('hidden');
      } else {
        setProgress(0);
        log(`❌ Error al subir video: ${data.error}`, 'error');
      }
    } catch (err) {
      setProgress(0);
      log(`❌ Error de conexión: ${err.message}`, 'error');
    } finally {
      btnUpload.disabled = false;
      btnUpload.textContent = '🚀 Subir Video a YouTube';
    }
  });

  // ============================================================================
  // GOOGLE ADS & YOUTUBE ADS DASHBOARD LOGIC
  // ============================================================================

  // Tab switching elements
  const tabBtnYoutube = document.getElementById('tab-btn-youtube');
  const tabBtnAds = document.getElementById('tab-btn-ads');
  const panelYoutube = document.getElementById('panel-youtube');
  const panelAds = document.getElementById('panel-ads');

  // Ads form elements
  const adsTypeSelect = document.getElementById('ads-type-select');
  const adsTipsText = document.getElementById('ads-tips-text');
  const adsNameInput = document.getElementById('ads-name-input');
  const adsBudgetInput = document.getElementById('ads-budget-input');
  const adsUrlInput = document.getElementById('ads-url-input');
  const adsKeywordsGroup = document.getElementById('ads-keywords-group');
  const adsKeywordsInput = document.getElementById('ads-keywords-input');
  const adsVideoIdGroup = document.getElementById('ads-video-id-group');
  const adsVideoIdInput = document.getElementById('ads-video-id-input');
  const adsDisplayGroup = document.getElementById('ads-display-group');
  const adsImageUrl = document.getElementById('ads-image-url');
  const adsShoppingGroup = document.getElementById('ads-shopping-group');
  const adsMerchantId = document.getElementById('ads-merchant-id');
  const adsLocalGroup = document.getElementById('ads-local-group');
  const adsStoreAddress = document.getElementById('ads-store-address');
  const adsStoreRadius = document.getElementById('ads-store-radius');
  const adsStartDate = document.getElementById('ads-start-date');
  const adsEndDate = document.getElementById('ads-end-date');

  // Creative groups
  const adsCreativeSearchGroup = document.getElementById('ads-creative-search-group');
  const adsCreativeVideoGroup = document.getElementById('ads-creative-video-group');

  // Search creatives inputs
  const adsHeadline1 = document.getElementById('ads-headline-1');
  const adsHeadline2 = document.getElementById('ads-headline-2');
  const adsHeadline3 = document.getElementById('ads-headline-3');
  const adsDesc1 = document.getElementById('ads-desc-1');
  const adsDesc2 = document.getElementById('ads-desc-2');

  // Video creatives inputs
  const adsVideoHeadline = document.getElementById('ads-video-headline');
  const adsVideoCta = document.getElementById('ads-video-cta');
  const adsVideoDesc = document.getElementById('ads-video-desc');

  // Action button and logs
  const adsDryRunCheckbox = document.getElementById('ads-dry-run-checkbox');
  const btnCreateAdsCampaign = document.getElementById('btn-create-ads-campaign');
  const adsConsoleLog = document.getElementById('ads-console-log');
  const adsResultCard = document.getElementById('ads-result-card');
  const adsResultCampaignId = document.getElementById('ads-result-campaign-id');
  const adsResultMessage = document.getElementById('ads-result-message');

  // Utility: Append to Ads console log
  function logAds(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${message}`;
    adsConsoleLog.appendChild(line);
    adsConsoleLog.scrollTop = adsConsoleLog.scrollHeight;
  }

  // 1. Tab Switching Handlers
  tabBtnYoutube.addEventListener('click', () => {
    tabBtnYoutube.classList.add('active');
    tabBtnAds.classList.remove('active');
    panelYoutube.classList.remove('hidden');
    panelAds.classList.add('hidden');
  });

  tabBtnAds.addEventListener('click', () => {
    tabBtnAds.classList.add('active');
    tabBtnYoutube.classList.remove('active');
    panelAds.classList.remove('hidden');
    panelYoutube.classList.add('hidden');
  });

  // Marketing Tips & Explanations mapping
  const campaignTips = {
    SEARCH: `<strong>Búsqueda en Google:</strong> Tus anuncios de texto aparecerán cuando la gente busque términos específicos. <br><br>
             <em>💎 Tip de Joyería:</em> Usa palabras clave de intención alta como "comprar anillo de compromiso oro 18k" para captar clientes listos para comprar, en lugar de términos sueltos como "anillos" para evitar clics costosos de curiosos.`,
    
    VIDEO: `<strong>Video en YouTube:</strong> Muestra anuncios de video antes, durante o después de los videos de YouTube. <br><br>
            <em>💎 Tip de Joyería:</em> Los primeros 5 segundos del video son críticos. Muestra el brillo de las joyas y el logo de Aguamarina de inmediato antes de que el usuario pueda omitir el anuncio.`,
    
    DISPLAY: `<strong>Red de Display de Google:</strong> Anuncios visuales (banners) en millones de sitios web y aplicaciones asociadas. <br><br>
              <em>💎 Tip de Joyería:</em> Excelente para <strong>Retargeting</strong>. Muestra fotos de los mismos anillos que los usuarios vieron en tu web para recordarles que completen su compra.`,
    
    PERFORMANCE_MAX: `<strong>Máximo Rendimiento (PMax):</strong> Campaña automatizada por IA que publica anuncios en Search, Maps, YouTube, Gmail y Discover. <br><br>
                      <em>💎 Tip de Joyería:</em> Usa esta campaña si quieres maximizar tus ventas online. Pon tus mejores imágenes de catálogo y deja que la IA de Google encuentre a los compradores.`,
    
    SHOPPING: `<strong>Google Shopping:</strong> Muestra fotos de tus joyas con precio y nombre directamente en los resultados de Google Shopping. <br><br>
               <em>💎 Tip de Joyería:</em> Sincroniza correctamente tu Merchant Center con Hostinger. Los usuarios que buscan joyería comparan precios directamente; asegúrate de tener fotos nítidas sobre fondo blanco.`,
    
    LOCAL: `<strong>Local Ads:</strong> Diseñados para atraer clientes de tu ciudad a tu joyería física local en Google Maps y Google Search. <br><br>
            <em>💎 Tip de Joyería:</em> Excelente si tienes showroom físico. Muestra anuncios a personas en un radio de 10-15 km con un botón directo de "Cómo llegar" y tu número de WhatsApp.`
  };

  // 2. Campaign Type Selection Handler
  adsTypeSelect.addEventListener('change', () => {
    const type = adsTypeSelect.value;
    
    // Update Dynamic Tips Box
    adsTipsText.innerHTML = campaignTips[type] || 'Selecciona un tipo de campaña.';

    // Hide all conditional groups first
    adsKeywordsGroup.classList.add('hidden');
    adsVideoIdGroup.classList.add('hidden');
    adsDisplayGroup.classList.add('hidden');
    adsShoppingGroup.classList.add('hidden');
    adsLocalGroup.classList.add('hidden');
    adsCreativeSearchGroup.classList.add('hidden');
    adsCreativeVideoGroup.classList.add('hidden');

    // Show groups depending on type
    if (type === 'SEARCH') {
      adsKeywordsGroup.classList.remove('hidden');
      adsCreativeSearchGroup.classList.remove('hidden');
      logAds('Cambiado a campaña de Búsqueda (Search Ads). Configura palabras clave y textos.', 'info');
    } else if (type === 'VIDEO') {
      adsVideoIdGroup.classList.remove('hidden');
      adsCreativeVideoGroup.classList.remove('hidden');
      logAds('Cambiado a campaña de Video (YouTube Ads). Vincula un ID de video.', 'info');
    } else if (type === 'DISPLAY') {
      adsDisplayGroup.classList.remove('hidden');
      adsCreativeSearchGroup.classList.remove('hidden');
      logAds('Cambiado a campaña de Display. Configura la URL del Banner y los textos de apoyo.', 'info');
    } else if (type === 'PERFORMANCE_MAX') {
      adsKeywordsGroup.classList.remove('hidden'); // Used as search signals
      adsVideoIdGroup.classList.remove('hidden'); // Optional video asset
      adsCreativeSearchGroup.classList.remove('hidden'); // Assets group
      logAds('Cambiado a campaña de Máximo Rendimiento (PMax). Configura todas las señales posibles.', 'info');
    } else if (type === 'SHOPPING') {
      adsShoppingGroup.classList.remove('hidden');
      logAds('Cambiado a campaña de Google Shopping. Vincula tu Merchant Center ID.', 'info');
    } else if (type === 'LOCAL') {
      adsLocalGroup.classList.remove('hidden');
      adsCreativeSearchGroup.classList.remove('hidden');
      logAds('Cambiado a campaña Local. Configura tu dirección y radio de cobertura.', 'info');
    }
  });

  // 3. Create Campaign Handler
  btnCreateAdsCampaign.addEventListener('click', async () => {
    const type = adsTypeSelect.value;
    const name = adsNameInput.value.trim();
    const budget = adsBudgetInput.value.trim();
    const finalUrl = adsUrlInput.value.trim();
    const isDryRun = adsDryRunCheckbox ? adsDryRunCheckbox.checked : true;

    const startDate = adsStartDate ? adsStartDate.value : '';
    const endDate = adsEndDate ? adsEndDate.value : '';

    if (!name) {
      alert('Por favor introduce un nombre para la campaña.');
      return;
    }
    if (!budget || Number(budget) <= 0) {
      alert('Por favor introduce un presupuesto diario válido.');
      return;
    }

    btnCreateAdsCampaign.disabled = true;
    btnCreateAdsCampaign.textContent = '⌛ Lanzando campaña...';
    adsResultCard.classList.add('hidden');
    const dateRangeStr = (startDate || endDate) ? ` [Fechas: ${startDate || 'Hoy'} a ${endDate || 'Sin límite'}]` : '';
    logAds(`Iniciando creación de campaña ${type} [${name}] (Presupuesto: $${budget}/día)${dateRangeStr}...`, 'info');

    let requestBody = {
      campaignType: type,
      campaignName: name,
      budgetAmount: Number(budget),
      finalUrl,
      startDate,
      endDate,
      dryRun: isDryRun
    };

    // Populate data based on campaign type
    if (type === 'SEARCH' || type === 'DISPLAY' || type === 'PERFORMANCE_MAX' || type === 'LOCAL') {
      const headlines = [
        adsHeadline1.value.trim(),
        adsHeadline2.value.trim(),
        adsHeadline3.value.trim()
      ].filter(Boolean);

      const descriptions = [
        adsDesc1.value.trim(),
        adsDesc2.value.trim()
      ].filter(Boolean);

      if (headlines.length === 0 || descriptions.length === 0) {
        alert('Por favor rellena al menos un título y una descripción para el anuncio.');
        btnCreateAdsCampaign.disabled = false;
        btnCreateAdsCampaign.textContent = '🚀 Crear Campaña en Google Ads';
        return;
      }

      requestBody.headlines = headlines;
      requestBody.descriptions = descriptions;

      if (type === 'SEARCH' || type === 'PERFORMANCE_MAX') {
        requestBody.keywords = adsKeywordsInput.value.trim();
      }
      if (type === 'PERFORMANCE_MAX') {
        requestBody.youtubeVideoId = adsVideoIdInput.value.trim();
      }
      if (type === 'DISPLAY') {
        requestBody.bannerImageUrl = adsImageUrl.value.trim();
      }
      if (type === 'LOCAL') {
        requestBody.storeAddress = adsStoreAddress.value.trim();
        requestBody.storeRadius = Number(adsStoreRadius.value);
      }
    } else if (type === 'VIDEO') {
      const youtubeVideoId = adsVideoIdInput.value.trim();
      const headline = adsVideoHeadline.value.trim() || 'Aguamarina';
      const callToAction = adsVideoCta.value || 'Comprar';
      const description = adsVideoDesc.value.trim() || 'Colección de Joyería Fina';

      if (!youtubeVideoId) {
        logAds('ℹ️ No se especificó ID de video. Se generó un identificador de anuncio automático.', 'warning');
        requestBody.youtubeVideoId = 'yt_mock_123456';
      } else {
        requestBody.youtubeVideoId = youtubeVideoId;
      }

      requestBody.headlines = [headline];
      requestBody.descriptions = [description];
      requestBody.callToAction = callToAction;
    } else if (type === 'SHOPPING') {
      const merchantId = adsMerchantId.value.trim();
      if (!merchantId) {
        alert('Por favor introduce tu Google Merchant Center ID.');
        btnCreateAdsCampaign.disabled = false;
        btnCreateAdsCampaign.textContent = '🚀 Crear Campaña en Google Ads';
        return;
      }
      requestBody.merchantId = merchantId;
    }

    try {
      logAds('Enviando datos al servidor de automatización de Google Ads API...', 'info');
      const response = await fetch('/api/create-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (data.success && data.result) {
        const campaign = data.result;
        logAds(`🎉 ¡Campaña creada con éxito! ID: ${campaign.campaignId}`, 'success');
        if (campaign.isMock || campaign.dryRun) {
          logAds('Nota: La campaña se creó en MODO SIMULACIÓN (sin cobros reales).', 'warning');
          adsResultCampaignId.textContent = `ID de Campaña: ${campaign.campaignId} (${type} - Modo Simulación)`;
          const datesInfo = (startDate || endDate) ? ` · Programada de ${startDate || 'Hoy'} a ${endDate || 'Indefinido'}` : '';
          adsResultMessage.textContent = `Campaña ${type} configurada con éxito (${datesInfo}). Presupuesto y creativos validados.`;
        } else {
          logAds(`La campaña está activa en tu cuenta de anunciante. Resource Name: ${campaign.campaignResourceName}`, 'success');
          adsResultCampaignId.textContent = `ID de Campaña: ${campaign.campaignId}`;
          const datesInfo = (startDate || endDate) ? ` · Duración: ${startDate || 'Hoy'} a ${endDate || 'Indefinido'}` : '';
          adsResultMessage.textContent = `Campaña subida en vivo a tu cuenta de Google Ads (${datesInfo}).`;
        }
        adsResultCard.classList.remove('hidden');
      } else {
        logAds(`❌ Error al crear campaña: ${data.error || 'Respuesta vacía del servidor'}`, 'error');
        alert(`Error al crear campaña: ${data.error || 'Respuesta vacía'}`);
      }
    } catch (err) {
      logAds(`❌ Error en cliente/servidor: ${err.message}`, 'error');
      alert(`Error al procesar campaña: ${err.message}`);
    } finally {
      btnCreateAdsCampaign.disabled = false;
      btnCreateAdsCampaign.textContent = '🚀 Crear Campaña en Google Ads';
    }
  });
});
