export LANGUAGE=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8

SRC_DIR = src
BUILD_DIR = build

SRC_FILES := $(shell cd ${SRC_DIR} && find . -maxdepth 2 -name '*.adoc')
HTML_FILES := $(SRC_FILES:%.adoc=$(BUILD_DIR)/%.html)

OUT_IMG = $(patsubst ${SRC_DIR}/%,${BUILD_DIR}/%,$(wildcard ${SRC_DIR}/*/images/*))
OUT_CSS = $(patsubst ${SRC_DIR}/%,${BUILD_DIR}/%,$(wildcard ${SRC_DIR}/*/assets/css/*))
OUT_JS = $(patsubst ${SRC_DIR}/%,${BUILD_DIR}/%,$(wildcard ${SRC_DIR}/*/assets/js/*))

.PHONY: all
all: $(HTML_FILES) $(OUT_IMG) $(OUT_CSS) $(OUT_JS)
	@echo "All tasks finished."

$(BUILD_DIR)/%.html: $(SRC_DIR)/%.adoc
	@echo "Building the presentation slides..."
	@/usr/bin/asciidoctor-web-pdf $? --template-require ./converter.js -D $(dir $@)
	@echo "Moving the html file as well..."
	@mv $(subst .adoc,.html,$?) $@
	@patch $@ -p0 < ./posthtml.patch
	@echo "Done!"

$(BUILD_DIR)/%: $(SRC_DIR)/%
	@mkdir -p $(dir $@)
	@cp $? $@

.PHONY: clean
clean:
	rm -rf ${BUILD_DIR}