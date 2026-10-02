/**
 * 超星自动刷视频
 *
 * 用法：
 * 1. 打开课程页面
 * 2. F12 打开开发者工具
 * 3. 切到 Console
 * 4. 左上角执行环境选择 top
 * 5. 粘贴并运行下面代码
 *
 * 效果：
 * - 当前视频播完后，跳过本节测验
 * - 自动进入下一节视频
 * - 新视频自动开始播放
 * - 持续循环
 *
 * 适用场景：
 * 每小节是「视频 + 测验」，想先把视频全部看完，测验最后统一做。
 */

(() => {
  // 防止重复启动
  if (window.__autoVideoNextStarted) {
    console.log('⚠️ 自动跳视频脚本已经在运行');
    return;
  }

  window.__autoVideoNextStarted = true;

  const boundVideos = new WeakSet();

  // =========================================
  // 1. 递归寻找当前页面及 iframe 里的 video
  // =========================================
  function findVideos(win = window, results = []) {
    try {
      const videos = win.document.querySelectorAll('video');
      videos.forEach(v => results.push(v));

      const frames = win.document.querySelectorAll('iframe');

      frames.forEach(frame => {
        try {
          if (frame.contentWindow) {
            findVideos(frame.contentWindow, results);
          }
        } catch (e) {
          // 跨域 iframe 无法访问时直接忽略
        }
      });
    } catch (e) {}

    return results;
  }


  // =========================================
  // 2. 找当前目录之后的下一条 unfinished = 2
  // =========================================
  function getNextUnwatchedSection() {
    const items = [
      ...document.querySelectorAll('.posCatalog_name')
    ];

    const currentBox =
      document.querySelector('.posCatalog_select');

    if (!currentBox) {
      console.log('❌ 没找到当前目录项');
      return null;
    }

    const currentName =
      currentBox.querySelector('.posCatalog_name');

    const currentIndex =
      items.indexOf(currentName);

    console.log(
      '📍 当前小节：',
      currentName?.getAttribute('title') ||
      currentName?.innerText
    );

    // 只从当前课程之后寻找 unfinished = 2
    for (
      let i = currentIndex + 1;
      i < items.length;
      i++
    ) {
      const item = items[i];

      const count =
        item.parentElement
          ?.querySelector('.jobUnfinishCount')
          ?.value;

      if (count === '2') {
        return item;
      }
    }

    return null;
  }


  // =========================================
  // 3. 自动播放
  // =========================================
  async function tryAutoPlay(video) {

    // 如果已经在播放，不做任何事情
    if (!video.paused) {
      console.log('▶️ 视频已经在播放');
      return;
    }

    // 最多尝试 5 次
    for (let attempt = 1; attempt <= 5; attempt++) {

      try {

        console.log(
          `▶️ 尝试自动播放，第 ${attempt} 次`
        );

        await video.play();

        console.log('✅ 视频已自动开始播放');

        return;

      } catch (e) {

        console.log(
          `⚠️ 第 ${attempt} 次自动播放失败：`,
          e?.name || e
        );

        // 等待播放器继续初始化
        await new Promise(resolve =>
          setTimeout(resolve, 1200)
        );
      }
    }

    console.log(
      '❌ Edge / 播放器阻止了自动播放，需要手动点击播放'
    );
  }


  // =========================================
  // 4. 视频播放结束
  // =========================================
  function handleEnded() {

    console.log('✅ 视频播放结束');

    /*
       等待超星更新任务完成状态：
       当前章节应该从 2 变成 1
    */
    setTimeout(() => {

      const next =
        getNextUnwatchedSection();

      if (!next) {

        console.log(
          '🎉 后面没有找到 unfinished = 2 的课程'
        );

        return;
      }

      const title =
        next.getAttribute('title') ||
        next.innerText.trim();

      console.log(
        '⏭️ 跳过测验，进入下一段视频：',
        title
      );

      // 直接点击目录下一小节
      next.click();

    }, 3000);
  }


  // =========================================
  // 5. 不断扫描新加载出来的视频
  // =========================================
  function scanVideos() {

    const videos = findVideos();

    videos.forEach(video => {

      // 这个视频已经处理过
      if (boundVideos.has(video)) {
        return;
      }

      boundVideos.add(video);

      console.log(
        '🎬 发现新视频：',
        video
      );

      // 视频结束 → 下一章节
      video.addEventListener(
        'ended',
        handleEnded
      );

      console.log(
        '✅ 已绑定视频结束监听'
      );

      /*
        给 Video.js / 超星播放器一点加载时间，
        然后自动播放
      */
      setTimeout(() => {

        tryAutoPlay(video);

      }, 1800);

    });
  }


  // =========================================
  // 6. 每秒检查是否出现了新视频
  // =========================================
  window.__autoVideoNextTimer =
    setInterval(scanVideos, 1000);

  // 立即扫描一次
  scanVideos();


  console.log(
    '🚀 自动视频模式已开启'
  );

  console.log(
    '流程：自动播放 → 视频结束 → 跳过测验 → 下一小节 → 自动播放'
  );

})();
