(function () {
    const audio = document.getElementById("audio-player");
    const canvas = document.getElementById("spectrumCanvas");
    const btn = document.getElementById("toggleSpectrumBtn");
    let showSpectrum = false;

    if (!audio || !canvas) {
        console.error("找不到 #player 或 #spectrumCanvas，无法启动可视化");
        return;
    }

    const ctx = canvas.getContext("2d");
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    canvas.style.display = "none"
    btn.addEventListener("click", () => {
        showSpectrum = !showSpectrum;
        btn.textContent = showSpectrum ? "隐藏频谱" : "显示频谱";
        canvas.style.display = showSpectrum ? "block" : "none";
    });

    // 公共渐变色
    const gradientColors = [
        {stop: 0, color: "rgba(255,200,180,0.8)"},
        {stop: 0.5, color: "rgba(255,180,150,0.7)"},
        {stop: 1, color: "rgba(255,160,120,0.6)"},
    ];

    function getGradient(x1, y1, x2, y2) {
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        gradientColors.forEach(c => grad.addColorStop(c.stop, c.color));
        return grad;
    }

    let mode = "spectrum"; // "spectrum" / "waveform" / "circle"

    // 公共清屏函数
    function clearCanvas() {
        ctx.fillStyle = "#fff8f0";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 绘制线性频谱
    function drawSpectrum() {
        analyser.getByteFrequencyData(dataArray);
        clearCanvas();
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] * 0.8;
            ctx.fillStyle = getGradient(0, 0, 0, canvas.height);
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    // 绘制波形
    function drawWaveform() {
        analyser.getByteTimeDomainData(dataArray);
        clearCanvas();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = getGradient(0, 0, 0, canvas.height);
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    }

    // 绘制环形频谱
    function drawCircleSpectrum() {
        analyser.getByteFrequencyData(dataArray);
        clearCanvas();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.35;
        const bars = 128;
        const step = Math.floor(dataArray.length / bars);
        for (let i = 0; i < bars; i++) {
            const value = dataArray[i * step];
            const barHeight = value * 0.5;
            const angle = (i / bars) * Math.PI * 2;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);
            ctx.strokeStyle = getGradient(x1, y1, x2, y2);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    function draw() {
        requestAnimationFrame(draw);
        if (!showSpectrum) return;
        if (mode === "spectrum") drawSpectrum();
        else if (mode === "waveform") drawWaveform();
        else drawCircleSpectrum();
    }

    function resumeAudioContext() {
        if (audioCtx.state === "suspended") audioCtx.resume();
    }

    document.addEventListener("click", resumeAudioContext);
    document.addEventListener("keydown", resumeAudioContext);

    // 按 M 切换模式
    document.addEventListener("keydown", e => {
        if (e.key.toLowerCase() !== "m") return;
        mode = mode === "spectrum" ? "waveform" : mode === "waveform" ? "circle" : "spectrum";
    });

    draw();
})();
