import * as cheerio from 'cheerio';
import path from 'path';

export interface ModificationDetail {
  tag: string;
  action: 'injected' | 'updated' | 'demoted' | 'promoted' | 'formatted';
  targetSelector?: string;
  oldValue?: string;
  newValue: string;
  reason: string;
}

export interface ParseAndOptimizeOptions {
  brandName?: string;
  filename?: string;
  defaultLanguage?: string;
}

export interface ParseResult {
  html: string;
  modifications: ModificationDetail[];
  isModified: boolean;
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatTitleFromFilename(filename: string): string {
  const parsed = path.parse(filename);
  const nameWithoutExt = parsed.name.toLowerCase();
  if (nameWithoutExt === 'index' || nameWithoutExt === 'home') {
    return 'Inicio';
  }

  const words = nameWithoutExt
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'Inicio';

  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatMetaDescription(text: string): string {
  let cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return '';

  if (cleaned.length <= 160) {
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
    return cleaned;
  }

  let truncated = cleaned.slice(0, 157);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 100) {
    truncated = truncated.slice(0, lastSpace);
  }

  return truncated.trim() + '...';
}

function formatAltFromFilename(src: string, brandName: string): string {
  const fallback = 'Joyería fina Aguamarina';
  if (!src) return fallback;
  
  try {
    const filename = path.basename(src.split('?')[0]);
    const nameWithoutExt = path.parse(filename).name;

    if (/^(img|image|photo|pic|picture|dsc|file|asset)\d*$/i.test(nameWithoutExt)) {
      return fallback;
    }

    const words = nameWithoutExt
      .replace(/[-_]+/g, ' ')
      .replace(/\d+/g, '')
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0 || nameWithoutExt.length < 3) {
      return fallback;
    }

    const titleCase = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    return `${titleCase} - ${brandName}`;
  } catch (err) {
    return fallback;
  }
}

