/**
 * Shared typography + card styles for Gap U marketing surfaces (/studios/gap-u/*).
 * Keep in sync with GapUStudioPage layout expectations.
 */
export const GAP_U_SURFACE_CSS = `
  .gapu-page { max-width: 960px; margin: 0 auto; padding: 0 20px 48px; }
  .gapu-hero {
    padding: clamp(32px, 5vw, 48px) 0 28px;
    text-align: center;
  }
  .gapu-eyebrow {
    font-size: 11px; font-weight: 800; letter-spacing: 0.12em;
    text-transform: uppercase; color: #9d174d; margin: 0 0 12px;
  }
  .gapu-headline {
    font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: #1c1917;
    letter-spacing: -0.03em; line-height: 1.15; margin: 0 0 14px;
  }
  .gapu-sub { font-size: 16px; line-height: 1.55; color: #57534e; max-width: 640px; margin: 0 auto 20px; }
  .gapu-section-title {
    font-size: 22px; font-weight: 800; color: #1c1917; margin: 0 0 20px;
    letter-spacing: -0.02em;
  }
  .gapu-grid {
    display: grid; gap: 14px;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
  .gapu-card {
    padding: 18px; border-radius: 18px; background: rgba(255,255,255,0.92);
    border: 1px solid rgba(28,25,23,0.08);
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }
  .gapu-card h3 { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #1c1917; }
  .gapu-card p { margin: 0; font-size: 14px; line-height: 1.5; color: #57534e; }
  .gapu-card ul { margin: 10px 0 0; padding-left: 18px; font-size: 13px; color: #78716c; }
  .gapu-pathway-grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  }
  .gapu-pathway-card {
    display: flex; flex-direction: column; min-height: 100%;
    padding: 22px 20px; border-radius: 18px;
    background: rgba(255,255,255,0.94);
    border: 1px solid rgba(28,25,23,0.08);
    border-top: 3px solid #9d174d;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .gapu-pathway-badge {
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: #9d174d; margin: 0 0 10px;
  }
  .gapu-pathway-title { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #1c1917; }
  .gapu-pathway-lede { margin: 0 0 14px; font-size: 14px; line-height: 1.55; color: #57534e; flex: 1; }
  .gapu-pathway-cta {
    display: inline-flex; align-items: center; justify-content: center; margin-top: auto;
    padding: 11px 16px; border-radius: 12px; font-size: 13px; font-weight: 700;
    text-decoration: none; background: #1c1917; color: #fff;
    align-self: flex-start;
    transition: background 0.15s ease;
  }
  .gapu-pathway-cta:hover { background: #44403c; }
  .gapu-why {
    margin: 36px 0; padding: 28px 24px; border-radius: 22px;
    background: linear-gradient(165deg, #fdf2f8 0%, #fafaf9 55%, #f5f2ea 100%);
    border: 1px solid rgba(157, 23, 77, 0.12);
  }
  .gapu-why-point { margin-bottom: 16px; }
  .gapu-why-point h4 { margin: 0 0 4px; font-size: 15px; font-weight: 800; color: #44403c; }
  .gapu-why-point p { margin: 0; font-size: 14px; color: #57534e; line-height: 1.5; }
  .gapu-list-item {
    padding: 14px 16px; border-radius: 14px; background: #fff;
    border: 1px solid rgba(28,25,23,0.06); margin-bottom: 10px;
  }
  .gapu-list-meta { font-size: 11px; font-weight: 700; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.06em; }
  .gapu-live-badge {
    display: inline-block; margin-bottom: 24px; padding: 4px 10px; border-radius: 8px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    background: #ecfdf5; color: #047857;
  }
  .gapu-access-bar {
    display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;
    padding: 20px; border-radius: 18px; background: rgba(28,25,23,0.04);
    border: 1px solid rgba(28,25,23,0.08); margin-top: 32px;
  }
  .gapu-access-label { margin: 0; font-size: 13px; font-weight: 700; color: #44403c; }
  .gapu-access-desc { margin: 6px 0 0; font-size: 13px; color: #78716c; max-width: 480px; }
  .gapu-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 11px 18px; border-radius: 12px; font-size: 13px; font-weight: 700;
    text-decoration: none; border: none; cursor: pointer;
  }
  .gapu-btn-primary { background: #9d174d; color: #fff; }
  .gapu-btn-ghost {
    background: transparent; color: #44403c; border: 1px solid rgba(28,25,23,0.15);
    text-decoration: none;
  }
  .gapu-btn-ghost:hover { background: rgba(28,25,23,0.04); }
  .gapu-access-hint { width: 100%; margin: 8px 0 0; font-size: 12px; color: #78716c; }
  .gapu-access-status { text-align: center; font-size: 13px; color: #57534e; margin-top: 12px; }
  .gapu-modal-backdrop {
    position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .gapu-modal {
    width: min(420px, 100%); padding: 22px; border-radius: 18px; background: #fff;
  }
  .gapu-modal-title { margin: 0 0 8px; font-size: 18px; font-weight: 800; }
  .gapu-modal-sub { margin: 0 0 16px; font-size: 13px; color: #78716c; line-height: 1.45; }
  .gapu-back { display: inline-flex; margin-bottom: 16px; font-size: 13px; font-weight: 600; color: #57534e; text-decoration: none; }
  .gapu-roadmap-phase {
    margin-bottom: 20px; padding: 20px; border-radius: 16px;
    background: rgba(255,255,255,0.94); border: 1px solid rgba(28,25,23,0.08);
  }
  .gapu-roadmap-phase h3 { margin: 0 0 6px; font-size: 17px; font-weight: 800; color: #831843; }
  .gapu-roadmap-phase-summary { margin: 0 0 14px; font-size: 14px; color: #57534e; line-height: 1.5; }
  .gapu-roadmap-unit { margin-bottom: 12px; }
  .gapu-roadmap-unit h4 { margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #1c1917; }
  .gapu-roadmap-unit p { margin: 0; font-size: 13px; color: #57534e; line-height: 1.5; }
  .gapu-roadmap-muted { margin: 0 0 20px; font-size: 13px; color: #78716c; line-height: 1.5; }
`;
