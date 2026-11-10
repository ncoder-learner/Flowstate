export const FEEL = {
  coyoteTime: 0.10, jumpBufferTime: 0.11, airStrafeAcceleration: 13.5,
  grappleRange: 38, grappleAssistAngle: 0.095,
  slideJumpMomentum: 1.12, slideJumpCarryTime: 0.24, slideJumpSpeedCap: 25,
  slideCameraTilt: -0.055, speedFovScale: 0.42,
  windStartSpeed: 11, windFullSpeed: 25, windBasePitch: 75, windPitchRange: 190, windMaxVolume: 0.018,
  killHitstop: 0.025, bossKillSlowMotion: 0.62, sectorClearSlowMotion: 0.42, slowMotionScale: 0.24,
  critPitch: 1040, killPitchBase: 390, killPitchPerFlow: 55,
  hitFlashDuration: 0.12, hitStaggerDuration: 0.075,
  speedLineStart: 17, speedLineFull: 27, speedLineCount: 22, speedLineInnerRadius: 0.3, speedLineRadiusStep: 0.045, speedLineBaseLength: 0.08, speedLineMaxLength: 0.34, speedLineDepth: -1.35, speedLineOpacity: 0.42, speedLineDrift: 0.2,
  hitFlashEmissive: 2.4, hitFlashRestEmissive: 0.16,
} as const;
