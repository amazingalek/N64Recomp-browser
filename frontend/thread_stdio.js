// Link with --js-library (n64recomp_browser_frontend does): what a thread prints to stdout or stderr is printed without
// waiting for the page's thread. Emscripten runs every fd_write on the page's thread and waits for it there (each
// syscall is proxied 'sync' with threads, libcore.js's wrapSyscallFunction), since its file system lives there; the
// page's thread is also the WebGPU device's, so every line a game thread printed held that thread until the page got
// to it, a frame's work at worst. Here a write to fd 1 or 2 is cut into lines on the thread that made it and each line
// handed to out or err, which on a worker post it to the page's console without waiting (Module.print and printErr,
// set below, are what a worker forwards: without them a worker prints to a console of its own, which a page driver
// doesn't see). A write to any other fd, a file's, goes to the page's thread as before.
addToLibrary({
  $threadStdio: [null, [], []],
  $threadStdio__postset: () => `
    if (!ENVIRONMENT_IS_PTHREAD) {
      Module['print'] ??= (...args) => console.log(...args);
      Module['printErr'] ??= (...args) => console.error(...args);
    }`,

  // fd_write as Emscripten has it with a file system, proxied to the page's thread.
  n64recomp_browser_fd_write_proxied__proxy: 'sync',
  n64recomp_browser_fd_write_proxied__deps: ['$SYSCALLS', '$doWritev'],
  n64recomp_browser_fd_write_proxied: (fd, iov, iovcnt, pnum) => {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      {{{ makeSetValue('pnum', 0, 'num', 'i32') }}};
      return 0;
    } catch (e) {
      if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
      return e.errno;
    }
  },

  fd_write__proxy: 'none',
  fd_write__deps: ['$threadStdio', '$UTF8ArrayToString', 'n64recomp_browser_fd_write_proxied'],
  fd_write: (fd, iov, iovcnt, pnum) => {
    if (fd != 1 && fd != 2) return _n64recomp_browser_fd_write_proxied(fd, iov, iovcnt, pnum);
    var buffer = threadStdio[fd];
    var num = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = {{{ makeGetValue('iov', C_STRUCTS.iovec.iov_base, '*') }}};
      var len = {{{ makeGetValue('iov', C_STRUCTS.iovec.iov_len, '*') }}};
      iov += {{{ C_STRUCTS.iovec.__size__ }}};
      for (var j = 0; j < len; j++) {
        var c = HEAPU8[ptr + j];
        if (c === 10) {
          (fd === 1 ? out : err)(UTF8ArrayToString(buffer));
          buffer.length = 0;
        } else {
          buffer.push(c);
        }
      }
      num += len;
    }
    {{{ makeSetValue('pnum', 0, 'num', 'i32') }}};
    return 0;
  },
});