export function parseAndOptimizeHtml(
  htmlContent: string,
  options: ParseAndOptimizeOptions = {}
): ParseResult {
  const brandName = options.brandName || 'Aguamarina Joyería';
  const filename = options.filename || 'index.html';
  const defaultLanguage = options.defaultLanguage || 'es';
  const modifications: ModificationDetail[] = [];

  let inputHtml = htmlContent;
  let isDoctypePresent = false;

  if (inputHtml && /^\s*<!DOCTYPE/i.test(inputHtml)) {
    isDoctypePresent = true;
  }

  // Handle empty or whitespace-only files
  if (!inputHtml || inputHtml.trim().length === 0) {
    inputHtml = `<!DOCTYPE html>
<html lang="${defaultLanguage}">
<head>
  <meta charset="UTF-8">
</head>
<body>
</body>
</html>`;
    isDoctypePresent = true;
    modifications.push({
      tag: 'html',
      action: 'injected',
      newValue: 'Clean HTML5 template structure',
      reason: 'Initialized standard HTML5 structure for empty file'
    });
  }

  const hasHeadTagOriginally = /<head[\s>]/i.test(inputHtml);

  let $ = cheerio.load(inputHtml, {
    decodeEntities: false,
    xml: false
  } as any);

  // Ensure <head> tag exists
  let $head = $('head');
  if ($head.length === 0) {
    let $html = $('html');
    if ($html.length === 0) {
      const bodyContent = $.html();
      $ = cheerio.load(
        `<!DOCTYPE html><html lang="${defaultLanguage}"><head></head><body>${bodyContent}</body></html>`,
        { decodeEntities: false, xml: false } as any
      );
      $head = $('head');
      isDoctypePresent = true;
    } else {
      $html.prepend('<head></head>');
      $head = $('head');
    }
  }

  if (!hasHeadTagOriginally) {
    modifications.push({
      tag: 'head',
      action: 'injected',
      newValue: '<head></head>',
      reason: 'Created missing <head> tag inside <html>'
    });
  }

  // 1. Optimize <title> tag
  let $title = $('head > title');
  const brandSuffix = ` | ${brandName}`;

  if ($title.length === 0 || !$title.text().trim()) {
    // Find candidate title
    let candidateTitle = '';
    const $firstH1 = $('h1').first();
    if ($firstH1.length > 0 && $firstH1.text().trim()) {
      candidateTitle = $firstH1.text().trim();
    } else {
      const $firstHeading = $('h2, h3').first();
      if ($firstHeading.length > 0 && $firstHeading.text().trim()) {
        candidateTitle = $firstHeading.text().trim();
      } else {
        candidateTitle = formatTitleFromFilename(filename);
      }
    }

    if (candidateTitle.toLowerCase().endsWith(brandName.toLowerCase())) {
      candidateTitle = candidateTitle;
    } else {
      candidateTitle = `${candidateTitle}${brandSuffix}`;
    }

    if ($title.length === 0) {
      $head.append(`<title>${escapeHtmlAttr(candidateTitle)}</title>`);
      modifications.push({
        tag: 'title',
        action: 'injected',
        newValue: candidateTitle,
        reason: 'Injected missing <title> tag with brand suffix'
      });
    } else {
      const oldVal = $title.text();
      $title.text(candidateTitle);
      modifications.push({
        tag: 'title',
        action: 'updated',
        oldValue: oldVal,
        newValue: candidateTitle,
        reason: 'Populated empty <title> tag with candidate title and brand suffix'
      });
    }
  } else {
    const existingTitle = $title.text().trim();
    const isGeneric = /^(document|untitled|untitled document|documento sin t[ií]tulo|p[aá]gina sin t[ií]tulo|home|inicio)$/i.test(existingTitle);

    if (isGeneric) {
      let candidateTitle = '';
      const $firstH1 = $('h1').first();
      if ($firstH1.length > 0 && $firstH1.text().trim()) {
        candidateTitle = $firstH1.text().trim();
      } else {
        candidateTitle = formatTitleFromFilename(filename);
      }

      const newTitle = candidateTitle.toLowerCase().endsWith(brandName.toLowerCase())
        ? candidateTitle
        : `${candidateTitle}${brandSuffix}`;

      $title.text(newTitle);
      modifications.push({
        tag: 'title',
        action: 'updated',
        oldValue: existingTitle,
        newValue: newTitle,
        reason: 'Replaced generic title text with context-based title and brand suffix'
      });
    } else if (!existingTitle.toLowerCase().includes(brandName.toLowerCase())) {
      const newTitle = `${existingTitle}${brandSuffix}`;
      $title.text(newTitle);
      modifications.push({
        tag: 'title',
        action: 'updated',
        oldValue: existingTitle,
        newValue: newTitle,
        reason: 'Appended brand suffix to existing title tag'
      });
    }
  }

  // 2. Optimize Meta Description
  let $metaDesc = $('head > meta[name="description"], head > meta[name="Description"]');
  let currentDesc = $metaDesc.attr('content') ? $metaDesc.attr('content')!.trim() : '';

  if ($metaDesc.length === 0 || !currentDesc) {
    let candidateText = '';

    const $paragraphs = $('main p, body p, p');
    $paragraphs.each((_, el) => {
      const pText = $(el).text().replace(/\s+/g, ' ').trim();
      if (pText.length > 20 && !candidateText) {
        candidateText = pText;
      }
    });

    if (!candidateText) {
      candidateText = `Descubre la elegancia y distinción en ${brandName}. Colección exclusiva de joyas, anillos de compromiso, oro 18k y diamantes.`;
    }

    const formattedDesc = formatMetaDescription(candidateText);

    if ($metaDesc.length === 0) {
      $head.append(`<meta name="description" content="${escapeHtmlAttr(formattedDesc)}">`);
      modifications.push({
        tag: 'meta-description',
        action: 'injected',
        newValue: formattedDesc,
        reason: 'Injected missing meta description from page context'
      });
    } else {
      $metaDesc.attr('content', formattedDesc);
      modifications.push({
        tag: 'meta-description',
        action: 'updated',
        oldValue: currentDesc,
        newValue: formattedDesc,
        reason: 'Updated empty meta description with contextual text'
      });
    }
  }

  // 3. Optimize Meta Viewport
  let $metaViewport = $('head > meta[name="viewport"]');
  const targetViewport = 'width=device-width, initial-scale=1.0';

  if ($metaViewport.length === 0) {
    $head.append(`<meta name="viewport" content="${targetViewport}">`);
    modifications.push({
      tag: 'meta-viewport',
      action: 'injected',
      newValue: targetViewport,
      reason: 'Injected missing mobile viewport meta tag'
    });
  } else {
    const currentViewport = $metaViewport.attr('content') || '';
    if (!currentViewport.includes('width=device-width')) {
      $metaViewport.attr('content', targetViewport);
      modifications.push({
        tag: 'meta-viewport',
        action: 'updated',
        oldValue: currentViewport,
        newValue: targetViewport,
        reason: 'Normalized meta viewport tag to width=device-width, initial-scale=1.0'
      });
    }
  }

  // 4. OpenGraph & Twitter Tags
  const finalTitle = $('head > title').text().trim();
  const finalDesc = $('head > meta[name="description"]').attr('content') || '';
  const firstImgSrc = $('body img').first().attr('src') || '/images/aguamarina-banner.jpg';

  const socialTags = [
    { type: 'property', name: 'og:title', content: finalTitle, group: 'og:title' },
    { type: 'property', name: 'og:description', content: finalDesc, group: 'og:description' },
    { type: 'property', name: 'og:type', content: 'website', group: 'og:type' },
    { type: 'property', name: 'og:site_name', content: brandName, group: 'og:site_name' },
    { type: 'property', name: 'og:image', content: firstImgSrc, group: 'og:image' },
    { type: 'name', name: 'twitter:card', content: 'summary_large_image', group: 'twitter:card' },
    { type: 'name', name: 'twitter:title', content: finalTitle, group: 'twitter:title' },
    { type: 'name', name: 'twitter:description', content: finalDesc, group: 'twitter:description' },
    { type: 'name', name: 'twitter:image', content: firstImgSrc, group: 'twitter:image' }
  ];

  socialTags.forEach(st => {
    const selector = st.type === 'property'
      ? `head > meta[property="${st.name}"]`
      : `head > meta[name="${st.name}"]`;
    const $tag = $(selector);

    if ($tag.length === 0) {
      if (st.type === 'property') {
        $head.append(`<meta property="${st.name}" content="${escapeHtmlAttr(st.content)}">`);
      } else {
        $head.append(`<meta name="${st.name}" content="${escapeHtmlAttr(st.content)}">`);
      }
      modifications.push({
        tag: st.group,
        action: 'injected',
        targetSelector: `${st.type}="${st.name}"`,
        newValue: st.content,
        reason: `Injected missing ${st.name} social meta tag`
      });
    } else {
      const currentContent = $tag.attr('content') || '';
      if (!currentContent) {
        $tag.attr('content', st.content);
        modifications.push({
          tag: st.group,
          action: 'updated',
          targetSelector: `${st.type}="${st.name}"`,
          oldValue: currentContent,
          newValue: st.content,
          reason: `Populated empty ${st.name} social meta tag`
        });
      }
    }
  });

  // 5. Heading Hierarchy Normalizer
  const $h1s = $('h1');
  if ($h1s.length === 0) {
    const $firstHeading = $('h2, h3, h4, h5, h6').first();
    if ($firstHeading.length > 0) {
      const oldTag = ($firstHeading.prop('tagName') || '').toLowerCase();
      const content = $firstHeading.html() || '';
      $firstHeading.replaceWith(`<h1>${content}</h1>`);
      modifications.push({
        tag: 'heading',
        action: 'promoted',
        oldValue: oldTag,
        newValue: 'h1',
        reason: `Promoted first heading <${oldTag}> to <h1> to ensure single <h1> per page`
      });
    }
  } else if ($h1s.length > 1) {
    $h1s.each((index, el) => {
      if (index > 0) {
        const $extraH1 = $(el);
        const content = $extraH1.html() || '';
        $extraH1.replaceWith(`<h2>${content}</h2>`);
        modifications.push({
          tag: 'heading',
          action: 'demoted',
          oldValue: 'h1',
          newValue: 'h2',
          reason: 'Demoted extra <h1> tag to <h2> to maintain single <h1> rule'
        });
      }
    });
  }

  // Audit heading skips
  const $headings = $('h1, h2, h3, h4, h5, h6');
  let currentLevel = 0;
  $headings.each((_, el) => {
    const $h = $(el);
    const tag = ($h.prop('tagName') || '').toLowerCase();
    const level = parseInt(tag.slice(1), 10);

    if (currentLevel > 0 && level > currentLevel + 1) {
      const newLevel = currentLevel + 1;
      const newTag = `h${newLevel}`;
      const content = $h.html() || '';
      $h.replaceWith(`<${newTag}>${content}</${newTag}>`);
      modifications.push({
        tag: 'heading',
        action: 'promoted',
        oldValue: tag,
        newValue: newTag,
        reason: `Fixed heading level skip: converted <${tag}> to <${newTag}> after <h${currentLevel}>`
      });
      currentLevel = newLevel;
    } else {
      currentLevel = level;
    }
  });

  // 6. Image alt attribute contextual injection
  const $images = $('img');
  $images.each((_, el) => {
    const $img = $(el);
    const currentAlt = $img.attr('alt');

    if (currentAlt === undefined || currentAlt.trim() === '') {
      let altText = '';

      const $figure = $img.closest('figure');
      if ($figure.length > 0) {
        const $caption = $figure.find('figcaption');
        if ($caption.length > 0 && $caption.text().trim()) {
          altText = $caption.text().trim();
        }
      }

      if (!altText) {
        const $parentA = $img.closest('a');
        if ($parentA.length > 0 && $parentA.attr('title')) {
          altText = $parentA.attr('title')!.trim();
        }
      }

      if (!altText) {
        const $parentP = $img.closest('p');
        if ($parentP.length > 0 && $parentP.text().trim().length > 5 && $parentP.text().trim().length < 80) {
          altText = $parentP.text().trim();
        }
      }

      if (!altText) {
        const src = $img.attr('src') || '';
        altText = formatAltFromFilename(src, brandName);
      }

      $img.attr('alt', altText);
      modifications.push({
        tag: 'img-alt',
        action: 'injected',
        targetSelector: `img[src="${$img.attr('src') || ''}"]`,
        newValue: altText,
        reason: 'Injected contextual alt attribute for image'
      });
    }
  });

  let serializedHtml = $.html();
  if (!/^\s*<!DOCTYPE/i.test(serializedHtml)) {
    serializedHtml = `<!DOCTYPE html>\n${serializedHtml}`;
  }

  return {
    html: serializedHtml,
    modifications,
    isModified: modifications.length > 0
  };
}
