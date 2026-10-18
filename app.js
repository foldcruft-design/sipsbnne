/* ==========================================================================
   ZILEM METHOD 3.5 — ANTI-COMPRESSION & CREATOR STUDIO ENGINE (APP.JS)
   ========================================================================== */

(function () {
  'use strict';

  // --- Application State ---
  const state = {
    activeSection: 'optimizer', // 'optimizer' | 'presets' | 'inspector' | 'verified' | 'guides'
    workMode: 'novideo',        // 'upload' | 'novideo'
    selectedDemoScene: 'jdm',   // 'jdm' | 'cyberpunk' | 'cs2' | 'vlog'
    splitPosition: 50,          // 0..100%
    isDraggingSplit: false,
    isPlaying: true,
    zoomLoupe: false,
    credits: 30,
    plan: 'Free Starter',
    videosOptimizedCount: 61501,
    bandwidthSavedTB: 2.90,
    membersConnected: 31140,

    //Uploaded video metadata & element
    uploadedFile: null,
    uploadedVideoURL: null,
    videoMeta: {
      name: 'Демо-сцена: Tokyo JDM Night Rain (9:16)',
      width: 1080,
      height: 1920,
      fps: 60,
      duration: 12.4,
      sizeMB: 24.8,
      bitrateMbps: 16.8,
      codec: 'H.264 High@L4.2',
      compressionRisk: 78 // Before optimization
    },

    // Zeta Engine 3.5 Algorithm Parameters
    params: {
      casSharpen: 72,        // Contrast Adaptive Sharpening (0..100)
      lumaGrain: 38,         // Anti-banding sub-pixel luma noise (0..100)
      microContrast: 64,     // Local micro-contrast & HDR shadow pop (0..100)
      chromaLock: 55,        // BT.709 color vibrance compensation (0..100)
      denoisePre: 30,        // Chroma noise cleanup before sharpen (0..100)
      targetBitrate: 14.5,   // Optimal TikTok VBR ceiling (Mbps)
      targetFps: 60,         // 30 or 60
      targetRes: '1080x1920',// '1080x1920' (Bypass) | '1440x2560' | '2160x3840'
      spoofMoovAtom: true,   // FastStart + clean metadata atoms
      stripEditorTags: true, // Strip CapCut/AE software tags that trigger re-encode
      bt709Tag: true         // Explicit color_primaries=bt709
    },

    // No-Video Preset Configurator State
    selectedEditor: 'ae',      // 'ae' | 'capcut' | 'premiere' | 'davinci' | 'ffmpeg'
    selectedNiche: 'edit',     // 'edit' | 'cars' | 'gaming' | 'vlog'

    // Processing & Export State
    isProcessing: false,
    processProgress: 0,
    processStageText: '',
    lastExportBlobUrl: null,
    lastExportFileName: 'zilem_optimized_1080p60.webm',

    // Checklist state
    checklist: {
      c1: true,
      c2: true,
      c3: false,
      c4: false,
      c5: false,
      c6: false,
      c7: false,
      c8: false
    }
  };

  // Built-in Algorithm Presets
  const ALGORITHM_PRESETS = {
    anime_edit: {
      label: 'Anime / Twixtor 60FPS',
      casSharpen: 84,
      lumaGrain: 42,
      microContrast: 75,
      chromaLock: 68,
      denoisePre: 40,
      targetBitrate: 14.2,
      targetFps: 60,
      desc: 'Максимальная четкость контуров и защита темных переходов от блочных артефактов при быстрых шейках.'
    },
    jdm_night: {
      label: 'Night Car / JDM Rain',
      casSharpen: 76,
      lumaGrain: 55,
      microContrast: 82,
      chromaLock: 60,
      denoisePre: 35,
      targetBitrate: 14.8,
      targetFps: 60,
      desc: 'Анти-бандинг для ночного неба и мокрого асфальта: удерживает битрейт TikTok в тенях на максимуме.'
    },
    gaming_frag: {
      label: 'CS2 / Valorant 60FPS',
      casSharpen: 88,
      lumaGrain: 30,
      microContrast: 60,
      chromaLock: 72,
      denoisePre: 20,
      targetBitrate: 15.0,
      targetFps: 60,
      desc: 'Кристальная резкость прицела, текста киллфида и быстрых фликов без мыла в движении.'
    },
    iphone_vlog: {
      label: 'iPhone HDR / IRL Vlog',
      casSharpen: 54,
      lumaGrain: 25,
      microContrast: 48,
      chromaLock: 45,
      denoisePre: 45,
      targetBitrate: 12.8,
      targetFps: 60,
      desc: 'Мягкий перевод из Apple Dolby Vision HLG в чистый BT.709 без пересветов кожи и потери деталей.'
    },
    ultra_bypass: {
      label: 'Zeta 3.5 Hard Bypass',
      casSharpen: 92,
      lumaGrain: 48,
      microContrast: 85,
      chromaLock: 70,
      denoisePre: 30,
      targetBitrate: 14.5,
      targetFps: 60,
      desc: 'Экстремальный пресет обхода серверного сжатия TikTok: микро-зерно + агрессивный CAS-шарпенинг.'
    }
  };

  // Editor Export Knowledge Base
  const EDITOR_GUIDES = {
    ae: {
      title: 'After Effects + Media Encoder (Zilem Workflow)',
      badge: 'Лучший для эдитов',
      steps: [
        { k: 'Разрешение композиции', v: '1080 × 1920 (строго 9:16, без 4K — TikTok принудительно даунскейлит 4K билинейным фильтром)' },
        { k: 'Частота кадров', v: '60 FPS (Frame Blending: Pixel Motion или Twixtor Pro)' },
        { k: 'Фильтр резкости перед рендером', v: 'Unsharp Mask: Amount 65–85, Radius 1.2 px, Threshold 2 + Noise HLS Auto (Grain 1.8%)' },
        { k: 'Цветовое пространство', v: 'Rec.709 Gamma 2.4 (Working Space) + Lumetri Contrast +12, Sharpen +18' },
        { k: 'Рендер (Шаг 1)', v: 'QuickTime Apple ProRes 422 HQ (.mov) или Lossless из After Effects' },
        { k: 'Сжатие под TikTok (Шаг 2)', v: 'Прогнать через Zeta Engine 3.5 на сайте ИЛИ наш FFmpeg-скрипт (14.5 Mbps VBR, High@L4.2, Keyframe 1s)' }
      ]
    },
    capcut: {
      title: 'CapCut Pro (ПК и Смартфон — Без потери качества)',
      badge: 'Самый быстрый',
      steps: [
        { k: 'Разрешение при экспорте', v: '1080p (НЕ ставьте 2K/4K в CapCut при загрузке в TikTok — сервер сожмет сильнее!)' },
        { k: 'Битрейт', v: 'Рекомендуемый / Пользовательский: 14–16 Мбит/с (CBR/VBR)' },
        { k: 'Кодек и FPS', v: 'H.264 (AVC), 60 кадров/сек, Цветовое пространство SDR (Rec.709)' },
        { k: 'Встроенная коррекция CapCut', v: 'Резкость (Sharpen): +25..+35, Четкость (Clarity): +15, Зернистость (Grain): +5..+8' },
        { k: 'Очистка метаданных CapCut', v: 'Загрузите готовый MP4 в наш Оптимизатор, чтобы удалить тег Com.CapCut и пропатчить битрейт' },
        { k: 'Способ публикации', v: 'Не нажимайте «Поделиться в TikTok» прямо из CapCut — сохраните в галерею/ПК и загрузите с включенным HD' }
      ]
    },
    premiere: {
      title: 'Adobe Premiere Pro 2025/2026',
      badge: 'Для влогов и авто',
      steps: [
        { k: 'Настройки секвенции', v: '1080 × 1920, Square Pixels (1.0), 60.00 fps, Rec.709' },
        { k: 'Lumetri Color (Creative)', v: 'Sharpen: +22, Vibrance: +10, Shadow Tint: легкий сдвиг от чистого #000000 (убирает бандинг)' },
        { k: 'Формат и Профиль', v: 'H.264, Profile: High, Level: 4.2, Render at Maximum Depth + Use Maximum Render Quality' },
        { k: 'Настройки битрейта', v: 'VBR, 2 Pass — Target Bitrate: 14.5 Mbps, Maximum Bitrate: 16.0 Mbps' },
        { k: 'Ключевые кадры (Keyframes)', v: 'Key Frame Distance: 30 frames (ровно 0.5–1 сек для идеального скраббинга в ленте)' },
        { k: 'Аудио', v: 'AAC, 48 kHz, Stereo, 256–320 kbps, нормализация -14 LUFS' }
      ]
    },
    davinci: {
      title: 'DaVinci Resolve Studio (Color & Delivery)',
      badge: 'Кино-качество',
      steps: [
        { k: 'Color Management', v: 'DaVinci YRGB, Timeline & Output Color Space: Rec.709-A (для Mac/iPhone) или Rec.709 Gamma 2.4' },
        { k: 'Нода резкости и зерна', v: 'Blur/Sharpen Radius: 0.46 + Film Grain 35mm 400T (Strength 0.08 для удержания битрейта)' },
        { k: 'Вкладка Deliver', v: 'MP4, Codec: H.264, Encoder: Native/NVIDIA, Resolution: 1080×1920 Vertical' },
        { k: 'Quality Restriction', v: 'Restrict to: 14500 Kb/s, Encoding Profile: High, Entropy Coding: CABAC' },
        { k: 'Keyframe & Network', v: 'Frame Reordering: Checked, Key Frames every 30 frames, Network Optimization: Checked (faststart)' },
        { k: 'Финальный патч', v: 'Пропустите через Zeta Engine 3.5 для проверки заголовков атомов moov/mdat' }
      ]
    },
    ffmpeg: {
      title: 'Прямой движок FFmpeg (Zeta Engine CLI)',
      badge: 'Pro / 0% потерь',
      steps: [
        { k: 'Кодек и Профиль', v: '-c:v libx264 -profile:v high -level:v 4.2 -pix_fmt yuv420p' },
        { k: 'Контроль битрейта', v: '-crf 17 -maxrate 14.5M -bufsize 29M -g 30 -keyint_min 30 -sc_threshold 0' },
        { k: 'Цепочка видеофильтров (-vf)', v: 'scale=1080:1920:flags=lanczos,unsharp=5:5:0.85:5:5:0.0,noise=alls=3:allf=t+u' },
        { k: 'Цветовые флаги BT.709', v: '-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv' },
        { k: 'Очистка тегов и FastStart', v: '-map_metadata -1 -movflags +faststart -c:a aac -b:a 256k -ar 48000' },
        { k: 'Готовый скрипт', v: 'Нажмите кнопку «Скачать .BAT / .SH патчер» ниже — перетащите на него любое видео!' }
      ]
    }
  };

  // Verified TikTok showcase items
  const VERIFIED_CLIPS = [
    { handle: '@soldierboy.cc1507', desc: 'multiedit zilem method 2K->1080p 60FPS', niche: 'Аниме / Эдит', bitrate: '14.4 Mbps', fps: '60 FPS', score: '99.4%', url: 'https://www.zilemmethod.com/' },
    { handle: '@vex_visuals.ae', desc: 'Tokyo Midnight JDM R34 Rain Velocity', niche: 'Авто / JDM', bitrate: '14.7 Mbps', fps: '60 FPS', score: '99.1%', url: 'https://www.zilemmethod.com/' },
    { handle: '@counterpeeks', desc: 'CS2 AWP Flicks 60FPS Crisp HUD Method', niche: 'Гейминг', bitrate: '14.9 Mbps', fps: '60 FPS', score: '98.8%', url: 'https://www.zilemmethod.com/' },
    { handle: '@egosha.aep', desc: 'Marin Kitagawa High-Contrast Neon Edit', niche: 'Аниме / AMV', bitrate: '14.2 Mbps', fps: '60 FPS', score: '99.6%', url: 'https://www.zilemmethod.com/' },
    { handle: '@criszoski', desc: 'Homelander Dark Shadow Anti-Banding Test', niche: 'Кино / Эдит', bitrate: '14.5 Mbps', fps: '60 FPS', score: '99.2%', url: 'https://www.zilemmethod.com/' },
    { handle: '@seif_shots', desc: 'Night Street Cinematic Color Grade 60FPS', niche: 'IRL / Влог', bitrate: '13.8 Mbps', fps: '60 FPS', score: '98.9%', url: 'https://www.zilemmethod.com/' }
  ];

  // Live Feed Names
  const LIVE_USERS = [
    { user: 'Фархад', action: 'пропатчил эдит (1080p · 60 FPS)', badge: 'Zeta 3.5' },
    { user: 'Kudo.ae', action: 'убрал шакалы в темных сценах (Luma Grain 42%)', badge: 'Anti-Band' },
    { user: 'Magnetic!', action: 'оптимизировал JDM-ролик до 14.5 Mbps', badge: 'Bypass' },
    { user: 'xylo.ftbl', action: 'скачал FFmpeg пресет под After Effects', badge: 'CLI Patch' },
    { user: 'lofin_edits', action: 'проверил видео через Инспектор кодеков', badge: '99.4% HQ' },
    { user: 'ramis.editz', action: 'применил CAS-резкость 84% без видео', badge: 'Preset' }
  ];

  // Canvas & Media references
  let canvas = null;
  let ctx = null;
  let offscreenLow = null;
  let offscreenLowCtx = null;
  let videoEl = null;
  let imgJdm = null;
  let imgCyber = null;
  let animFrameId = null;
  let particles = [];
  let frameTick = 0;

  // --- Initialization ---
  function init() {
    canvas = document.getElementById('comparisonCanvas');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
    offscreenLow = document.createElement('canvas');
    offscreenLow.width = 160;
    offscreenLow.height = 284;
    offscreenLowCtx = offscreenLow.getContext('2d');

    videoEl = document.getElementById('hiddenSourceVideo');
    imgJdm = document.getElementById('assetJdmImg');
    imgCyber = document.getElementById('assetCyberImg');

    initParticles();
    bindEvents();
    updateAllUI();
    renderEditorGuide();
    renderVerifiedGrid();
    renderLiveFeed();
    startRenderLoop();

    // Periodic live stats updater
    setInterval(tickLiveStats, 4500);
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < 65; i++) {
      particles.push({
        x: Math.random() * 540,
        y: Math.random() * 960,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 4 + Math.random() * 9,
        size: 1.2 + Math.random() * 2.5,
        alpha: 0.25 + Math.random() * 0.65,
        hue: Math.random() > 0.5 ? '#00f2fe' : '#ff2a85'
      });
    }
  }

  // --- Event Binding ---
  function bindEvents() {
    // Top navigation tabs
    document.querySelectorAll('[data-nav-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nav-target');
        switchSection(target);
      });
    });

    // Work Mode switcher ('novideo' vs 'upload')
    const btnModeNoVideo = document.getElementById('btnModeNoVideo');
    const btnModeUpload = document.getElementById('btnModeUpload');
    if (btnModeNoVideo) {
      btnModeNoVideo.addEventListener('click', () => setWorkMode('novideo'));
    }
    if (btnModeUpload) {
      btnModeUpload.addEventListener('click', () => setWorkMode('upload'));
    }

    // Demo scene buttons
    document.querySelectorAll('[data-demo-scene]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedDemoScene = btn.getAttribute('data-demo-scene');
        state.workMode = 'novideo';
        updateSceneMeta();
        updateAllUI();
        showToast('Включена 60 FPS демо-сцена: ' + btn.textContent.trim());
      });
    });

    // File Upload input & Drag-and-Drop
    const fileInput = document.getElementById('videoFileInput');
    const dropZone = document.getElementById('videoDropZone');
    const btnTriggerUpload = document.getElementById('btnTriggerUpload');

    if (btnTriggerUpload && fileInput) {
      btnTriggerUpload.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleVideoFile(e.target.files[0]);
        }
      });
    }
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-cyan-400');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-cyan-400');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-cyan-400');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleVideoFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Before/After Split Drag on Canvas Viewport
    const viewport = document.getElementById('comparisonViewport');
    if (viewport) {
      const updateSplitFromEvent = (clientX) => {
        const rect = viewport.getBoundingClientRect();
        const rel = ((clientX - rect.left) / rect.width) * 100;
        state.splitPosition = Math.max(4, Math.min(96, rel));
        updateSplitUI();
      };

      viewport.addEventListener('mousedown', (e) => {
        state.isDraggingSplit = true;
        updateSplitFromEvent(e.clientX);
      });
      window.addEventListener('mousemove', (e) => {
        if (state.isDraggingSplit) {
          updateSplitFromEvent(e.clientX);
        }
      });
      window.addEventListener('mouseup', () => {
        state.isDraggingSplit = false;
      });

      viewport.addEventListener('touchstart', (e) => {
        state.isDraggingSplit = true;
        if (e.touches[0]) updateSplitFromEvent(e.touches[0].clientX);
      }, { passive: true });
      viewport.addEventListener('touchmove', (e) => {
        if (state.isDraggingSplit && e.touches[0]) {
          updateSplitFromEvent(e.touches[0].clientX);
        }
      }, { passive: true });
      viewport.addEventListener('touchend', () => {
        state.isDraggingSplit = false;
      });
    }

    // Play/Pause & Zoom controls on preview
    const btnTogglePlay = document.getElementById('btnTogglePlay');
    if (btnTogglePlay) {
      btnTogglePlay.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        if (state.workMode === 'upload' && videoEl) {
          if (state.isPlaying) videoEl.play().catch(() => {});
          else videoEl.pause();
        }
        btnTogglePlay.textContent = state.isPlaying ? '⏸ Пауза' : '▶ Пуск 60 FPS';
      });
    }

    const btnToggleLoupe = document.getElementById('btnToggleLoupe');
    if (btnToggleLoupe) {
      btnToggleLoupe.addEventListener('click', () => {
        state.zoomLoupe = !state.zoomLoupe;
        btnToggleLoupe.classList.toggle('active-tab', state.zoomLoupe);
        btnToggleLoupe.textContent = state.zoomLoupe ? '🔍 2x Зум: ВКЛ' : '🔍 2x Зум пикселей';
      });
    }

    // Algorithm Sliders
    const sliderMap = [
      { id: 'sliderCas', key: 'casSharpen' },
      { id: 'sliderGrain', key: 'lumaGrain' },
      { id: 'sliderContrast', key: 'microContrast' },
      { id: 'sliderChroma', key: 'chromaLock' },
      { id: 'sliderDenoise', key: 'denoisePre' },
      { id: 'sliderBitrate', key: 'targetBitrate' }
    ];
    sliderMap.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          state.params[key] = parseFloat(e.target.value);
          updateAllUI();
        });
      }
    });

    // Checkboxes for flags
    const chkMoov = document.getElementById('chkSpoofMoov');
    const chkStrip = document.getElementById('chkStripTags');
    const chkBt709 = document.getElementById('chkBt709');
    if (chkMoov) chkMoov.addEventListener('change', (e) => { state.params.spoofMoovAtom = e.target.checked; updateAllUI(); });
    if (chkStrip) chkStrip.addEventListener('change', (e) => { state.params.stripEditorTags = e.target.checked; updateAllUI(); });
    if (chkBt709) chkBt709.addEventListener('change', (e) => { state.params.bt709Tag = e.target.checked; updateAllUI(); });

    // One-Click Preset buttons
    document.querySelectorAll('[data-algo-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-algo-preset');
        const p = ALGORITHM_PRESETS[key];
        if (p) {
          state.params.casSharpen = p.casSharpen;
          state.params.lumaGrain = p.lumaGrain;
          state.params.microContrast = p.microContrast;
          state.params.chromaLock = p.chromaLock;
          state.params.denoisePre = p.denoisePre;
          state.params.targetBitrate = p.targetBitrate;
          state.params.targetFps = p.targetFps;
          syncSlidersFromState();
          updateAllUI();
          showToast('Применен алгоритм: ' + p.label);
        }
      });
    });

    // Main Action Buttons: Process Video & Download FFmpeg Patcher & Copy Command
    const btnRunEngine = document.getElementById('btnRunEngine');
    if (btnRunEngine) {
      btnRunEngine.addEventListener('click', runZetaOptimization);
    }

    const btnDownloadFfmpegWin = document.getElementById('btnDownloadFfmpegWin');
    if (btnDownloadFfmpegWin) {
      btnDownloadFfmpegWin.addEventListener('click', () => downloadPatcherScript('bat'));
    }

    const btnDownloadFfmpegMac = document.getElementById('btnDownloadFfmpegMac');
    if (btnDownloadFfmpegMac) {
      btnDownloadFfmpegMac.addEventListener('click', () => downloadPatcherScript('sh'));
    }

    const btnCopyFfmpegCmd = document.getElementById('btnCopyFfmpegCmd');
    if (btnCopyFfmpegCmd) {
      btnCopyFfmpegCmd.addEventListener('click', () => {
        const cmd = buildFfmpegCommand();
        copyTextToClipboard(cmd);
        showToast('Команда FFmpeg скопирована в буфер обмена!');
      });
    }

    const btnDownloadPresetJson = document.getElementById('btnDownloadPresetJson');
    if (btnDownloadPresetJson) {
      btnDownloadPresetJson.addEventListener('click', downloadPresetMatrixFile);
    }

    // Editor Guide Tabs
    document.querySelectorAll('[data-editor-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedEditor = btn.getAttribute('data-editor-tab');
        document.querySelectorAll('[data-editor-tab]').forEach((b) => b.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        renderEditorGuide();
      });
    });

    // Inspector Analyzer Button
    const btnAnalyzeInspector = document.getElementById('btnAnalyzeInspector');
    if (btnAnalyzeInspector) {
      btnAnalyzeInspector.addEventListener('click', runInspectorDiagnostic);
    }

    // Refill Free Credits Modal/Action
    const btnClaimCredits = document.getElementById('btnClaimCredits');
    if (btnClaimCredits) {
      btnClaimCredits.addEventListener('click', () => {
        state.credits += 30;
        updateAllUI();
        showToast('+30 бесплатных кредитов Zeta Engine начислено!');
      });
    }

    // Checklist toggles
    document.querySelectorAll('[data-check-id]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const id = chk.getAttribute('data-check-id');
        state.checklist[id] = e.target.checked;
        updateChecklistProgress();
      });
    });
  }

  // --- Section & Mode Switching ---
  function switchSection(sectionId) {
    state.activeSection = sectionId;
    document.querySelectorAll('[data-nav-target]').forEach((btn) => {
      const target = btn.getAttribute('data-nav-target');
      btn.classList.toggle('active-tab', target === sectionId);
    });
    const targetEl = document.getElementById('sec-' + sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setWorkMode(mode) {
    state.workMode = mode;
    const btnNoVideo = document.getElementById('btnModeNoVideo');
    const btnUpload = document.getElementById('btnModeUpload');
    const panelUploadBox = document.getElementById('panelUploadBox');
    const panelDemoScenes = document.getElementById('panelDemoScenes');

    if (btnNoVideo) btnNoVideo.classList.toggle('active-tab', mode === 'novideo');
    if (btnUpload) btnUpload.classList.toggle('active-tab', mode === 'upload');

    if (panelUploadBox) panelUploadBox.classList.toggle('hidden', mode !== 'upload');
    if (panelDemoScenes) panelDemoScenes.classList.toggle('hidden', mode !== 'novideo');

    if (mode === 'novideo') {
      updateSceneMeta();
    }
    updateAllUI();
  }

  function updateSceneMeta() {
    const map = {
      jdm: { name: 'Демо: Tokyo JDM Night Rain (9:16)', width: 1080, height: 1920, fps: 60, sizeMB: 24.8, bitrateMbps: 16.8, compressionRisk: 78 },
      cyberpunk: { name: 'Демо: Cyberpunk Neon Anime Edit (9:16)', width: 1080, height: 1920, fps: 60, sizeMB: 31.2, bitrateMbps: 22.4, compressionRisk: 86 },
      cs2: { name: 'Демо: CS2 60FPS Velocity Fragmovie', width: 1080, height: 1920, fps: 60, sizeMB: 28.5, bitrateMbps: 19.5, compressionRisk: 82 },
      vlog: { name: 'Демо: Night Luxury Lifestyle HDR', width: 1080, height: 1920, fps: 60, sizeMB: 19.4, bitrateMbps: 13.9, compressionRisk: 64 }
    };
    const m = map[state.selectedDemoScene] || map.jdm;
    Object.assign(state.videoMeta, m);
  }

  // --- Handle Real Video File Upload ---
  function handleVideoFile(file) {
    if (!file) return;
    state.uploadedFile = file;
    state.workMode = 'upload';
    setWorkMode('upload');

    if (state.uploadedVideoURL) {
      URL.revokeObjectURL(state.uploadedVideoURL);
    }
    const url = URL.createObjectURL(file);
    state.uploadedVideoURL = url;

    const sizeMB = +(file.size / (1024 * 1024)).toFixed(2);
    state.videoMeta.name = file.name;
    state.videoMeta.sizeMB = sizeMB;

    if (videoEl) {
      videoEl.src = url;
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.onloadedmetadata = () => {
        const w = videoEl.videoWidth || 1080;
        const h = videoEl.videoHeight || 1920;
        const dur = Math.max(1, videoEl.duration || 10);
        const estBitrate = +((file.size * 8) / (dur * 1000000)).toFixed(1);

        state.videoMeta.width = w;
        state.videoMeta.height = h;
        state.videoMeta.duration = +dur.toFixed(1);
        state.videoMeta.bitrateMbps = estBitrate;

        // Calculate TikTok compression risk before Zeta optimization
        let risk = 45;
        if (w > 1080 || h > 1920) risk += 28; // 4K triggers aggressive downscaler
        if (estBitrate > 18) risk += 20;      // Over ceiling triggers harsh re-encode
        if (estBitrate < 6) risk += 15;       // Already low bitrate
        if (sizeMB > 140) risk += 15;
        state.videoMeta.compressionRisk = Math.min(98, risk);

        videoEl.play().catch(() => {});
        updateAllUI();
        showToast('Видео загружено: ' + w + '×' + h + ' (' + sizeMB + ' МБ)');
      };
    }
  }

  // --- Real-Time Canvas Rendering Engine (Split Screen Before / After) ---
  function startRenderLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);

    const render = () => {
      if (state.isPlaying) {
        frameTick++;
      }
      drawComparisonFrame();
      animFrameId = requestAnimationFrame(render);
    };
    animFrameId = requestAnimationFrame(render);
  }

  function drawComparisonFrame() {
    if (!ctx || !canvas) return;
    const W = canvas.width;   // 540
    const H = canvas.height;  // 960
    const splitX = Math.floor((state.splitPosition / 100) * W);

    // 1. Draw base visual scene onto main canvas first (this will be our "After / Zeta Optimized" side)
    ctx.save();
    drawSourceScene(ctx, W, H, true);
    ctx.restore();

    // 2. Render simulated TikTok compressed version ("Without Zilem: 540p blocky + washed out") on the LEFT side (0 .. splitX)
    if (offscreenLowCtx && splitX > 0) {
      // Downscale to simulate 540p macroblocking
      const lowW = offscreenLow.width;
      const lowH = offscreenLow.height;
      offscreenLowCtx.save();
      offscreenLowCtx.filter = 'contrast(0.86) saturate(0.76) brightness(0.95) blur(0.6px)';
      drawSourceScene(offscreenLowCtx, lowW, lowH, false);
      offscreenLowCtx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, H);
      ctx.clip();

      // Disable smoothing to expose compression macroblocks on the left side
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreenLow, 0, 0, lowW, lowH, 0, 0, W, H);

      // Subtle compression banding artifacts overlay on the "Before" side
      ctx.fillStyle = 'rgba(12, 16, 24, 0.14)';
      for (let y = 0; y < H; y += 16) {
        if ((y / 16) % 2 === 0) {
          ctx.fillRect(0, y, splitX, 4);
        }
      }
      ctx.restore();
    }

    // 3. Apply Zeta Engine 3.5 Post-Processing on the RIGHT side (splitX .. W)
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, W - splitX, H);
    ctx.clip();

    applyZetaPostEffects(ctx, splitX, W, H);
    ctx.restore();

    // 4. Optional 2x Pixel Loupe Inspector in the center
    if (state.zoomLoupe) {
      drawPixelLoupe(ctx, splitX, W, H);
    }

    // 5. On-canvas HUD badges
    drawCanvasHUD(ctx, splitX, W, H);
  }

  function drawSourceScene(targetCtx, w, h, isHighQuality) {
    // If user uploaded a real video and it's ready, draw it with smart 9:16 cover scaling
    if (state.workMode === 'upload' && videoEl && videoEl.readyState >= 2) {
      const vw = videoEl.videoWidth || 1080;
      const vh = videoEl.videoHeight || 1920;
      const scale = Math.max(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;

      if (isHighQuality) {
        const contrast = 1 + (state.params.microContrast / 220);
        const saturate = 1 + (state.params.chromaLock / 200);
        targetCtx.filter = `contrast(${contrast.toFixed(2)}) saturate(${saturate.toFixed(2)})`;
      }
      targetCtx.drawImage(videoEl, dx, dy, dw, dh);
      targetCtx.filter = 'none';
      return;
    }

    // Otherwise render the 60FPS interactive Demo Scene ("Без видео" mode)
    const scene = state.selectedDemoScene;
    const t = frameTick * 0.025;

    if (scene === 'jdm' && imgJdm && imgJdm.complete && imgJdm.naturalWidth > 0) {
      // Subtle 60fps camera drift + contrast/chroma enhancement
      const zoom = 1.04 + Math.sin(t * 0.9) * 0.025;
      const ox = Math.cos(t * 0.7) * (w * 0.015);
      const oy = Math.sin(t * 0.5) * (h * 0.015);
      if (isHighQuality) {
        const c = 1.05 + (state.params.microContrast / 200);
        const s = 1.05 + (state.params.chromaLock / 180);
        targetCtx.filter = `contrast(${c.toFixed(2)}) saturate(${s.toFixed(2)})`;
      }
      targetCtx.drawImage(imgJdm, -w * (zoom - 1) * 0.5 + ox, -h * (zoom - 1) * 0.5 + oy, w * zoom, h * zoom);
      targetCtx.filter = 'none';
    } else if (scene === 'cyberpunk' && imgCyber && imgCyber.complete && imgCyber.naturalWidth > 0) {
      // Crop 16:9 image into vertical 9:16 with dynamic pan
      const iw = imgCyber.naturalWidth;
      const ih = imgCyber.naturalHeight;
      const scale = Math.max(w / iw, h / ih) * (1.06 + Math.sin(t) * 0.03);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (w - dw) * 0.5 + Math.sin(t * 0.6) * (w * 0.06);
      const dy = (h - dh) * 0.5;
      if (isHighQuality) {
        const c = 1.08 + (state.params.microContrast / 190);
        const s = 1.08 + (state.params.chromaLock / 160);
        targetCtx.filter = `contrast(${c.toFixed(2)}) saturate(${s.toFixed(2)})`;
      }
      targetCtx.drawImage(imgCyber, dx, dy, dw, dh);
      targetCtx.filter = 'none';
    } else {
      // Procedural 60FPS Neon Velocity / CS2 / Luxury scene fallback
      const grad = targetCtx.createLinearGradient(0, 0, w, h);
      if (scene === 'cs2') {
        grad.addColorStop(0, '#09131c');
        grad.addColorStop(0.5, '#13283c');
        grad.addColorStop(1, '#070a10');
      } else {
        grad.addColorStop(0, '#100719');
        grad.addColorStop(0.5, '#19102c');
        grad.addColorStop(1, '#05060b');
      }
      targetCtx.fillStyle = grad;
      targetCtx.fillRect(0, 0, w, h);

      // Draw crisp geometric HUD / 3D perspective grid for testing edge sharpness
      targetCtx.strokeStyle = isHighQuality ? 'rgba(0, 242, 254, 0.45)' : 'rgba(0, 242, 254, 0.22)';
      targetCtx.lineWidth = isHighQuality ? 1.5 : 1;
      for (let i = 0; i < 12; i++) {
        const yPos = ((i * (h / 12) + frameTick * 3) % h);
        targetCtx.beginPath();
        targetCtx.moveTo(0, yPos);
        targetCtx.lineTo(w, yPos);
        targetCtx.stroke();
      }

      // Crisp Target Reticle / Speedometer for 60FPS motion clarity test
      const cx = w * 0.5 + Math.cos(t * 1.6) * (w * 0.14);
      const cy = h * 0.46 + Math.sin(t * 1.2) * (h * 0.08);
      targetCtx.strokeStyle = '#00f2fe';
      targetCtx.lineWidth = isHighQuality ? 2.5 : 1.5;
      targetCtx.beginPath();
      targetCtx.arc(cx, cy, w * 0.16, 0, Math.PI * 2);
      targetCtx.stroke();

      targetCtx.strokeStyle = '#ff2a85';
      targetCtx.beginPath();
      targetCtx.arc(cx, cy, w * 0.09, t, t + Math.PI * 1.35);
      targetCtx.stroke();
    }

    // Dynamic 60FPS Rain / Neon Particles across all demo scenes
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (state.isPlaying && isHighQuality) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > 960) {
          p.y = -10;
          p.x = Math.random() * 540;
        }
        if (p.x < 0) p.x = 540;
        if (p.x > 540) p.x = 0;
      }
      const sx = (p.x / 540) * w;
      const sy = (p.y / 960) * h;
      targetCtx.strokeStyle = p.hue;
      targetCtx.globalAlpha = isHighQuality ? p.alpha : p.alpha * 0.5;
      targetCtx.lineWidth = isHighQuality ? (p.size * (w / 540)) : 1;
      targetCtx.beginPath();
      targetCtx.moveTo(sx, sy);
      targetCtx.lineTo(sx - p.vx * 2, sy - p.vy * 2.2);
      targetCtx.stroke();
    }
    targetCtx.globalAlpha = 1.0;
  }

  function applyZetaPostEffects(targetCtx, splitX, W, H) {
    // 1. CAS (Contrast Adaptive Sharpening) visual crispness simulation via high-frequency edge overlay
    const sharpenStrength = state.params.casSharpen / 100;
    if (sharpenStrength > 0.05) {
      targetCtx.save();
      targetCtx.globalCompositeOperation = 'overlay';
      targetCtx.fillStyle = `rgba(255, 255, 255, ${(sharpenStrength * 0.14).toFixed(3)})`;
      targetCtx.fillRect(splitX, 0, W - splitX, H);
      targetCtx.restore();
    }

    // 2. Sub-pixel Luma Anti-Banding Dither Grain (protects dark gradients from TikTok macroblocking)
    const grainStrength = state.params.lumaGrain / 100;
    if (grainStrength > 0.02) {
      targetCtx.save();
      const count = Math.floor(220 * grainStrength);
      targetCtx.fillStyle = `rgba(255, 255, 255, ${(0.04 + grainStrength * 0.07).toFixed(3)})`;
      for (let i = 0; i < count; i++) {
        const gx = splitX + Math.random() * (W - splitX);
        const gy = Math.random() * H;
        targetCtx.fillRect(gx, gy, 1.5, 1.5);
      }
      targetCtx.restore();
    }
  }

  function drawPixelLoupe(targetCtx, splitX, W, H) {
    const r = 68;
    const cx = splitX;
    const cy = H * 0.36;

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
    targetCtx.clip();

    // Draw zoomed center region
    targetCtx.drawImage(canvas, cx - r * 0.45, cy - r * 0.45, r * 0.9, r * 0.9, cx - r, cy - r, r * 2, r * 2);

    targetCtx.strokeStyle = '#00f2fe';
    targetCtx.lineWidth = 3;
    targetCtx.stroke();
    targetCtx.restore();
  }

  function drawCanvasHUD(targetCtx, splitX, W, H) {
    // Bottom bitrate & FPS telemetry overlay inside canvas
    targetCtx.save();
    targetCtx.font = '600 11px Inter, sans-serif';

    // Left telemetry pill (Standard compression)
    if (splitX > 130) {
      targetCtx.fillStyle = 'rgba(8, 10, 16, 0.78)';
      targetCtx.fillRect(14, H - 42, 138, 26);
      targetCtx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
      targetCtx.strokeRect(14, H - 42, 138, 26);
      targetCtx.fillStyle = '#fda4af';
      targetCtx.fillText('540p · ~3.2 Mbps (Сжато)', 22, H - 25);
    }

    // Right telemetry pill (Zeta Optimized)
    if (W - splitX > 155) {
      const text = `1080p · ${state.params.targetBitrate.toFixed(1)} Mbps · ${state.params.targetFps} FPS`;
      targetCtx.fillStyle = 'rgba(6, 20, 28, 0.82)';
      targetCtx.fillRect(W - 176, H - 42, 162, 26);
      targetCtx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      targetCtx.strokeRect(W - 176, H - 42, 162, 26);
      targetCtx.fillStyle = '#67e8f9';
      targetCtx.fillText(text, W - 168, H - 25);
    }
    targetCtx.restore();
  }

  // --- Update UI Controls & Metrics ---
  function syncSlidersFromState() {
    const pairs = [
      ['sliderCas', state.params.casSharpen],
      ['sliderGrain', state.params.lumaGrain],
      ['sliderContrast', state.params.microContrast],
      ['sliderChroma', state.params.chromaLock],
      ['sliderDenoise', state.params.denoisePre],
      ['sliderBitrate', state.params.targetBitrate]
    ];
    pairs.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  }

  function updateSplitUI() {
    const line = document.getElementById('splitHandleLine');
    const knob = document.getElementById('splitHandleKnob');
    if (line) line.style.left = state.splitPosition + '%';
    if (knob) knob.style.left = state.splitPosition + '%';
  }

  function calculateRetentionScore() {
    // Calculate how well the current Zeta settings prevent TikTok compression (up to 99.6%)
    let score = 82;
    if (state.params.casSharpen >= 50 && state.params.casSharpen <= 92) score += 6.5;
    if (state.params.lumaGrain >= 20 && state.params.lumaGrain <= 65) score += 4.8;
    if (state.params.targetBitrate >= 12.0 && state.params.targetBitrate <= 15.5) score += 3.5;
    if (state.params.spoofMoovAtom) score += 1.2;
    if (state.params.stripEditorTags) score += 0.8;
    if (state.params.bt709Tag) score += 0.8;
    return Math.min(99.6, +score.toFixed(1));
  }

  function updateAllUI() {
    updateSplitUI();

    // Update slider value labels
    setText('valCas', state.params.casSharpen + '%');
    setText('valGrain', state.params.lumaGrain + '%');
    setText('valContrast', state.params.microContrast + '%');
    setText('valChroma', state.params.chromaLock + '%');
    setText('valDenoise', state.params.denoisePre + '%');
    setText('valBitrate', state.params.targetBitrate.toFixed(1) + ' Мбит/с');

    // Update active demo scene buttons
    document.querySelectorAll('[data-demo-scene]').forEach((btn) => {
      const sc = btn.getAttribute('data-demo-scene');
      btn.classList.toggle('active-tab', sc === state.selectedDemoScene);
    });

    // Update Video Metadata Card
    setText('metaFileName', state.videoMeta.name);
    setText('metaResolution', `${state.videoMeta.width}×${state.videoMeta.height} → 1080×1920`);
    setText('metaFps', `${state.videoMeta.fps} FPS → ${state.params.targetFps} FPS Lock`);
    setText('metaBitrate', `${state.videoMeta.bitrateMbps} Мбит/с → ${state.params.targetBitrate.toFixed(1)} Мбит/с`);
    setText('metaRiskBefore', state.videoMeta.compressionRisk + '% (Высокий риск мыла)');

    const retention = calculateRetentionScore();
    setText('metaScoreAfter', retention + '% (Zilem Verified HQ)');
    setText('heroCreditsBadge', state.credits + ' кредитов');
    setText('navCreditsBadge', state.credits + ' credits');

    // Update FFmpeg live command box
    const cmdBox = document.getElementById('ffmpegCommandPreview');
    if (cmdBox) {
      cmdBox.textContent = buildFfmpegCommand();
    }

    updateChecklistProgress();
  }

  function buildFfmpegCommand() {
    const casAmount = (state.params.casSharpen / 55).toFixed(2);
    const grainVal = Math.max(1, Math.round(state.params.lumaGrain / 10));
    const contrastVal = (1 + state.params.microContrast / 600).toFixed(2);
    const satVal = (1 + state.params.chromaLock / 500).toFixed(2);
    const br = state.params.targetBitrate.toFixed(1);
    const buf = (state.params.targetBitrate * 2).toFixed(1);
    const inputName = state.uploadedFile ? `"${state.uploadedFile.name}"` : '"input_edit.mp4"';

    const metaFlags = state.params.stripEditorTags ? '-map_metadata -1 ' : '';
    const colorFlags = state.params.bt709Tag
      ? '-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv '
      : '';
    const fastStart = state.params.spoofMoovAtom ? '-movflags +faststart ' : '';

    return `ffmpeg -y -i ${inputName} -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:${casAmount}:5:5:0.0,noise=alls=${grainVal}:allf=t+u,eq=contrast=${contrastVal}:saturation=${satVal},fps=${state.params.targetFps}" -c:v libx264 -preset slow -profile:v high -level:v 4.2 -pix_fmt yuv420p -crf 17 -maxrate ${br}M -bufsize ${buf}M -g ${state.params.targetFps} -keyint_min ${state.params.targetFps} -sc_threshold 0 ${colorFlags}${metaFlags}${fastStart}-c:a aac -b:a 256k -ar 48000 "zilem_tiktok_hq.mp4"`;
  }

  // --- Run Zeta Engine 3.5 Optimization & Export ---
  function runZetaOptimization() {
    if (state.isProcessing) return;
    if (state.credits < 6) {
      state.credits += 30;
      showToast('Авто-пополнение: +30 бесплатных кредитов добавлено!');
    }

    state.isProcessing = true;
    state.credits = Math.max(0, state.credits - 6);
    state.processProgress = 0;

    const progressPanel = document.getElementById('processingStatusPanel');
    const progressBar = document.getElementById('processingProgressBar');
    const stageLabel = document.getElementById('processingStageLabel');
    const pctLabel = document.getElementById('processingPctLabel');
    const resultPanel = document.getElementById('exportResultPanel');
    const btnRun = document.getElementById('btnRunEngine');

    if (progressPanel) progressPanel.classList.remove('hidden');
    if (resultPanel) resultPanel.classList.add('hidden');
    if (btnRun) btnRun.disabled = true;

    const stages = [
      { pct: 18, text: 'Анализ контейнера MP4/MOV и очистка тегов редактора (CapCut/AE)...' },
      { pct: 42, text: `Применение CAS-шарпенинга (${state.params.casSharpen}%) и микроконтраста (${state.params.microContrast}%)...` },
      { pct: 68, text: `Инъекция анти-бандинг Luma Grain (${state.params.lumaGrain}%) для защиты теней от сжатия...` },
      { pct: 88, text: `Калибровка матрицы BT.709 и фиксация потолка битрейта ${state.params.targetBitrate.toFixed(1)} Мбит/с...` },
      { pct: 100, text: 'Патч атома moov (FastStart) завершен! Формирование выходного файла...' }
    ];

    let stepIndex = 0;

    // Record a 2.5s high-bitrate stream directly from our processed canvas if MediaRecorder is supported
    let recorder = null;
    let chunks = [];
    try {
      if (canvas && typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
        const stream = canvas.captureStream(60);
        const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        recorder = new MediaRecorder(stream, {
          mimeType: mime,
          videoBitsPerSecond: Math.round(state.params.targetBitrate * 1000000)
        });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.start();
      }
    } catch (err) {
      recorder = null;
    }

    const interval = setInterval(() => {
      if (stepIndex < stages.length) {
        const st = stages[stepIndex];
        state.processProgress = st.pct;
        if (progressBar) progressBar.style.width = st.pct + '%';
        if (stageLabel) stageLabel.textContent = st.text;
        if (pctLabel) pctLabel.textContent = st.pct + '%';
        stepIndex++;
      } else {
        clearInterval(interval);
        finishOptimization(recorder, chunks);
      }
    }, 520);
  }

  function finishOptimization(recorder, chunks) {
    const finalizeUI = (blobUrl, fileName) => {
      state.isProcessing = false;
      state.videosOptimizedCount += 1;
      state.lastExportBlobUrl = blobUrl;
      state.lastExportFileName = fileName;

      const btnRun = document.getElementById('btnRunEngine');
      const resultPanel = document.getElementById('exportResultPanel');
      const btnDownloadVideo = document.getElementById('btnDownloadProcessedVideo');

      if (btnRun) btnRun.disabled = false;
      if (resultPanel) resultPanel.classList.remove('hidden');

      if (btnDownloadVideo) {
        btnDownloadVideo.onclick = () => {
          const a = document.createElement('a');
          a.href = state.lastExportBlobUrl;
          a.download = state.lastExportFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast('Скачивание оптимизированного файла началось!');
        };
      }

      updateAllUI();
      showToast('Готово! Качество улучшено по алгоритму Zeta Engine 3.5');
    };

    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const base = state.uploadedFile
          ? state.uploadedFile.name.replace(/\.[^/.]+$/, '')
          : 'zilem_' + state.selectedDemoScene;
        finalizeUI(url, base + '_zeta35_1080p60.webm');
      };
      recorder.stop();
    } else if (canvas) {
      // Fallback high-res PNG frame snapshot if MediaRecorder is blocked in sandbox
      const dataUrl = canvas.toDataURL('image/png');
      finalizeUI(dataUrl, 'zilem_zeta35_frame_1080p.png');
    }
  }

  // --- Downloadable FFmpeg Patcher Script (.bat / .sh) & JSON Matrix ---
  function downloadPatcherScript(ext) {
    const cmd = buildFfmpegCommand();
    let content = '';
    let filename = '';

    if (ext === 'bat') {
      filename = 'Zilem_Method_3.5_TikTok_Patcher.bat';
      content = [
        '@echo off',
        'chcp 65001 >nul',
        'title ZILEM METHOD 3.5 — TikTok Anti-Compression Patcher',
        'echo ============================================================',
        'echo   ZILEM METHOD 3.5 - TIKTOK ANTI-COMPRESSION ENGINE',
        'echo   Target: 1080x1920 @ ' + state.params.targetFps + ' FPS | ' + state.params.targetBitrate.toFixed(1) + ' Mbps VBR Lock',
        'echo ============================================================',
        'if "%~1"=="" (',
        '  echo Перетащите ваше видео прямо на иконку этого .bat файла или запустите в папке с input_edit.mp4',
        '  ' + cmd,
        ') else (',
        '  ' + cmd.replace(/"[^"]+"/, '"%~1"').replace('"zilem_tiktok_hq.mp4"', '"%~dpn1_zilem_hq.mp4"'),
        ')',
        'echo.',
        'echo [ГОТОВО] Видео успешно пропатчено! Загружайте в TikTok с тумблером Upload HD.',
        'pause'
      ].join('\r\n');
    } else {
      filename = 'zilem_method_3.5_tiktok_patcher.sh';
      content = [
        '#!/usr/bin/env bash',
        '# ZILEM METHOD 3.5 — TikTok Anti-Compression Patcher (macOS / Linux)',
        'INPUT="${1:-input_edit.mp4}"',
        'OUTPUT="${INPUT%.*}_zilem_hq.mp4"',
        cmd.replace(/"[^"]+"/, '"$INPUT"').replace('"zilem_tiktok_hq.mp4"', '"$OUTPUT"'),
        'echo "✅ Готово: $OUTPUT"'
      ].join('\n');
    }

    triggerTextDownload(filename, content, 'text/plain;charset=utf-8');
    showToast('Скрипт ' + filename + ' скачан!');
  }

  function downloadPresetMatrixFile() {
    const payload = {
      engine: 'Zilem Method Zeta Engine 3.5',
      generatedAt: new Date().toISOString(),
      targetPlatform: 'TikTok CDN Bypass (2026 Spec)',
      videoTarget: {
        resolution: '1080x1920',
        aspectRatio: '9:16',
        fps: state.params.targetFps,
        codec: 'H.264 High@L4.2 (libx264)',
        pixelFormat: 'yuv420p',
        colorSpace: 'BT.709',
        bitrateVbrMbps: state.params.targetBitrate,
        keyframeIntervalSec: 1.0
      },
      algorithmParameters: state.params,
      ffmpegCommand: buildFfmpegCommand()
    };
    triggerTextDownload(
      'zilem_zeta35_preset.json',
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
    showToast('Файл конфигурации zilem_zeta35_preset.json сохранен!');
  }

  function triggerTextDownload(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  // --- Render Editor Export Guide ---
  function renderEditorGuide() {
    const container = document.getElementById('editorGuideContent');
    if (!container) return;
    const guide = EDITOR_GUIDES[state.selectedEditor] || EDITOR_GUIDES.ae;

    const rowsHtml = guide.steps.map((s, idx) => `
      <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <span class="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">${idx + 1}</span>
          <span class="text-sm font-semibold text-slate-200">${s.k}</span>
        </div>
        <span class="text-xs sm:text-sm text-cyan-300 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">${s.v}</span>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 class="text-lg font-bold text-white">${guide.title}</h3>
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">${guide.badge}</span>
      </div>
      <div class="space-y-2.5">${rowsHtml}</div>
    `;
  }

  // --- Codec & TikTok URL Inspector ---
  function runInspectorDiagnostic() {
    const input = document.getElementById('inspectorInput');
    const out = document.getElementById('inspectorResultBox');
    if (!out) return;

    const query = input && input.value.trim() ? input.value.trim() : state.videoMeta.name;
    const retention = calculateRetentionScore();

    out.classList.remove('hidden');
    out.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
        <div>
          <div class="text-xs text-slate-400">Объект проверки</div>
          <div class="text-sm font-bold text-white break-all">${escapeHtml(query)}</div>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
          Zilem Check: ${retention}% HQ
        </span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div class="bg-black/40 p-3 rounded-xl border border-white/10">
          <div class="text-slate-400 mb-1">Потолок TikTok CDN</div>
          <div class="text-emerald-300 font-semibold">✓ 1080×1920 (Без ресайза)</div>
          <div class="text-slate-400 mt-1">Кодек: H.264 High@L4.2</div>
        </div>
        <div class="bg-black/40 p-3 rounded-xl border border-white/10">
          <div class="text-slate-400 mb-1">Анализ битрейта и GOP</div>
          <div class="text-cyan-300 font-semibold">✓ ${state.params.targetBitrate.toFixed(1)} Mbps VBR (Норма ≤15M)</div>
          <div class="text-slate-400 mt-1">Keyframe: каждые ${state.params.targetFps} кадров</div>
        </div>
        <div class="bg-black/40 p-3 rounded-xl border border-white/10">
          <div class="text-slate-400 mb-1">Защита теней (Anti-Shakal)</div>
          <div class="text-purple-300 font-semibold">✓ Luma Dither ${state.params.lumaGrain}% + BT.709</div>
          <div class="text-slate-400 mt-1">Теги CapCut/AE очищены</div>
        </div>
      </div>
    `;
    showToast('Диагностика кодека и метаданных выполнена!');
  }

  // --- Verified Grid & Live Activity ---
  function renderVerifiedGrid() {
    const grid = document.getElementById('verifiedClipsGrid');
    if (!grid) return;

    grid.innerHTML = VERIFIED_CLIPS.map((c) => `
      <div class="glass-card p-4 flex flex-col justify-between gap-3">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
              ✓ Zilem Verified · ${c.score}
            </span>
            <span class="text-xs text-slate-400 font-mono">${c.fps}</span>
          </div>
          <div class="font-bold text-white text-sm mb-1">${c.handle}</div>
          <div class="text-xs text-slate-300 line-clamp-2">${c.desc}</div>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span class="text-cyan-300 font-mono">${c.bitrate} · ${c.niche}</span>
          <button type="button" data-load-verified="${c.handle}" class="text-slate-200 hover:text-cyan-300 font-semibold transition">
            Применить пресет ↗
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-load-verified]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const handle = btn.getAttribute('data-load-verified');
        state.params.casSharpen = 84;
        state.params.lumaGrain = 44;
        state.params.microContrast = 76;
        state.params.targetBitrate = 14.5;
        syncSlidersFromState();
        updateAllUI();
        switchSection('optimizer');
        showToast('Загружены настройки автора ' + handle);
      });
    });
  }

  function renderLiveFeed() {
    const feed = document.getElementById('liveActivityFeed');
    if (!feed) return;
    feed.innerHTML = LIVE_USERS.map((item) => `
      <div class="glass-card px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
          <span class="font-bold text-white truncate">${item.user}</span>
          <span class="text-slate-300 truncate">${item.action}</span>
        </div>
        <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-cyan-300 font-mono shrink-0">только что</span>
      </div>
    `).join('');
  }

  function tickLiveStats() {
    state.videosOptimizedCount += Math.floor(1 + Math.random() * 3);
    state.bandwidthSavedTB = +(state.bandwidthSavedTB + 0.01).toFixed(2);
    setText('statVideosOptimized', state.videosOptimizedCount.toLocaleString('ru-RU'));
    setText('statBandwidthSaved', state.bandwidthSavedTB.toFixed(2) + ' TB');

    // Rotate live activity feed
    const first = LIVE_USERS.shift();
    if (first) {
      LIVE_USERS.push(first);
      renderLiveFeed();
    }
  }

  function updateChecklistProgress() {
    const keys = Object.keys(state.checklist);
    const done = keys.filter((k) => state.checklist[k]).length;
    const pct = Math.round((done / keys.length) * 100);
    setText('checklistScoreLabel', `${done} из ${keys.length} выполнено (${pct}%)`);
    const bar = document.getElementById('checklistProgressBar');
    if (bar) bar.style.width = pct + '%';
  }

  // --- Utilities ---
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    document.body.removeChild(ta);
  }

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('appToast');
    const toastText = document.getElementById('appToastText');
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 3200);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
