    function enterStartScreen(stage) {
      modeParticles && modeParticles.stop();
      const modePage = document.getElementById('mode-page');
      modePage.classList.remove('active');
      modePage.classList.add('fade-out');
      setTimeout(() => {
        modePage.style.display = 'none';
        const sp = document.getElementById('stage-select-page');
        if (sp) sp.style.display = 'none';
        const startScreen = document.getElementById('start-screen');
        // 更新模式徽章
        const badge = document.getElementById('start-mode-badge');
        const stageNameEl = document.getElementById('start-stage-name');
        const exitBtn = document.getElementById('exit-stage-btn');
        if (gameMode === 'endless') {
          badge.textContent = '∞ 无尽模式';
          badge.className = 'start-mode-badge endless-badge';
          stageNameEl.textContent = '';
          stageNameEl.style.display = 'none';
          exitBtn.style.display = 'none';
        } else {
          const sc = stage || _currentStage;
          badge.textContent = '★ 闯关模式';
          badge.className = 'start-mode-badge stages-badge';
          if (sc) {
            stageNameEl.textContent = '第' + sc.id + '关 · ' + sc.nameCN;
            stageNameEl.style.display = '';
          } else {
            stageNameEl.textContent = '';
            stageNameEl.style.display = 'none';
          }
          exitBtn.style.display = '';
        }
        startScreen.style.display = 'flex';
        startScreen.classList.remove('hidden');
      }, 500);
    }

    // ④ 开始界面按钮 → 倒计时 → 游戏开始