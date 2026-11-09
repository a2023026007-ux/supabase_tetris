import { $, openDialog } from './dom';
import { sound } from '../audio/sound';

const dlg = $<HTMLDialogElement>('#dlg-settings');
const bgmOn = $<HTMLInputElement>('#set-bgm-on');
const bgmVol = $<HTMLInputElement>('#set-bgm-vol');
const sfxOn = $<HTMLInputElement>('#set-sfx-on');
const sfxVol = $<HTMLInputElement>('#set-sfx-vol');
const muted = $<HTMLInputElement>('#set-muted');
const muteBtn = $<HTMLButtonElement>('#btn-mute');

function syncControls(): void {
  const s = sound.settings;
  bgmOn.checked = s.bgmOn;
  bgmVol.value = String(Math.round(s.bgmVolume * 100));
  bgmVol.disabled = !s.bgmOn;
  sfxOn.checked = s.sfxOn;
  sfxVol.value = String(Math.round(s.sfxVolume * 100));
  sfxVol.disabled = !s.sfxOn;
  muted.checked = s.muted;
}

export function refreshMuteButton(): void {
  const isMuted = sound.settings.muted;
  muteBtn.textContent = isMuted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐';
  muteBtn.setAttribute('aria-pressed', String(isMuted));
  if (dlg.open) syncControls();
}

export function openSettings(): void {
  syncControls();
  openDialog(dlg);
}

export function initSettingsUI(): void {
  refreshMuteButton();
  bgmOn.addEventListener('change', () => {
    sound.update({ bgmOn: bgmOn.checked });
    syncControls();
  });
  bgmVol.addEventListener('input', () => sound.update({ bgmVolume: Number(bgmVol.value) / 100 }));
  sfxOn.addEventListener('change', () => {
    sound.update({ sfxOn: sfxOn.checked });
    syncControls();
  });
  sfxVol.addEventListener('input', () => sound.update({ sfxVolume: Number(sfxVol.value) / 100 }));
  // 볼륨을 놓았을 때 미리듣기
  sfxVol.addEventListener('change', () => {
    sound.unlock();
    sound.play('rotate');
  });
  muted.addEventListener('change', () => {
    sound.unlock();
    sound.update({ muted: muted.checked });
    refreshMuteButton();
  });
  muteBtn.addEventListener('click', () => {
    sound.unlock();
    sound.toggleMute();
    refreshMuteButton();
    muteBtn.blur();
  });
}
