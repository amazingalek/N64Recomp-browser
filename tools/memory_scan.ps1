# Whose code made the memory a browser's GPU process grows by, on Windows, read from outside the process: no
# elevation, no tracing flag, nothing in the browser. For a GPU process that keeps growing, where about:memory only
# says "system heap" (memory native code allocates that Firefox's own heap doesn't count) or "GPU committed".
#
#   pwsh tools/memory_scan.ps1 snap -ProfileDir <dir> -Snap <file>    early in a play: the process's committed pages
#   pwsh tools/memory_scan.ps1 diff -ProfileDir <dir> -Snap <file>    later: what was committed since, and whose
#
# -ProfileDir is the --profile given to play_page.mjs (any part of the path will do): the GPU process is the child of the
# Firefox (or Chrome, -Browser chrome.exe) started with it, so another browser on the machine is left alone; -TargetPid
# names a process instead. The page plays meanwhile (play_page.mjs --play, a scan taking a few seconds to half a minute).
#
# diff reads every private page committed since the snap and prints its MB by kind: Windows' heap (a segment with the
# NT heap's signature), write-combined (memory a D3D12 driver maps for the CPU to write, upload heaps and GPU memory on
# an integrated GPU; not read, since a read of it is slow), 1 MB-aligned (mozjemalloc's chunks, Firefox's own heap) and
# other. Then, for each kind, how many of those pages' 8-byte words point into each loaded module: an object's vtable,
# a callback, a string a module keeps, so the module that made a block. A pointer names who made a block, not who
# keeps it alive: a D3D12 object wgpu never releases reads as d3d12.dll's and the driver's. And it counts DXBC (a
# compiled shader's container) and a few other markers in the new pages. docs/findings.md, Memory, has what it found.
param([Parameter(Position = 0)][ValidateSet('snap', 'diff')][string]$Mode, [string]$ProfileDir, [int]$TargetPid = 0,
  [string]$Snap, [string]$Out, [string]$Browser = 'firefox.exe')
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

public static class HeapScan {
  [StructLayout(LayoutKind.Sequential)]
  public struct MBI { public IntPtr BaseAddress, AllocationBase; public uint AllocationProtect; public ushort PartitionId; public IntPtr RegionSize; public uint State, Protect, Type; }
  [StructLayout(LayoutKind.Sequential)]
  public struct MODULEINFO { public IntPtr Base; public uint Size; public IntPtr Entry; }
  [DllImport("kernel32")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32")] static extern IntPtr VirtualQueryEx(IntPtr h, IntPtr addr, out MBI mbi, IntPtr len);
  [DllImport("kernel32")] static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("psapi")] static extern bool EnumProcessModulesEx(IntPtr h, [Out] IntPtr[] mods, int cb, out int needed, uint filter);
  [DllImport("psapi", CharSet = CharSet.Unicode)] static extern uint GetModuleBaseNameW(IntPtr h, IntPtr mod, StringBuilder name, int size);
  [DllImport("psapi")] static extern bool GetModuleInformation(IntPtr h, IntPtr mod, out MODULEINFO info, int cb);

  const uint COMMIT = 0x1000, PRIVATE = 0x20000;

  static List<MBI> Regions(IntPtr h) {
    var list = new List<MBI>();
    long addr = 0;
    MBI m;
    while (VirtualQueryEx(h, (IntPtr)addr, out m, (IntPtr)Marshal.SizeOf<MBI>()) != IntPtr.Zero) {
      list.Add(m);
      long next = (long)m.BaseAddress + (long)m.RegionSize;
      if (next <= addr) break;
      addr = next;
    }
    return list;
  }

  static IntPtr Open(int pid) {
    IntPtr h = OpenProcess(0x0410, false, pid);
    if (h == IntPtr.Zero) throw new Exception("OpenProcess failed: " + Marshal.GetLastWin32Error());
    return h;
  }

  public static void Snap(int pid, string path) {
    IntPtr h = Open(pid);
    using (var w = new StreamWriter(path))
      foreach (var m in Regions(h))
        if (m.State == COMMIT && m.Type == PRIVATE) w.WriteLine((long)m.BaseAddress + " " + (long)m.RegionSize);
  }

