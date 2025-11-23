const { join, isAbsolute } = require('path');
const { URL } = require('url');
const defaultStyleDir = `../../assets/`

const customStyleDir = (node) => {
  const stylesDirectory = node.getAttribute('stylesdir');
  if (stylesDirectory) {
    try {
      const url = new URL(stylesDirectory);
      return url.href;
    } catch (_) {
      if (isAbsolute(stylesDirectory)) {
        return stylesDirectory;
      }
      return join(node.getDocument().getBaseDir(), stylesDirectory);
    }
  }
  return defaultStyleDir;
};


const customStyleContent = (node) => {
  const stylesheet = node.getAttribute('stylesheet') || join(`css`, `slides.css`)
  if (isAbsolute(stylesheet)) {
    return stylesheet
  }
  let start = customStyleDir(node)
  return start + stylesheet
}

const customScriptContent = (node) => {
  let start = customStyleDir(node)
  return start + join(`js`, `presentation.js`)
}

const titleSliderHeader = (node) => {
  const doctitle = node.getDocumentTitle({ partition: true })
  if (doctitle.hasSubtitle()) {
    return `<h1>${doctitle.getMain()}</h1>
<h2>${doctitle.getSubtitle()}</h2>`
  }
  return `<h1>${node.getDocumentTitle()}</h1>`
}


const getImageCanvas = (node) => {
  const images = node.findBy({ context: 'image', role: 'canvas' })
  if (images && images.length > 0) {
    return images[0]
  }
  return undefined
}

const sectionInlineStyle = (node) => {
  const image = getImageCanvas(node)
  if (image) {
    const roles = node.getRoles()
    let backgroundSize
    if (roles && roles.includes('contain')) {
      backgroundSize = 'contain'
    } else {
      backgroundSize = 'cover'
    }
    return ` style="background-image: url(${node.getImageUri(image.getAttribute('target'))}); background-size: ${backgroundSize}; background-repeat: no-repeat"`
  }
  return ''
}

const titleSlide = (node) => {
  const author = node.getDocument().getAuthor() || ''
  const institute = node.getDocument().getAttribute('institute') || ''
  const collaborators = node.getDocument().getAttribute('collaborators') || ''
  const background = node.getDocument().getAttribute('title-background') || ''
  const footnote = node.getDocument().getAttribute('footnote') || ''
  const authorHeader = author ? `<p class="author">${author}</p>` : ''
  const instituteHeader = institute ? `<p class="institute">${institute}</p>` : ''
  const footnoteFooter = footnote ? `<p class="footnote">${footnote}</p>` : ''
  const collaboratorsHeader = collaborators ? `<p class="collaborators">${collaborators}</p>` : ''
  
  const titleBgStyle = background ? ` style="background-image: url(${node.getImageUri(background)}); background-size: cover; background-repeat: no-repeat"` : ''

  return `<section class="title slide"${titleBgStyle}>
  <header>
    ${titleSliderHeader(node)}
    ${authorHeader}
    ${instituteHeader}
    ${collaboratorsHeader}
  </header>
  <footer>
    ${footnoteFooter}
  </footer>
</section>`
}

const sectionTitle = (node) => {
  const titleSeparator = node.getDocument().getAttribute('title-separator') || ':'
  const parts = node.getTitle().split(titleSeparator)
  const main = parts[0]
  const subtitle = parts[1]
  const level = node.getLevel()
  if (subtitle) {
    return `<header>
  <h${level + 1}>${main}</h${level + 1}>
  <h${level + 2}>${subtitle}</h${level + 2}>
</header>`
  }
  return `<h${level + 1}>${node.getTitle()}</h${level + 1}>`
}

const sectionRoles = (node) => {
  const roles = node.getRoles() || []
  roles.unshift('slide')
  const image = getImageCanvas(node)
  if (image) {
    roles.push('image')
  }
  return roles
}

const elementId = (node) => {
  const id = node.getId()
  if (id) {
    return ` id="${id}"`
  }
  return ''
}

function hasNoPaginationAttribute(block) {
  // Check if the block has attributes and $$smap within attributes
  if (
    block.attributes &&
    block.attributes.$$smap &&
    block.attributes.$$smap.role
  ) {
    // Split the role string by spaces and check if 'no-pagination' is one of the elements
    return block.attributes.$$smap.role.split(" ").includes("no-pagination");
  }
  return false;
}

function calculateTotalPages(node) {
  let totalPages = 0;
  node.parent.blocks.forEach((block) => {
    if (!hasNoPaginationAttribute(block)) {
      totalPages++;
    }
  });
  return totalPages;
}

function calculatePageNumber(node) {
  let noPaginationNumber = 0;
  node.parent.blocks.forEach((block) => {
    if (hasNoPaginationAttribute(block) && block.index < node.index) {
      noPaginationNumber++;
    }
  });
  return node.index - noPaginationNumber + 1;
}

function paragraph(node) { return `<p class="${node.getRoles().join(' ')}">${node.getContent()}</p>` }
function section(node) {
  if (node.getLevel() !== 1) {
    return `${sectionTitle(node)}
    ${node.getContent()}`;
  }
  const noTitleToggle = node.getTitle() === '!' ? ' no-title' : ''
  const slideNum = ` data-slide-number="${calculatePageNumber(node)}"`
  const slideCount = ` data-slide-count="${calculateTotalPages(node)}"`
  const slideTransition = ` transition="${node.getAttribute('transition') || node.getDocument().getAttribute('slide-transion') || 'zoom'}"`
  return `<section class="${sectionRoles(node).join(' ')}${noTitleToggle}"${slideTransition}${slideNum}${slideCount}${sectionInlineStyle(node)}>
  ${sectionTitle(node)}
  ${node.getContent()}
</section>`
}
function document(node) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${customStyleDir(node)}/css/asciidoctor.css" rel="stylesheet">
<link rel="stylesheet" href="${customStyleContent(node)}" rel="stylesheet">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/github.min.css">
<body>
${titleSlide(node)}
${node.getContent()}
</head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>
hljs.initHighlightingOnLoad();
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_HTMLorMML"></script>
<!-- <script src="${customScriptContent(node)}" defer></script> -->
</body>`
}
function open(node) { return `<div${elementId(node)} class="${node.getRoles().join(' ')}">${node.getContent()}</div>` }
function image(node) {
  const roles = node.getRoles()
  if (roles && roles.includes('canvas')) {
    return ''
  }
  const width = node.getAttribute('width')
  const widthStyle = width ? ` width=${width}` : ''
  const height = node.getAttribute('height')
  const heightStyle = height ? ` height=${height}` : ''
  const figcaption = node.getAttribute('figcaption') || ''
  const figcap = figcaption ? `<figcaption>${figcaption}</figcaption>` : ''
  const roleClass = roles.length > 0 ? `image ${roles.join(' ')}` : 'image'
  return `<figure class="${roleClass}"><img src="${node.getImageUri(node.getAttribute('target'))}"${widthStyle}${heightStyle}/>${figcap}</figure>`
}

module.exports = {
  paragraph: paragraph,
  section: section,
  document: document,
  open: open,
  image: image
}