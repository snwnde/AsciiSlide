
const { join, isAbsolute } = require('path');
const { URL } = require('url');

const DEFAULT_STYLES_DIRECTORY = '../assets/';
const DEFAULT_STYLESHEET = join('css', 'slides.css');

// -----------------------------------------------------------------------------
// Utility helpers
// -----------------------------------------------------------------------------

const Maybe = (value) => ({
  value,

  map: (callback) =>
    Maybe(value != null ? callback(value) : null),

  getOrElse: (defaultValue) =>
    value != null ? value : defaultValue,
});

const getAttribute = (object, path) => {
  const keys = path.split('.');
  let current = object;

  for (const key of keys) {
    current = current?.[key];

    if (current == null) {
      return Maybe(null);
    }
  }

  return Maybe(current);
};

const renderParagraph = (className, content) => {
  if (content == null || content === '') {
    return '';
  }

  return `<p class="${className}">${content}</p>`;
};

// -----------------------------------------------------------------------------
// Asset paths
// -----------------------------------------------------------------------------

const getStylesDirectory = (node) => {
  const stylesDirectory = node.getAttribute('stylesdir');

  if (!stylesDirectory) {
    return DEFAULT_STYLES_DIRECTORY;
  }

  try {
    return new URL(stylesDirectory).href;
  } catch {
    if (isAbsolute(stylesDirectory)) {
      return stylesDirectory;
    }

    return join(
      node.getDocument().getBaseDir(),
      stylesDirectory,
    );
  }
};

const getStylesheetPath = (node) => {
  const stylesheet =
    node.getAttribute('stylesheet') || DEFAULT_STYLESHEET;

  if (isAbsolute(stylesheet)) {
    return stylesheet;
  }

  return getStylesDirectory(node) + stylesheet;
};

const getPresentationScriptPath = (node) =>
  getStylesDirectory(node) + join('js', 'presentation.js');

const getImageUri = async (node, target) => {
  const imageUri = await node.getImageUri(target);
  const imagesDirectory =
    node.getDocument().getAttribute('imagesdir');

  if (
    !imagesDirectory ||
    isAbsolute(imageUri) ||
    /^[a-z]+:\/\//i.test(imageUri)
  ) {
    return imageUri;
  }

  return join(imagesDirectory, imageUri);
};

// -----------------------------------------------------------------------------
// Image helpers
// -----------------------------------------------------------------------------

const getCanvasImage = (node) => {
  const images = node.findBy({
    context: 'image',
    role: 'canvas',
  });

  return images?.[0] ?? null;
};

const getSectionBackgroundStyle = async (node) => {
  const image = getCanvasImage(node);

  if (!image) {
    return '';
  }

  const roles = node.getRoles() || [];
  const backgroundSize = roles.includes('contain')
    ? 'contain'
    : 'cover';

  const backgroundImage = await getImageUri(
    node,
    image.getAttribute('target'),
  );

  return [
    `background-image: url(${backgroundImage})`,
    `background-size: ${backgroundSize}`,
    'background-repeat: no-repeat',
  ].join('; ');
};

const renderBackgroundStyle = async (node, backgroundUrl) => {
  if (!backgroundUrl) {
    return '';
  }

  const imageUri = await node.getImageUri(backgroundUrl);

  return ` style="background-image: url(${imageUri}); background-size: cover; background-repeat: no-repeat"`;
};

// -----------------------------------------------------------------------------
// Title helpers
// -----------------------------------------------------------------------------

const renderDocumentTitle = (node) => {
  const documentTitle = node.getDocumentTitle({
    partition: true,
  });

  if (documentTitle.hasSubtitle()) {
    return `
      <h1>${documentTitle.getMain()}</h1>
      <h2>${documentTitle.getSubtitle()}</h2>
    `;
  }

  return `<h1>${node.getDocumentTitle()}</h1>`;
};

const renderSectionTitle = (node) => {
  const separator =
    node.getDocument().getAttribute('title-separator') || ':';

  const [mainTitle, subtitle] = node.getTitle().split(separator);

  const level = node.getLevel();

  if (subtitle) {
    return `
      <header>
        <h${level + 1}>${mainTitle}</h${level + 1}>
        <h${level + 2}>${subtitle}</h${level + 2}>
      </header>
    `;
  }

  return `<h${level + 1}>${node.getTitle()}</h${level + 1}>`;
};

// -----------------------------------------------------------------------------
// Slide helpers
// -----------------------------------------------------------------------------

const getSectionRoles = (node) => {
  const roles = [...(node.getRoles() || []), 'slide'];

  if (getCanvasImage(node)) {
    roles.push('image');
  }

  return roles;
};

const getElementId = (node) =>
  getAttribute(node, 'id')
    .map((id) => ` id="${id}"`)
    .getOrElse('');

const hasNoPagination = (block) =>
  getAttribute(block, 'attributes.$$smap.role')
    .map((role) => role.split(' ').includes('no-pagination'))
    .getOrElse(false);

const getTotalPages = (node) =>
  node.parent.blocks.filter(
    (block) => !hasNoPagination(block),
  ).length;