  public static string Diff(int pid, string snapPath) {
    IntPtr h = Open(pid);
    var old = new HashSet<long>();
    foreach (var line in File.ReadAllLines(snapPath)) {
      var p = line.Split(' ');
      long b = long.Parse(p[0]), s = long.Parse(p[1]);
      for (long a = b; a < b + s; a += 4096) old.Add(a >> 12);
    }
    var mods = new IntPtr[4096];
    int needed;
    EnumProcessModulesEx(h, mods, mods.Length * 8, out needed, 3);
    var ranges = new List<Tuple<long, long, string>>();
    for (int i = 0; i < needed / 8; i++) {
      var sb = new StringBuilder(260);
      GetModuleBaseNameW(h, mods[i], sb, 260);
      MODULEINFO mi;
      if (GetModuleInformation(h, mods[i], out mi, Marshal.SizeOf<MODULEINFO>())) ranges.Add(Tuple.Create((long)mi.Base, (long)mi.Base + mi.Size, sb.ToString().ToLowerInvariant()));
    }
    ranges.Sort((a, b) => a.Item1.CompareTo(b.Item1));
    long[] starts = ranges.Select(r => r.Item1).ToArray();

    var regions = Regions(h);
    var allocSize = new Dictionary<long, long>();
    foreach (var m in regions) if (m.State == COMMIT || m.State == 0x2000) {
      long ab = (long)m.AllocationBase;
      allocSize[ab] = (allocSize.ContainsKey(ab) ? allocSize[ab] : 0) + (long)m.RegionSize;
    }
    var category = new Dictionary<long, string>();
    Func<MBI, string> cat = (m) => {
      if ((m.Protect & 0x400) != 0) return "writecombine";
      if ((m.Protect & 0x200) != 0) return "nocache";
      long ab = (long)m.AllocationBase;
      string c;
      if (category.TryGetValue(ab, out c)) return c;
      var head = new byte[32];
      IntPtr r;
      c = "other";
      if (ReadProcessMemory(h, (IntPtr)ab, head, (IntPtr)32, out r)) {
        uint sig = BitConverter.ToUInt32(head, 0x10);
        if (sig == 0xFFEEFFEE) c = "ntheap";
        else if (sig == 0xDDEEDDEE) c = "segheap";
      }
      if (c == "other" && (ab & 0xFFFFF) == 0 && (allocSize[ab] & 0xFFFFF) == 0) c = "1MB-aligned";
      category[ab] = c;
      return c;
    };

    var bytesBy = new Dictionary<string, long>();
    var zeroBy = new Dictionary<string, long>();
    var ptrs = new Dictionary<string, Dictionary<string, long>>();
    var magic = new Dictionary<string, long> { { "DXBC", 0 }, { "@binding(", 0 }, { "Texture2D", 0 }, { "SPIR-V", 0 } };
    var big = new List<string>();
    var page = new byte[4096];
    foreach (var m in regions) {
      if (m.State != COMMIT || m.Type != PRIVATE) continue;
      string c = cat(m);
      long b = (long)m.BaseAddress, e = b + (long)m.RegionSize, fresh = 0;
      bool readable = c != "writecombine" && c != "nocache" && (m.Protect & 0x101) == 0;
      for (long a = b; a < e; a += 4096) {
        if (old.Contains(a >> 12)) continue;
        fresh += 4096;
        bytesBy[c] = (bytesBy.ContainsKey(c) ? bytesBy[c] : 0) + 4096;
        if (!readable) continue;
        IntPtr r;
        if (!ReadProcessMemory(h, (IntPtr)a, page, (IntPtr)4096, out r)) continue;
        bool zero = true;
        Dictionary<string, long> pc;
        if (!ptrs.TryGetValue(c, out pc)) ptrs[c] = pc = new Dictionary<string, long>();
        for (int i = 0; i < 4096; i += 8) {
          long v = BitConverter.ToInt64(page, i);
          if (v != 0) zero = false; else continue;
          int k = Array.BinarySearch(starts, v);
          if (k < 0) k = ~k - 1;
          if (k >= 0 && v < ranges[k].Item2) { string n = ranges[k].Item3; pc[n] = (pc.ContainsKey(n) ? pc[n] : 0) + 1; }
        }
        if (zero) zeroBy[c] = (zeroBy.ContainsKey(c) ? zeroBy[c] : 0) + 4096;
        else {
          string s = Encoding.ASCII.GetString(page);
          foreach (var key in magic.Keys.ToList()) for (int i = s.IndexOf(key); i >= 0; i = s.IndexOf(key, i + 1)) magic[key]++;
        }
      }
      if (fresh >= (8L << 20)) big.Add(string.Format("{0:x} {1} MB new of {2} MB region, {3}, protect {4:x}, alloc {5} MB", b, fresh >> 20, (long)m.RegionSize >> 20, c, m.Protect, allocSize[(long)m.AllocationBase] >> 20));
    }
    var o = new StringBuilder();
    o.AppendLine("new committed private MB by kind (all-zero MB):");
    foreach (var kv in bytesBy.OrderByDescending(x => x.Value)) o.AppendLine(string.Format("  {0,-14} {1,8:F1} ({2:F1})", kv.Key, kv.Value / 1048576.0, (zeroBy.ContainsKey(kv.Key) ? zeroBy[kv.Key] : 0) / 1048576.0));
    o.AppendLine("pointers into modules found in those new pages, by kind:");
    foreach (var kv in ptrs) {
      o.AppendLine("  " + kv.Key + ":");
      foreach (var p in kv.Value.OrderByDescending(x => x.Value).Take(12)) o.AppendLine(string.Format("    {0,-28} {1,10}", p.Key, p.Value));
    }
    o.AppendLine("strings in new pages: " + string.Join(", ", magic.Select(kv => kv.Key + " " + kv.Value)));
    o.AppendLine("regions with 8 MB or more new:");
    foreach (var l in big) o.AppendLine("  " + l);
    return o.ToString();
  }
}
'@
if ($TargetPid -eq 0) {
  $all = Get-CimInstance Win32_Process -Filter "Name='$Browser'"
  $parents = @($all | ? { $_.CommandLine -and $_.CommandLine.Contains($ProfileDir) -and $_.CommandLine -notmatch '-parentPid|--type=' } | % { [int]$_.ProcessId })
  $gpu = @($all | ? { (($_.CommandLine -match '-parentPid (\d+)' -and $parents -contains [int]$Matches[1]) -or $parents -contains [int]$_.ParentProcessId) -and $_.CommandLine -match '--type=gpu-process| gpu$' })
  if ($gpu.Count -ne 1) { throw "found $($gpu.Count) GPU processes for $ProfileDir (browsers $parents)" }
  $TargetPid = $gpu[0].ProcessId
}
$mb = [math]::Round((Get-Process -Id $TargetPid).PrivateMemorySize64 / 1MB)
if ($Mode -eq 'snap') { [HeapScan]::Snap($TargetPid, $Snap); "snap of $TargetPid at $mb MB private" }
else { "diff of $TargetPid at $mb MB private"; $r = [HeapScan]::Diff($TargetPid, $Snap); $r; if ($Out) { $r | Set-Content $Out } }
