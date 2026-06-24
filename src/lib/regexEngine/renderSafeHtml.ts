/**
 * src/lib/regexEngine/renderSafeHtml.ts — Safe HTML Renderer for Iframe Preview
 * Guide §5: Wrap replaceString content in a full HTML document for sandboxed iframe preview.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CAPTURE GROUP PROCESSING — Guide §5.1 step 2
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SAMPLE_TEXTS: Record<string, string> = {
  '$&': 'Toàn bộ nội dung khớp (full match)',
  '$1': 'Nội dung mẫu nhóm 1',
  '$2': 'Nội dung mẫu nhóm 2',
  '$3': 'Nội dung mẫu nhóm 3',
  '$4': 'Nội dung mẫu nhóm 4',
  '$5': 'Nội dung mẫu nhóm 5',
};

/**
 * Replace capture group references ($1, $2, $&) with sample text for preview purposes.
 */
export function processCaptureGroups(
  content: string,
  sampleTexts?: Record<string, string>,
): string {
  const texts = { ...DEFAULT_SAMPLE_TEXTS, ...sampleTexts };

  return content
    .replace(/\$(\d+)/g, (match) => texts[match] ?? match)
    .replace(/\$&/g, texts['$&'] ?? '$&');
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE HTML RENDERER — Guide §5.2
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap htmlContent in a full HTML document suitable for iframe srcDoc.
 * Includes: jQuery CDN, dark theme CSS, ST common classes, accordion handlers.
 * Guide §5.2 template.
 */
export function renderSafeHtml(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <!-- jQuery for interactive elements -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    
    <style>
      /* === Base Theme (Match SillyTavern Dark) === */
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 12px 16px;
        background: #0f0f12;
        color: #e8e6f0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 0.9rem;
        line-height: 1.7;
      }
      
      /* === Các class CSS phổ biến của ST Cards === */
      .chinh_van  { border-left: 3px solid #6366f1; padding-left: 10px; color: #c7d2fe; margin: 4px 0; }
      .thoai      { color: #67e8f9; font-style: italic; }
      .hanhdong   { color: #fbbf24; font-style: italic; font-family: monospace; }
      .suy_nghi   { color: #c084fc; font-style: italic; opacity: 0.85; }
      .ngoai_hinh { color: #f9a8d4; }
      .cam_xuc    { color: #fb923c; font-style: italic; }
      
      /* === Accordion/Section System === */
      .section           { border: 1px solid #2a2a3e; border-radius: 8px; margin: 8px 0; overflow: hidden; }
      .section-header    { cursor: pointer; background: #16161e; padding: 8px 12px; user-select: none;
                           display: flex; justify-content: space-between; align-items: center; }
      .section-header:hover { background: #1e1e2e; }
      .section-content   { padding: 12px 14px; }
      .hidden            { display: none !important; }
      .collapsed         { /* marker class */ }
      
      /* === Game Panel (Guide §8.1) === */
      .game-panel        { border: 1px solid #2a2a3e; border-radius: 8px; margin: 8px 0; overflow: hidden; }
      .game-panel-header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 10px 14px;
                           cursor: pointer; font-weight: 600; display: flex; justify-content: space-between;
                           align-items: center; user-select: none; }
      .game-panel-header:hover { background: linear-gradient(135deg, #1e1e3a, #1a2744); }
      .game-panel-body   { padding: 12px 14px; background: #0f0f12; }
      .game-panel-body.collapsed { display: none; }
      .toggle-icon       { transition: transform 0.2s; }
      .toggle-icon.open  { transform: rotate(90deg); }
      
      /* === HP Bar (Guide §8.2) === */
      .hp-container { background: #1a1a2e; border-radius: 12px; padding: 2px; margin: 4px 0;
                      position: relative; height: 22px; overflow: hidden; }
      .hp-fill      { height: 100%; border-radius: 10px; transition: width 0.5s ease;
                      background: linear-gradient(90deg, #ef4444, #f97316); }
      .hp-text      { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                      font-size: 0.7rem; font-weight: 700; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
      
      /* === Badge / Divider === */
      .badge   { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem;
                 background: #2a2a3e; color: #a5b4fc; }
      .divider { height: 1px; background: #2a2a3e; margin: 8px 0; }
      
      /* === Action Buttons === */
      .action-btn { display: inline-block; padding: 6px 14px; border-radius: 6px; cursor: pointer;
                    background: #1a1a2e; color: #e8e6f0; border: 1px solid #2a2a3e; transition: all 0.2s; }
      .action-btn:hover { background: #2a2a3e; }
      
      /* === Scrollbar === */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    </style>
  </head>
  <body>
    <div class="st-preview">
      ${htmlContent}
    </div>
    
    <script>
      // Fallback event binders for accordion/section toggles
      if (typeof $ !== 'undefined') {
        $(document).ready(function() {
          $(document).on('click', '.section-header', function() {
            $(this).toggleClass('collapsed');
            $(this).next('.section-content').toggleClass('hidden');
          });
          $(document).on('click', '.game-panel-header', function() {
            var body = $(this).next('.game-panel-body');
            var icon = $(this).find('.toggle-icon');
            body.toggleClass('collapsed');
            icon.toggleClass('open');
          });
          
          // Tab switcher for custom card layouts
          $(document).on('click', '.tab-btn', function() {
            var $btn = $(this);
            var $nav = $btn.parent();
            var index = $nav.find('.tab-btn').index($btn);
            if (index !== -1) {
              $nav.find('.tab-btn').removeClass('active');
              $btn.addClass('active');
              
              var $container = $nav.closest('.sp');
              if ($container.length === 0) {
                $container = $nav.parent();
              }
              var $panes = $container.find('.tab-pane');
              if ($panes.length > index) {
                $panes.removeClass('active');
                $panes.eq(index).addClass('active');
              }
            }
          });

          // Collapse/expand header handler for custom card layouts
          $(document).on('click', '.sp-hd, .chev', function(e) {
            if ($(this).hasClass('sp-hd') && $(e.target).closest('.chev').length) {
              return;
            }
            var $sp = $(this).closest('.sp');
            var $coll = $sp.find('.coll');
            var $chev = $sp.find('.chev');
            $coll.toggleClass('shut');
            $chev.toggleClass('shut');
          });
        });
      }
    </script>
  </body>
</html>`;
}
