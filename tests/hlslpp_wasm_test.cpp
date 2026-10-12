// hlslpp's WebAssembly SIMD backend (platforms/wasm.h, picked when __wasm_simd128__ is defined, so in every build with
// -msimd128), run by CI in node against the same math written out in plain C++. RT64 does its matrix work on the CPU
// with hlslpp, so an op that is wrong there gives wrong transforms and nothing else: Banjo-Kazooie drew a screen-wide
// polygon over everything, Rush 2049 didn't happen to show it. hlslpp-web fixes what this found wrong:
// movehl (so transpose and inverse), dot4 (so length and the mul of every non-4x4 shape), load3 of int3, and shifts
// by a count per lane.
//
//   em++ -O2 -std=c++17 -msimd128 -I<hlslpp>/include tests/hlslpp_wasm_test.cpp -o hlslpp_wasm_test.js
//   node hlslpp_wasm_test.js

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <string>

#include "hlsl++.h"

#if !defined(HLSLPP_WASM)
#error "built without the wasm SIMD backend: compile with -msimd128"
#endif

using namespace hlslpp;

namespace {

int failures = 0;

bool near(float a, float b) {
    return std::fabs(a - b) <= 1e-4f * std::fmax(1.0f, std::fmax(std::fabs(a), std::fabs(b)));
}

void check(bool ok, const std::string &what) {
    printf("%s %s\n", ok ? "ok  " : "FAIL", what.c_str());
    if (!ok) {
        failures++;
    }
}

void checkFloats(const float *got, const float *want, int n, const std::string &what) {
    bool ok = true;
    for (int i = 0; i < n; i++) {
        ok = ok && near(got[i], want[i]);
    }

    if (!ok) {
        for (int i = 0; i < n; i++) {
            printf("    [%d] %g, wanted %g\n", i, got[i], want[i]);
        }
    }

    check(ok, what);
}

// Row-major R x C matrices, as hlslpp's constructors and store() take them.
template <int R, int K, int C>
void refMul(const float *a, const float *b, float *o) {
    for (int i = 0; i < R; i++) {
        for (int j = 0; j < C; j++) {
            float s = 0.0f;
            for (int k = 0; k < K; k++) {
                s += a[i * K + k] * b[k * C + j];
            }

            o[i * C + j] = s;
        }
    }
}

template <int N>
void refTranspose(const float *a, float *o) {
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            o[j * N + i] = a[i * N + j];
        }
    }
}

// Gauss-Jordan with partial pivoting.
template <int N>
void refInverse(const float *a, float *o) {
    double m[N][2 * N];
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            m[i][j] = a[i * N + j];
            m[i][N + j] = (i == j) ? 1.0 : 0.0;
        }
    }

    for (int c = 0; c < N; c++) {
        int p = c;
        for (int r = c + 1; r < N; r++) {
            if (std::fabs(m[r][c]) > std::fabs(m[p][c])) {
                p = r;
            }
        }

        for (int j = 0; j < 2 * N; j++) {
            std::swap(m[c][j], m[p][j]);
        }

        double d = m[c][c];
        for (int j = 0; j < 2 * N; j++) {
            m[c][j] /= d;
        }

        for (int r = 0; r < N; r++) {
            if (r != c) {
                double f = m[r][c];
                for (int j = 0; j < 2 * N; j++) {
                    m[r][j] -= f * m[c][j];
                }
            }
        }
    }

    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            o[i * N + j] = float(m[i][N + j]);
        }
    }
}

} // namespace

