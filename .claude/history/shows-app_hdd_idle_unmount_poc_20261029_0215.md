# HDD idle unmount + spindown POC — 2026-10-29

Goal: HDD unmounts + spins down after 15 min idle; login page brings it back.

## Changes (backups: *.bak-20261029 next to each file)
- apt: installed `hd-idle`, `hdparm`.
- /etc/default/hd-idle: START_HD_IDLE=true,
  HD_IDLE_OPTS="-i 0 -a /dev/disk/by-id/usb-JMicron_Generic_0123456789ABCDEF-0:0 -i 900"
  (only the USB HDD, 900 s). hd-idle.service enabled.
- /etc/fstab /mnt/hdd line: added
  `x-systemd.automount,x-systemd.idle-timeout=15min,x-systemd.device-timeout=10s`.
  /mnt/hdd is now autofs; ext4 mounted on first access, unmounted after 15 min with no open files.
- /etc/systemd/system/hdd-remount.service: ExecStart `mount UUID=...` -> `ls /mnt/hdd`
  (triggers automount instead of mounting over autofs). Still restarts shows-app after.
- App code: unchanged. AuthGate.js already POSTs /api/wake on login page -> reads /mnt/hdd -> mounts + spins up.

## Findings
- JMS578 bridge: `hdparm -C` = unknown (no ATA passthrough), but SCSI stop via `hd-idle -t /dev/sda` works:
  cold read 2.0 s vs warm 0.03 s, no USB reset on wake.
- hd-idle needs full /dev path; bare `sda` fails.
- dmesg shows USB resets every ~30 min (00:42, 01:12, 01:42) even idle — pattern, cause unknown.

## Rollback
sudo cp -p /etc/fstab.bak-20261029 /etc/fstab
sudo cp -p /etc/default/hd-idle.bak-20261029 /etc/default/hd-idle
sudo cp -p /etc/systemd/system/hdd-remount.service.bak-20261029 /etc/systemd/system/hdd-remount.service
sudo systemctl daemon-reload; sudo systemctl disable --now hd-idle mnt-hdd.automount; sudo mount /mnt/hdd

## Test 1 result (01:57-02:23)
- Spindown fired 02:12:51; /api/wake spun up in 2.05 s, home 200.
- Unmount did NOT fire: daily-script/pi_monitor/collect.py (cron every minute) did
  shutil.disk_usage('/mnt/hdd') → path walk resets autofs idle timer every minute.
- Fix (daily-script, develop): per-minute sample now reads hdd % from 6-hourly .state/hdd.json
  and only checks /dev/disk/by-uuid/<uuid> exists (red only when drive unplugged). 6-hourly `hdd` run
  still mounts + spins up the drive every 6 h.

## Test 2 result (02:24-02:46) — unmount still blocked
- Not busy: manual `umount /mnt/hdd` succeeds.
- Journal after manual umount: "Got automount request for /mnt/hdd, triggered by 3444 (k3s-server)" within ~1 min.
- k3s kubelet/cadvisor statfs's every mount in /proc/mounts → re-triggers automount; no k3s pod uses /mnt/hdd
  (pods: headlamp, coredns, traefik, metrics-server, local-path-provisioner).
- Spindown (A) works: spinup+spindown seen, wake 0.37-2.05 s.
- Open decision for Gaurav: disable k3s / keep A only (revert fstab + pi_monitor) / custom unmount script.

## 2026-10-29 11:20 — Decision: keep spin-down (A), revert automount (B)
- Verified: journal shows manual umount 02:49:16, then `Got automount request ... triggered by 3444 (k3s-server)` at 02:49:22; never idled out in 9h after.
- Mechanism (Robertof gist, node_exporter case): statfs() path walk resets autofs last_used. Fix there = ExtraOptions=strictexpire (systemd>=250, needs hand-written .automount). Not used: once expired, k3s would just remount within a minute → mount/unmount churn.
- Reverted: /etc/fstab and hdd-remount.service restored from .bak-20261029. POC versions kept as *.poc-20261029.
- hd-idle (900 s, JMicron by-id) stays on.
- Checked: /mnt/hdd plain ext4, no autofs layer; /api/wake on :4180 → 204.
