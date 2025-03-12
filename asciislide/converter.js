const { isAbsolute, join } = require('path');
const defaultAssetsDir = `../../assets/css`

const customStyleDir = (node) => {
  const stylesDirectory = node.getAttribute('stylesdir')
  if (stylesDirectory) {
    if (isAbsolute(stylesDirectory)) {
      return stylesDirectory
    }
    return join(node.getDocument().getBaseDir(), stylesDirectory)
  }
  return defaultAssetsDir
}

const customStyleContent = (node) => {
  const stylesheet = node.getAttribute('stylesheet') || `slides.css`
  if (isAbsolute(stylesheet)) {
    return stylesheet
  }
  let start = customStyleDir(node)
  return join(start, stylesheet)
}

const titleSliderHeader = (node) => {
  const doctitle = node.getDocumentTitle({ partition: true })
  if (doctitle.hasSubtitle()) {
    return `<h1>${doctitle.getMain()}</h1>
<h2>${doctitle.getSubtitle()}</h2>`
  }
  return `<h1>${node.getDocumentTitle()}</h1>`
}

const titleSlide = (node) => {
  return `<section class="title slide">
  <header>
    ${titleSliderHeader(node)}
  </header>
  <footer>
    <p class="author">${node.getDocument().getAuthor()}</p>
    <p class="institute">${node.getDocument().getAttribute("institute")}</p>
    <p class="collaborators">${node.getDocument().getAttribute("collaborators")}</p>
  </footer>
</section>`
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
    return `style="background-image: url(${node.getImageUri(image.getAttribute('target'))}); background-size: ${backgroundSize}; background-repeat: no-repeat"`
  }
  return ''
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

function paragraph(node) { return `<p class="${node.getRoles().join(' ')}">${node.getContent()}</p>` }
function section(node) {
  if (node.getLevel() !== 1) {
    return `${sectionTitle(node)}
    ${node.getContent()}`;
  }
  return `<section class="${sectionRoles(node).join(' ')}${node.getTitle() === '!' ? 'no-title' : ''}" data-slide-number="${node.index + 1}" data-slide-count="${node.parent.blocks.length}" ${sectionInlineStyle(node)}>
  ${sectionTitle(node)}
  ${node.getContent()}
</section>`
}
function document(node) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="${defaultAssetsDir}/asciidoctor.css" rel="stylesheet">
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
</body>`
}
function open(node) { return `<div${elementId(node)} class="${node.getRoles().join(' ')}">${node.getContent()}</div>` }
function image(node) {
  const roles = node.getRoles()
  if (roles && roles.includes('canvas')) {
    return ''
  }
  const width = node.getAttribute('width')
  const figcaption = node.getAttribute('figcaption') || ''
  const figcap = figcaption ? `<figcaption>${figcaption}</figcaption>` : ''
  const roleClass = roles.length > 0 ? `image ${roles.join(' ')}` : 'image'
  return `<figure class="${roleClass}"><img src="${node.getImageUri(node.getAttribute('target'))}" width="${width}"/>
    ${figcap}
    </figure>`
}

module.exports = {
  paragraph: paragraph,
  section: section,
  document: document,
  open: open,
  image: image
}