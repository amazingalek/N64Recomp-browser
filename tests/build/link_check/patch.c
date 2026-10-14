// A patch calling native.c's native as it calls a recompiled function: a call whose signature doesn't match the
// function's, which wasm-ld links as a trap, with a warning that frontend/ makes an error.
struct recomp_context;
void native(unsigned char* rdram, struct recomp_context* ctx);

int main(void) {
    native(0, 0);
    return 0;
}
