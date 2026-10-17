// How much WebGPU work a page does a second, by kind: a preload for play_page.mjs (--preload tools/webgpu_census.js)
// that wraps the calls a browser's GPU process allocates for and, every 10 s, prints a "census:" line, JSON, with each
// one's calls a second, or [calls, KB] a second where it moves or makes memory, and the textures, buffers and bind groups
// alive (made and not destroyed, or not yet collected for bind groups, which have no destroy). Textures made are also
// counted by size and format, the largest kinds first. gpu_growth.html replays each kind alone at these rates, so its
// defaults are a page's census (its header says whose).
(() => {
  if (typeof GPUDevice === 'undefined') return;
  const counts = {};
  const textureKinds = {};
  const alive = { textures: 0, buffers: 0, bufferBytes: 0, bindGroups: 0 };
  const bufferSize = new WeakMap();
  const collected = new FinalizationRegistry(() => alive.bindGroups--);
  const add = (name, bytes = 0) => {
    const c = counts[name] ??= { calls: 0, bytes: 0 };
    c.calls++;
    c.bytes += bytes;
  };
  const wrap = (proto, name, make) => {
    const original = proto[name];
    if (original) proto[name] = make(original);
  };
  const extent = (size) => Array.isArray(size) ? [size[0], size[1] ?? 1, size[2] ?? 1] :
    [size.width, size.height ?? 1, size.depthOrArrayLayers ?? 1];
  const texelBytes = (format) => /32float|32uint|32sint/.test(format) ? (/rgba/.test(format) ? 16 : /rg/.test(format) ? 8 : 4) :
    /16/.test(format) ? (/rgba/.test(format) ? 8 : /rg/.test(format) ? 4 : 2) : /^r8|stencil8$/.test(format) ? 1 : /^rg8/.test(format) ? 2 : 4;

  wrap(GPUDevice.prototype, 'createTexture', (original) => function (descriptor) {
    const [w, h, d] = extent(descriptor.size);
    const bytes = w * h * d * texelBytes(descriptor.format) * (descriptor.sampleCount ?? 1);
    add('createTexture', bytes);
    const kind = `${w}x${h}${d > 1 ? 'x' + d : ''} ${descriptor.format}${(descriptor.mipLevelCount ?? 1) > 1 ? ' mips' : ''}`;
    textureKinds[kind] = (textureKinds[kind] ?? 0) + 1;
    alive.textures++;
    return original.call(this, descriptor);
  });
  wrap(GPUTexture.prototype, 'destroy', (original) => function () { add('destroyTexture'); alive.textures--; return original.call(this); });
  wrap(GPUDevice.prototype, 'createBuffer', (original) => function (descriptor) {
    const kind = descriptor.usage & GPUBufferUsage.MAP_READ ? 'createBuffer mapRead' : descriptor.usage & GPUBufferUsage.MAP_WRITE ? 'createBuffer mapWrite' :
      descriptor.usage & GPUBufferUsage.UNIFORM ? 'createBuffer uniform' : 'createBuffer other';
    add(kind, descriptor.size);
    alive.buffers++;
    alive.bufferBytes += descriptor.size;
    const buffer = original.call(this, descriptor);
    bufferSize.set(buffer, descriptor.size);
    return buffer;
  });
  wrap(GPUBuffer.prototype, 'destroy', (original) => function () {
    if (bufferSize.has(this)) { add('destroyBuffer'); alive.buffers--; alive.bufferBytes -= bufferSize.get(this); bufferSize.delete(this); }
    return original.call(this);
  });
  wrap(GPUBuffer.prototype, 'mapAsync', (original) => function (mode, offset = 0, size) {
    add('mapAsync', size ?? (bufferSize.get(this) ?? 0) - offset);
    return original.call(this, mode, offset, size);
  });
  wrap(GPUQueue.prototype, 'writeBuffer', (original) => function (buffer, offset, data, dataOffset, size) {
    const element = data.BYTES_PER_ELEMENT ?? 1;
    add('writeBuffer', size !== undefined ? size * element : data.byteLength - (dataOffset ?? 0) * element);
    return original.apply(this, arguments);
  });
  wrap(GPUQueue.prototype, 'writeTexture', (original) => function (destination, data, layout, size) {
    const [w, h, d] = extent(size);
    add('writeTexture', w * h * d * texelBytes(destination.texture.format));
    return original.apply(this, arguments);
  });
  wrap(GPUQueue.prototype, 'submit', (original) => function (buffers) { add('submit'); add('commandBuffers', 0); counts.commandBuffers.calls += buffers.length - 1; return original.call(this, buffers); });
  wrap(GPUQueue.prototype, 'onSubmittedWorkDone', (original) => function () { add('onSubmittedWorkDone'); return original.call(this); });
  wrap(GPUDevice.prototype, 'createBindGroup', (original) => function (descriptor) {
    add('createBindGroup');
    alive.bindGroups++;
    const group = original.call(this, descriptor);
    collected.register(group, 0);
    return group;
  });
  for (const name of ['createCommandEncoder', 'createSampler', 'createRenderPipeline', 'createRenderPipelineAsync',
    'createComputePipeline', 'createShaderModule', 'createBindGroupLayout', 'createQuerySet']) {
    wrap(GPUDevice.prototype, name, (original) => function () { add(name); return original.apply(this, arguments); });
  }
  wrap(GPUTexture.prototype, 'createView', (original) => function () { add('createView'); return original.apply(this, arguments); });
  for (const name of ['beginRenderPass', 'beginComputePass', 'copyBufferToBuffer', 'copyBufferToTexture',
    'copyTextureToBuffer', 'copyTextureToTexture', 'clearBuffer', 'resolveQuerySet']) {
    wrap(GPUCommandEncoder.prototype, name, (original) => function () { add(name); return original.apply(this, arguments); });
  }
  for (const name of ['draw', 'drawIndexed', 'setBindGroup', 'setPipeline']) {
    wrap(GPURenderPassEncoder.prototype, name, (original) => function () { add(name); return original.apply(this, arguments); });
  }
  wrap(GPUComputePassEncoder.prototype, 'dispatchWorkgroups', (original) => function () { add('dispatchWorkgroups'); return original.apply(this, arguments); });
  if (typeof GPUCanvasContext !== 'undefined') {
    wrap(GPUCanvasContext.prototype, 'getCurrentTexture', (original) => function () { add('getCurrentTexture'); return original.call(this); });
  }

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const seconds = (now - last) / 1000;
    last = now;
    const perSecond = {};
    for (const [name, c] of Object.entries(counts).sort()) {
      perSecond[name] = c.bytes ? [Math.round(c.calls / seconds), Math.round(c.bytes / seconds / 1024)] : Math.round(c.calls / seconds);
      delete counts[name];
    }
    const kinds = Object.entries(textureKinds).sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([kind, n]) => `${kind}: ${Math.round(n / seconds * 10) / 10}`);
    for (const kind of Object.keys(textureKinds)) delete textureKinds[kind];
    console.log('census: ' + JSON.stringify({ perSecond, alive: { ...alive, bufferMB: Math.round(alive.bufferBytes / 1048576) },
      texturesBySize: kinds }));
  }, 10000);
})();