const getPageNumber = (node) => {
  const excludedPreviousPages = node.parent.blocks.filter(
    (block) =>
      hasNoPagination(block) && block.index < node.index,
  ).length;

  return node.index - excludedPreviousPages + 1;
};

const getPresentationTheme = (node) => {
  const theme = String(
    node.getDocument().getAttribute('theme') || '',
  )
    .trim()
    .toLowerCase();

  if (!theme) {
    return 'marine';
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(theme)) {
    throw new Error(`Invalid presentation theme: ${theme}`);
  }

  return theme;
};

// -----------------------------------------------------------------------------
// Document rendering
// -----------------------------------------------------------------------------

async function renderTitleSlide(node) {
  const document = node.getDocument();

  const author = document.getAuthor() || '';
  const institute = document.getAttribute('institute') || '';
  const collaborators =
    document.getAttribute('collaborators') || '';
  const background =
    document.getAttribute('title-background') || '';
  const footnote = document.getAttribute('footnote') || '';

  const backgroundStyle = await renderBackgroundStyle(
    node,
    background,
  );

  return `
    <section class="title slide"${backgroundStyle}>
      <header>
        ${renderDocumentTitle(node)}
        ${renderParagraph('author', author)}
        ${renderParagraph('institute', institute)}
        ${renderParagraph('collaborators', collaborators)}
      </header>

      <footer>
        ${renderParagraph('footnote', footnote)}
      </footer>
    </section>
  `;
}

async function renderSection(node) {
  const content = await node.getContent();

  if (node.getLevel() !== 1) {
    return `
      ${renderSectionTitle(node)}
      ${content}
    `;
  }

  const noTitleClass = node.getTitle() === '!'
    ? ' no-title'
    : '';

  const slideNumber = getPageNumber(node);
  const slideCount = getTotalPages(node);

  const transition =
    node.getAttribute('transition') ||
    node.getDocument().getAttribute('slide-transion') ||
    'zoom';

  const backgroundStyle = await getSectionBackgroundStyle(node);

  const inlineStyle = backgroundStyle
    ? ` style="${backgroundStyle}"`
    : '';

  const footerMsg = node.getDocument().getAttribute('footer-msg') || '';

  return `
    <section
      class="${getSectionRoles(node).join(' ')}${noTitleClass}"
      transition="${transition}"
      data-slide-number="${slideNumber}"
      data-slide-count="${slideCount}"${inlineStyle}
    >
      ${renderSectionTitle(node)}
      ${content}
      <footer>
        ${renderParagraph('footer-msg', footerMsg)}
      </footer>
    </section>
  `;
}

async function renderDocument(node) {
  const stylesDirectory = getStylesDirectory(node);
  const stylesheet = getStylesheetPath(node);
  const presentationScript = getPresentationScriptPath(node);
  const theme = getPresentationTheme(node);

  const titleSlideHtml = await renderTitleSlide(node);
  const content = await node.getContent();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <link
    href="${stylesDirectory}/css/asciidoctor.css"
    rel="stylesheet"
  >
  <link href="${stylesheet}" rel="stylesheet">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin
  >

  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
  >
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/github.min.css"
  >

  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
  <script>hljs.initHighlightingOnLoad();</script>

  <script>
  window.MathJax = {
    tex: {
      inlineMath: [['\\\\(', '\\\\)']],
      displayMath: [['\\\\[', '\\\\]']],
    },
    svg: {
      fontCache: 'none',
    },
    startup: {
      pageReady: () =>
        MathJax.startup.defaultPageReady().then(() => {
          document.documentElement.classList.add('mathjax-ready');
        }),
    },
  };
  </script>
  <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>

  <!-- <script src="${presentationScript}" defer></script> -->
</head>

<body data-asciislide-theme="${theme}">
  ${titleSlideHtml}
  ${content}
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// Element rendering
// -----------------------------------------------------------------------------

async function renderParagraphElement(node) {
  return `<p class="${(node.getRoles() || []).join(' ')}">${await node.getContent()}</p>`;
}

async function renderOpenBlock(node) {
  const id = getElementId(node);
  const roles = (node.getRoles() || []).join(' ');

  return `<div${id} class="${roles}">${await node.getContent()}</div>`;
}

async function renderImage(node) {
  const roles = node.getRoles() || [];

  if (roles.includes('canvas')) {
    return '';
  }

  const width = node.getAttribute('width');
  const height = node.getAttribute('height');
  const caption = node.getAttribute('figcaption');

  const widthAttribute = width ? ` width="${width}"` : '';
  const heightAttribute = height ? ` height="${height}"` : '';

  const roleClass = roles.length
    ? `image ${roles.join(' ')}`
    : 'image';

  const source = await getImageUri(
    node,
    node.getAttribute('target'),
  );

  const captionHtml = caption
    ? `<figcaption>${caption}</figcaption>`
    : '';

  return `
    <figure class="${roleClass}">
      <img src="${source}"${widthAttribute}${heightAttribute}>
      ${captionHtml}
    </figure>
  `;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

module.exports = {
  paragraph: renderParagraphElement,
  section: renderSection,
  document: renderDocument,
  open: renderOpenBlock,
  image: renderImage,
};
