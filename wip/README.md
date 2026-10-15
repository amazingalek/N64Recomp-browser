# WIP: GoldenEye keyboard and mouse (remove this folder before the PR)

Hand-over notes. Nothing here has been built or played yet.

## RecompFrontend-web-mouse-bindings.patch

A commit on RecompFrontend-web main 75fe596, not pushed. Apply it with `git am` in a clone of the fork.
- EXTRA_1..EXTRA_8: inputs a game defines beyond the N64's buttons, hidden until the game enables them.
  `profiles::get_extra_inputs(player)` returns a bitmask of the ones held.
- Mouse buttons (PF_MOUSE_1..5) and the wheel (0x100 up, 0x101 down) are bindable as InputType::Mouse.
  A wheel notch is a 60 ms press and a 60 ms release; at most 3 notches are queued.
- GeneralTabOptions gains mouse_sensitivity_default and mouse_sensitivity_description.
- Still to add: `recompinput::take_mouse_deltas(float* x, float* y)`, an accumulator scaled by
  sensitivity. poll_inputs runs from both ultramodern's poll_input and recomp_update_inputs, so
  mouse_delta is overwritten between them.
- Not yet compiled.
- Then: push it to the fork's main (fast-forward), bump forks.txt, run tools/export_patches.sh, and add
  a row to CLAUDE.md's fork table.

## GoldenEye64Recomp-web (not started in code)

The design: facts from the decomp and goldeneye-pc-port only, nothing copied from src/game.
Addresses are from dump.toml.

### Per-tick hook

Use a us.toml `[[patches.hook]]` at the entry of bondviewApplyVertaTheta (0x80481790), or patch it.
It runs after the input is read, before the wrap, clamp and crouch animation.
- Mouse look, outside aim mode: `vv_theta += dx*k*fovscale`, `vv_verta -= dy*k` (invert-Y flips it).
  k is PD's 0.022 degrees a count times MouseSpeed (pct/10, default 25%).
- In aim mode, edge turn past |s| > 0.7.
- Crouch: force crouchpos at 0x9C (0 squat, 1 half, 2 stand) while the toggle is held.
- Reload, on the key's press: attempt_reload_item_in_hand (0x8045D964) for GUNRIGHT and GUNLEFT.
- Next and previous weapon: advance_through_inventory (0x8045D6D0) and backstep_through_inventory (0x8045D768).
- Only for player 0, and not when bonddead, pause_state, the watch menu or the camera mode says so.

g_CurrentPlayer is at 0x8007A0B0. Its fields:

| Field | Offset |
|---|---|
| crouchpos | 0x9C |
| bonddead | 0xD8 |
| docentreupdown | 0x104 |
| insightaimmode | 0x124 |
| vv_theta | 0x148 |
| vv_verta | 0x158 |
| pause_state | 0x218 |
| crosshair_x_pos, crosshair_y_pos | 0xFF0, 0xFF4 |
| guncrossdamp | 0xFF8 |

### Other patches

- Aim mode: RECOMP_PATCH sub_GAME_7F067FBC (0x80467FBC). Keep a swivel position s that the mouse
  moves, clamp it to ±1, and pass it to caclulate_gun_crosshair_position_rotation(s_x, s_y, 0.01, AimLockSpeed).
  The original passes the stick, the weapon's CrosshairSpeed and its AimLockSpeed. Reset s on leaving aim mode.
  The PD classic factors per scaled count:
  - x: 0.062857*0.7*aimf*(320/1080)/aspect
  - y: 0.062857*0.7*aimf*(240/1080)
- cur_player_get_lookahead (0x804A4E68) returns 0 while mouse look is on, so the look-ahead doesn't fight the mouse.
- Menus: a hook at the entry of frontUpdateControlStickPosition (0x80409B84) adds the deltas to the
  cursor_h_pos and cursor_v_pos globals; the game's own clamp follows.
- New natives in patches/syms.ld and src/game/recomp_api.cpp: recomp_get_extra_inputs,
  recomp_take_mouse_deltas, recomp_get_mouse_options (aim sensitivity, invert Y).
  recomp_get_mouse_deltas (0x8F000080) already exists, unused.
- src/game/config.cpp:
  - The mouse sensitivity default and help text (it still reads Zelda's).
  - Aim Mode Sensitivity and Invert Mouse Y.
  - Enable and name the extras with their keys: Reload R, Half Crouch LShift, Crouch LCtrl,
    Next Weapon wheel down, Previous Weapon wheel up.

### Default bindings

| Action | Keys |
|---|---|
| Move forward and back (stick Y) | W, S |
| Strafe (C-left, C-right) | A, D |
| Turn (stick X) | Left, Right |
| Look up and down (C-up, C-down) | Up, Down |
| Fire (Z) | LMB, Space |
| Aim (R) | RMB, Z key |
| Use (B) | E |
| Start | Return, Tab |

PD's defaults are in its port/src/input.c:191-215.

### For the comparison with PD

- In GE's aim mode Bond stands still and C-left/right lean: the game's own rules.
- E also reloads when nothing is in reach (GE's B).

## Building

This had to stop because the machine's security policy blocks running programs built on it
(N64Recomp, naga, the desktop game). The build and play have to happen on a machine without that rule.
