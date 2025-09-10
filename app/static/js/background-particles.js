(function () {
    // 获取 script 标签中的属性（如 zIndex、opacity、color、count），若不存在则使用默认值
    function getAttributeOrDefault(script, attr, defaultValue) {
        return script.getAttribute(attr) || defaultValue;
    }

    // 获取指定标签名的元素集合
    function getElementsByTag(tagName) {
        return document.getElementsByTagName(tagName);
    }

    // 提取当前 script 元素上的配置信息
    function getConfig() {
        const scripts = getElementsByTag("script");
        const currentScript = scripts[scripts.length - 1];
        return {
            scriptCount: scripts.length,
            zIndex: getAttributeOrDefault(currentScript, "zIndex", -1),
            opacity: getAttributeOrDefault(currentScript, "opacity", 0.5),
            color: getAttributeOrDefault(currentScript, "color", "0,0,0"),
            count: getAttributeOrDefault(currentScript, "count", 99)
        };
    }

    // 设置 canvas 尺寸为全屏
    function setCanvasSize() {
        canvas.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        canvas.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        width = canvas.width;
        height = canvas.height;
    }

    // 动画绘制函数
    function drawFrame() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p1, index) => {
            // 更新粒子位置
            p1.x += p1.vx;
            p1.y += p1.vy;

            // 边界反弹
            p1.vx *= (p1.x > width || p1.x < 0) ? -1 : 1;
            p1.vy *= (p1.y > height || p1.y < 0) ? -1 : 1;

            ctx.fillRect(p1.x - 0.5, p1.y - 0.5, 1, 1);

            // 绘制粒子之间的连线
            for (let j = index + 1; j < allParticles.length; j++) {
                const p2 = allParticles[j];
                if (p2.x === null || p2.y === null) continue;

                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < p2.max) {
                    if (p2 === mouse && distSq > p2.max / 2) {
                        // 鼠标靠近时，产生排斥
                        p1.x -= dx * 0.03;
                        p1.y -= dy * 0.03;
                    }

                    const lineOpacity = (p2.max - distSq) / p2.max;
                    ctx.beginPath();
                    ctx.lineWidth = lineOpacity / 2;
                    ctx.strokeStyle = `rgba(${config.color},${lineOpacity + 0.2})`;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        });

        animation(drawFrame);
    }

    // 初始化配置
    const config = getConfig();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const animation = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame || function (fn) {
            return setTimeout(fn, 1000 / 45);
        };

    let width, height;
    setCanvasSize();

    // 设置 canvas 样式并添加到页面
    canvas.id = "canvas_background_" + config.scriptCount;
    canvas.style.cssText = `position:fixed;top:0;left:0;z-index:${config.zIndex};opacity:${config.opacity}` + ";pointer-events:none;";
    document.body.appendChild(canvas);

    // 鼠标点对象
    const mouse = {x: null, y: null, max: 20000};

    // 初始化粒子数组
    const particles = [];
    for (let i = 0; i < config.count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const vx = (Math.random() * 2 - 1);
        const vy = (Math.random() * 2 - 1);
        particles.push({x, y, vx, vy, max: 6000});
    }

    // 所有参与计算的对象：粒子 + 鼠标点
    const allParticles = particles.concat([mouse]);

    // 窗口事件监听
    window.onresize = setCanvasSize;
    window.onmousemove = function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };
    window.onmouseout = function () {
        mouse.x = null;
        mouse.y = null;
    };

    // 启动动画
    setTimeout(() => drawFrame(), 100);
})();
