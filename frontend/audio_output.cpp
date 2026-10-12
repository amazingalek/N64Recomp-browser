// n64recomp_browser::audio (audio_output.h). The ring is a power of two frames long, and its two counters run on past
// it and wrap at 2^32: the program writes `write`, the worklet `read`, so neither needs a lock.
#include "audio_output.h"

#include <algorithm>
#include <atomic>
#include <cstring>
#include <emscripten.h>

namespace {
    constexpr uint32_t ring_frames = 32768;
    struct Ring {
        std::atomic<uint32_t> write{ 0 };
        std::atomic<uint32_t> read{ 0 };
    };
    Ring ring;
    float* samples = nullptr;
    uint32_t channel_count = 0;
}

uint32_t n64recomp_browser::audio::open(uint32_t channels) {
    channel_count = channels;
    samples = new float[size_t(ring_frames) * channels]();
    return MAIN_THREAD_EM_ASM_INT({ return recompAudioOpen($0, $1, $2, $3); }, &ring, samples, ring_frames, channels);
}

void n64recomp_browser::audio::queue(const float* frames, size_t frame_count) {
    uint32_t write = ring.write.load(std::memory_order_relaxed);
    uint32_t space = ring_frames - (write - ring.read.load(std::memory_order_acquire));
    frame_count = std::min<size_t>(frame_count, space);
    for (size_t done = 0; done < frame_count;) {
        uint32_t at = (write + done) & (ring_frames - 1);
        size_t run = std::min<size_t>(frame_count - done, ring_frames - at);
        std::memcpy(samples + size_t(at) * channel_count, frames + done * channel_count, run * channel_count * sizeof(float));
        done += run;
    }
    ring.write.store(write + uint32_t(frame_count), std::memory_order_release);
}

size_t n64recomp_browser::audio::queued_frames() {
    return ring.write.load(std::memory_order_acquire) - ring.read.load(std::memory_order_acquire);
}
