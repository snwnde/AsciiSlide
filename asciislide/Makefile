export LANGUAGE=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8

ASCIISLIDE_SRC_DIR ?= src
ASCIISLIDE_BUILD_DIR ?= build

SRC_DIR := ${ASCIISLIDE_SRC_DIR}
BUILD_DIR := ${ASCIISLIDE_BUILD_DIR}

ASCIIDOCTOR_WEB_PDF := $(shell command -v asciidoctor-web-pdf 2>/dev/null)

ifeq ($(ASCIIDOCTOR_WEB_PDF),)
ASCIIDOCTOR_WEB_PDF := /usr/bin/asciidoctor-web-pdf
endif

SRC_FILES := $(shell cd ${SRC_DIR} && find . -maxdepth 1 -name '*.adoc')
HTML_FILES := $(SRC_FILES:%.adoc=$(BUILD_DIR)/%.html)

OUT_IMG = $(patsubst ${SRC_DIR}/%,${BUILD_DIR}/%,$(wildcard ${SRC_DIR}/images/*))
OUT_CSS = $(patsubst ${SRC_DIR}/%,${BUILD_DIR}/%,$(wildcard ${SRC_DIR}/assets/css/*))
OUT_JS = $(patsubst ${SRC_DIR}/%,${BUILD_DIR}/%,$(wildcard ${SRC_DIR}/assets/js/*))

.PHONY: all
all: $(HTML_FILES) $(OUT_IMG) $(OUT_CSS) $(OUT_JS)
	@echo "All tasks finished."

$(BUILD_DIR)/%.html: $(SRC_DIR)/%.adoc
	@echo "Building the presentation slides..."
	@$(ASCIIDOCTOR_WEB_PDF) $? --template-require ./converter.js -D $(dir $@)
	@echo "Moving the html file as well..."
	@mv $(subst .adoc,.html,$?) $@
	@sed -i '/<!-- <script src=.*presentation\.js.*><\/script> -->/s/<!-- //; s/ -->//' $@
	@echo "Done!"

$(BUILD_DIR)/%: $(SRC_DIR)/%
	@mkdir -p $(dir $@)
	@cp $? $@

.PHONY: clean
clean:
	rm -rf ${BUILD_DIR}