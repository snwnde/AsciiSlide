const { join, isAbsolute } = require('path');
const { URL } = require('url');
const defaultStyleDir = `../assets/`

const Maybe = (value) => ({
  value,
  map: (fn) => Maybe(value != null ? fn(value) : null),
  getOrElse: (defaultVal) => value != null ? value : defaultVal,
})

const getAttribute = (obj, path) => {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    current = current?.[key]
    if (current == null) return Maybe(null)
  }
  return Maybe(current)
}

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
  return Maybe(node.findBy({ context: 'image', role: 'canvas' }))
    .map(images => images?.length > 0 ? images[0] : null)
}

const sectionInlineStyle = (node) => {
  return getImageCanvas(node)
    .map(image => {
      const roles = node.getRoles() || []
      const backgroundSize = roles.includes('contain') ? 'contain' : 'cover'
      const backgroundUrl = node.getImageUri(image.getAttribute('target'))
      return ` style="background-image: url(${backgroundUrl}); background-size: ${backgroundSize}; background-repeat: no-repeat"`
    })
    .getOrElse('')
}

const renderElement = (className, content) =>
  Maybe(content)
    .map(value => `<p class="${className}">${value}</p>`)
    .getOrElse('')

const renderBackgroundStyle = (node, backgroundUrl) =>
  Maybe(backgroundUrl)
    .map(bg => ` style="background-image: url(${node.getImageUri(bg)}); background-size: cover; background-repeat: no-repeat"`)
    .getOrElse('')

const titleSlide = (node) => {
  const doc = node.getDocument()
  const author = doc.getAuthor() || ''
  const institute = doc.getAttribute('institute') || ''
  const collaborators = doc.getAttribute('collaborators') || ''
  const background = doc.getAttribute('title-background') || ''
  const footnote = doc.getAttribute('footnote') || ''

  const titleBgStyle = renderBackgroundStyle(node, background)

  return `<section class="title slide"${titleBgStyle}>
  <header>
    ${titleSliderHeader(node)}
    ${renderElement('author', author)}
    ${renderElement('institute', institute)}
    ${renderElement('collaborators', collaborators)}
  </header>
  <footer>
    ${renderElement('footnote', footnote)}
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
  getImageCanvas(node).map(
    () => roles.push('image')
  )
  return roles
}

const elementId = (node) => {
  return Maybe(node.getId())
    .map(id => ` id="${id}"`)
    .getOrElse('')
}

const hasNoPaginationAttribute = (block) => {
  return getAttribute(block, 'attributes.$$smap.role')
    .map(role => role.split(' ').includes('no-pagination'))
    .getOrElse(false)
}

const calculateTotalPages = (node) => {
  return node.parent.blocks.reduce((count, block) => {
    return hasNoPaginationAttribute(block) ? count : count + 1
  }, 0)
}

const calculatePageNumber = (node) => {
  const noPaginationCount = node.parent.blocks.reduce((count, block) => {
    return hasNoPaginationAttribute(block) && block.index < node.index ? count + 1 : count
  }, 0)
  return node.index - noPaginationCount + 1
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
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="${customStyleDir(node)}/css/asciidoctor.css" rel="stylesheet">
<link rel="stylesheet" href="${customStyleContent(node)}" rel="stylesheet">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>
hljs.initHighlightingOnLoad();
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_HTMLorMML"></script>
<!-- <script src="${customScriptContent(node)}" defer></script> -->
</head>
<body>
${titleSlide(node)}
${node.getContent()}
</body>`
}
function open(node) { return `<div${elementId(node)} class="${node.getRoles().join(' ')}">${node.getContent()}</div>` }
function image(node) {
  const roles = node.getRoles()
  if (roles && roles.includes('canvas')) {
    return ''
  }
  const widthStyle = Maybe(node.getAttribute('width'))
    .map(width => ` width=${width}`)
    .getOrElse('')
  const heightStyle = Maybe(node.getAttribute('height'))
    .map(height => ` height=${height}`)
    .getOrElse('')
  const figcap = Maybe(node.getAttribute('figcaption'))
    .map(figcaption => `<figcaption>${figcaption}</figcaption>`)
    .getOrElse('')
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