int main() {
    float A[16] = { 1.5f, -2.0f, 3.0f, 0.5f, 4.0f, 5.25f, -6.0f, 1.0f, 7.0f, 8.0f, 9.5f, -2.0f, 0.25f, -1.0f, 2.0f, 3.0f };
    float B[16] = { 2.0f, 0.5f, -1.0f, 3.0f, -4.0f, 1.0f, 2.0f, 0.75f, 1.0f, -3.0f, 4.0f, 2.0f, 5.0f, 6.0f, -7.0f, 8.0f };
    float C[9] = { 2.0f, -1.0f, 0.5f, 3.0f, 4.0f, -2.0f, 1.0f, 1.0f, 5.0f };
    float D[12] = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 };      // 4x3
    float E[12] = { 1, -2, 3, -4, 5, -6, 7, -8, 9, -10, 11, -12 }; // 3x4
    float V[4] = { 1.0f, -2.0f, 3.5f, 4.0f };
    float W[4] = { 2.0f, 3.0f, 4.0f, 5.0f };

    float4x4 a, b;
    float3x3 c;
    float4x3 d(D[0], D[1], D[2], D[3], D[4], D[5], D[6], D[7], D[8], D[9], D[10], D[11]);
    float3x4 e(E[0], E[1], E[2], E[3], E[4], E[5], E[6], E[7], E[8], E[9], E[10], E[11]);
    float4 v, w;
    load(a, A);
    load(b, B);
    load(c, C);
    load(v, V);
    load(w, W);

    float got[16], want[16];

    store(mul(a, b), got);
    refMul<4, 4, 4>(A, B, want);
    checkFloats(got, want, 16, "mul(float4x4, float4x4)");

    store(mul(v, a), got);
    refMul<1, 4, 4>(V, A, want);
    checkFloats(got, want, 4, "mul(float4, float4x4)");

    store(mul(a, v), got);
    refMul<4, 4, 1>(A, V, want);
    checkFloats(got, want, 4, "mul(float4x4, float4)");

    store(transpose(a), got);
    refTranspose<4>(A, want);
    checkFloats(got, want, 16, "transpose(float4x4)");

    store(transpose(c), got);
    refTranspose<3>(C, want);
    checkFloats(got, want, 9, "transpose(float3x3)");

    store(inverse(a), got);
    refInverse<4>(A, want);
    checkFloats(got, want, 16, "inverse(float4x4)");

    store(inverse(c), got);
    refInverse<3>(C, want);
    checkFloats(got, want, 9, "inverse(float3x3)");

    store(mul(c, c), got);
    refMul<3, 3, 3>(C, C, want);
    checkFloats(got, want, 9, "mul(float3x3, float3x3)");

    store(mul(e, d), got);
    refMul<3, 4, 3>(E, D, want);
    checkFloats(got, want, 9, "mul(float3x4, float4x3)");

    store(mul(d, e), got);
    refMul<4, 3, 4>(D, E, want);
    checkFloats(got, want, 16, "mul(float4x3, float3x4)");

    store(mul(v.xyz, e), got);
    refMul<1, 3, 4>(V, E, want);
    checkFloats(got, want, 4, "mul(float3, float3x4)");

    store(mul(d, v.xyz), got);
    refMul<4, 3, 1>(D, V, want);
    checkFloats(got, want, 4, "mul(float4x3, float3)");

    float dot4 = V[0] * W[0] + V[1] * W[1] + V[2] * W[2] + V[3] * W[3];
    float dot3 = V[0] * W[0] + V[1] * W[1] + V[2] * W[2];
    check(near(float(dot(v, w)), dot4), "dot(float4)");
    check(near(float(dot(v.xyz, w.xyz)), dot3), "dot(float3)");
    check(near(float(length(v)), std::sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2] + V[3] * V[3])), "length(float4)");

    int32_t I[3] = { 11, 22, 33 };
    int3 i3;
    load(i3, I);
    int32_t gotI[4];
    store(i3, gotI);
    check(gotI[0] == 11 && gotI[1] == 22 && gotI[2] == 33, "load(int3)");

    int4 si(-64, 64, -1, 1 << 30);
    store(si >> int4(2, 3, 1, 4), gotI);
    check(gotI[0] == (-64 >> 2) && gotI[1] == (64 >> 3) && gotI[2] == (-1 >> 1) && gotI[3] == ((1 << 30) >> 4),
        "int4 >> int4 (arithmetic, a count per lane)");
    store(si << int4(1, 0, 2, 1), gotI);
    check(gotI[0] == int32_t(uint32_t(-64) << 1) && gotI[1] == 64 && gotI[2] == -4 && gotI[3] == int32_t(uint32_t(1 << 30) << 1),
        "int4 << int4 (a count per lane)");

    uint4 su(0x80000000u, 0xF0u, 7u, 0xFFFFFFFFu);
    uint32_t gotU[4];
    store(su >> uint4(4, 1, 0, 31), gotU);
    check(gotU[0] == 0x08000000u && gotU[1] == 0x78u && gotU[2] == 7u && gotU[3] == 1u, "uint4 >> uint4 (logical, a count per lane)");
    store(su >> uint1(4u), gotU);
    check(gotU[0] == 0x08000000u && gotU[3] == 0x0FFFFFFFu, "uint4 >> uint (logical)");

    printf("%s\n", failures == 0 ? "all passed" : "FAILED");
    return failures == 0 ? 0 : 1;
}
